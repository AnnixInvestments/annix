import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";

export abstract class JobCardApprovalRepository extends TenantScopedRepository<JobCardApproval> {
  abstract withTransaction(context: TransactionContext): JobCardApprovalRepository;
  abstract saveForCompany(companyId: number, entity: JobCardApproval): Promise<JobCardApproval>;
  abstract removeForCompany(companyId: number, entity: JobCardApproval): Promise<void>;
  abstract findForJobCardOrdered(companyId: number, jobCardId: number): Promise<JobCardApproval[]>;
  abstract findApprovedStepsForJobCardIds(
    companyId: number,
    jobCardIds: number[],
  ): Promise<Array<{ jobCardId: number; step: string }>>;
  abstract findForJobCardWithApprovedBy(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardApproval[]>;
  abstract findLatestForStep(
    companyId: number,
    jobCardId: number,
    step: string,
  ): Promise<JobCardApproval | null>;
  abstract deleteForJobCard(companyId: number, jobCardId: number): Promise<void>;
  abstract countByStatus(companyId: number, status: ApprovalStatus): Promise<number>;
  abstract rejectPendingStep(
    jobCardId: number,
    step: string,
    changes: DeepPartial<JobCardApproval>,
  ): Promise<void>;
}
