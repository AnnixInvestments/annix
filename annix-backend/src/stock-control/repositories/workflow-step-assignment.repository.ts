import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";

export abstract class WorkflowStepAssignmentRepository extends TenantScopedRepository<WorkflowStepAssignment> {
  abstract withTransaction(context: TransactionContext): WorkflowStepAssignmentRepository;
  abstract saveForCompany(
    companyId: number,
    entity: WorkflowStepAssignment,
  ): Promise<WorkflowStepAssignment>;
  abstract removeForCompany(companyId: number, entity: WorkflowStepAssignment): Promise<void>;
  abstract buildMany(rows: DeepPartial<WorkflowStepAssignment>[]): WorkflowStepAssignment[];
  abstract saveMany(entities: WorkflowStepAssignment[]): Promise<WorkflowStepAssignment[]>;
  abstract findForCompanyWithUser(companyId: number): Promise<WorkflowStepAssignment[]>;
  abstract findForStepWithUser(companyId: number, step: string): Promise<WorkflowStepAssignment[]>;
  abstract findOnePrimaryForStepWithSecondaryUser(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment | null>;
  abstract findUserIdsForStep(companyId: number, step: string): Promise<WorkflowStepAssignment[]>;
  abstract deleteForStep(companyId: number, step: string): Promise<void>;
  abstract findForStepWithUserRelation(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment[]>;
  abstract countForStep(companyId: number, step: string): Promise<number>;
  abstract deleteForUser(companyId: number, userId: number): Promise<void>;
}
