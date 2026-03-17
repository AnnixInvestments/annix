import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { CpoCalloffRecord } from "../entities/cpo-calloff-record.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { JobCard } from "../entities/job-card.entity";
import { WorkflowStep } from "../entities/job-card-approval.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { CompanyEmailService } from "./company-email.service";
import { WebPushService } from "./web-push.service";
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
    private readonly companyEmailService: CompanyEmailService,
    private readonly configService: ConfigService,
    private readonly assignmentService: WorkflowAssignmentService,
    private readonly webPushService: WebPushService,
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
    this.webPushService
      .sendToUsers(
        users.map((u) => u.id),
        {
          title: `Approval Required: ${jobCard.jobName}`,
          body: `Job card ${jobCard.jobNumber} requires your approval for ${this.stepDisplayName(step)}.`,
          tag: `approval-${jobCardId}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
    this.logger.log(
      `Created ${notifications.length} approval notifications for job card ${jobCardId}`,
    );

    await Promise.all(
      users.map((user) =>
        this.sendApprovalRequiredEmail(
          companyId,
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
    this.webPushService
      .sendToUsers(
        users.map((u) => u.id),
        {
          title: `Approved: ${jobCard.jobName}`,
          body: `${sender.name} approved ${this.stepDisplayName(step)} for job card ${jobCard.jobNumber}.`,
          tag: `approved-${jobCardId}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
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
    this.webPushService
      .sendToUsers(
        users.map((u) => u.id),
        {
          title: `Rejected: ${jobCard.jobName}`,
          body: `${sender.name} rejected job card ${jobCard.jobNumber}. Reason: ${reason}`,
          tag: `rejected-${jobCardId}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));

    await Promise.all(
      users.map((user) =>
        this.sendRejectionEmail(
          companyId,
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
    this.webPushService
      .sendToUsers(
        managers.map((u) => u.id),
        {
          title: `Over-Allocation Approval: ${jobCard.jobName}`,
          body: `Stock allocation for ${productName} exceeds limit by ${overBy}L.`,
          tag: `over-allocation-${jobCardId}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
    this.logger.log(
      `Created ${notifications.length} over-allocation notifications for job card ${jobCardId}`,
    );

    await Promise.all(
      managers.map((user) =>
        this.sendOverAllocationEmail(
          companyId,
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
    this.webPushService
      .sendToUsers(
        storemen.map((u) => u.id),
        {
          title: `Ready for Dispatch: ${jobCard.jobName}`,
          body: `Job card ${jobCard.jobNumber} is ready for physical dispatch.`,
          tag: `dispatch-${jobCardId}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
  }

  async notifyJobCardsImported(
    companyId: number,
    jobCardIds: number[],
    sender?: SenderInfo,
  ): Promise<void> {
    if (jobCardIds.length === 0) {
      return;
    }

    const jobCards = await this.jobCardRepo.find({
      where: jobCardIds.map((id) => ({ id, companyId })),
    });

    if (jobCards.length === 0) {
      return;
    }

    const recipientEmails = await this.assignmentService.notificationRecipientsForStep(
      companyId,
      WorkflowStep.DOCUMENT_UPLOAD,
    );

    if (recipientEmails.length === 0) {
      this.logger.log("No notification recipients configured for Doc Upload step, skipping");
      return;
    }

    const allUsers = await this.userRepo.find({ where: { companyId } });
    const recipientSet = new Set(recipientEmails.map((e) => e.toLowerCase()));
    const recipientUsers = allUsers.filter((u) => recipientSet.has(u.email.toLowerCase()));

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards`;

    const senderContext = sender ? ` by ${sender.name}` : "";
    const jobNumbers = jobCards.map((jc) => jc.jobNumber).join(", ");
    const title =
      jobCards.length === 1
        ? `New Job Card Imported: ${jobCards[0].jobNumber}`
        : `${jobCards.length} New Job Cards Imported`;
    const message =
      jobCards.length === 1
        ? `Job card ${jobCards[0].jobNumber} (${jobCards[0].jobName}) was imported${senderContext} and needs activation.`
        : `${jobCards.length} job cards were imported${senderContext} and need activation: ${jobNumbers}`;

    const detailUrl =
      jobCards.length === 1
        ? `${frontendUrl}/stock-control/portal/job-cards/${jobCards[0].id}`
        : actionUrl;

    const notifications = recipientUsers.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId: jobCards.length === 1 ? jobCards[0].id : null,
        title,
        message,
        actionType: NotificationActionType.JOB_CARDS_IMPORTED,
        actionUrl: detailUrl,
        senderId: sender?.id ?? null,
        senderName: sender?.name ?? null,
      }),
    );

    await this.notificationRepo.save(notifications);
    if (recipientUsers.length > 0) {
      this.webPushService
        .sendToUsers(
          recipientUsers.map((u) => u.id),
          {
            title,
            body: message,
            tag: `import-${jobCardIds[0]}`,
            data: { url: detailUrl },
          },
        )
        .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
    }
    this.logger.log(
      `Created ${notifications.length} import notifications for ${jobCards.length} job cards`,
    );

    await Promise.all(
      recipientEmails.map((email) => {
        const user = recipientUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return this.sendJobCardsImportedEmail(
          companyId,
          email,
          user?.name ?? email,
          jobCards,
          detailUrl,
          sender?.name,
        );
      }),
    );
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
    await this.notificationRepo.update(
      { id: notificationId, userId },
      { readAt: now().toJSDate() },
    );
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepo.update({ userId, readAt: IsNull() }, { readAt: now().toJSDate() });
  }

  async markJobCardNotificationsAsRead(userId: number, jobCardId: number): Promise<void> {
    await this.notificationRepo.update(
      { userId, jobCardId, readAt: IsNull() },
      { readAt: now().toJSDate() },
    );
  }

  async notifyCpoCalloffNeeded(
    companyId: number,
    jobCard: JobCard,
    cpo: CustomerPurchaseOrder,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/purchase-orders/${cpo.id}`;

    const managers = await this.userRepo.find({
      where: [
        { companyId, role: StockControlRole.MANAGER },
        { companyId, role: StockControlRole.ADMIN },
      ],
    });

    const title = `CPO Call-Off Needed: ${jobCard.jobNumber}`;
    const message = `JC ${jobCard.jobNumber} (${jobCard.jobName}) arrived for CPO ${cpo.cpoNumber} — call-off needed for rubber, paint, and solution.`;

    const notifications = managers.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId: jobCard.id,
        title,
        message,
        actionType: NotificationActionType.CPO_CALLOFF_NEEDED,
        actionUrl,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.webPushService
      .sendToUsers(
        managers.map((u) => u.id),
        {
          title,
          body: message,
          tag: `cpo-calloff-${cpo.id}-${jobCard.id}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));

    this.logger.log(
      `Created ${notifications.length} CPO call-off notifications for JC ${jobCard.jobNumber} / CPO ${cpo.cpoNumber}`,
    );

    await Promise.all(
      managers.map((user) =>
        this.sendCpoCalloffEmail(companyId, user.email, user.name, jobCard, cpo, actionUrl),
      ),
    );
  }

  async notifyCpoInvoiceOverdue(
    companyId: number,
    cpo: CustomerPurchaseOrder,
    overdueRecords: CpoCalloffRecord[],
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/purchase-orders/${cpo.id}`;

    const recipients = await this.userRepo.find({
      where: [
        { companyId, role: StockControlRole.MANAGER },
        { companyId, role: StockControlRole.ADMIN },
        { companyId, role: StockControlRole.ACCOUNTS },
      ],
    });

    const recordSummary = overdueRecords
      .map((r) => `${r.calloffType}${r.jobCard ? ` (JC ${r.jobCard.jobNumber})` : ""}`)
      .join(", ");

    const title = `Overdue Invoice: ${cpo.cpoNumber}`;
    const message = `${overdueRecords.length} call-off item(s) for CPO ${cpo.cpoNumber} were delivered 21+ days ago but not yet invoiced: ${recordSummary}`;

    const notifications = recipients.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId: null,
        title,
        message,
        actionType: NotificationActionType.CPO_INVOICE_OVERDUE,
        actionUrl,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.webPushService
      .sendToUsers(
        recipients.map((u) => u.id),
        {
          title,
          body: message,
          tag: `cpo-overdue-${cpo.id}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));

    this.logger.log(
      `Created ${notifications.length} overdue invoice notifications for CPO ${cpo.cpoNumber}`,
    );

    await Promise.all(
      recipients.map((user) =>
        this.sendCpoOverdueInvoiceEmail(
          companyId,
          user.email,
          user.name,
          cpo,
          overdueRecords,
          actionUrl,
        ),
      ),
    );
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
    companyId: number,
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

    return this.companyEmailService.sendEmail(companyId, {
      to: email,
      subject: `Approval Required: ${jobNumber} - ${jobName}`,
      html,
    });
  }

  private async sendRejectionEmail(
    companyId: number,
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

    return this.companyEmailService.sendEmail(companyId, {
      to: email,
      subject: `Job Card Rejected: ${jobNumber} - ${jobName}`,
      html,
    });
  }

  private async sendOverAllocationEmail(
    companyId: number,
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

    return this.companyEmailService.sendEmail(companyId, {
      to: email,
      subject: `Over-Allocation Approval Required: ${jobNumber} - ${productName}`,
      html,
    });
  }

  private async sendJobCardsImportedEmail(
    companyId: number,
    email: string,
    recipientName: string,
    jobCards: JobCard[],
    actionUrl: string,
    senderName?: string,
  ): Promise<boolean> {
    const senderLine = senderName ? `<p><strong>Imported By:</strong> ${senderName}</p>` : "";
    const jobCardRows = jobCards
      .map(
        (jc) =>
          `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${jc.jobNumber}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${jc.jobName}</td></tr>`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Job Cards Imported - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0d9488;">New Job Cards Imported</h1>
          <p>Hello ${recipientName},</p>
          <p>${jobCards.length === 1 ? "A new job card has" : `${jobCards.length} new job cards have`} been imported and ${jobCards.length === 1 ? "needs" : "need"} activation.</p>
          ${senderLine}

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f0fdfa;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #0d9488;">Job Number</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #0d9488;">Job Name</th>
              </tr>
            </thead>
            <tbody>
              ${jobCardRows}
            </tbody>
          </table>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${jobCards.length === 1 ? "Review Job Card" : "Review Job Cards"}
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

    const subject =
      jobCards.length === 1
        ? `New Job Card Imported: ${jobCards[0].jobNumber} - ${jobCards[0].jobName}`
        : `${jobCards.length} New Job Cards Imported`;

    return this.companyEmailService.sendEmail(companyId, { to: email, subject, html });
  }

  private async sendCpoCalloffEmail(
    companyId: number,
    email: string,
    recipientName: string,
    jobCard: JobCard,
    cpo: CustomerPurchaseOrder,
    actionUrl: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CPO Call-Off Needed - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed;">CPO Call-Off Needed</h1>
          <p>Hello ${recipientName},</p>
          <p>A job card has arrived that is linked to a Customer Purchase Order and requires call-off action.</p>

          <div style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
            <strong>Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Job Card:</strong> ${jobCard.jobNumber} (${jobCard.jobName})<br/>
              <strong>CPO:</strong> ${cpo.cpoNumber}<br/>
              <strong>Customer:</strong> ${cpo.customerName || "-"}
            </p>
          </div>

          <p>Call-off records have been created for rubber, paint, and solution. Please review and action.</p>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Purchase Order
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

    return this.companyEmailService.sendEmail(companyId, {
      to: email,
      subject: `CPO Call-Off Needed: JC ${jobCard.jobNumber} for ${cpo.cpoNumber}`,
      html,
    });
  }

  private async sendCpoOverdueInvoiceEmail(
    companyId: number,
    email: string,
    recipientName: string,
    cpo: CustomerPurchaseOrder,
    overdueRecords: CpoCalloffRecord[],
    actionUrl: string,
  ): Promise<boolean> {
    const rows = overdueRecords
      .map(
        (r) =>
          `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${r.calloffType}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${r.jobCard ? r.jobCard.jobNumber : "-"}</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString("en-ZA") : "-"}</td></tr>`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Overdue CPO Invoice - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Overdue Invoice Alert</h1>
          <p>Hello ${recipientName},</p>
          <p>The following call-off items for CPO <strong>${cpo.cpoNumber}</strong> (${cpo.customerName || "Unknown customer"}) were delivered more than 3 weeks ago but have not yet been invoiced.</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #fef2f2;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dc2626;">Type</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dc2626;">Job Card</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dc2626;">Delivered</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <p style="margin: 30px 0;">
            <a href="${actionUrl}"
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Purchase Order
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

    return this.companyEmailService.sendEmail(companyId, {
      to: email,
      subject: `Overdue Invoice: CPO ${cpo.cpoNumber} - ${overdueRecords.length} item(s) uninvoiced`,
      html,
    });
  }

  async notifyBackgroundStepRequired(
    companyId: number,
    jobCardId: number,
    stepKey: string,
    stepLabel: string,
    sender: SenderInfo,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      this.logger.warn(`Job card ${jobCardId} not found for background step notification`);
      return;
    }

    const users = await this.assignmentService.usersForStep(companyId, stepKey as WorkflowStep);

    if (users.length === 0) {
      this.logger.warn(
        `No users assigned to background step "${stepKey}" for company ${companyId}`,
      );
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Background Task: ${stepLabel}`,
        message: `Job card ${jobCard.jobNumber} requires "${stepLabel}" to be completed. [step:${stepKey}]`,
        actionType: NotificationActionType.BACKGROUND_STEP_REQUIRED,
        actionUrl,
        senderId: sender.id,
        senderName: sender.name,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.webPushService
      .sendToUsers(
        users.map((u) => u.id),
        {
          title: `Background Task: ${stepLabel}`,
          body: `Job card ${jobCard.jobNumber} requires "${stepLabel}" to be completed.`,
          tag: `bg-step-${jobCardId}-${stepKey}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));

    this.logger.log(
      `Created ${notifications.length} background step notifications for step "${stepKey}" on job card ${jobCardId}`,
    );
  }

  async notifyBackgroundStepCompleted(
    companyId: number,
    jobCardId: number,
    stepKey: string,
    stepLabel: string,
    completer: SenderInfo,
  ): Promise<void> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      return;
    }

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const actionUrl = `${frontendUrl}/stock-control/portal/job-cards/${jobCardId}`;

    const allAdmins = await this.userRepo.find({
      where: [
        { companyId, role: StockControlRole.ADMIN },
        { companyId, role: StockControlRole.MANAGER },
      ],
    });

    const recipients = allAdmins.filter((u) => u.id !== completer.id);

    const notifications = recipients.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId,
        title: `Background Task Completed: ${stepLabel}`,
        message: `${completer.name} completed "${stepLabel}" for job card ${jobCard.jobNumber}.`,
        actionType: NotificationActionType.BACKGROUND_STEP_COMPLETED,
        actionUrl,
        senderId: completer.id,
        senderName: completer.name,
      }),
    );

    await this.notificationRepo.save(notifications);
    this.webPushService
      .sendToUsers(
        recipients.map((u) => u.id),
        {
          title: `Background Task Completed: ${stepLabel}`,
          body: `${completer.name} completed "${stepLabel}" for job card ${jobCard.jobNumber}.`,
          tag: `bg-done-${jobCardId}-${stepKey}`,
          data: { url: actionUrl },
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));
  }
}
