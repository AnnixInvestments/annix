import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlActionPermission } from "../entities/stock-control-action-permission.entity";

export abstract class StockControlActionPermissionRepository extends CrudRepository<StockControlActionPermission> {
  abstract withTransaction(
    context: TransactionContext,
  ): CrudRepository<StockControlActionPermission>;
  abstract findForCompany(companyId: number): Promise<StockControlActionPermission[]>;
}
