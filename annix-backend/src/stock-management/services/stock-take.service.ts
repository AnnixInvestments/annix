import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { StockTake, type StockTakeStatus } from "../entities/stock-take.entity";
import { StockTakeLine } from "../entities/stock-take-line.entity";
import type { VarianceCategorySeverity } from "../entities/stock-take-variance-category.entity";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockTakeRepository } from "../repositories/stock-take.repository";
import { StockTakeLineRepository } from "../repositories/stock-take-line.repository";
import { StockTakeVarianceCategoryRepository } from "../repositories/stock-take-variance-category.repository";

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
    private readonly stockTakeRepo: StockTakeRepository,
    private readonly lineRepo: StockTakeLineRepository,
    private readonly categoryRepo: StockTakeVarianceCategoryRepository,
    private readonly productRepo: IssuableProductRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async createSession(companyId: number, input: CreateStockTakeInput): Promise<StockTake> {
    const stockTake = this.stockTakeRepo.build({
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
    return this.txRunner.run(async (context) => {
      const takeRepo = this.stockTakeRepo.withTransaction(context);
      const lineRepo = this.lineRepo.withTransaction(context);
      const productRepo = this.productRepo.withTransaction(context);

      const stockTake = await takeRepo.findByIdForCompany(companyId, stockTakeId);
      if (!stockTake) {
        throw new NotFoundException(`Stock take ${stockTakeId} not found`);
      }
      if (stockTake.snapshotAt) {
        throw new BadRequestException(`Stock take ${stockTakeId} already has a snapshot`);
      }

      const products = await productRepo.findActiveForCompany(companyId);
      const lines = products.map((product) =>
        lineRepo.build({
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
      await lineRepo.saveMany(lines);

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
    const stockTake = await this.stockTakeRepo.findByIdForCompany(companyId, stockTakeId);
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${stockTakeId} not found`);
    }
    if (stockTake.status !== "counting" && stockTake.status !== "draft") {
      throw new BadRequestException(
        `Stock take ${stockTakeId} is in status "${stockTake.status}" — cannot record counts`,
      );
    }
    const line = await this.lineRepo.findOneForStockTake(stockTakeId, input.productId, companyId);
    if (!line) {
      throw new NotFoundException(
        `Stock take line for product ${input.productId} not found in stock take ${stockTakeId}`,
      );
    }

    const product = await this.productRepo.findByIdForCompany(companyId, input.productId);
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
    const lines = await this.lineRepo.findForStockTake(stockTakeId, companyId);
    const photoMissing = lines.some(async (line) => {
      if (line.varianceCategoryId === null) return false;
      const cat = await this.categoryRepo.findById(line.varianceCategoryId);
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
    return this.stockTakeRepo.findForCompany(companyId, status);
  }

  async byId(companyId: number, id: number): Promise<StockTake> {
    const stockTake = await this.stockTakeRepo.findByIdForCompanyWithLines(companyId, id);
    if (!stockTake) {
      throw new NotFoundException(`Stock take ${id} not found`);
    }
    return stockTake;
  }

  async varianceArchive(
    companyId: number,
    options: { sinceMonths?: number } = {},
  ): Promise<
    Array<{
      productId: number;
      productSku: string;
      productName: string;
      stockTakeCount: number;
      shortageCount: number;
      overageCount: number;
      totalVarianceQty: number;
      totalVarianceValueR: number;
      lastSeenAt: string | null;
    }>
  > {
    const monthsBack = options.sinceMonths ?? 12;
    return this.lineRepo.varianceArchive(companyId, monthsBack);
  }

  private async detectCriticalSeverity(lines: StockTakeLine[]): Promise<boolean> {
    const categoryIds = lines
      .map((line) => line.varianceCategoryId)
      .filter((id): id is number => id !== null);
    if (categoryIds.length === 0) {
      return false;
    }
    const categories = await this.categoryRepo.findByIds(categoryIds);
    return categories.some((cat) => cat.severity === ("critical" as VarianceCategorySeverity));
  }
}
