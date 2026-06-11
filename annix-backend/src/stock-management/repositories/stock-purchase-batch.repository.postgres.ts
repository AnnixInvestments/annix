import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  StockPurchaseBatch,
  type StockPurchaseBatchSourceType,
  type StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";
import {
  type CompanyValuationTotals,
  type ProductValuationTotals,
  StockPurchaseBatchRepository,
} from "./stock-purchase-batch.repository";

@Injectable()
export class PostgresStockPurchaseBatchRepository
  extends TypeOrmCrudRepository<StockPurchaseBatch>
  implements StockPurchaseBatchRepository
{
  constructor(@InjectRepository(StockPurchaseBatch) repository: Repository<StockPurchaseBatch>) {
    super(repository);
  }

  build(data: DeepPartial<StockPurchaseBatch>): StockPurchaseBatch {
    return this.repository.create(data as TypeOrmDeepPartial<StockPurchaseBatch>);
  }

  withTransaction(context: TransactionContext): PostgresStockPurchaseBatchRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresStockPurchaseBatchRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresStockPurchaseBatchRepository(
      context.manager.getRepository(StockPurchaseBatch),
    );
  }

  findActiveForProductLocked(companyId: number, productId: number): Promise<StockPurchaseBatch[]> {
    return this.repository
      .createQueryBuilder("batch")
      .where("batch.company_id = :companyId", { companyId })
      .andWhere("batch.product_id = :productId", { productId })
      .andWhere("batch.status = :status", { status: "active" })
      .andWhere("batch.quantity_remaining > 0")
      .orderBy("batch.received_at", "ASC")
      .addOrderBy("batch.id", "ASC")
      .setLock("pessimistic_write")
      .getMany();
  }

  async valuationForProduct(companyId: number, productId: number): Promise<ProductValuationTotals> {
    const rows = await this.repository
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

    return {
      totalQuantity: Number(rows?.total_quantity ?? 0),
      totalValueR: Number(rows?.total_value ?? 0),
      legacyQuantity: Number(rows?.legacy_quantity ?? 0),
      legacyValueR: Number(rows?.legacy_value ?? 0),
      activeBatchCount: Number(rows?.active_count ?? 0),
    };
  }

  async valuationForCompany(companyId: number): Promise<CompanyValuationTotals> {
    const row = await this.repository
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

  findForProduct(
    companyId: number,
    productId: number,
    status: StockPurchaseBatchStatus | undefined,
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
    return this.repository.find({
      where,
      order: { receivedAt: "ASC", id: "ASC" },
    });
  }

  findLegacyForProduct(companyId: number, productId: number): Promise<StockPurchaseBatch | null> {
    return this.repository.findOne({
      where: { companyId, productId, isLegacyBatch: true },
    });
  }

  findBySourceRefs(
    companyId: number,
    sourceType: StockPurchaseBatchSourceType,
    sourceRefIds: number[],
  ): Promise<StockPurchaseBatch[]> {
    if (sourceRefIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({
      where: { companyId, sourceType, sourceRefId: In(sourceRefIds) },
      order: { receivedAt: "ASC", id: "ASC" },
    });
  }
}
