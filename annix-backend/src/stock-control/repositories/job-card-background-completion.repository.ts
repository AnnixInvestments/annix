import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";

export abstract class JobCardBackgroundCompletionRepository extends TenantScopedRepository<JobCardBackgroundCompletion> {
  abstract withTransaction(context: TransactionContext): JobCardBackgroundCompletionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: JobCardBackgroundCompletion,
  ): Promise<JobCardBackgroundCompletion>;
  abstract removeForCompany(companyId: number, entity: JobCardBackgroundCompletion): Promise<void>;
  abstract buildMany(
    rows: DeepPartial<JobCardBackgroundCompletion>[],
  ): JobCardBackgroundCompletion[];
  abstract findOneByJobCardAndStep(
    jobCardId: number,
    stepKey: string,
  ): Promise<JobCardBackgroundCompletion | null>;
  abstract findForJobCardAndCompany(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardBackgroundCompletion[]>;
  abstract findForJobCard(jobCardId: number): Promise<JobCardBackgroundCompletion[]>;
  abstract findForCompany(companyId: number): Promise<JobCardBackgroundCompletion[]>;
  abstract findForCompanyAndJobCardIds(
    companyId: number,
    jobCardIds: number[],
  ): Promise<JobCardBackgroundCompletion[]>;
  abstract saveMany(
    entities: JobCardBackgroundCompletion[],
  ): Promise<JobCardBackgroundCompletion[]>;
  abstract removeMany(entities: JobCardBackgroundCompletion[]): Promise<void>;
  abstract deleteByJobCardCompanyStep(
    jobCardId: number,
    companyId: number,
    stepKey: string,
  ): Promise<void>;
}
