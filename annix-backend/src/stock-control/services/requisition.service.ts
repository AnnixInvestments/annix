import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { JobCardCoatingAnalysisRepository } from "../repositories/coating-analysis.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { RequisitionRepository } from "../repositories/requisition.repository";
import { RequisitionItemRepository } from "../repositories/requisition-item.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";

const DEFAULT_PACK_SIZE = 20;

@Injectable()
export class RequisitionService {
  private readonly logger = new Logger(RequisitionService.name);

  constructor(
    private readonly requisitionRepo: RequisitionRepository,
    private readonly itemRepo: RequisitionItemRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly analysisRepo: JobCardCoatingAnalysisRepository,
    private readonly stockItemRepo: StockItemRepository,
  ) {}

  async createFromJobCard(
    companyId: number,
    jobCardId: number,
    createdBy: string | null,
  ): Promise<Requisition | null> {
    const existing = await this.requisitionRepo.findActiveForJobCard(companyId, jobCardId);

    if (existing) {
      this.logger.log(`Requisition already exists for job card ${jobCardId}, skipping`);
      return existing;
    }

    const analysis = await this.analysisRepo.findOneForJobCard(companyId, jobCardId);

    if (!analysis || analysis.coats.length === 0) {
      this.logger.log(
        `No coating analysis or coats for job card ${jobCardId}, skipping requisition`,
      );
      return null;
    }

    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      this.logger.log(`Job card ${jobCardId} not found, skipping requisition`);
      return null;
    }

    const baseReqNumber = `REQ-${jobCard.jobNumber}`;
    const requisitionNumber = await this.nextRequisitionNumber(companyId, baseReqNumber);

    const saved = await this.requisitionRepo.create({
      requisitionNumber,
      jobCardId,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy,
    });

    const stockAssessmentMap = new Map(analysis.stockAssessment.map((sa) => [sa.product, sa]));

    const grouped = analysis.coats.reduce((acc, coat) => {
      const key = `${coat.product}::${coat.area || "external"}`;
      const existing = acc.get(key);
      if (existing) {
        existing.litresRequired += coat.litersRequired;
      } else {
        acc.set(key, {
          product: coat.product,
          area: coat.area,
          litresRequired: coat.litersRequired,
        });
      }
      return acc;
    }, new Map<string, { product: string; area: string; litresRequired: number }>());

    const items = this.itemRepo.buildMany(
      Array.from(grouped.values()).map((group) => {
        const assessment = stockAssessmentMap.get(group.product);
        const packSizeLitres = DEFAULT_PACK_SIZE;
        const packsToOrder = Math.ceil(group.litresRequired / packSizeLitres);

        return {
          requisitionId: saved.id,
          stockItemId: assessment?.stockItemId ?? null,
          productName: group.product,
          area: group.area,
          litresRequired: group.litresRequired,
          packSizeLitres,
          packsToOrder,
          companyId,
        };
      }),
    );

    await this.itemRepo.saveMany(items);

    this.logger.log(
      `Requisition ${saved.requisitionNumber} created with ${items.length} item(s) for job card ${jobCardId}`,
    );

