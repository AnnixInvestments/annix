import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockTakeLine } from "../entities/stock-take-line.entity";

export interface VarianceArchiveRow {
  productId: number;
  productSku: string;
  productName: string;
  stockTakeCount: number;
  shortageCount: number;
  overageCount: number;
  totalVarianceQty: number;
  totalVarianceValueR: number;
  lastSeenAt: string | null;
}

export abstract class StockTakeLineRepository extends CrudRepository<StockTakeLine> {
  abstract build(data: DeepPartial<StockTakeLine>): StockTakeLine;
  abstract withTransaction(context: TransactionContext): StockTakeLineRepository;
  abstract saveMany(lines: StockTakeLine[]): Promise<StockTakeLine[]>;
  abstract findOneForStockTake(
    stockTakeId: number,
    productId: number,
    companyId: number,
  ): Promise<StockTakeLine | null>;
  abstract findForStockTake(stockTakeId: number, companyId: number): Promise<StockTakeLine[]>;
  abstract varianceArchive(companyId: number, monthsBack: number): Promise<VarianceArchiveRow[]>;
}
