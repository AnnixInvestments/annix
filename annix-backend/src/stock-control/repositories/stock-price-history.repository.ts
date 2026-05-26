import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { StockPriceHistory } from "../entities/stock-price-history.entity";

export abstract class StockPriceHistoryRepository extends CrudRepository<StockPriceHistory> {
  abstract build(data: DeepPartial<StockPriceHistory>): StockPriceHistory;
  abstract findForItemRecent(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<StockPriceHistory[]>;
  abstract findForItemOrdered(companyId: number, stockItemId: number): Promise<StockPriceHistory[]>;
  abstract recentChangesForCompany(companyId: number, limit: number): Promise<StockPriceHistory[]>;
}
