import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DashboardPreference } from "../entities/dashboard-preference.entity";

export abstract class DashboardPreferenceRepository extends TenantScopedRepository<DashboardPreference> {
  abstract withTransaction(context: TransactionContext): DashboardPreferenceRepository;
  abstract saveForCompany(
    companyId: number,
    entity: DashboardPreference,
  ): Promise<DashboardPreference>;
  abstract removeForCompany(companyId: number, entity: DashboardPreference): Promise<void>;
  abstract findOneForUser(companyId: number, userId: number): Promise<DashboardPreference | null>;
}
