import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";

export abstract class WorkflowStepAssignmentRepository extends CrudRepository<WorkflowStepAssignment> {
  abstract buildMany(rows: DeepPartial<WorkflowStepAssignment>[]): WorkflowStepAssignment[];
  abstract saveMany(entities: WorkflowStepAssignment[]): Promise<WorkflowStepAssignment[]>;
  abstract findForCompanyWithUser(companyId: number): Promise<WorkflowStepAssignment[]>;
  abstract findForStepWithUser(companyId: number, step: string): Promise<WorkflowStepAssignment[]>;
  abstract findOnePrimaryForStepWithSecondaryUser(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment | null>;
  abstract findUserIdsForStep(companyId: number, step: string): Promise<WorkflowStepAssignment[]>;
  abstract findForStepWithUserRelation(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment[]>;
  abstract countForStep(companyId: number, step: string): Promise<number>;
}
