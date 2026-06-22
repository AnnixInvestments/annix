import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DispatchCdn } from "../entities/dispatch-cdn.entity";

export abstract class DispatchCdnRepository extends TenantScopedRepository<DispatchCdn> {
  abstract withTransaction(context: TransactionContext): DispatchCdnRepository;
  abstract saveForCompany(companyId: number, entity: DispatchCdn): Promise<DispatchCdn>;
  abstract removeForCompany(companyId: number, entity: DispatchCdn): Promise<void>;
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]>;
  abstract findOneForCompany(cdnId: number, companyId: number): Promise<DispatchCdn | null>;
  abstract updateById(cdnId: number, changes: DeepPartial<DispatchCdn>): Promise<void>;
}
