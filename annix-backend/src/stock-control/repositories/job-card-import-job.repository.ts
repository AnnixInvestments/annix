import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardImportJob } from "../entities/job-card-import-job.entity";

export abstract class JobCardImportJobRepository extends TenantScopedRepository<JobCardImportJob> {
  abstract withTransaction(context: TransactionContext): JobCardImportJobRepository;
  abstract saveForCompany(companyId: number, entity: JobCardImportJob): Promise<JobCardImportJob>;
  abstract removeForCompany(companyId: number, entity: JobCardImportJob): Promise<void>;
  abstract findActiveForUser(
    companyId: number,
    createdByUserId: number | null,
  ): Promise<JobCardImportJob[]>;
  abstract findOneForCompany(id: number, companyId: number): Promise<JobCardImportJob | null>;
  abstract markStaleProcessingFailed(error: string): Promise<number>;
}
