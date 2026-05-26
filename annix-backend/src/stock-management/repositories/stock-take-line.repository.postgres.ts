import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockTakeLine } from "../entities/stock-take-line.entity";
import { StockTakeLineRepository, type VarianceArchiveRow } from "./stock-take-line.repository";

@Injectable()
export class PostgresStockTakeLineRepository
  extends TypeOrmCrudRepository<StockTakeLine>
  implements StockTakeLineRepository
{
  constructor(@InjectRepository(StockTakeLine) repository: Repository<StockTakeLine>) {
    super(repository);
  }

  build(data: DeepPartial<StockTakeLine>): StockTakeLine {
    return this.repository.create(data as TypeOrmDeepPartial<StockTakeLine>);
  }

  withTransaction(context: TransactionContext): PostgresStockTakeLineRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error("PostgresStockTakeLineRepository requires a TypeOrmTransactionContext");
    }
    return new PostgresStockTakeLineRepository(context.manager.getRepository(StockTakeLine));
  }

  saveMany(lines: StockTakeLine[]): Promise<StockTakeLine[]> {
    return this.repository.save(lines);
  }

  findOneForStockTake(
    stockTakeId: number,
    productId: number,
    companyId: number,
  ): Promise<StockTakeLine | null> {
    return this.repository.findOne({
      where: { stockTakeId, productId, companyId },
    });
  }

  findForStockTake(stockTakeId: number, companyId: number): Promise<StockTakeLine[]> {
    return this.repository.find({ where: { stockTakeId, companyId } });
  }

  async varianceArchive(companyId: number, monthsBack: number): Promise<VarianceArchiveRow[]> {
    const rows = await this.repository
      .createQueryBuilder("line")
      .innerJoin("line.stockTake", "st")
      .innerJoin("line.product", "product")
      .select("line.product_id", "product_id")
      .addSelect("product.sku", "product_sku")
      .addSelect("product.name", "product_name")
      .addSelect("COUNT(DISTINCT line.stock_take_id)", "stock_take_count")
      .addSelect("COUNT(CASE WHEN line.variance_qty < 0 THEN 1 END)", "shortage_count")
      .addSelect("COUNT(CASE WHEN line.variance_qty > 0 THEN 1 END)", "overage_count")
      .addSelect("SUM(COALESCE(line.variance_qty, 0))", "total_variance_qty")
      .addSelect("SUM(COALESCE(line.variance_value_r, 0))", "total_variance_value_r")
      .addSelect("MAX(line.created_at)", "last_seen_at")
      .where("line.company_id = :companyId", { companyId })
      .andWhere("line.variance_qty IS NOT NULL")
      .andWhere("line.variance_qty != 0")
      .andWhere("st.status IN ('approved', 'posted', 'archived')")
      .andWhere(`st.created_at > NOW() - (INTERVAL '1 month' * :monthsBack)`, { monthsBack })
      .groupBy("line.product_id")
      .addGroupBy("product.sku")
      .addGroupBy("product.name")
      .orderBy("ABS(SUM(COALESCE(line.variance_value_r, 0)))", "DESC")
      .limit(100)
      .getRawMany<{
        product_id: number;
        product_sku: string;
        product_name: string;
        stock_take_count: string;
        shortage_count: string;
        overage_count: string;
        total_variance_qty: string;
        total_variance_value_r: string;
        last_seen_at: string;
      }>();
    return rows.map((row) => ({
      productId: Number(row.product_id),
      productSku: row.product_sku,
      productName: row.product_name,
      stockTakeCount: Number(row.stock_take_count),
      shortageCount: Number(row.shortage_count),
      overageCount: Number(row.overage_count),
      totalVarianceQty: Number(row.total_variance_qty),
      totalVarianceValueR: Number(row.total_variance_value_r),
      lastSeenAt: row.last_seen_at,
    }));
  }
}
