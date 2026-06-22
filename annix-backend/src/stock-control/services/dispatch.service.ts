import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { JobCard } from "../entities/job-card.entity";
import { StockItem } from "../entities/stock-item.entity";
import { DispatchCdnRepository } from "../repositories/dispatch-cdn.repository";
import { DispatchLoadPhotoRepository } from "../repositories/dispatch-load-photo.repository";
import { DispatchScanRepository } from "../repositories/dispatch-scan.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";

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
  hasCdn: boolean;
  hasLoadPhotos: boolean;
  canComplete: boolean;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly dispatchScanRepo: DispatchScanRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly allocationRepo: StockAllocationRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly cdnRepo: DispatchCdnRepository,
    private readonly loadPhotoRepo: DispatchLoadPhotoRepository,
    private readonly auditService: AuditService,
  ) {}

  async startDispatchSession(
    companyId: number,
    jobCardId: number,
  ): Promise<{ jobCard: JobCard; progress: DispatchProgress }> {
    const jobCard = await this.jobCardRepo.findOneForCompanyWithRelations(jobCardId, companyId, [
      "allocations",
      "allocations.stockItem",
    ]);

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    if (jobCard.workflowStatus !== "ready") {
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
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    if (jobCard.workflowStatus !== "ready") {
      throw new BadRequestException("Job card is not ready for dispatch");
    }

    const allocation = await this.allocationRepo.findOneByJobAndStockItem(jobCardId, stockItemId);

    if (!allocation) {
      throw new BadRequestException(
        `Stock item ${stockItemId} is not allocated to job card ${jobCardId}`,
      );
    }

    const existingScans = await this.dispatchScanRepo.findForJobCardItem(jobCardId, stockItemId);

    const alreadyDispatched = existingScans.reduce((sum, scan) => sum + scan.quantityDispatched, 0);

    const remaining = allocation.quantityUsed - alreadyDispatched;

    if (quantity > remaining) {
      throw new BadRequestException(
        `Cannot dispatch ${quantity}. Only ${remaining} remaining for this item.`,
      );
    }

    const saved = await this.dispatchScanRepo.create({
      jobCardId,
      companyId,
      stockItemId,
      allocationId: allocation.id,
      quantityDispatched: quantity,
      scannedById: user.id,
      scannedByName: user.name,
      dispatchNotes: notes ?? null,
    });

    this.logger.log(
      `Dispatched ${quantity} of item ${stockItemId} for job card ${jobCardId} by ${user.name}`,
    );

    return saved;
  }

  async dispatchProgress(companyId: number, jobCardId: number): Promise<DispatchProgress> {
    const allocations = await this.allocationRepo.findForJobCardWithStockItem(companyId, jobCardId);

    const scans = await this.dispatchScanRepo.findForJobCard(jobCardId, companyId);

    const scansByItem = scans.reduce(
      (acc, scan) => {
        acc[scan.stockItemId] = (acc[scan.stockItemId] || 0) + scan.quantityDispatched;
        return acc;
      },
      {} as Record<number, number>,
    );

    const items: AllocationSummary[] = allocations.map((allocation) => {
      const dispatchedQuantity = scansByItem[allocation.stockItemId] || 0;
      return {
        stockItemId: allocation.stockItemId,
        stockItem: allocation.stockItem,
        allocatedQuantity: allocation.quantityUsed,
        dispatchedQuantity,
        remainingQuantity: allocation.quantityUsed - dispatchedQuantity,
      };
    });

    const totalAllocated = items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    const totalDispatched = items.reduce((sum, item) => sum + item.dispatchedQuantity, 0);
    const isComplete = items.every((item) => item.remainingQuantity === 0);

    const cdnCount = await this.cdnRepo.count({ jobCardId, companyId });
    const photoCount = await this.loadPhotoRepo.count({ jobCardId, companyId });
    const hasCdn = cdnCount > 0;
    const hasLoadPhotos = photoCount > 0;
    const canComplete = hasCdn && hasLoadPhotos;

    return {
      totalAllocated,
      totalDispatched,
      isComplete,
      items,
      hasCdn,
      hasLoadPhotos,
      canComplete,
    };
  }

  async dispatchHistory(companyId: number, jobCardId: number): Promise<DispatchScan[]> {
    return this.dispatchScanRepo.findHistoryForJobCard(jobCardId, companyId);
  }

  async completeDispatch(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<JobCard> {
    const progress = await this.dispatchProgress(companyId, jobCardId);

    if (!progress.canComplete) {
      const missing: string[] = [];
      if (!progress.hasCdn) {
        missing.push("Customer Delivery Note (CDN)");
      }
      if (!progress.hasLoadPhotos) {
        missing.push("load photos");
      }
      throw new BadRequestException(`Cannot complete dispatch. Missing: ${missing.join(" and ")}.`);
    }

    const updateAffected = await this.jobCardRepo.updateWorkflowStatusIfMatches(
      jobCardId,
      companyId,
      "ready",
      "dispatched",
    );

    if (updateAffected === 0) {
      throw new ConflictException("Job card status has changed. Please refresh and try again.");
    }

    this.auditService
      .log({
        entityType: "job_card_dispatch",
        entityId: jobCardId,
        action: AuditAction.UPDATE,
        oldValues: { workflowStatus: "ready" },
        newValues: { workflowStatus: "dispatched", completedBy: user.name },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    this.logger.log(`Job card ${jobCardId} dispatch completed by ${user.name}`);

    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);
    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    return jobCard;
  }

  async reverseDispatchScan(
    companyId: number,
    scanId: number,
    user: { id: number; name: string },
  ): Promise<void> {
    const scan = await this.dispatchScanRepo.findOneForCompanyWithJobCard(scanId, companyId);

    if (!scan) {
      throw new NotFoundException(`Dispatch scan ${scanId} not found`);
    }

    if (scan.jobCard.workflowStatus === "dispatched") {
      throw new BadRequestException("Cannot reverse scans on a completed dispatch");
    }

    await this.dispatchScanRepo.removeForCompany(companyId, scan);

    this.logger.log(
      `Dispatch scan ${scanId} reversed by ${user.name} for job card ${scan.jobCardId}`,
    );

    this.auditService
      .log({
        entityType: "dispatch_scan",
        entityId: scanId,
        action: AuditAction.DELETE,
        oldValues: {
          jobCardId: scan.jobCardId,
          stockItemId: scan.stockItemId,
          quantity: scan.quantityDispatched,
        },
        newValues: { reversedBy: user.name },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));
  }

  async scanByQrToken(
    companyId: number,
    qrToken: string,
  ): Promise<{ type: "job_card" | "stock_item"; id: number }> {
    const jobCard = await this.jobCardRepo.findByQrToken(companyId, qrToken);

    if (jobCard) {
      return { type: "job_card", id: jobCard.id };
    }

    const stockItem = await this.stockItemRepo.findOneByQrTokenForCompany(companyId, qrToken);

    if (stockItem) {
      return { type: "stock_item", id: stockItem.id };
    }

    throw new NotFoundException(`No job card or stock item found for QR token: ${qrToken}`);
  }
}
