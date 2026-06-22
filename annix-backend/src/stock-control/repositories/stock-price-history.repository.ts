import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockPriceHistory } from "../entities/stock-price-history.entity";

export abstract class StockPriceHistoryRepository extends TenantScopedRepository<StockPriceHistory> {
  abstract withTransaction(context: TransactionContext): StockPriceHistoryRepository;
  abstract saveForCompany(companyId: number, entity: StockPriceHistory): Promise<StockPriceHistory>;
  abstract removeForCompany(companyId: number, entity: StockPriceHistory): Promise<void>;
  abstract build(data: DeepPartial<StockPriceHistory>): StockPriceHistory;
  abstract findForItemRecent(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<StockPriceHistory[]>;
  abstract findForItemOrdered(companyId: number, stockItemId: number): Promise<StockPriceHistory[]>;
  abstract recentChangesForCompany(companyId: number, limit: number): Promise<StockPriceHistory[]>;
}
