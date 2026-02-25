import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Equal, Not, Repository } from "typeorm";
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

    const requisition = this.requisitionRepo.create({
      requisitionNumber: `REQ-${jobCard.jobNumber}`,
      jobCardId,
      companyId,
      status: RequisitionStatus.PENDING,
      createdBy,
    });
    const saved = await this.requisitionRepo.save(requisition);

    const stockAssessmentMap = new Map(analysis.stockAssessment.map((sa) => [sa.product, sa]));

    const items = analysis.coats.map((coat) => {
      const assessment = stockAssessmentMap.get(coat.product);
      const litresRequired = coat.litersRequired;
      const packSizeLitres = DEFAULT_PACK_SIZE;
      const packsToOrder = Math.ceil(litresRequired / packSizeLitres);

      return this.itemRepo.create({
        requisitionId: saved.id,
        stockItemId: assessment?.stockItemId ?? null,
        productName: coat.product,
        area: coat.area,
        litresRequired,
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

    const requisition = this.requisitionRepo.create({
      requisitionNumber: `REORDER-${stockItem.sku}`,
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

  async findAll(companyId: number): Promise<Requisition[]> {
    return this.requisitionRepo.find({
      where: { companyId },
      relations: ["jobCard", "items"],
      order: { createdAt: "DESC" },
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
    data: { packSizeLitres: number },
  ): Promise<RequisitionItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, companyId },
      relations: ["stockItem"],
    });
    if (!item) {
      throw new NotFoundException("Requisition item not found");
    }

    item.packSizeLitres = data.packSizeLitres;
    item.packsToOrder = Math.ceil(Number(item.litresRequired) / data.packSizeLitres);

    return this.itemRepo.save(item);
  }
}
