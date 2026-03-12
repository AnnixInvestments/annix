import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { JobCard, JobCardWorkflowStatus } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { StockMovement } from "../entities/stock-movement.entity";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface AllocationSummary {
  stockItemId: number;
  stockItem: StockItem;
  allocatedQuantity: number;
  dispatchedQuantity: number;
  remainingQuantity: number;
}

export interface DispatchProgress {
  totalAllocated: number;
  totalDispatched: number;
  isComplete: boolean;
  items: AllocationSummary[];
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(DispatchScan)
    private readonly dispatchScanRepo: Repository<DispatchScan>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async startDispatchSession(
    companyId: number,
    jobCardId: number,
  ): Promise<{ jobCard: JobCard; progress: DispatchProgress }> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
      relations: ["allocations", "allocations.stockItem"],
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    if (jobCard.workflowStatus !== JobCardWorkflowStatus.READY_FOR_DISPATCH) {
      throw new BadRequestException(
        `Job card is not ready for dispatch. Current status: ${jobCard.workflowStatus}`,
      );
    }

    const progress = await this.dispatchProgress(companyId, jobCardId);

    return { jobCard, progress };
  }

  async scanItem(
    companyId: number,
    jobCardId: number,
    stockItemId: number,
    quantity: number,
    user: UserContext,
    notes?: string,
  ): Promise<DispatchScan> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    if (jobCard.workflowStatus !== JobCardWorkflowStatus.READY_FOR_DISPATCH) {
      throw new BadRequestException("Job card is not ready for dispatch");
    }

    const allocation = await this.allocationRepo.findOne({
      where: { jobCard: { id: jobCardId }, stockItem: { id: stockItemId } },
      relations: ["stockItem"],
    });

    if (!allocation) {
      throw new BadRequestException(
        `Stock item ${stockItemId} is not allocated to job card ${jobCardId}`,
      );
    }

    const existingScans = await this.dispatchScanRepo.find({
      where: { jobCardId, stockItemId },
    });

    const alreadyDispatched = existingScans.reduce((sum, scan) => sum + scan.quantityDispatched, 0);

    const remaining = allocation.quantityUsed - alreadyDispatched;

    if (quantity > remaining) {
      throw new BadRequestException(
        `Cannot dispatch ${quantity}. Only ${remaining} remaining for this item.`,
      );
    }

    const scan = this.dispatchScanRepo.create({
      jobCardId,
      companyId,
      stockItemId,
      allocationId: allocation.id,
      quantityDispatched: quantity,
      scannedById: user.id,
      scannedByName: user.name,
      dispatchNotes: notes ?? null,
    });

    const saved = await this.dispatchScanRepo.save(scan);

    this.logger.log(
      `Dispatched ${quantity} of item ${stockItemId} for job card ${jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async dispatchProgress(companyId: number, jobCardId: number): Promise<DispatchProgress> {
    const allocations = await this.allocationRepo.find({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem"],
    });

    const scans = await this.dispatchScanRepo.find({
      where: { jobCardId, companyId },
    });

    const scansByItem = scans.reduce(
      (acc, scan) => {
        acc[scan.stockItemId] = (acc[scan.stockItemId] || 0) + scan.quantityDispatched;
        return acc;
      },
      {} as Record<number, number>,
    );

    const items: AllocationSummary[] = allocations.map((allocation) => {
      const dispatchedQuantity = scansByItem[allocation.stockItem.id] || 0;
      return {
        stockItemId: allocation.stockItem.id,
        stockItem: allocation.stockItem,
        allocatedQuantity: allocation.quantityUsed,
        dispatchedQuantity,
        remainingQuantity: allocation.quantityUsed - dispatchedQuantity,
      };
    });

    const totalAllocated = items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    const totalDispatched = items.reduce((sum, item) => sum + item.dispatchedQuantity, 0);
    const isComplete = items.every((item) => item.remainingQuantity === 0);

    return {
      totalAllocated,
      totalDispatched,
      isComplete,
      items,
    };
  }

  async dispatchHistory(companyId: number, jobCardId: number): Promise<DispatchScan[]> {
    return this.dispatchScanRepo.find({
      where: { jobCardId, companyId },
      relations: ["stockItem", "scannedBy"],
      order: { scannedAt: "DESC" },
    });
  }

  async completeDispatch(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<JobCard> {
    const progress = await this.dispatchProgress(companyId, jobCardId);

    if (!progress.isComplete) {
      throw new BadRequestException("Cannot complete dispatch. Not all items have been scanned.");
    }

    const result = await this.jobCardRepo.update(
      { id: jobCardId, companyId, workflowStatus: JobCardWorkflowStatus.READY_FOR_DISPATCH },
      { workflowStatus: JobCardWorkflowStatus.DISPATCHED },
    );

    if (result.affected === 0) {
      throw new ConflictException(
        "Job card status has changed. Please refresh and try again.",
      );
    }

    this.auditService.log({
      entityType: "job_card_dispatch",
      entityId: jobCardId,
      action: AuditAction.UPDATE,
      oldValues: { workflowStatus: JobCardWorkflowStatus.READY_FOR_DISPATCH },
      newValues: { workflowStatus: JobCardWorkflowStatus.DISPATCHED, completedBy: user.name },
    }).catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    this.logger.log(`Job card ${jobCardId} dispatch completed by ${user.name}`);

    const jobCard = await this.jobCardRepo.findOne({ where: { id: jobCardId, companyId } });
    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    return jobCard;
  }

  async scanByQrToken(
    companyId: number,
    qrToken: string,
  ): Promise<{ type: "job_card" | "stock_item"; id: number }> {
    const jobCard = await this.jobCardRepo
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.id::text = :qrToken OR jc.jobNumber = :qrToken", { qrToken })
      .getOne();

    if (jobCard) {
      return { type: "job_card", id: jobCard.id };
    }

    const stockItem = await this.stockItemRepo
      .createQueryBuilder("si")
      .where("si.companyId = :companyId", { companyId })
      .andWhere("si.id::text = :qrToken OR si.sku = :qrToken", { qrToken })
      .getOne();

    if (stockItem) {
      return { type: "stock_item", id: stockItem.id };
    }

    throw new NotFoundException(`No job card or stock item found for QR token: ${qrToken}`);
  }
}
