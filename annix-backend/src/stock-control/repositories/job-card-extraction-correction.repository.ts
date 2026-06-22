import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";

export abstract class JobCardExtractionCorrectionRepository extends TenantScopedRepository<JobCardExtractionCorrection> {
  abstract withTransaction(context: TransactionContext): JobCardExtractionCorrectionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: JobCardExtractionCorrection,
  ): Promise<JobCardExtractionCorrection>;
  abstract removeForCompany(companyId: number, entity: JobCardExtractionCorrection): Promise<void>;
  abstract findForJobCardOrdered(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardExtractionCorrection[]>;
  abstract findRecentForCustomer(
    companyId: number,
    customerName: string,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]>;
  abstract findRecentForCompany(
    companyId: number,
    limit: number,
  ): Promise<JobCardExtractionCorrection[]>;
}
