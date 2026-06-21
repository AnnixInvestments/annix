import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { now } from "../../lib/datetime";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { PaginatedResponse } from "../../shared/dto/api-response.dto";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardJobFileRepository } from "../repositories/job-card-job-file.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { ReconciliationDocumentRepository } from "../repositories/reconciliation-document.repository";
import { ReconciliationItemRepository } from "../repositories/reconciliation-item.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockMovementRepository } from "../repositories/stock-movement.repository";
import { StockReturnRepository } from "../repositories/stock-return.repository";
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
    private readonly lineItemRepo: JobCardLineItemRepository,
    private readonly stockItemRepo: StockItemRepository,
    private readonly stockMovementRepo: StockMovementRepository,
    private readonly stockReturnRepo: StockReturnRepository,
    private readonly reconciliationItemRepo: ReconciliationItemRepository,
    private readonly reconciliationDocumentRepo: ReconciliationDocumentRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => RequisitionService))
    private readonly requisitionService: RequisitionService,
    @Inject(forwardRef(() => WorkflowNotificationService))
    private readonly notificationService: WorkflowNotificationService,
    private readonly auditService: AuditService,
    private readonly txRunner: TransactionRunner,
  ) {}

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
    const removeAllWhere = async (
      repo: {
        findManyWhere(criteria: Record<string, unknown>): Promise<{ id: number }[]>;
        remove(entity: { id: number }): Promise<void>;
      },
      criteria: Record<string, unknown>,
    ) => {
      const rows = await repo.findManyWhere(criteria);
      await rows.reduce(async (prev, row) => {
        await prev;
        await repo.remove(row);
      }, Promise.resolve());
    };

    await removeAllWhere(this.stockReturnRepo, { jobCardId: numericId, companyId });
    await removeAllWhere(this.allocationRepo, { jobCardId: numericId, companyId });
    await removeAllWhere(this.reconciliationItemRepo, { jobCardId: numericId, companyId });
    await removeAllWhere(this.reconciliationDocumentRepo, { jobCardId: numericId, companyId });
    await this.lineItemRepo.deleteForJobCard(numericId);
    await this.jobCardRepo.remove(jobCard);
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
    userId?: number,
  ): Promise<StockAllocation> {
    const outcome = await (async () => {
      const { stockItem, jobCard } = await this.validateAllocationEntities(
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
        const saved = await this.createAllocationRecord({
          stockItem,
          jobCard,
          data,
          companyId,
          pendingApproval: true,
          allowedLitres: overAllocationCheck.allowedLitres,
        });

        return { saved, pendingApproval: true as const, stockItem, overAllocationCheck };
      }

      const saved = await this.txRunner.run(async (ctx) => {
        const stockItemTx = this.stockItemRepo.withTransaction(ctx);
        const decremented = await stockItemTx.decrementQuantityForCompany(
          stockItem.id,
          companyId,
          data.quantityUsed,
          true,
        );
        if (!decremented) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${data.quantityUsed}`,
          );
        }

        const allocation = await this.createAllocationRecord({
          stockItem,
          jobCard,
          data,
          companyId,
          pendingApproval: false,
          allowedLitres: overAllocationCheck.allowedLitres,
          ctx,
        });

        await this.stockMovementRepo.withTransaction(ctx).create({
          stockItemId: stockItem.id,
          movementType: MovementType.OUT,
          quantity: data.quantityUsed,
          referenceType: ReferenceType.ALLOCATION,
          referenceId: allocation.id,
          notes: `Allocated to job ${jobCard.jobNumber}`,
          createdBy: data.allocatedBy || null,
          companyId,
        });

        return allocation;
      });

      return { saved, pendingApproval: false as const, stockItem, overAllocationCheck };
    })();

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

    this.triggerPostAllocationSideEffects(
      companyId,
      outcome.stockItem,
      outcome.saved,
      data,
      userId,
    );

    return outcome.saved;
  }

  private async validateAllocationEntities(
    companyId: number,
    stockItemId: number,
    jobCardId: number,
    quantityUsed: number,
  ): Promise<{ stockItem: StockItem; jobCard: JobCard }> {
    const stockItem = await this.stockItemRepo.findOneForCompany(stockItemId, companyId);
    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);
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

  private async createAllocationRecord(params: {
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
    ctx?: TransactionContext;
  }): Promise<StockAllocation> {
    const allocationRepo = params.ctx
      ? this.allocationRepo.withTransaction(params.ctx)
      : this.allocationRepo;
    const saved = await allocationRepo.create({
      stockItemId: params.stockItem.id,
      jobCardId: params.jobCard.id,
      quantityUsed: params.data.quantityUsed,
      photoUrl: params.data.photoUrl || null,
      notes: params.data.notes || null,
      allocatedBy: params.data.allocatedBy || null,
      staffMemberId: params.data.staffMemberId || null,
      companyId: params.companyId,
      pendingApproval: params.pendingApproval,
      allowedLitres: params.allowedLitres ?? null,
    });
    saved.stockItem = params.stockItem;
    saved.jobCard = params.jobCard;
    return saved;
  }

  private triggerPostAllocationSideEffects(
    companyId: number,
    stockItem: StockItem,
    allocation: StockAllocation,
    data: { stockItemId: number; quantityUsed: number; jobCardId: number; allocatedBy?: string },
    userId?: number,
  ): void {
    this.evaluateReorderThreshold(companyId, stockItem.id).catch((err) =>
      this.logger.error(`Failed to create reorder requisition: ${err.message}`, err.stack),
    );

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: allocation.id,
        action: AuditAction.CREATE,
        newValues: {
          companyId,
          userId: userId ?? null,
          stockItemId: data.stockItemId,
          quantity: data.quantityUsed,
          jobCardId: data.jobCardId,
          allocatedBy: data.allocatedBy,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));
  }

  private async evaluateReorderThreshold(companyId: number, stockItemId: number): Promise<void> {
    const refreshed = await this.stockItemRepo.findOneForCompany(stockItemId, companyId);
    if (refreshed && refreshed.minStockLevel > 0 && refreshed.quantity < refreshed.minStockLevel) {
      await this.requisitionService.createReorderRequisition(companyId, stockItemId);
    }
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
    const { saved, stockItem } = await (async () => {
      const allocation = await this.allocationRepo.findOnePendingForCompany(
        allocationId,
        companyId,
      );

      if (!allocation) {
        throw new NotFoundException("Pending allocation not found");
      }

      const stockItem = await this.stockItemRepo.findOneForCompany(
        Number(allocation.stockItemId),
        companyId,
      );

      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }

      if (stockItem.quantity < allocation.quantityUsed) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${allocation.quantityUsed}`,
        );
      }

      const jobCard = await this.jobCardRepo.findOneForCompany(
        Number(allocation.jobCardId),
        companyId,
      );
      const jobLabel = jobCard ? jobCard.jobNumber : allocation.jobCardId;

      const saved = await this.txRunner.run(async (ctx) => {
        const decremented = await this.stockItemRepo
          .withTransaction(ctx)
          .decrementQuantityForCompany(stockItem.id, companyId, allocation.quantityUsed, true);
        if (!decremented) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${allocation.quantityUsed}`,
          );
        }

        allocation.pendingApproval = false;
        allocation.approvedByManagerId = managerId;
        allocation.approvedAt = now().toJSDate();
        const persisted = await this.allocationRepo.withTransaction(ctx).save(allocation);

        await this.stockMovementRepo.withTransaction(ctx).create({
          stockItemId: stockItem.id,
          movementType: MovementType.OUT,
          quantity: allocation.quantityUsed,
          referenceType: ReferenceType.ALLOCATION,
          referenceId: persisted.id,
          notes: `Allocated to job ${jobLabel} (manager approved over-allocation)`,
          createdBy: allocation.allocatedBy || null,
          companyId,
        });

        return persisted;
      });

      return { saved, stockItem };
    })();

    this.evaluateReorderThreshold(companyId, stockItem.id).catch((err) =>
      this.logger.error(`Failed to create reorder requisition: ${err.message}`),
    );

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: saved.id,
        action: AuditAction.APPROVE,
        oldValues: { pendingApproval: true },
        newValues: {
          companyId,
          userId: managerId,
          pendingApproval: false,
          approvedByManagerId: managerId,
          stockItemId: stockItem.id,
          jobCardId: saved.jobCardId,
          quantity: saved.quantityUsed,
        },
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

    const stockItem = await this.stockItemRepo.findOneForCompany(
      Number(allocation.stockItemId),
      companyId,
    );

    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    await this.txRunner.run(async (ctx) => {
      await this.stockItemRepo
        .withTransaction(ctx)
        .incrementQuantityForCompany(stockItem.id, companyId, Number(allocation.quantityUsed));

      allocation.undone = true;
      allocation.undoneAt = now().toJSDate();
      allocation.undoneByName = user.name;
      await this.allocationRepo.withTransaction(ctx).save(allocation);

      await this.stockMovementRepo.withTransaction(ctx).create({
        stockItemId: stockItem.id,
        movementType: MovementType.IN,
        quantity: allocation.quantityUsed,
        referenceType: ReferenceType.ALLOCATION,
        referenceId: allocation.id,
        notes: `Undo allocation #${allocation.id} by ${user.name}`,
        createdBy: user.name,
        companyId,
      });
    });

    this.auditService
      .log({
        entityType: "stock_allocation",
        entityId: allocation.id,
        action: AuditAction.DELETE,
        oldValues: { stockItemId: allocation.stockItemId, quantity: allocation.quantityUsed },
        newValues: {
          companyId,
          userId: user.id,
          stockItemId: allocation.stockItemId,
          jobCardId: allocation.jobCardId,
          quantity: allocation.quantityUsed,
          undoneBy: user.name,
        },
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

      const refNum = (jc.reference || "").trim().toLowerCase();

      let key: string;
      if (jtNum) {
        // Delivery / JT-numbered cards keyed by JT (unchanged).
        key = `${pNum}|${jcNum}|jt:${jtNum}`;
      } else {
        // Plain job cards with no JT (e.g. re-imported the same .xls twice) escaped
        // dedup before. Key them by page AND reference — JT-split imports store the
        // JT base in `reference` with no jtDnNumber, so without the reference in the
        // key, distinct JT cards of one JC would merge and hide each other's items.
        // Skip CPO parents / delivery children to avoid orphaning.
        if (jc.cpoId || jc.parentJobCardId) return;
        key = `${pNum}|${jcNum}|page:${pageNum}|ref:${refNum}`;
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

      const ranked = await this.rankDuplicates(cards);
      const winner = ranked[0];

      const losers = ranked.slice(1);

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

  async deliveryChildCounts(
    companyId: number,
    parentJobCardIds: number[],
  ): Promise<Map<number, number>> {
    return this.jobCardRepo.countDeliveryChildrenForParents(companyId, parentJobCardIds);
  }

  // The survivor of a duplicate group must be the most complete card: one with line
  // items beats an empty one, then the furthest-progressed workflow wins (so an
  // in-flight approval is never superseded by a fresh re-imported draft), newest last.
  private async rankDuplicates(cards: JobCard[]): Promise<JobCard[]> {
    const WORKFLOW_RANK: Record<string, number> = {
      draft: 0,
      manager_approval: 1,
      admin_approval: 2,
      manager_final: 3,
      dispatched: 4,
    };

    const scored = await Promise.all(
      cards.map(async (card) => ({
        card,
        itemCount: await this.lineItemRepo.countForJobCard(card.id),
        workflowRank: WORKFLOW_RANK[card.workflowStatus] ?? 0,
      })),
    );

    return scored
      .sort((a, b) => {
        const aHasItems = a.itemCount > 0 ? 1 : 0;
        const bHasItems = b.itemCount > 0 ? 1 : 0;
        if (aHasItems !== bHasItems) return bHasItems - aHasItems;
        if (a.workflowRank !== b.workflowRank) return b.workflowRank - a.workflowRank;
        return b.card.id - a.card.id;
      })
      .map((entry) => entry.card);
  }
}
