import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardDocument } from "../entities/job-card-document.entity";

export abstract class JobCardDocumentRepository extends TenantScopedRepository<JobCardDocument> {
  abstract withTransaction(context: TransactionContext): JobCardDocumentRepository;
  abstract saveForCompany(companyId: number, entity: JobCardDocument): Promise<JobCardDocument>;
  abstract removeForCompany(companyId: number, entity: JobCardDocument): Promise<void>;
  abstract findFirstForJobCard(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardDocument | null>;
  abstract findForJobCardOrdered(jobCardId: number, companyId: number): Promise<JobCardDocument[]>;
  abstract findForJobCard(jobCardId: number, companyId: number): Promise<JobCardDocument[]>;
}
