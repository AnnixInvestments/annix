import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import type {
  StockMovementBatchConsumption,
  StockMovementKind,
} from "../entities/stock-movement-batch-consumption.entity";
import type {
  StockPurchaseBatchSourceType,
  StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";
import { StockPurchaseBatch } from "../entities/stock-purchase-batch.entity";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { StockMovementBatchConsumptionRepository } from "../repositories/stock-movement-batch-consumption.repository";
import { StockPurchaseBatchRepository } from "../repositories/stock-purchase-batch.repository";

export interface CreateBatchInput {
  productId: number;
  sourceType: StockPurchaseBatchSourceType;
  sourceRefId?: number | null;
  supplierName?: string | null;
  supplierBatchRef?: string | null;
  quantityPurchased: number;
  costPerUnit: number;
  receivedAt?: Date;
  isLegacyBatch?: boolean;
  createdByStaffId?: number | null;
  notes?: string | null;
}

export interface ConsumeFifoInput {
  productId: number;
  movementKind: StockMovementKind;
  movementRefId?: number | null;
  quantity: number;
  consumedByStaffId?: number | null;
  notes?: string | null;
}

export interface ConsumeFifoResult {
  totalCostConsumedR: number;
  consumptions: StockMovementBatchConsumption[];
}

export interface ProductValuation {
  productId: number;
  totalQuantity: number;
  totalValueR: number;
  legacyQuantity: number;
  legacyValueR: number;
  realFifoQuantity: number;
  realFifoValueR: number;
  activeBatchCount: number;
}

@Injectable()
export class FifoBatchService {
  private readonly logger = new Logger(FifoBatchService.name);

  constructor(
    private readonly batchRepo: StockPurchaseBatchRepository,
    private readonly consumptionRepo: StockMovementBatchConsumptionRepository,
    private readonly productRepo: IssuableProductRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async createBatch(companyId: number, input: CreateBatchInput): Promise<StockPurchaseBatch> {
    if (input.quantityPurchased <= 0) {
      throw new BadRequestException("quantityPurchased must be greater than zero");
    }
    if (input.costPerUnit < 0) {
      throw new BadRequestException("costPerUnit cannot be negative");
    }
    const product = await this.productRepo.findByIdForCompany(companyId, input.productId);
    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found for company ${companyId}`);
    }
    const batch = this.batchRepo.build({
      companyId,
      productId: input.productId,
      sourceType: input.sourceType,
      sourceRefId: input.sourceRefId ?? null,
      supplierName: input.supplierName ?? null,
      supplierBatchRef: input.supplierBatchRef ?? null,
      quantityPurchased: input.quantityPurchased,
      quantityRemaining: input.quantityPurchased,
      costPerUnit: input.costPerUnit,
      totalCostR: input.quantityPurchased * input.costPerUnit,
      receivedAt: input.receivedAt ?? now().toJSDate(),
      status: "active",
      isLegacyBatch: input.isLegacyBatch ?? false,
      createdByStaffId: input.createdByStaffId ?? null,
      notes: input.notes ?? null,
    });
    return this.batchRepo.save(batch);
  }

  async consumeFifo(companyId: number, input: ConsumeFifoInput): Promise<ConsumeFifoResult> {
    if (input.quantity <= 0) {
      throw new BadRequestException("quantity must be greater than zero");
    }
    return this.txRunner.run((context) => this.consumeFifoInTransaction(context, companyId, input));
  }

  async consumeFifoInTransaction(
    context: TransactionContext,
    companyId: number,
    input: ConsumeFifoInput,
  ): Promise<ConsumeFifoResult> {
    const batchRepo = this.batchRepo.withTransaction(context);
    const consumptionRepo = this.consumptionRepo.withTransaction(context);
    const productRepo = this.productRepo.withTransaction(context);

    const activeBatches = await batchRepo.findActiveForProductLocked(companyId, input.productId);

    let remainingToConsume = input.quantity;
    const consumptions: StockMovementBatchConsumption[] = [];
    let totalCost = 0;

    for (const batch of activeBatches) {
      if (remainingToConsume <= 0) {
        break;
      }
      const consumeFromBatch = Math.min(batch.quantityRemaining, remainingToConsume);
      const consumptionCost = consumeFromBatch * batch.costPerUnit;

      const consumption = consumptionRepo.build({
        companyId,
        purchaseBatchId: batch.id,
        productId: input.productId,
        movementKind: input.movementKind,
        movementRefId: input.movementRefId ?? null,
        quantityConsumed: consumeFromBatch,
        costPerUnitAtConsumption: batch.costPerUnit,
        totalCostConsumedR: consumptionCost,
        consumedByStaffId: input.consumedByStaffId ?? null,
        notes: input.notes ?? null,
      });
      const savedConsumption = await consumptionRepo.save(consumption);
      consumptions.push(savedConsumption);

      batch.quantityRemaining -= consumeFromBatch;
      if (batch.quantityRemaining <= 0) {
        batch.quantityRemaining = 0;
        batch.status = "exhausted";
      }
      await batchRepo.save(batch);

      remainingToConsume -= consumeFromBatch;
      totalCost += consumptionCost;
    }

    if (remainingToConsume > 0) {
      const product = await productRepo.findNameSkuForProduct(companyId, input.productId);
      const productLabel = product
        ? `${product.name} (${product.sku})`
        : `product ${input.productId}`;
      const available = input.quantity - remainingToConsume;
      throw new BadRequestException(
        `${productLabel} is out of stock — requested ${input.quantity}, available ${available}. ` +
          "Record a delivery for this item (Supplier → Deliveries) or adjust the stock level before issuing.",
      );
    }

    return { totalCostConsumedR: totalCost, consumptions };
  }

  async valuationForProduct(companyId: number, productId: number): Promise<ProductValuation> {
    const totals = await this.batchRepo.valuationForProduct(companyId, productId);
    return {
      productId,
      totalQuantity: totals.totalQuantity,
      totalValueR: totals.totalValueR,
      legacyQuantity: totals.legacyQuantity,
      legacyValueR: totals.legacyValueR,
      realFifoQuantity: totals.totalQuantity - totals.legacyQuantity,
      realFifoValueR: totals.totalValueR - totals.legacyValueR,
      activeBatchCount: totals.activeBatchCount,
    };
  }

  async valuationForCompany(
    companyId: number,
  ): Promise<{ totalValueR: number; legacyValueR: number; activeBatchCount: number }> {
    return this.batchRepo.valuationForCompany(companyId);
  }

  async batchesForProduct(
    companyId: number,
    productId: number,
    status?: StockPurchaseBatchStatus,
  ): Promise<StockPurchaseBatch[]> {
    return this.batchRepo.findForProduct(companyId, productId, status);
  }

  async consumptionHistory(
    companyId: number,
    productId: number,
    limit = 100,
  ): Promise<StockMovementBatchConsumption[]> {
    return this.consumptionRepo.findHistoryForProduct(companyId, productId, limit);
  }
}
