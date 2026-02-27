import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { RequisitionService } from "./requisition.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

@Injectable()
export class JobCardService {
  private readonly logger = new Logger(JobCardService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingAnalysisRepo: Repository<JobCardCoatingAnalysis>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    @Inject(forwardRef(() => WorkflowNotificationService))
    private readonly notificationService: WorkflowNotificationService,
  ) {}

  async create(companyId: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = this.jobCardRepo.create({ ...data, companyId });
    return this.jobCardRepo.save(jobCard);
  }

  async findAll(companyId: number, status?: string): Promise<JobCard[]> {
    const where: Record<string, unknown> = { companyId };
    if (status) {
      where.status = status;
    }
    return this.jobCardRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findById(companyId: number, id: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id, companyId },
      relations: ["allocations", "allocations.stockItem", "allocations.staffMember", "lineItems"],
    });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }
    return jobCard;
  }

  async update(companyId: number, id: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = await this.findById(companyId, id);
    Object.assign(jobCard, data);
    return this.jobCardRepo.save(jobCard);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const jobCard = await this.findById(companyId, id);
    await this.jobCardRepo.remove(jobCard);
  }

  async allocateStock(
    companyId: number,
    data: {
      stockItemId: number;
      jobCardId: number;
      quantityUsed: number;
      photoUrl?: string;
      notes?: string;
      allocatedBy?: string;
      staffMemberId?: number;
    },
  ): Promise<StockAllocation> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: data.stockItemId, companyId },
    });
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const jobCard = await this.jobCardRepo.findOne({ where: { id: data.jobCardId, companyId } });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    if (stockItem.quantity < data.quantityUsed) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${data.quantityUsed}`,
      );
    }

    const overAllocationCheck = await this.checkOverAllocation(
      companyId,
      data.jobCardId,
      stockItem,
      data.quantityUsed,
    );

    if (overAllocationCheck.requiresApproval) {
      const allocation = this.allocationRepo.create({
        stockItem,
        jobCard,
        quantityUsed: data.quantityUsed,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
        allocatedBy: data.allocatedBy || null,
        staffMemberId: data.staffMemberId || null,
        companyId,
        pendingApproval: true,
        allowedLitres: overAllocationCheck.allowedLitres,
      });
      const saved = await this.allocationRepo.save(allocation);

      await this.notificationService.notifyOverAllocationApproval(
        companyId,
        data.jobCardId,
        saved.id,
        stockItem.name,
        data.quantityUsed,
        overAllocationCheck.allowedLitres ?? 0,
        overAllocationCheck.alreadyAllocated,
      );

      return saved;
    }

    stockItem.quantity = stockItem.quantity - data.quantityUsed;
    await this.stockItemRepo.save(stockItem);

    const allocation = this.allocationRepo.create({
      stockItem,
      jobCard,
      quantityUsed: data.quantityUsed,
      photoUrl: data.photoUrl || null,
      notes: data.notes || null,
      allocatedBy: data.allocatedBy || null,
      staffMemberId: data.staffMemberId || null,
      companyId,
      pendingApproval: false,
      allowedLitres: overAllocationCheck.allowedLitres,
    });
    const saved = await this.allocationRepo.save(allocation);

    const movement = this.movementRepo.create({
      stockItem,
      movementType: MovementType.OUT,
      quantity: data.quantityUsed,
      referenceType: ReferenceType.ALLOCATION,
      referenceId: saved.id,
      notes: `Allocated to job ${jobCard.jobNumber}`,
      createdBy: data.allocatedBy || null,
      companyId,
    });
    await this.movementRepo.save(movement);

    if (stockItem.minStockLevel > 0 && stockItem.quantity < stockItem.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, stockItem.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    return saved;
  }

  private async checkOverAllocation(
    companyId: number,
    jobCardId: number,
    stockItem: StockItem,
    quantityRequested: number,
  ): Promise<{
    requiresApproval: boolean;
    allowedLitres: number | null;
    alreadyAllocated: number;
  }> {
    const coatingAnalysis = await this.coatingAnalysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!coatingAnalysis || !coatingAnalysis.coats || coatingAnalysis.coats.length === 0) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const matchingCoat = this.fuzzyMatchCoat(stockItem.name, coatingAnalysis.coats);
    if (!matchingCoat) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const existingAllocations = await this.allocationRepo.find({
      where: {
        jobCard: { id: jobCardId },
        stockItem: { id: stockItem.id },
        companyId,
        pendingApproval: false,
        rejectedAt: null as unknown as Date,
      },
    });

    const alreadyAllocated = existingAllocations.reduce(
      (sum, alloc) => sum + Number(alloc.quantityUsed),
      0,
    );
    const totalAfterAllocation = alreadyAllocated + quantityRequested;
    const allowedLitres = matchingCoat.litersRequired;

    if (totalAfterAllocation > allowedLitres) {
      return { requiresApproval: true, allowedLitres, alreadyAllocated };
    }

    return { requiresApproval: false, allowedLitres, alreadyAllocated };
  }

  private fuzzyMatchCoat(
    stockItemName: string,
    coats: Array<{ product: string; litersRequired: number }>,
  ): { product: string; litersRequired: number } | null {
    const normalised = stockItemName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ");

    const scored = coats
      .map((coat) => {
        const coatName = coat.product.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((word) => coatName.includes(word));
        return { coat, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].coat : null;
  }

  async approveOverAllocation(
    companyId: number,
    allocationId: number,
    managerId: number,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, companyId, pendingApproval: true },
      relations: ["stockItem", "jobCard"],
    });

    if (!allocation) {
      throw new NotFoundException("Pending allocation not found");
    }

    const stockItem = allocation.stockItem;
    if (stockItem.quantity < allocation.quantityUsed) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${allocation.quantityUsed}`,
      );
    }

    stockItem.quantity = stockItem.quantity - allocation.quantityUsed;
    await this.stockItemRepo.save(stockItem);

    allocation.pendingApproval = false;
    allocation.approvedByManagerId = managerId;
    allocation.approvedAt = new Date();
    const saved = await this.allocationRepo.save(allocation);

    const movement = this.movementRepo.create({
      stockItem,
      movementType: MovementType.OUT,
      quantity: allocation.quantityUsed,
      referenceType: ReferenceType.ALLOCATION,
      referenceId: saved.id,
      notes: `Allocated to job ${allocation.jobCard.jobNumber} (manager approved over-allocation)`,
      createdBy: allocation.allocatedBy || null,
      companyId,
    });
    await this.movementRepo.save(movement);

    if (stockItem.minStockLevel > 0 && stockItem.quantity < stockItem.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, stockItem.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    this.logger.log(`Over-allocation ${allocationId} approved by manager ${managerId}`);
    return saved;
  }

  async rejectOverAllocation(
    companyId: number,
    allocationId: number,
    reason: string,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, companyId, pendingApproval: true },
    });

    if (!allocation) {
      throw new NotFoundException("Pending allocation not found");
    }

    allocation.pendingApproval = false;
    allocation.rejectedAt = new Date();
    allocation.rejectionReason = reason;

    this.logger.log(`Over-allocation ${allocationId} rejected: ${reason}`);
    return this.allocationRepo.save(allocation);
  }

  async pendingAllocations(companyId: number): Promise<StockAllocation[]> {
    return this.allocationRepo.find({
      where: { companyId, pendingApproval: true },
      relations: ["stockItem", "jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  async allocationsByJobCard(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    return this.allocationRepo.find({
      where: { jobCard: { id: jobCardId }, companyId },
      relations: ["stockItem", "staffMember"],
      order: { createdAt: "DESC" },
    });
  }

  async uploadAllocationPhoto(
    companyId: number,
    allocationId: number,
    file: Express.Multer.File,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOne({
      where: { id: allocationId, companyId },
      relations: ["stockItem"],
    });
    if (!allocation) {
      throw new NotFoundException("Allocation not found");
    }
    const result = await this.storageService.upload(file, "stock-control/allocations");
    allocation.photoUrl = result.url;
    return this.allocationRepo.save(allocation);
  }
}
