import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockReturn } from "../entities/stock-return.entity";

export abstract class StockReturnRepository extends TenantScopedRepository<StockReturn> {
  abstract withTransaction(context: TransactionContext): StockReturnRepository;
  abstract deleteByJobCardForCompany(companyId: number, jobCardId: number): Promise<void>;
}
