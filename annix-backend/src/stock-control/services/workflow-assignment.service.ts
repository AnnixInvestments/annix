import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { WorkflowStep } from "../entities/job-card-approval.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";

export interface StepAssignment {
  step: WorkflowStep;
  userIds: number[];
  primaryUserId: number | null;
  users: { id: number; name: string; email: string; role: StockControlRole }[];
}

@Injectable()
export class WorkflowAssignmentService {
  private readonly logger = new Logger(WorkflowAssignmentService.name);

  constructor(
    @InjectRepository(WorkflowStepAssignment)
    private readonly assignmentRepo: Repository<WorkflowStepAssignment>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
  ) {}

  async allAssignments(companyId: number): Promise<StepAssignment[]> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId },
      relations: ["user"],
      order: { workflowStep: "ASC", isPrimary: "DESC" },
    });

    const stepGroups = assignments.reduce(
      (acc, assignment) => {
        const step = assignment.workflowStep;
        if (!acc[step]) {
          acc[step] = { userIds: [], primaryUserId: null, users: [] };
        }
        acc[step].userIds.push(assignment.userId);
        acc[step].users.push({
          id: assignment.user.id,
          name: assignment.user.name,
          email: assignment.user.email,
          role: assignment.user.role,
        });
        if (assignment.isPrimary) {
          acc[step].primaryUserId = assignment.userId;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          userIds: number[];
          primaryUserId: number | null;
          users: { id: number; name: string; email: string; role: StockControlRole }[];
        }
      >,
    );

    return Object.values(WorkflowStep).map((step) => ({
      step,
      userIds: stepGroups[step]?.userIds || [],
      primaryUserId: stepGroups[step]?.primaryUserId || null,
      users: stepGroups[step]?.users || [],
    }));
  }

  async assignmentsForStep(
    companyId: number,
    step: WorkflowStep,
  ): Promise<WorkflowStepAssignment[]> {
    return this.assignmentRepo.find({
      where: { companyId, workflowStep: step },
      relations: ["user"],
      order: { isPrimary: "DESC" },
    });
  }

  async updateAssignments(
    companyId: number,
    step: WorkflowStep,
    userIds: number[],
    primaryUserId?: number,
  ): Promise<void> {
    await this.assignmentRepo.delete({ companyId, workflowStep: step });

    if (userIds.length === 0) {
      return;
    }

    const assignments = userIds.map((userId) =>
      this.assignmentRepo.create({
        companyId,
        workflowStep: step,
        userId,
        isPrimary: primaryUserId === userId,
      }),
    );

    await this.assignmentRepo.save(assignments);
    this.logger.log(`Updated ${step} assignments for company ${companyId}: ${userIds.join(", ")}`);
  }

  async usersForStep(companyId: number, step: WorkflowStep): Promise<StockControlUser[]> {
    const assignments = await this.assignmentsForStep(companyId, step);

    if (assignments.length > 0) {
      return assignments.map((a) => a.user);
    }

    const fallbackRoles = this.rolesForStep(step);
    return this.userRepo.find({
      where: fallbackRoles.map((role) => ({ companyId, role })),
    });
  }

  async assignedUserIdsForStep(companyId: number, step: WorkflowStep): Promise<number[]> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId, workflowStep: step },
      select: ["userId"],
    });
    return assignments.map((a) => a.userId);
  }

  async hasExplicitAssignments(companyId: number, step: WorkflowStep): Promise<boolean> {
    const count = await this.assignmentRepo.count({
      where: { companyId, workflowStep: step },
    });
    return count > 0;
  }

  async eligibleUsersForStep(
    companyId: number,
    step: WorkflowStep,
  ): Promise<{ id: number; name: string; email: string; role: StockControlRole }[]> {
    const compatibleRoles = this.compatibleRolesForStep(step);

    const users = await this.userRepo.find({
      where: { companyId, role: In(compatibleRoles) },
      order: { name: "ASC" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }

  private rolesForStep(step: WorkflowStep): StockControlRole[] {
    const roleMap: Record<WorkflowStep, StockControlRole[]> = {
      [WorkflowStep.DOCUMENT_UPLOAD]: [StockControlRole.ACCOUNTS],
      [WorkflowStep.ADMIN_APPROVAL]: [StockControlRole.ADMIN],
      [WorkflowStep.MANAGER_APPROVAL]: [StockControlRole.MANAGER],
      [WorkflowStep.REQUISITION_SENT]: [StockControlRole.MANAGER],
      [WorkflowStep.STOCK_ALLOCATION]: [StockControlRole.STOREMAN],
      [WorkflowStep.MANAGER_FINAL]: [StockControlRole.MANAGER],
      [WorkflowStep.READY_FOR_DISPATCH]: [StockControlRole.STOREMAN],
      [WorkflowStep.DISPATCHED]: [StockControlRole.STOREMAN],
    };

    return roleMap[step] || [StockControlRole.ADMIN];
  }

  private compatibleRolesForStep(step: WorkflowStep): StockControlRole[] {
    const compatibleMap: Record<WorkflowStep, StockControlRole[]> = {
      [WorkflowStep.DOCUMENT_UPLOAD]: [
        StockControlRole.ACCOUNTS,
        StockControlRole.ADMIN,
        StockControlRole.MANAGER,
      ],
      [WorkflowStep.ADMIN_APPROVAL]: [StockControlRole.ADMIN],
      [WorkflowStep.MANAGER_APPROVAL]: [StockControlRole.MANAGER, StockControlRole.ADMIN],
      [WorkflowStep.REQUISITION_SENT]: [StockControlRole.MANAGER, StockControlRole.ADMIN],
      [WorkflowStep.STOCK_ALLOCATION]: [
        StockControlRole.STOREMAN,
        StockControlRole.MANAGER,
        StockControlRole.ADMIN,
      ],
      [WorkflowStep.MANAGER_FINAL]: [StockControlRole.MANAGER, StockControlRole.ADMIN],
      [WorkflowStep.READY_FOR_DISPATCH]: [
        StockControlRole.STOREMAN,
        StockControlRole.MANAGER,
        StockControlRole.ADMIN,
      ],
      [WorkflowStep.DISPATCHED]: [
        StockControlRole.STOREMAN,
        StockControlRole.MANAGER,
        StockControlRole.ADMIN,
      ],
    };

    return compatibleMap[step] || Object.values(StockControlRole);
  }
}
