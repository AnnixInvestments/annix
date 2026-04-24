import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IssuableProduct } from "../entities/issuable-product.entity";
import {
  StockMovementBatchConsumption,
  type StockMovementKind,
} from "../entities/stock-movement-batch-consumption.entity";
import {
  StockPurchaseBatch,
  type StockPurchaseBatchSourceType,
  type StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";

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
    @InjectRepository(StockPurchaseBatch)
    private readonly batchRepo: Repository<StockPurchaseBatch>,
    @InjectRepository(StockMovementBatchConsumption)
    private readonly consumptionRepo: Repository<StockMovementBatchConsumption>,
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    private readonly dataSource: DataSource,
  ) {}

  async createBatch(companyId: number, input: CreateBatchInput): Promise<StockPurchaseBatch> {
    if (input.quantityPurchased <= 0) {
      throw new BadRequestException("quantityPurchased must be greater than zero");
    }
    if (input.costPerUnit < 0) {
      throw new BadRequestException("costPerUnit cannot be negative");
    }
    const product = await this.productRepo.findOne({
      where: { id: input.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found for company ${companyId}`);
    }
    const batch = this.batchRepo.create({
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
    return this.dataSource.transaction(async (manager) =>
      this.consumeFifoInTransaction(manager, companyId, input),
    );
  }

  async consumeFifoInTransaction(
    manager: EntityManager,
    companyId: number,
    input: ConsumeFifoInput,
  ): Promise<ConsumeFifoResult> {
    const batchRepo = manager.getRepository(StockPurchaseBatch);
    const consumptionRepo = manager.getRepository(StockMovementBatchConsumption);

    const activeBatches = await batchRepo
      .createQueryBuilder("batch")
      .where("batch.company_id = :companyId", { companyId })
      .andWhere("batch.product_id = :productId", { productId: input.productId })
      .andWhere("batch.status = :status", { status: "active" })
      .andWhere("batch.quantity_remaining > 0")
      .orderBy("batch.received_at", "ASC")
      .addOrderBy("batch.id", "ASC")
      .setLock("pessimistic_write")
      .getMany();

    let remainingToConsume = input.quantity;
    const consumptions: StockMovementBatchConsumption[] = [];
    let totalCost = 0;

    for (const batch of activeBatches) {
      if (remainingToConsume <= 0) {
        break;
      }
      const consumeFromBatch = Math.min(batch.quantityRemaining, remainingToConsume);
      const consumptionCost = consumeFromBatch * batch.costPerUnit;

      const consumption = consumptionRepo.create({
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
      const product = await manager.getRepository(IssuableProduct).findOne({
        where: { id: input.productId, companyId },
        select: ["name", "sku"],
      });
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
    const rows = await this.batchRepo
      .createQueryBuilder("batch")
      .select("SUM(batch.quantity_remaining)::numeric", "total_quantity")
      .addSelect("SUM(batch.quantity_remaining * batch.cost_per_unit)::numeric", "total_value")
      .addSelect(
        "SUM(CASE WHEN batch.is_legacy_batch THEN batch.quantity_remaining ELSE 0 END)::numeric",
        "legacy_quantity",
      )
      .addSelect(
        "SUM(CASE WHEN batch.is_legacy_batch THEN batch.quantity_remaining * batch.cost_per_unit ELSE 0 END)::numeric",
        "legacy_value",
      )
      .addSelect("COUNT(batch.id)", "active_count")
      .where("batch.company_id = :companyId", { companyId })
      .andWhere("batch.product_id = :productId", { productId })
      .andWhere("batch.status = :status", { status: "active" })
      .getRawOne<{
        total_quantity: string | null;
        total_value: string | null;
        legacy_quantity: string | null;
        legacy_value: string | null;
        active_count: string | null;
      }>();

    const totalQuantity = Number(rows?.total_quantity ?? 0);
    const totalValueR = Number(rows?.total_value ?? 0);
    const legacyQuantity = Number(rows?.legacy_quantity ?? 0);
    const legacyValueR = Number(rows?.legacy_value ?? 0);
    return {
      productId,
      totalQuantity,
      totalValueR,
      legacyQuantity,
      legacyValueR,
      realFifoQuantity: totalQuantity - legacyQuantity,
      realFifoValueR: totalValueR - legacyValueR,
      activeBatchCount: Number(rows?.active_count ?? 0),
    };
  }

  async valuationForCompany(
    companyId: number,
  ): Promise<{ totalValueR: number; legacyValueR: number; activeBatchCount: number }> {
    const row = await this.batchRepo
      .createQueryBuilder("batch")
      .select("SUM(batch.quantity_remaining * batch.cost_per_unit)::numeric", "total_value")
      .addSelect(
        "SUM(CASE WHEN batch.is_legacy_batch THEN batch.quantity_remaining * batch.cost_per_unit ELSE 0 END)::numeric",
        "legacy_value",
      )
      .addSelect("COUNT(batch.id)", "active_count")
      .where("batch.company_id = :companyId", { companyId })
      .andWhere("batch.status = :status", { status: "active" })
      .getRawOne<{
        total_value: string | null;
        legacy_value: string | null;
        active_count: string | null;
      }>();
    return {
      totalValueR: Number(row?.total_value ?? 0),
      legacyValueR: Number(row?.legacy_value ?? 0),
      activeBatchCount: Number(row?.active_count ?? 0),
    };
  }

  async batchesForProduct(
    companyId: number,
    productId: number,
    status?: StockPurchaseBatchStatus,
  ): Promise<StockPurchaseBatch[]> {
    const where: {
      companyId: number;
      productId: number;
      status?: StockPurchaseBatchStatus;
    } = {
      companyId,
      productId,
    };
    if (status) {
      where.status = status;
    }
    return this.batchRepo.find({
      where,
      order: { receivedAt: "ASC", id: "ASC" },
    });
  }

  async consumptionHistory(
    companyId: number,
    productId: number,
    limit = 100,
  ): Promise<StockMovementBatchConsumption[]> {
    return this.consumptionRepo.find({
      where: { companyId, productId },
      order: { consumedAt: "DESC", id: "DESC" },
      take: limit,
      relations: { purchaseBatch: true },
    });
  }
}
