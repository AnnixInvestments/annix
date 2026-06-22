import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ReconciliationEvent } from "../entities/reconciliation-event.entity";

export abstract class ReconciliationEventRepository extends TenantScopedRepository<ReconciliationEvent> {
  abstract withTransaction(context: TransactionContext): ReconciliationEventRepository;
  abstract saveForCompany(
    companyId: number,
    entity: ReconciliationEvent,
  ): Promise<ReconciliationEvent>;
  abstract removeForCompany(companyId: number, entity: ReconciliationEvent): Promise<void>;
  abstract findForItemsForCompany(
    companyId: number,
    itemIds: number[],
  ): Promise<ReconciliationEvent[]>;
}
