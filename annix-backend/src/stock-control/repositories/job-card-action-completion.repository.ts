import { CrudRepository } from "../../lib/persistence/crud-repository";
import { JobCardActionCompletion } from "../entities/job-card-action-completion.entity";

export abstract class JobCardActionCompletionRepository extends CrudRepository<JobCardActionCompletion> {
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
