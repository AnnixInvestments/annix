import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockTake, type StockTakeStatus } from "../entities/stock-take.entity";
import { StockTakeLine } from "../entities/stock-take-line.entity";
import {
  StockTakeVarianceCategory,
  type VarianceCategorySeverity,
} from "../entities/stock-take-variance-category.entity";

export interface CreateStockTakeInput {
  name: string;
  periodLabel?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  startedByStaffId?: number | null;
  notes?: string | null;
}

export interface RecordCountInput {
  productId: number;
  countedQty: number;
  countedByStaffId: number;
  varianceCategoryId?: number | null;
  varianceReason?: string | null;
  photoUrl?: string | null;
}

const HIGH_VALUE_DEFAULT_THRESHOLD = 10000;

@Injectable()
export class StockTakeService {
  private readonly logger = new Logger(StockTakeService.name);

  constructor(
    @InjectRepository(StockTake)
    private readonly stockTakeRepo: Repository<StockTake>,
    @InjectRepository(StockTakeLine)
    private readonly lineRepo: Repository<StockTakeLine>,
    @InjectRepository(StockTakeVarianceCategory)
    private readonly categoryRepo: Repository<StockTakeVarianceCategory>,
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    private readonly dataSource: DataSource,
  ) {}

  async createSession(companyId: number, input: CreateStockTakeInput): Promise<StockTake> {
    const stockTake = this.stockTakeRepo.create({
      companyId,
      name: input.name,
      periodLabel: input.periodLabel ?? null,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      status: "draft",
      startedByStaffId: input.startedByStaffId ?? null,
      notes: input.notes ?? null,
    });
    return this.stockTakeRepo.save(stockTake);
  }

  async captureSnapshot(companyId: number, stockTakeId: number): Promise<StockTake> {
    return this.dataSource.transaction(async (manager) => {
      const takeRepo = manager.getRepository(StockTake);
      const lineRepo = manager.getRepository(StockTakeLine);
      const productRepo = manager.getRepository(IssuableProduct);

      const stockTake = await takeRepo.findOne({ where: { id: stockTakeId, companyId } });
      if (!stockTake) {
        throw new NotFoundException(`Stock take ${stockTakeId} not found`);
      }
      if (stockTake.snapshotAt) {
        throw new BadRequestException(`Stock take ${stockTakeId} already has a snapshot`);
      }

      const products = await productRepo.find({ where: { companyId, active: true } });
      const lines = products.map((product) =>
        lineRepo.create({
          stockTakeId,
          companyId,
          productId: product.id,
          locationId: product.locationId,
          expectedQty: product.quantity,
          expectedCostPerUnit: product.costPerUnit,
          expectedValueR: product.quantity * product.costPerUnit,
          expectedAtSnapshot: product.quantity,
        }),
      );
      await lineRepo.save(lines);

      stockTake.snapshotAt = now().toJSDate();
      stockTake.status = "counting";
      stockTake.valuationBeforeR = lines.reduce((sum, line) => sum + line.expectedValueR, 0);
      return takeRepo.save(stockTake);
    });
  }

