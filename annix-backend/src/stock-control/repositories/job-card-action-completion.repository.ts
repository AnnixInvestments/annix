import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";

export abstract class JobCardActionCompletionRepository extends TenantScopedRepository<JobCardActionCompletion> {
  abstract withTransaction(context: TransactionContext): JobCardActionCompletionRepository;
  abstract saveForCompany(
    companyId: number,
    entity: JobCardActionCompletion,
  ): Promise<JobCardActionCompletion>;
  abstract removeForCompany(companyId: number, entity: JobCardActionCompletion): Promise<void>;
  abstract findOneForStepAction(
    jobCardId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null>;
  abstract findForJobCardOrdered(
    jobCardId: number,
    companyId: number,
  ): Promise<JobCardActionCompletion[]>;
  abstract findOneForJobCardStepAction(
    jobCardId: number,
    companyId: number,
    stepKey: string,
    actionType: string,
  ): Promise<JobCardActionCompletion | null>;
}
