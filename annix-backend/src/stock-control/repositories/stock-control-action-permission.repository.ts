import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";

export abstract class StockControlActionPermissionRepository extends TenantScopedRepository<StockControlActionPermission> {
  abstract withTransaction(context: TransactionContext): StockControlActionPermissionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlActionPermission,
  ): Promise<StockControlActionPermission>;
  abstract removeForCompany(companyId: number, entity: StockControlActionPermission): Promise<void>;
  abstract findForCompany(companyId: number): Promise<StockControlActionPermission[]>;
}
