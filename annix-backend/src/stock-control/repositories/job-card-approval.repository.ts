import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ApprovalStatus, JobCardApproval } from "../entities/job-card-approval.entity";

export abstract class JobCardApprovalRepository extends CrudRepository<JobCardApproval> {
  abstract findForJobCardOrdered(companyId: number, jobCardId: number): Promise<JobCardApproval[]>;
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