    return this.findById(companyId, saved.id);
  }

  async createReorderRequisition(
    companyId: number,
    stockItemId: number,
  ): Promise<Requisition | null> {
    const stockItem = await this.stockItemRepo.findOneForCompany(stockItemId, companyId);

    if (!stockItem || stockItem.minStockLevel <= 0) {
      return null;
    }

    if (stockItem.quantity >= stockItem.minStockLevel) {
      return null;
    }

    const existing = await this.requisitionRepo.findActiveReorderByNumber(
      companyId,
      `REORDER-${stockItem.sku}`,
      RequisitionSource.REORDER,
    );

    if (existing) {
      this.logger.log(`Active reorder requisition already exists for ${stockItem.sku}, skipping`);
      return existing;
    }

    const deficit = stockItem.minStockLevel - stockItem.quantity;

    const baseReorderNumber = `REORDER-${stockItem.sku}`;
    const reorderNumber = await this.nextRequisitionNumber(companyId, baseReorderNumber);

    const saved = await this.requisitionRepo.create({
      requisitionNumber: reorderNumber,
      jobCardId: null,
      source: RequisitionSource.REORDER,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy: "System",
      notes: `Auto-generated: ${stockItem.name} (${stockItem.sku}) stock is ${stockItem.quantity}, below minimum level of ${stockItem.minStockLevel}. Deficit: ${deficit}.`,
    });

    await this.itemRepo.create({
      requisitionId: saved.id,
      stockItemId: stockItem.id,
      productName: stockItem.name,
      area: null,
      litresRequired: 0,
      packSizeLitres: 0,
      packsToOrder: 0,
      quantityRequired: deficit,
      companyId,
    });

    this.logger.log(
      `Reorder requisition REORDER-${stockItem.sku} created for ${stockItem.name} (deficit: ${deficit})`,
    );

    return this.findById(companyId, saved.id);
  }

  async findAll(companyId: number, page: number = 1, limit: number = 50): Promise<Requisition[]> {
    return this.requisitionRepo.findAllForCompanyPaginated(companyId, page, limit);
  }

  async findById(companyId: number, id: number): Promise<Requisition> {
    const requisition = await this.requisitionRepo.findOneForCompanyWithDetails(id, companyId);
    if (!requisition) {
      throw new NotFoundException("Requisition not found");
    }
    return requisition;
  }

  async findByJobCard(companyId: number, jobCardId: number): Promise<Requisition | null> {
    return this.requisitionRepo.findActiveForJobCardWithItems(companyId, jobCardId);
  }

  async updateItem(
    companyId: number,
    itemId: number,
    data: { packSizeLitres?: number; reorderQty?: number | null; reqNumber?: string | null },
  ): Promise<RequisitionItem> {
    const item = await this.itemRepo.findOneForCompanyWithStockItem(itemId, companyId);
    if (!item) {
      throw new NotFoundException("Requisition item not found");
    }

    if (data.packSizeLitres !== undefined) {
      item.packSizeLitres = data.packSizeLitres;
      item.packsToOrder = Math.ceil(Number(item.litresRequired) / data.packSizeLitres);
    }

    if (data.reorderQty !== undefined) {
      item.reorderQty = data.reorderQty;
      if (data.reorderQty !== null && data.reorderQty > 0) {
        item.packsToOrder = data.reorderQty;
      }
    }

    if (data.reqNumber !== undefined) {
      item.reqNumber = data.reqNumber;
    }

    return this.itemRepo.save(item);
  }

  async recordReceipt(
    companyId: number,
    requisitionId: number,
    itemId: number,
    quantityReceived: number,
    deliveryNoteId: number | null,
  ): Promise<RequisitionItem> {
    const item = await this.itemRepo.findOneForRequisition(itemId, requisitionId, companyId);

    if (!item) {
      throw new NotFoundException(`Requisition item ${itemId} not found`);
    }

    item.quantityReceived = (item.quantityReceived || 0) + quantityReceived;
    if (deliveryNoteId) {
      item.linkedDeliveryNoteId = deliveryNoteId;
    }

    await this.itemRepo.save(item);
    await this.recalculateRequisitionStatus(companyId, requisitionId);

    return item;
  }

  async recalculateRequisitionStatus(companyId: number, requisitionId: number): Promise<void> {
    const requisition = await this.requisitionRepo.findOneForCompanyWithItems(
      requisitionId,
      companyId,
    );

    if (!requisition) return;
    if (
      requisition.status === RequisitionStatus.CANCELLED ||
      requisition.status === RequisitionStatus.PENDING
    )
      return;

    const allFullyReceived = requisition.items.every((item) => {
      const required = item.quantityRequired ?? item.packsToOrder ?? 0;
      return required <= 0 || item.quantityReceived >= required;
    });

    const anyReceived = requisition.items.some((item) => item.quantityReceived > 0);

    if (allFullyReceived) {
      requisition.status = RequisitionStatus.RECEIVED;
    } else if (anyReceived) {
      requisition.status = RequisitionStatus.PARTIALLY_RECEIVED;
    }

    await this.requisitionRepo.save(requisition);
  }

  private async nextRequisitionNumber(companyId: number, base: string): Promise<string> {
    const conflict = await this.requisitionRepo.findByExactNumber(companyId, base);

    if (!conflict) {
      return base;
    }

    const count = await this.requisitionRepo.countByNumberPrefix(companyId, base);

    return `${base}-${count}`;
  }
}
