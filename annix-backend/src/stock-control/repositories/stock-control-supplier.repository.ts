import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";

export abstract class StockControlSupplierRepository extends TenantScopedRepository<StockControlSupplier> {
  abstract withTransaction(context: TransactionContext): StockControlSupplierRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlSupplier,
  ): Promise<StockControlSupplier>;
  abstract removeForCompany(companyId: number, entity: StockControlSupplier): Promise<void>;
  abstract build(data: DeepPartial<StockControlSupplier>): StockControlSupplier;
  abstract findAllForCompanyOrderedByName(companyId: number): Promise<StockControlSupplier[]>;
  abstract findAllForCompany(companyId: number): Promise<StockControlSupplier[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<StockControlSupplier | null>;
  abstract findOneForCompanyByNameCaseInsensitive(
    companyId: number,
    name: string,
  ): Promise<StockControlSupplier | null>;
}
