import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockControlRbacConfig } from "../entities/stock-control-rbac-config.entity";

export abstract class StockControlRbacConfigRepository extends TenantScopedRepository<StockControlRbacConfig> {
  abstract withTransaction(context: TransactionContext): StockControlRbacConfigRepository;
  abstract saveForCompany(
    companyId: number,
    entity: StockControlRbacConfig,
  ): Promise<StockControlRbacConfig>;
  abstract removeForCompany(companyId: number, entity: StockControlRbacConfig): Promise<void>;
  abstract findForCompany(companyId: number): Promise<StockControlRbacConfig[]>;
}
