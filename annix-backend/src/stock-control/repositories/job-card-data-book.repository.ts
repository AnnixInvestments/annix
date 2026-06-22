import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";

export abstract class JobCardDataBookRepository extends TenantScopedRepository<JobCardDataBook> {
  abstract withTransaction(context: TransactionContext): JobCardDataBookRepository;
  abstract saveForCompany(companyId: number, entity: JobCardDataBook): Promise<JobCardDataBook>;
  abstract removeForCompany(companyId: number, entity: JobCardDataBook): Promise<void>;
  abstract findLatestForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardDataBook | null>;
  abstract findForJobCardIds(companyId: number, jobCardIds: number[]): Promise<JobCardDataBook[]>;
}
