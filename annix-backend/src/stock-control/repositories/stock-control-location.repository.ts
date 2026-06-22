import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlLocation } from "../entities/stock-control-location.entity";

export abstract class StockControlLocationRepository extends TenantScopedRepository<StockControlLocation> {
  abstract withTransaction(context: TransactionContext): StockControlLocationRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlLocation,
  ): Promise<StockControlLocation>;
  abstract removeForCompany(companyId: number, entity: StockControlLocation): Promise<void>;
  abstract findActiveForCompanyOrdered(companyId: number): Promise<StockControlLocation[]>;
  abstract findAllForCompanyOrdered(companyId: number): Promise<StockControlLocation[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlLocation | null>;
}
