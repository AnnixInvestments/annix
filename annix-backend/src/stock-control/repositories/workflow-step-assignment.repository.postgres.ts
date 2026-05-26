import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";
import { WorkflowStepAssignmentRepository } from "./workflow-step-assignment.repository";

@Injectable()
export class PostgresWorkflowStepAssignmentRepository
  extends TypeOrmCrudRepository<WorkflowStepAssignment>
  implements WorkflowStepAssignmentRepository
{
  constructor(
    @InjectRepository(WorkflowStepAssignment) repository: Repository<WorkflowStepAssignment>,
  ) {
    super(repository);
  }

  buildMany(rows: DeepPartial<WorkflowStepAssignment>[]): WorkflowStepAssignment[] {
    return this.repository.create(rows as TypeOrmDeepPartial<WorkflowStepAssignment>[]);
  }

  saveMany(entities: WorkflowStepAssignment[]): Promise<WorkflowStepAssignment[]> {
    return this.repository.save(entities);
  }

  findForCompanyWithUser(companyId: number): Promise<WorkflowStepAssignment[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["user"],
      order: { workflowStep: "ASC", isPrimary: "DESC" },
    });
  }

  findForStepWithUser(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    return this.repository.find({
      where: { companyId, workflowStep: step },
      relations: ["user"],
      order: { isPrimary: "DESC" },
    });
  }

  findOnePrimaryForStepWithSecondaryUser(
    companyId: number,
    step: string,
  ): Promise<WorkflowStepAssignment | null> {
    return this.repository.findOne({
      where: { companyId, workflowStep: step, isPrimary: true },
      relations: ["secondaryUser"],
    });
  }

  findUserIdsForStep(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    return this.repository.find({
      where: { companyId, workflowStep: step },
      select: ["userId"],
    });
  }

  findForStepWithUserRelation(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    return this.repository.find({
      where: { companyId, workflowStep: step },
      relations: ["user"],
    });
  }

  countForStep(companyId: number, step: string): Promise<number> {
    return this.repository.count({ where: { companyId, workflowStep: step } });
  }
}
