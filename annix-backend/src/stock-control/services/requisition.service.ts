import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Equal, Like, Not, Repository } from "typeorm";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { Requisition, RequisitionSource, RequisitionStatus } from "../entities/requisition.entity";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { StockItem } from "../entities/stock-item.entity";

const DEFAULT_PACK_SIZE = 20;

@Injectable()
export class RequisitionService {
  private readonly logger = new Logger(RequisitionService.name);

  constructor(
    @InjectRepository(Requisition)
    private readonly requisitionRepo: Repository<Requisition>,
    @InjectRepository(RequisitionItem)
    private readonly itemRepo: Repository<RequisitionItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly analysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
  ) {}

  async createFromJobCard(
    companyId: number,
    jobCardId: number,
    createdBy: string | null,
  ): Promise<Requisition | null> {
    const existing = await this.requisitionRepo.findOne({
      where: {
        jobCardId,
        companyId,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
    });

    if (existing) {
      this.logger.log(`Requisition already exists for job card ${jobCardId}, skipping`);
      return existing;
    }

    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis || analysis.coats.length === 0) {
      this.logger.log(
        `No coating analysis or coats for job card ${jobCardId}, skipping requisition`,
      );
      return null;
    }

    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      this.logger.log(`Job card ${jobCardId} not found, skipping requisition`);
      return null;
    }

    const baseReqNumber = `REQ-${jobCard.jobNumber}`;
    const requisitionNumber = await this.nextRequisitionNumber(companyId, baseReqNumber);

    const requisition = this.requisitionRepo.create({
      requisitionNumber,
      jobCardId,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy,
    });
    const saved = await this.requisitionRepo.save(requisition);

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

    const items = Array.from(grouped.values()).map((group) => {
      const assessment = stockAssessmentMap.get(group.product);
      const packSizeLitres = DEFAULT_PACK_SIZE;
      const packsToOrder = Math.ceil(group.litresRequired / packSizeLitres);

      return this.itemRepo.create({
        requisitionId: saved.id,
        stockItemId: assessment?.stockItemId ?? null,
        productName: group.product,
        area: group.area,
        litresRequired: group.litresRequired,
        packSizeLitres,
        packsToOrder,
        companyId,
      });
    });

    await this.itemRepo.save(items);

    this.logger.log(
      `Requisition ${saved.requisitionNumber} created with ${items.length} item(s) for job card ${jobCardId}`,
    );

    return this.findById(companyId, saved.id);
  }

  async createReorderRequisition(
    companyId: number,
    stockItemId: number,
  ): Promise<Requisition | null> {
    const stockItem = await this.stockItemRepo.findOne({
      where: { id: stockItemId, companyId },
    });

    if (!stockItem || stockItem.minStockLevel <= 0) {
      return null;
    }

    if (stockItem.quantity >= stockItem.minStockLevel) {
      return null;
    }

    const existing = await this.requisitionRepo.findOne({
      where: {
        requisitionNumber: `REORDER-${stockItem.sku}`,
        companyId,
        source: RequisitionSource.REORDER,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
    });

    if (existing) {
      this.logger.log(`Active reorder requisition already exists for ${stockItem.sku}, skipping`);
      return existing;
    }

    const deficit = stockItem.minStockLevel - stockItem.quantity;

    const baseReorderNumber = `REORDER-${stockItem.sku}`;
    const reorderNumber = await this.nextRequisitionNumber(companyId, baseReorderNumber);

    const requisition = this.requisitionRepo.create({
      requisitionNumber: reorderNumber,
      jobCardId: null,
      source: RequisitionSource.REORDER,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy: "System",
      notes: `Auto-generated: ${stockItem.name} (${stockItem.sku}) stock is ${stockItem.quantity}, below minimum level of ${stockItem.minStockLevel}. Deficit: ${deficit}.`,
    });
    const saved = await this.requisitionRepo.save(requisition);

    const item = this.itemRepo.create({
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
    await this.itemRepo.save(item);

    this.logger.log(
      `Reorder requisition REORDER-${stockItem.sku} created for ${stockItem.name} (deficit: ${deficit})`,
    );

    return this.findById(companyId, saved.id);
  }

  async findAll(companyId: number, page: number = 1, limit: number = 50): Promise<Requisition[]> {
    return this.requisitionRepo.find({
      where: { companyId },
      relations: ["jobCard", "items"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async findById(companyId: number, id: number): Promise<Requisition> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id, companyId },
      relations: ["jobCard", "items", "items.stockItem"],
    });
    if (!requisition) {
      throw new NotFoundException("Requisition not found");
    }
    return requisition;
  }

  async findByJobCard(companyId: number, jobCardId: number): Promise<Requisition | null> {
    return this.requisitionRepo.findOne({
      where: {
        jobCardId,
        companyId,
        status: Not(Equal(RequisitionStatus.CANCELLED)),
      },
      relations: ["items"],
    });
  }

  async updateItem(
    companyId: number,
    itemId: number,
    data: { packSizeLitres?: number; reorderQty?: number | null; reqNumber?: string | null },
  ): Promise<RequisitionItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, companyId },
      relations: ["stockItem"],
    });
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
    const item = await this.itemRepo.findOne({
      where: { id: itemId, requisitionId, companyId },
    });

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
    const requisition = await this.requisitionRepo.findOne({
      where: { id: requisitionId, companyId },
      relations: ["items"],
    });

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
    const conflict = await this.requisitionRepo.findOne({
      where: { companyId, requisitionNumber: base },
    });

    if (!conflict) {
      return base;
    }

    const count = await this.requisitionRepo.count({
      where: { companyId, requisitionNumber: Like(`${base}%`) },
    });

    return `${base}-${count}`;
  }
}
