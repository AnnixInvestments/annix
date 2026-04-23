import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowStepAssignment } from "../entities/workflow-step-assignment.entity";

export interface StepAssignment {
  step: string;
  userIds: number[];
  primaryUserId: number | null;
  secondaryUserId: number | null;
  users: { id: number; name: string; email: string; role: string }[];
}

export interface StepNotificationRecipients {
  step: string;
  emails: string[];
}

export interface UserLocationSummary {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  locationIds: number[];
}

@Injectable()
export class WorkflowAssignmentService {
  private readonly logger = new Logger(WorkflowAssignmentService.name);

  constructor(
    @InjectRepository(WorkflowStepAssignment)
    private readonly assignmentRepo: Repository<WorkflowStepAssignment>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(WorkflowNotificationRecipient)
    private readonly recipientRepo: Repository<WorkflowNotificationRecipient>,
    @InjectRepository(UserLocationAssignment)
    private readonly userLocationRepo: Repository<UserLocationAssignment>,
  ) {}

  async allAssignments(companyId: number): Promise<StepAssignment[]> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId },
      relations: ["user"],
      order: { workflowStep: "ASC", isPrimary: "DESC" },
    });

    const stepGroups = assignments.reduce(
      (acc, assignment) => {
        if (!assignment.user) return acc;
        const step = assignment.workflowStep;
        if (!acc[step]) {
          acc[step] = { userIds: [], primaryUserId: null, secondaryUserId: null, users: [] };
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
          acc[step].secondaryUserId = assignment.secondaryUserId ?? null;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          userIds: number[];
          primaryUserId: number | null;
          secondaryUserId: number | null;
          users: { id: number; name: string; email: string; role: string }[];
        }
      >,
    );

    return Object.keys(stepGroups).map((step) => ({
      step,
      userIds: stepGroups[step]?.userIds || [],
      primaryUserId: stepGroups[step]?.primaryUserId || null,
      secondaryUserId: stepGroups[step]?.secondaryUserId || null,
      users: stepGroups[step]?.users || [],
    }));
  }

  async assignmentsForStep(companyId: number, step: string): Promise<WorkflowStepAssignment[]> {
    return this.assignmentRepo.find({
      where: { companyId, workflowStep: step },
      relations: ["user"],
      order: { isPrimary: "DESC" },
    });
  }

  async updateAssignments(
    companyId: number,
    step: string,
    userIds: number[],
    primaryUserId?: number,
    secondaryUserId?: number | null,
  ): Promise<void> {
    const candidateIds = [
      ...userIds,
      ...(primaryUserId !== undefined ? [primaryUserId] : []),
      ...(secondaryUserId !== null && secondaryUserId !== undefined ? [secondaryUserId] : []),
    ];
    const validUsers = await this.userRepo.find({
      where: { id: In(candidateIds.length > 0 ? candidateIds : [0]), companyId },
      select: ["id"],
    });
    const validIds = new Set(validUsers.map((u) => u.id));
    const cleanedIds = userIds.filter((id) => validIds.has(id));
    const cleanedPrimary =
      primaryUserId !== undefined && validIds.has(primaryUserId) ? primaryUserId : undefined;
    const cleanedSecondary =
      secondaryUserId !== null && secondaryUserId !== undefined && validIds.has(secondaryUserId)
        ? secondaryUserId
        : null;

    await this.assignmentRepo.manager.transaction(async (manager) => {
      await manager.delete(WorkflowStepAssignment, { companyId, workflowStep: step });

      if (cleanedIds.length === 0) {
        return;
      }

      const assignments = cleanedIds.map((userId) =>
        manager.create(WorkflowStepAssignment, {
          companyId,
          workflowStep: step,
          userId,
          isPrimary: cleanedPrimary === userId,
          secondaryUserId: cleanedPrimary === userId ? cleanedSecondary : null,
        }),
      );
      await manager.save(assignments);
    });

    this.logger.log(
      `Updated ${step} assignments for company ${companyId}: ${cleanedIds.join(", ")}`,
    );
  }

  async secondaryUserForStep(companyId: number, step: string): Promise<StockControlUser | null> {
    const primaryAssignment = await this.assignmentRepo.findOne({
      where: { companyId, workflowStep: step, isPrimary: true },
      relations: ["secondaryUser"],
    });

    if (!primaryAssignment?.secondaryUserId) {
      return null;
    }

    return primaryAssignment.secondaryUser;
  }

  async usersForStep(companyId: number, step: string): Promise<StockControlUser[]> {
    const assignments = await this.assignmentsForStep(companyId, step);

    if (assignments.length > 0) {
      return assignments.map((a) => a.user);
    }

    const fallbackRoles = this.rolesForStep(step);
    return this.userRepo.find({
      where: fallbackRoles.map((role) => ({ companyId, role })),
    });
  }

  async assignedUserIdsForStep(companyId: number, step: string): Promise<number[]> {
    const assignments = await this.assignmentRepo.find({
      where: { companyId, workflowStep: step },
      select: ["userId"],
    });
    return assignments.map((a) => a.userId);
  }

  async hasExplicitAssignments(companyId: number, step: string): Promise<boolean> {
    const count = await this.assignmentRepo.count({
      where: { companyId, workflowStep: step },
    });
    return count > 0;
  }

  async eligibleUsersForStep(
    companyId: number,
    step: string,
  ): Promise<{ id: number; name: string; email: string; role: string }[]> {
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

  private rolesForStep(_step: string): StockControlRole[] {
    return Object.values(StockControlRole);
  }

  private compatibleRolesForStep(_step: string): StockControlRole[] {
    return Object.values(StockControlRole);
  }

  async allNotificationRecipients(companyId: number): Promise<StepNotificationRecipients[]> {
    const recipients = await this.recipientRepo.find({
      where: { companyId },
      order: { workflowStep: "ASC", email: "ASC" },
    });

    const grouped = recipients.reduce(
      (acc, r) => {
        if (!acc[r.workflowStep]) {
          acc[r.workflowStep] = [];
        }
        acc[r.workflowStep].push(r.email);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return Object.keys(grouped).map((step) => ({
      step,
      emails: grouped[step] || [],
    }));
  }

  async notificationRecipientsForStep(companyId: number, step: string): Promise<string[]> {
    const recipients = await this.recipientRepo.find({
      where: { companyId, workflowStep: step },
      order: { email: "ASC" },
    });
    return recipients.map((r) => r.email);
  }

  async updateNotificationRecipients(
    companyId: number,
    step: string,
    emails: string[],
  ): Promise<void> {
    await this.recipientRepo.delete({ companyId, workflowStep: step });

    if (emails.length === 0) {
      return;
    }

    const uniqueEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
    const entities = uniqueEmails.map((email) =>
      this.recipientRepo.create({ companyId, workflowStep: step, email }),
    );

    await this.recipientRepo.save(entities);
    this.logger.log(
      `Updated ${step} notification recipients for company ${companyId}: ${uniqueEmails.join(", ")}`,
    );
  }

  async allUserLocationAssignments(companyId: number): Promise<UserLocationSummary[]> {
    const assignments = await this.userLocationRepo.find({
      where: { companyId },
      relations: ["user", "location"],
      order: { userId: "ASC" },
    });

    const grouped = assignments.reduce(
      (acc, a) => {
        if (!a.user) return acc;
        if (!acc[a.userId]) {
          acc[a.userId] = {
            userId: a.userId,
            userName: a.user.name,
            userEmail: a.user.email,
            userRole: a.user.role,
            locationIds: [],
          };
        }
        acc[a.userId].locationIds.push(a.locationId);
        return acc;
      },
      {} as Record<number, UserLocationSummary>,
    );

    return Object.values(grouped);
  }

  async updateUserLocations(
    companyId: number,
    userId: number,
    locationIds: number[],
  ): Promise<void> {
    await this.userLocationRepo.delete({ companyId, userId });

    if (locationIds.length === 0) {
      return;
    }

    const uniqueIds = [...new Set(locationIds)];
    const entities = uniqueIds.map((locationId) =>
      this.userLocationRepo.create({ companyId, userId, locationId }),
    );

    await this.userLocationRepo.save(entities);
    this.logger.log(
      `Updated location assignments for user ${userId} in company ${companyId}: ${uniqueIds.join(", ")}`,
    );
  }

  async locationIdsForUser(companyId: number, userId: number): Promise<number[]> {
    const assignments = await this.userLocationRepo.find({
      where: { companyId, userId },
      select: ["locationId"],
    });
    return assignments.map((a) => a.locationId);
  }
}
