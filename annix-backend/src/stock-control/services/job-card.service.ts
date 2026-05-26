import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { type EntityManager } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { now } from "../../lib/datetime";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { PaginatedResponse } from "../../shared/dto/api-response.dto";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardJobFileRepository } from "../repositories/job-card-job-file.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { RequisitionService } from "./requisition.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

@Injectable()
export class JobCardService {
  private readonly logger = new Logger(JobCardService.name);

  constructor(
    private readonly jobCardRepo: JobCardRepository,
    private readonly allocationRepo: StockAllocationRepository,
    private readonly coatingAnalysisRepo: JobCardCoatingAnalysisRepository,
    private readonly jobFileRepo: JobCardJobFileRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    @Inject(forwardRef(() => WorkflowNotificationService))
    private readonly notificationService: WorkflowNotificationService,
    private readonly txRunner: TransactionRunner,
    private readonly auditService: AuditService,
  ) {}

  private transactionManager(context: TransactionContext) {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("JobCardService transactions require a TypeOrmTransactionContext");
    }
    return context.manager;
  }

  async create(companyId: number, data: Partial<JobCard>): Promise<JobCard> {
    return this.jobCardRepo.create({ ...data, companyId });
  }

  async findAll(
    companyId: number,
    status?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<JobCard[]> {
    const jobCards = await this.jobCardRepo.findForCompanyByListPage(
      companyId,
      status,
      page,
      limit,
    );

    const idsWithoutJtDn = jobCards.filter((jc) => !jc.jtDnNumber).map((jc) => jc.id);

    if (idsWithoutJtDn.length > 0) {
      const jtRows = await this.jobCardRepo.jtNumbersForJobCards(idsWithoutJtDn);

      const jtMap = new Map(jtRows.map((r) => [r.jobCardId, r.jtNumbers]));
      return jobCards.map((jc) => {
        if (!jc.jtDnNumber && jtMap.has(jc.id)) {
          return { ...jc, jtDnNumber: jtMap.get(jc.id) || null };
        }
        return jc;
      });
    }

    return jobCards;
  }

  async findById(companyId: number, id: number): Promise<JobCard> {
    const jobCard = await this.jobCardRepo.findOneForCompanyWithLineItems(id, companyId);
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    if (!jobCard.notes && jobCard.parentJobCardId) {
      const parent = await this.jobCardRepo.findOneForCompanySelectIdNotes(
        jobCard.parentJobCardId,
        companyId,
      );
      if (parent?.notes) {
        jobCard.notes = parent.notes;
      }
    }

    return jobCard;
  }

  async adjacentIds(
    companyId: number,
    id: number,
  ): Promise<{ previousId: number | null; nextId: number | null }> {
    const current = await this.jobCardRepo.findOneForCompanySelectId(id, companyId);
    if (!current) {
      throw new NotFoundException("Job card not found");
    }

    return this.jobCardRepo.adjacentIds(current.id, companyId);
  }

  async deliveryJobCards(companyId: number, parentJobCardId: number): Promise<JobCard[]> {
    return this.jobCardRepo.findDeliveryJobCards(companyId, parentJobCardId);
  }

  async update(companyId: number, id: number, data: Partial<JobCard>): Promise<JobCard> {
    const jobCard = await this.findById(companyId, id);
    Object.assign(jobCard, data);
    return this.jobCardRepo.save(jobCard);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const numericId = Number(id);
    this.logger.log(`Attempting to delete job card ${numericId} for company ${companyId}`);
    const jobCard = await this.findById(companyId, numericId);
    this.logger.log(
      `Found job card ${jobCard.jobNumber} (id=${numericId}), proceeding with delete`,
    );
    await this.txRunner.run(async (ctx) => {
      const em = this.transactionManager(ctx);
      await em.query("DELETE FROM stock_returns WHERE job_card_id = $1 AND company_id = $2", [
        numericId,
        companyId,
      ]);
      await em.query("DELETE FROM stock_allocations WHERE job_card_id = $1 AND company_id = $2", [
        numericId,
        companyId,
      ]);
      await em.query(
        "DELETE FROM reconciliation_items WHERE job_card_id = $1 AND company_id = $2",
        [numericId, companyId],
      );
      await em.query(
        "DELETE FROM reconciliation_documents WHERE job_card_id = $1 AND company_id = $2",
        [numericId, companyId],
      );
      await em.query("DELETE FROM job_cards WHERE id = $1 AND company_id = $2", [
        numericId,
        companyId,
      ]);
    });
    this.logger.log(`Successfully deleted job card ${numericId}`);
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
    const outcome = await this.txRunner.run(async (ctx) => {
      const manager = this.transactionManager(ctx);
      const { stockItem, jobCard } = await this.validateAllocationEntities(
        manager,
        companyId,
        data.stockItemId,
        data.jobCardId,
        data.quantityUsed,
      );

      const overAllocationCheck = await this.checkOverAllocation(
        companyId,
        data.jobCardId,
        stockItem,
        data.quantityUsed,
      );

      if (overAllocationCheck.requiresApproval) {
        const saved = await this.createAllocationRecord(manager, {
          stockItem,
          jobCard,
          data,
          companyId,
          pendingApproval: true,
          allowedLitres: overAllocationCheck.allowedLitres,
        });

        return { saved, pendingApproval: true as const, stockItem, overAllocationCheck };
      }

      stockItem.quantity = stockItem.quantity - data.quantityUsed;
      await manager.save(StockItem, stockItem);

      const saved = await this.createAllocationRecord(manager, {
        stockItem,
        jobCard,
        data,
        companyId,
        pendingApproval: false,
        allowedLitres: overAllocationCheck.allowedLitres,
      });

      const movement = manager.create(StockMovement, {
        stockItem,
        movementType: MovementType.OUT,
        quantity: data.quantityUsed,
        referenceType: ReferenceType.ALLOCATION,
        referenceId: saved.id,
        notes: `Allocated to job ${jobCard.jobNumber}`,
        createdBy: data.allocatedBy || null,
        companyId,
      });
      await manager.save(StockMovement, movement);

      return { saved, pendingApproval: false as const, stockItem, overAllocationCheck };
    });

    if (outcome.pendingApproval) {
      await this.notificationService.notifyOverAllocationApproval(
        companyId,
        data.jobCardId,
        outcome.saved.id,
        outcome.stockItem.name,
        data.quantityUsed,
        outcome.overAllocationCheck.allowedLitres ?? 0,
        outcome.overAllocationCheck.alreadyAllocated,
      );

      return outcome.saved;
    }

    this.triggerPostAllocationSideEffects(companyId, outcome.stockItem, outcome.saved, data);

    return outcome.saved;
  }

  private async validateAllocationEntities(
    manager: EntityManager,
    companyId: number,
    stockItemId: number,
    jobCardId: number,
    quantityUsed: number,
  ): Promise<{ stockItem: StockItem; jobCard: JobCard }> {
    const stockItem = await manager.findOne(StockItem, {
      where: { id: stockItemId, companyId },
      lock: { mode: "pessimistic_write" },
    });
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const jobCard = await manager.findOne(JobCard, {
      where: { id: jobCardId, companyId },
    });
    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    if (stockItem.quantity < quantityUsed) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${quantityUsed}`,
      );
    }

    return { stockItem, jobCard };
  }

  private async createAllocationRecord(
    manager: EntityManager,
    params: {
      stockItem: StockItem;
      jobCard: JobCard;
      data: {
        quantityUsed: number;
        photoUrl?: string;
        notes?: string;
        allocatedBy?: string;
        staffMemberId?: number;
      };
      companyId: number;
      pendingApproval: boolean;
      allowedLitres: number | null | undefined;
    },
  ): Promise<StockAllocation> {
    const allocation = manager.create(StockAllocation, {
      stockItem: params.stockItem,
      jobCard: params.jobCard,
      quantityUsed: params.data.quantityUsed,
      photoUrl: params.data.photoUrl || null,
      notes: params.data.notes || null,
      allocatedBy: params.data.allocatedBy || null,
      staffMemberId: params.data.staffMemberId || null,
      companyId: params.companyId,
      pendingApproval: params.pendingApproval,
      allowedLitres: params.allowedLitres,
    });
    return manager.save(StockAllocation, allocation);
  }

  private triggerPostAllocationSideEffects(
    companyId: number,
    stockItem: StockItem,
    allocation: StockAllocation,
    data: { stockItemId: number; quantityUsed: number; jobCardId: number; allocatedBy?: string },
  ): void {
    if (stockItem.minStockLevel > 0 && stockItem.quantity < stockItem.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, stockItem.id)
        .catch((err) =>
          this.logger.error(`Failed to create reorder requisition: ${err.message}`, err.stack),
        );
    }

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: allocation.id,
        action: AuditAction.CREATE,
        newValues: {
          stockItemId: data.stockItemId,
          quantity: data.quantityUsed,
          jobCardId: data.jobCardId,
          allocatedBy: data.allocatedBy,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));
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
    const coatingAnalysis = await this.coatingAnalysisRepo.findOneForJobCard(companyId, jobCardId);

    if (!coatingAnalysis?.coats || coatingAnalysis.coats.length === 0) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const matchingCoat = this.fuzzyMatchCoat(stockItem.name, coatingAnalysis.coats);
    if (!matchingCoat) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const existingAllocations = await this.allocationRepo.findActiveExistingByJobAndStockItem(
      companyId,
      jobCardId,
      stockItem.id,
    );

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
    const { saved, stockItem } = await this.txRunner.run(async (ctx) => {
      const manager = this.transactionManager(ctx);
      const allocation = await manager.findOne(StockAllocation, {
        where: { id: allocationId, companyId, pendingApproval: true },
        relations: ["stockItem", "jobCard"],
      });

      if (!allocation) {
        throw new NotFoundException("Pending allocation not found");
      }

      const stockItem = await manager.findOne(StockItem, {
        where: { id: allocation.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }

      if (stockItem.quantity < allocation.quantityUsed) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${allocation.quantityUsed}`,
        );
      }

      stockItem.quantity = stockItem.quantity - allocation.quantityUsed;
      await manager.save(StockItem, stockItem);

      allocation.pendingApproval = false;
      allocation.approvedByManagerId = managerId;
      allocation.approvedAt = now().toJSDate();
      const saved = await manager.save(StockAllocation, allocation);

      const movement = manager.create(StockMovement, {
        stockItem,
        movementType: MovementType.OUT,
        quantity: allocation.quantityUsed,
        referenceType: ReferenceType.ALLOCATION,
        referenceId: saved.id,
        notes: `Allocated to job ${allocation.jobCard.jobNumber} (manager approved over-allocation)`,
        createdBy: allocation.allocatedBy || null,
        companyId,
      });
      await manager.save(StockMovement, movement);

      return { saved, stockItem };
    });

    if (stockItem.minStockLevel > 0 && stockItem.quantity < stockItem.minStockLevel) {
      this.requisitionService
        .createReorderRequisition(companyId, stockItem.id)
        .catch((err) => this.logger.error(`Failed to create reorder requisition: ${err.message}`));
    }

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: saved.id,
        action: AuditAction.APPROVE,
        oldValues: { pendingApproval: true },
        newValues: { pendingApproval: false, approvedByManagerId: managerId },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    this.logger.log(`Over-allocation ${allocationId} approved by manager ${managerId}`);
    return saved;
  }

  async rejectOverAllocation(
    companyId: number,
    allocationId: number,
    reason: string,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOnePendingForCompany(allocationId, companyId);

    if (!allocation) {
      throw new NotFoundException("Pending allocation not found");
    }

    allocation.pendingApproval = false;
    allocation.rejectedAt = now().toJSDate();
    allocation.rejectionReason = reason;

    this.logger.log(`Over-allocation ${allocationId} rejected: ${reason}`);
    return this.allocationRepo.save(allocation);
  }

  async pendingAllocations(companyId: number): Promise<StockAllocation[]> {
    return this.allocationRepo.findPendingForCompany(companyId);
  }

  async offcutsUsedOnJobCard(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    const allocations = await this.allocationRepo.findForJobCardWithRelations(companyId, jobCardId);

    return allocations.filter((a) => a.stockItem?.isLeftover === true);
  }

  async allocationsByJobCard(
    companyId: number,
    jobCardId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<StockAllocation>> {
    const [data, total] = await this.allocationRepo.findForJobCardPaginated(
      companyId,
      jobCardId,
      page,
      limit,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async undoAllocation(
    companyId: number,
    allocationId: number,
    user: { id: number; name: string },
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOneForCompanyWithRelations(
      allocationId,
      companyId,
      ["stockItem", "jobCard"],
    );

    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found`);
    }

    if (allocation.undone) {
      throw new BadRequestException("This allocation has already been undone");
    }

    if (allocation.pendingApproval) {
      throw new BadRequestException("Cannot undo a pending allocation. Reject it instead.");
    }

    await this.txRunner.run(async (ctx) => {
      const manager = this.transactionManager(ctx);
      const stockItem = await manager.findOne(StockItem, {
        where: { id: allocation.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }

      stockItem.quantity = Number(stockItem.quantity) + Number(allocation.quantityUsed);
      await manager.save(StockItem, stockItem);

      allocation.undone = true;
      allocation.undoneAt = now().toJSDate();
      allocation.undoneByName = user.name;
      await manager.save(StockAllocation, allocation);

      const reverseMovement = manager.create(StockMovement, {
        stockItem: { id: stockItem.id },
        movementType: MovementType.IN,
        quantity: allocation.quantityUsed,
        referenceType: ReferenceType.ALLOCATION,
        referenceId: allocation.id,
        notes: `Undo allocation #${allocation.id} by ${user.name}`,
        createdBy: user.name,
        companyId,
      });
      await manager.save(StockMovement, reverseMovement);
    });

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: allocation.id,
        action: AuditAction.DELETE,
        oldValues: { stockItemId: allocation.stockItemId, quantity: allocation.quantityUsed },
        newValues: { undoneBy: user.name },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    return allocation;
  }

  async uploadAllocationPhoto(
    companyId: number,
    allocationId: number,
    file: Express.Multer.File,
  ): Promise<StockAllocation> {
    const allocation = await this.allocationRepo.findOneForCompanyWithRelations(
      allocationId,
      companyId,
      ["stockItem"],
    );
    if (!allocation) {
      throw new NotFoundException("Allocation not found");
    }
    const result = await this.storageService.upload(file, "stock-control/allocations");
    allocation.photoUrl = result.url;
    return this.allocationRepo.save(allocation);
  }

  async deduplicateJobCards(companyId: number): Promise<{ merged: number; groups: number }> {
    const allCards = await this.jobCardRepo.findActiveJobCardsWithDedupeFields(companyId);

    const groups = new Map<string, JobCard[]>();
    allCards.forEach((jc) => {
      const pNum = (jc.jobNumber || "").trim().toLowerCase();
      const jcNum = (jc.jcNumber || "").trim().toLowerCase();
      const jtNum = (jc.jtDnNumber || "").trim().toLowerCase();
      const pageNum = (jc.pageNumber || "").trim().toLowerCase();

      if (!pNum || !jcNum) return;

      let key: string;
      if (jtNum) {
        // Delivery / JT-numbered cards keyed by JT (unchanged).
        key = `${pNum}|${jcNum}|jt:${jtNum}`;
      } else {
        // Plain job cards with no JT (e.g. re-imported the same .xls twice) escaped
        // dedup before. Key them by page so different pages of one JC aren't merged but
        // exact re-imports are. Skip CPO parents / delivery children to avoid orphaning.
        if (jc.cpoId || jc.parentJobCardId) return;
        key = `${pNum}|${jcNum}|page:${pageNum}`;
      }

      const existing = groups.get(key) || [];
      groups.set(key, [...existing, jc]);
    });

    let mergedCount = 0;
    let groupCount = 0;

    const duplicateGroups = Array.from(groups.entries()).filter(
      ([_key, cards]) => cards.length > 1,
    );

    for (const [_key, cards] of duplicateGroups) {
      groupCount++;

      const winner = cards[0];

      const losers = cards.slice(1);

      for (const loser of losers) {
        const versionLabel = `V${loser.versionNumber} - ${loser.jobNumber}`;

        if (loser.sourceFilePath) {
          try {
            await this.jobFileRepo.create({
              jobCardId: winner.id,
              companyId,
              filePath: loser.sourceFilePath,
              originalFilename: loser.sourceFileName || `${versionLabel}.pdf`,
              aiGeneratedName: `Previous Version (${versionLabel})`,
              fileType: "pdf",
              mimeType: "application/pdf",
              fileSizeBytes: 0,
              uploadedByName: "System (deduplication)",
            });
          } catch (err) {
            this.logger.warn(
              `Failed to archive source file for JC #${loser.id}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }

        loser.supersededById = winner.id;
        await this.jobCardRepo.save(loser);
        mergedCount++;

        this.logger.log(`Job card #${loser.id} (${loser.jobNumber}) superseded by #${winner.id}`);
      }
    }

    this.logger.log(
      `Deduplication complete: ${mergedCount} job cards merged across ${groupCount} groups`,
    );

    return { merged: mergedCount, groups: groupCount };
  }
}
