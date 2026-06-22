import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ReconciliationItem } from "../entities/reconciliation-item.entity";

export abstract class ReconciliationItemRepository extends TenantScopedRepository<ReconciliationItem> {
  abstract withTransaction(context: TransactionContext): ReconciliationItemRepository;
  abstract saveForCompany(
    companyId: number,
    entity: ReconciliationItem,
  ): Promise<ReconciliationItem>;
  abstract removeForCompany(companyId: number, entity: ReconciliationItem): Promise<void>;
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<ReconciliationItem[]>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationItem[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<ReconciliationItem | null>;
  abstract maxSortOrder(companyId: number, jobCardId: number): Promise<number>;
  abstract buildMany(rows: DeepPartial<ReconciliationItem>[]): ReconciliationItem[];
  abstract saveManyForCompany(
    companyId: number,
    entities: ReconciliationItem[],
  ): Promise<ReconciliationItem[]>;
}
