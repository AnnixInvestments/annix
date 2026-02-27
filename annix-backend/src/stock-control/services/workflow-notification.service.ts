import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { JobCard } from "../entities/job-card.entity";
import { WorkflowStep } from "../entities/job-card-approval.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { WorkflowAssignmentService } from "./workflow-assignment.service";

interface SenderInfo {
  id: number;
  name: string;
}

@Injectable()
export class WorkflowNotificationService {
  private readonly logger = new Logger(WorkflowNotificationService.name);

  constructor(
    @InjectRepository(WorkflowNotification)
    private readonly notificationRepo: Repository<WorkflowNotification>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly assignmentService: WorkflowAssignmentService,
  ) {}

  async notifyApprovalRequired(
    companyId: number,
    jobCardId: number,
    step: WorkflowStep,
    sender?: SenderInfo,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      this.logger.warn(`Job card ${jobCardId} not found for notification`);
      return;
    }

    const users = await this.assignmentService.usersForStep(companyId, step);

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const senderContext = sender ? ` (from ${sender.name})` : "";
    const notifications = users.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Approval Required: ${jobCard.jobName}`,
        message: `Job card ${jobCard.jobNumber} requires your approval for ${this.stepDisplayName(step)}.${senderContext}`,
        actionType: NotificationActionType.APPROVAL_REQUIRED,
        actionUrl,
        senderId: sender?.id ?? null,
        senderName: sender?.name ?? null,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.logger.log(
      `Created ${notifications.length} approval notifications for job card ${jobCardId}`,
    );

    await Promise.all(
      users.map((user) =>
        this.sendApprovalRequiredEmail(
          user.email,
          user.name,
          jobCard.jobNumber,
          jobCard.jobName,
          this.stepDisplayName(step),
          actionUrl,
          sender?.name,
        ),
      ),
    );
  }

  async notifyApprovalCompleted(
    companyId: number,
    jobCardId: number,
    step: WorkflowStep,
    sender: SenderInfo,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const users = await this.userRepo.find({
      where: [
        { companyId, role: StockControlRole.MANAGER },
        { companyId, role: StockControlRole.ADMIN },
      ],
    });

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Approved: ${jobCard.jobName}`,
        message: `${sender.name} approved ${this.stepDisplayName(step)} for job card ${jobCard.jobNumber}.`,
        actionType: NotificationActionType.APPROVAL_COMPLETED,
        actionUrl,
        senderId: sender.id,
        senderName: sender.name,
      }),
    );

    await this.notificationRepo.save(notifications);
  }

  async notifyRejection(
    companyId: number,
    jobCardId: number,
    sender: SenderInfo,
    reason: string,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const users = await this.userRepo.find({
      where: [
        { companyId, role: StockControlRole.ACCOUNTS },
        { companyId, role: StockControlRole.ADMIN },
      ],
    });

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Rejected: ${jobCard.jobName}`,
        message: `${sender.name} rejected job card ${jobCard.jobNumber}. Reason: ${reason}`,
        actionType: NotificationActionType.APPROVAL_REJECTED,
        actionUrl,
        senderId: sender.id,
        senderName: sender.name,
      }),
    );

    await this.notificationRepo.save(notifications);

    await Promise.all(
      users.map((user) =>
        this.sendRejectionEmail(
          user.email,
          user.name,
          jobCard.jobNumber,
          jobCard.jobName,
          sender.name,
          reason,
          actionUrl,
        ),
      ),
    );
  }

  async notifyOverAllocationApproval(
    companyId: number,
    jobCardId: number,
    allocationId: number,
    productName: string,
    quantityRequested: number,
    allowedLitres: number,
    alreadyAllocated: number,
    sender?: SenderInfo,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      this.logger.warn(`Job card ${jobCardId} not found for over-allocation notification`);
      return;
    }

    const managers = await this.userRepo.find({
      where: { companyId, role: StockControlRole.MANAGER },
    });

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const totalAfter = alreadyAllocated + quantityRequested;
    const overBy = (totalAfter - allowedLitres).toFixed(1);

    const notifications = managers.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Over-Allocation Approval: ${jobCard.jobName}`,
        message: `Stock allocation request for ${productName} exceeds allowed limit. Requested: ${quantityRequested}L, Allowed: ${allowedLitres}L (${overBy}L over). Allocation ID: ${allocationId}`,
        actionType: NotificationActionType.OVER_ALLOCATION_APPROVAL,
        actionUrl,
        senderId: sender?.id ?? null,
        senderName: sender?.name ?? null,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.logger.log(
      `Created ${notifications.length} over-allocation notifications for job card ${jobCardId}`,
    );

    await Promise.all(
      managers.map((user) =>
        this.sendOverAllocationEmail(
          user.email,
          user.name,
          jobCard.jobNumber,
          jobCard.jobName,
          productName,
          quantityRequested,
          allowedLitres,
          alreadyAllocated,
          actionUrl,
        ),
      ),
    );
  }

  async notifyDispatchReady(companyId: number, jobCardId: number): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}/dispatch`;

    const storemen = await this.userRepo.find({
      where: { companyId, role: StockControlRole.STOREMAN },
    });

    const notifications = storemen.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Ready for Dispatch: ${jobCard.jobName}`,
        message: `Job card ${jobCard.jobNumber} is ready for physical dispatch.`,
        actionType: NotificationActionType.DISPATCH_READY,
        actionUrl,
      }),
    );

    await this.notificationRepo.save(notifications);
  }

  async unreadNotifications(userId: number): Promise<WorkflowNotification[]> {
    return this.notificationRepo.find({
      where: { userId, readAt: IsNull() },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  async allNotifications(userId: number, limit = 50): Promise<WorkflowNotification[]> {
    return this.notificationRepo.find({
      where: { userId },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async unreadCount(userId: number): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, readAt: IsNull() },
    });
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepo.update({ id: notificationId, userId }, { readAt: new Date() });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
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

  private stepDisplayName(step: WorkflowStep): string {
    const names: Record<WorkflowStep, string> = {
      [WorkflowStep.DOCUMENT_UPLOAD]: "Document Upload",
      [WorkflowStep.ADMIN_APPROVAL]: "Admin Approval",
      [WorkflowStep.MANAGER_APPROVAL]: "Manager Approval",
      [WorkflowStep.REQUISITION_SENT]: "Requisition",
      [WorkflowStep.STOCK_ALLOCATION]: "Stock Allocation",
      [WorkflowStep.MANAGER_FINAL]: "Final Manager Approval",
      [WorkflowStep.READY_FOR_DISPATCH]: "Ready for Dispatch",
      [WorkflowStep.DISPATCHED]: "Dispatched",
    };

    return names[step] || step;
  }

  private async sendApprovalRequiredEmail(
    email: string,
    recipientName: string,
    jobNumber: string,
    jobName: string,
    stepName: string,
    actionUrl: string,
    senderName?: string,
  ): Promise<boolean> {
    const senderLine = senderName ? `<br/><strong>Sent By:</strong> ${senderName}` : "";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Approval Required - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0d9488;">Approval Required</h1>
          <p>Hello ${recipientName},</p>
          <p>A job card requires your approval for the <strong>${stepName}</strong> step.</p>

          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0;">
            <strong>Job Card Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Job Number:</strong> ${jobNumber}<br/>
              <strong>Job Name:</strong> ${jobName}${senderLine}
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Job Card
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Stock Control.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.emailService.sendEmail({
      to: email,
      subject: `Approval Required: ${jobNumber} - ${jobName}`,
      html,
    });
  }

  private async sendRejectionEmail(
    email: string,
    recipientName: string,
    jobNumber: string,
    jobName: string,
    rejectedByName: string,
    reason: string,
    actionUrl: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Job Card Rejected - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Job Card Rejected</h1>
          <p>Hello ${recipientName},</p>
          <p>A job card has been rejected and requires your attention.</p>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Job Card Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Job Number:</strong> ${jobNumber}<br/>
              <strong>Job Name:</strong> ${jobName}<br/>
              <strong>Rejected By:</strong> ${rejectedByName}
            </p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Reason for Rejection:</strong>
            <p style="margin: 5px 0 0 0;">${reason}</p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Job Card
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Stock Control.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.emailService.sendEmail({
      to: email,
      subject: `Job Card Rejected: ${jobNumber} - ${jobName}`,
      html,
    });
  }

  private async sendOverAllocationEmail(
    email: string,
    recipientName: string,
    jobNumber: string,
    jobName: string,
    productName: string,
    quantityRequested: number,
    allowedLitres: number,
    alreadyAllocated: number,
    actionUrl: string,
  ): Promise<boolean> {
    const totalAfter = alreadyAllocated + quantityRequested;
    const overBy = (totalAfter - allowedLitres).toFixed(1);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Over-Allocation Approval Required - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">Over-Allocation Approval Required</h1>
          <p>Hello ${recipientName},</p>
          <p>A stock allocation request exceeds the allowed limit and requires your approval.</p>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <strong>Job Card Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Job Number:</strong> ${jobNumber}<br/>
              <strong>Job Name:</strong> ${jobName}
            </p>
          </div>

          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <strong>Allocation Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Product:</strong> ${productName}<br/>
              <strong>Already Allocated:</strong> ${alreadyAllocated}L<br/>
              <strong>Requested:</strong> ${quantityRequested}L<br/>
              <strong>Allowed:</strong> ${allowedLitres}L<br/>
              <strong style="color: #ef4444;">Over by:</strong> ${overBy}L
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review &amp; Approve
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Stock Control.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.emailService.sendEmail({
      to: email,
      subject: `Over-Allocation Approval Required: ${jobNumber} - ${productName}`,
      html,
    });
  }
}
