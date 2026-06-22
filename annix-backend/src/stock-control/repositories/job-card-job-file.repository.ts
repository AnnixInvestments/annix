import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";

export abstract class JobCardJobFileRepository extends TenantScopedRepository<JobCardJobFile> {
  abstract withTransaction(context: TransactionContext): JobCardJobFileRepository;
  abstract saveForCompany(companyId: number, entity: JobCardJobFile): Promise<JobCardJobFile>;
  abstract removeForCompany(companyId: number, entity: JobCardJobFile): Promise<void>;
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardJobFile[]>;
  abstract findOneForJobCard(
    id: number,
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardJobFile | null>;
  abstract findById(id: number): Promise<JobCardJobFile | null>;
  abstract updateById(id: number, changes: DeepPartial<JobCardJobFile>): Promise<void>;
  abstract countImageFiles(jobCardId: number, companyId: number): Promise<number>;
}
