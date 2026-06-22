import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../shared/dto/api-response.dto";
import { JobCard } from "../entities/job-card.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardJobFileRepository } from "../repositories/job-card-job-file.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { ReconciliationDocumentRepository } from "../repositories/reconciliation-document.repository";
import { ReconciliationItemRepository } from "../repositories/reconciliation-item.repository";
import { StockAllocationRepository } from "../repositories/stock-allocation.repository";
import { StockReturnRepository } from "../repositories/stock-return.repository";
import { JobCardAllocationService } from "./job-card-allocation.service";

@Injectable()
export class JobCardService {
  private readonly logger = new Logger(JobCardService.name);

  constructor(
    private readonly jobCardRepo: JobCardRepository,
    private readonly allocationRepo: StockAllocationRepository,
    private readonly jobFileRepo: JobCardJobFileRepository,
    private readonly lineItemRepo: JobCardLineItemRepository,
    private readonly stockReturnRepo: StockReturnRepository,
    private readonly reconciliationItemRepo: ReconciliationItemRepository,
    private readonly reconciliationDocumentRepo: ReconciliationDocumentRepository,
    private readonly allocationService: JobCardAllocationService,
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
    return this.jobCardRepo.saveForCompany(companyId, jobCard);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const numericId = Number(id);
    this.logger.log(`Attempting to delete job card ${numericId} for company ${companyId}`);
    const jobCard = await this.findById(companyId, numericId);
    this.logger.log(
      `Found job card ${jobCard.jobNumber} (id=${numericId}), proceeding with delete`,
    );
    await this.stockReturnRepo.deleteByJobCardForCompany(companyId, numericId);
    await this.allocationRepo.deleteByJobCardForCompany(companyId, numericId);

    const reconciliationItems = await this.reconciliationItemRepo.findForJobCard(
      companyId,
      numericId,
    );
    await reconciliationItems.reduce(async (prev, item) => {
      await prev;
      await this.reconciliationItemRepo.removeForCompany(companyId, item);
    }, Promise.resolve());

    const reconciliationDocuments = await this.reconciliationDocumentRepo.findForJobCard(
      companyId,
      numericId,
    );
    await reconciliationDocuments.reduce(async (prev, document) => {
      await prev;
      await this.reconciliationDocumentRepo.removeForCompany(companyId, document);
    }, Promise.resolve());

    await this.lineItemRepo.deleteForJobCard(numericId);
    await this.jobCardRepo.removeForCompany(companyId, jobCard);
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
    return this.allocationService.allocateStock(companyId, data, userId);
  }

  async approveOverAllocation(
    companyId: number,
    allocationId: number,
    managerId: number,
  ): Promise<StockAllocation> {
    return this.allocationService.approveOverAllocation(companyId, allocationId, managerId);
  }

  async rejectOverAllocation(
    companyId: number,
    allocationId: number,
    reason: string,
  ): Promise<StockAllocation> {
    return this.allocationService.rejectOverAllocation(companyId, allocationId, reason);
  }

  async pendingAllocations(companyId: number): Promise<StockAllocation[]> {
    return this.allocationService.pendingAllocations(companyId);
  }

  async offcutsUsedOnJobCard(companyId: number, jobCardId: number): Promise<StockAllocation[]> {
    return this.allocationService.offcutsUsedOnJobCard(companyId, jobCardId);
  }

  async allocationsByJobCard(
    companyId: number,
    jobCardId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<StockAllocation>> {
    return this.allocationService.allocationsByJobCard(companyId, jobCardId, page, limit);
  }

  async undoAllocation(
    companyId: number,
    allocationId: number,
    user: { id: number; name: string },
  ): Promise<StockAllocation> {
    return this.allocationService.undoAllocation(companyId, allocationId, user);
  }

  async uploadAllocationPhoto(
    companyId: number,
    allocationId: number,
    file: Express.Multer.File,
  ): Promise<StockAllocation> {
    return this.allocationService.uploadAllocationPhoto(companyId, allocationId, file);
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
        await this.jobCardRepo.saveForCompany(companyId, loser);
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
