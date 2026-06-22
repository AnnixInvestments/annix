import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardVersion } from "../entities/job-card-version.entity";

export abstract class JobCardVersionRepository extends TenantScopedRepository<JobCardVersion> {
  abstract withTransaction(context: TransactionContext): JobCardVersionRepository;
  abstract saveForCompany(companyId: number, entity: JobCardVersion): Promise<JobCardVersion>;
  abstract removeForCompany(companyId: number, entity: JobCardVersion): Promise<void>;
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardVersion[]>;
  abstract findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardVersion | null>;
}