  async recordCount(
    companyId: number,
    stockTakeId: number,
    input: RecordCountInput,
  ): Promise<StockTakeLine> {
    const stockTake = await this.stockTakeRepo.findOne({
      where: { id: stockTakeId, companyId },
    });
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${stockTakeId} not found`);
    }
    if (stockTake.status !== "counting" && stockTake.status !== "draft") {
      throw new BadRequestException(
        `Stock take ${stockTakeId} is in status "${stockTake.status}" — cannot record counts`,
      );
    }
    const line = await this.lineRepo.findOne({
      where: { stockTakeId, productId: input.productId, companyId },
    });
    if (!line) {
      throw new NotFoundException(
        `Stock take line for product ${input.productId} not found in stock take ${stockTakeId}`,
      );
    }

    const product = await this.productRepo.findOne({
      where: { id: input.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found`);
    }

    line.countedQty = input.countedQty;
    line.countedAt = now().toJSDate();
    line.countedByStaffId = input.countedByStaffId;
    line.expectedAtCountTime = product.quantity;
    line.varianceQty = input.countedQty - line.expectedAtCountTime;
    line.varianceValueR = line.varianceQty * line.expectedCostPerUnit;
    if (input.varianceCategoryId !== undefined) {
      line.varianceCategoryId = input.varianceCategoryId;
    }
    if (input.varianceReason !== undefined) {
      line.varianceReason = input.varianceReason;
    }
    if (input.photoUrl !== undefined) {
      line.photoUrl = input.photoUrl;
    }
    return this.lineRepo.save(line);
  }

  async submitForApproval(
    companyId: number,
    stockTakeId: number,
    submittedByStaffId: number,
  ): Promise<StockTake> {
    const stockTake = await this.byId(companyId, stockTakeId);
    if (stockTake.status !== "counting" && stockTake.status !== "draft") {
      throw new BadRequestException(`Cannot submit stock take in status "${stockTake.status}"`);
    }
    const lines = await this.lineRepo.find({ where: { stockTakeId, companyId } });
    const photoMissing = lines.some(async (line) => {
      if (line.varianceCategoryId === null) return false;
      const cat = await this.categoryRepo.findOne({ where: { id: line.varianceCategoryId } });
      return cat?.requiresPhoto === true && !line.photoUrl;
    });
    if (await Promise.resolve(photoMissing)) {
      throw new BadRequestException("Some variance lines require a photo before submission");
    }

    const totalVariance = lines.reduce((sum, line) => sum + (line.varianceValueR ?? 0), 0);
    const totalVarianceAbs = lines.reduce(
      (sum, line) => sum + Math.abs(line.varianceValueR ?? 0),
      0,
    );
    stockTake.totalVarianceR = totalVariance;
    stockTake.totalVarianceAbsR = totalVarianceAbs;
    stockTake.requiresHighValueApproval = totalVarianceAbs > HIGH_VALUE_DEFAULT_THRESHOLD;
    stockTake.requiresEscalatedReview = await this.detectCriticalSeverity(lines);
    stockTake.status = "pending_approval";
    stockTake.submittedAt = now().toJSDate();
    stockTake.submittedByStaffId = submittedByStaffId;
    return this.stockTakeRepo.save(stockTake);
  }

  async approve(
    companyId: number,
    stockTakeId: number,
    approvedByStaffId: number,
    approverRole: string,
  ): Promise<StockTake> {
    const stockTake = await this.byId(companyId, stockTakeId);
    if (stockTake.status !== "pending_approval") {
      throw new BadRequestException(`Cannot approve stock take in status "${stockTake.status}"`);
    }
    stockTake.status = "approved";
    stockTake.approvedAt = now().toJSDate();
    stockTake.approvedByStaffId = approvedByStaffId;
    stockTake.approverRole = approverRole;
    return this.stockTakeRepo.save(stockTake);
  }

  async reject(
    companyId: number,
    stockTakeId: number,
    rejectedByStaffId: number,
    reason: string,
  ): Promise<StockTake> {
    const stockTake = await this.byId(companyId, stockTakeId);
    stockTake.status = "rejected";
    stockTake.rejectedAt = now().toJSDate();
    stockTake.rejectedByStaffId = rejectedByStaffId;
    stockTake.rejectionReason = reason;
    return this.stockTakeRepo.save(stockTake);
  }

  async post(companyId: number, stockTakeId: number, postedByStaffId: number): Promise<StockTake> {
    const stockTake = await this.byId(companyId, stockTakeId);
    if (stockTake.status !== "approved") {
      throw new BadRequestException(`Cannot post stock take in status "${stockTake.status}"`);
    }
    stockTake.status = "posted";
    stockTake.postedAt = now().toJSDate();
    stockTake.postedByStaffId = postedByStaffId;
    stockTake.valuationAfterR = (stockTake.valuationBeforeR ?? 0) + (stockTake.totalVarianceR ?? 0);
    return this.stockTakeRepo.save(stockTake);
  }

  async list(companyId: number, status?: StockTakeStatus): Promise<StockTake[]> {
    const where: { companyId: number; status?: StockTakeStatus } = { companyId };
    if (status) {
      where.status = status;
    }
    return this.stockTakeRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async byId(companyId: number, id: number): Promise<StockTake> {
    const stockTake = await this.stockTakeRepo.findOne({
      where: { id, companyId },
      relations: { lines: { product: true, varianceCategory: true } },
    });
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${id} not found`);
    }
    return stockTake;
  }

  private async detectCriticalSeverity(lines: StockTakeLine[]): Promise<boolean> {
    const categoryIds = lines
      .map((line) => line.varianceCategoryId)
      .filter((id): id is number => id !== null);
    if (categoryIds.length === 0) {
      return false;
    }
    const categories = await this.categoryRepo
      .createQueryBuilder("c")
      .where("c.id IN (:...ids)", { ids: categoryIds })
      .getMany();
    return categories.some((cat) => cat.severity === ("critical" as VarianceCategorySeverity));
  }
}
