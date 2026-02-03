import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { now, fromJSDate } from '../lib/datetime';
import { EmailService } from '../email/email.service';
import { User } from '../user/entities/user.entity';
import {
  Message,
  Conversation,
  Broadcast,
  SlaConfig,
  BroadcastPriority,
} from './entities';

@Injectable()
export class MessageNotificationService {
  private readonly logger = new Logger(MessageNotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(SlaConfig)
    private readonly slaConfigRepo: Repository<SlaConfig>,
  ) {}

  async notifyNewMessage(
    message: Message,
    conversation: Conversation,
    sender: User,
    recipients: User[],
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const senderName =
      `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Someone';
    const messagePreview =
      message.content.length > 200
        ? message.content.substring(0, 200) + '...'
        : message.content;

    await Promise.all(
      recipients.map(async (recipient) => {
        if (!recipient.email) {
          this.logger.warn(
            `Cannot send notification to user ${recipient.id}: no email address`,
          );
          return;
        }

        const recipientName =
          `${recipient.firstName || ''}`.trim() || 'there';
        const portalPath = this.determinePortalPath(recipient);
        const conversationLink = `${frontendUrl}${portalPath}/messages/${conversation.id}`;

        const html = this.newMessageEmailHtml(
          recipientName,
          senderName,
          conversation.subject,
          messagePreview,
          conversationLink,
        );

        const text = this.newMessageEmailText(
          recipientName,
          senderName,
          conversation.subject,
          messagePreview,
          conversationLink,
        );

        const success = await this.emailService.sendEmail({
          to: recipient.email,
          subject: `New message from ${senderName}: ${conversation.subject}`,
          html,
          text,
        });

        if (!success) {
          this.logger.error(
            `Failed to send new message notification to ${recipient.email}`,
          );
        }
      }),
    );
  }

  async notifyBroadcast(broadcast: Broadcast, recipients: User[]): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    await Promise.all(
      recipients.map(async (recipient) => {
        if (!recipient.email) {
          this.logger.warn(
            `Cannot send broadcast to user ${recipient.id}: no email address`,
          );
          return;
        }

        const recipientName =
          `${recipient.firstName || ''}`.trim() || 'there';
        const portalPath = this.determinePortalPath(recipient);
        const broadcastLink = `${frontendUrl}${portalPath}/broadcasts`;

        const html = this.broadcastEmailHtml(
          recipientName,
          broadcast.title,
          broadcast.content,
          broadcast.priority,
          broadcastLink,
        );

        const text = this.broadcastEmailText(
          recipientName,
          broadcast.title,
          broadcast.content,
          broadcast.priority,
          broadcastLink,
        );

        const priorityLabel = this.priorityToLabel(broadcast.priority);
        const subject =
          broadcast.priority === BroadcastPriority.URGENT ||
          broadcast.priority === BroadcastPriority.HIGH
            ? `[${priorityLabel}] ${broadcast.title}`
            : broadcast.title;

        const success = await this.emailService.sendEmail({
          to: recipient.email,
          subject: `${subject} - Annix`,
          html,
          text,
        });

        if (!success) {
          this.logger.error(
            `Failed to send broadcast notification to ${recipient.email}`,
          );
        }
      }),
    );
  }

  async notifyOverdueResponse(
    conversation: Conversation,
    pendingMessage: Message,
    overdueRecipient: User,
    slaConfig: SlaConfig,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (!overdueRecipient.email) {
      this.logger.warn(
        `Cannot send overdue notification to user ${overdueRecipient.id}: no email address`,
      );
      return;
    }

    const recipientName =
      `${overdueRecipient.firstName || ''}`.trim() || 'there';
    const portalPath = this.determinePortalPath(overdueRecipient);
    const conversationLink = `${frontendUrl}${portalPath}/messages/${conversation.id}`;

    const hoursOverdue = Math.floor(
      fromJSDate(pendingMessage.sentAt)
        .diffNow('hours')
        .hours * -1 -
        slaConfig.responseTimeHours,
    );

    const html = this.overdueResponseEmailHtml(
      recipientName,
      conversation.subject,
      slaConfig.responseTimeHours,
      hoursOverdue,
      conversationLink,
    );

    const text = this.overdueResponseEmailText(
      recipientName,
      conversation.subject,
      slaConfig.responseTimeHours,
      hoursOverdue,
      conversationLink,
    );

    const success = await this.emailService.sendEmail({
      to: overdueRecipient.email,
      subject: `[Action Required] Response overdue: ${conversation.subject}`,
      html,
      text,
    });

    if (!success) {
      this.logger.error(
        `Failed to send overdue response notification to ${overdueRecipient.email}`,
      );
    }
  }

  private determinePortalPath(user: User): string {
    const roles = user.roles?.map((r) => r.name.toLowerCase()) || [];

    if (roles.includes('admin')) {
      return '/admin/portal';
    } else if (roles.includes('supplier')) {
      return '/supplier/portal';
    } else {
      return '/customer/portal';
    }
  }

  private priorityToLabel(priority: BroadcastPriority): string {
    const labels: Record<BroadcastPriority, string> = {
      [BroadcastPriority.LOW]: 'Low Priority',
      [BroadcastPriority.NORMAL]: 'Normal',
      [BroadcastPriority.HIGH]: 'High Priority',
      [BroadcastPriority.URGENT]: 'URGENT',
    };
    return labels[priority];
  }

  private priorityToColor(priority: BroadcastPriority): string {
    const colors: Record<BroadcastPriority, string> = {
      [BroadcastPriority.LOW]: '#6b7280',
      [BroadcastPriority.NORMAL]: '#2563eb',
      [BroadcastPriority.HIGH]: '#f59e0b',
      [BroadcastPriority.URGENT]: '#dc2626',
    };
    return colors[priority];
  }

  private newMessageEmailHtml(
    recipientName: string,
    senderName: string,
    subject: string,
    messagePreview: string,
    conversationLink: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Message - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">New Message</h1>
          <p>Hello ${recipientName},</p>
          <p>You have received a new message from <strong>${senderName}</strong>.</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Subject:</strong> ${subject}
          </div>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #4b5563;">${messagePreview}</p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${conversationLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Conversation
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from the Annix platform.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private newMessageEmailText(
    recipientName: string,
    senderName: string,
    subject: string,
    messagePreview: string,
    conversationLink: string,
  ): string {
    return `
New Message

Hello ${recipientName},

You have received a new message from ${senderName}.

Subject: ${subject}

Message Preview:
${messagePreview}

View the conversation at: ${conversationLink}

This is an automated notification from the Annix platform.
    `.trim();
  }

  private broadcastEmailHtml(
    recipientName: string,
    title: string,
    content: string,
    priority: BroadcastPriority,
    broadcastLink: string,
  ): string {
    const priorityColor = this.priorityToColor(priority);
    const priorityLabel = this.priorityToLabel(priority);

    const priorityBadge =
      priority === BroadcastPriority.URGENT || priority === BroadcastPriority.HIGH
        ? `<span style="background-color: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${priorityLabel}</span>`
        : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${priorityColor};">${title} ${priorityBadge}</h1>
          <p>Hello ${recipientName},</p>

          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${priorityColor}; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <div style="white-space: pre-line;">${content}</div>
          </div>

          <p style="margin: 30px 0;">
            <a href="${broadcastLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Announcements
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated announcement from the Annix platform.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private broadcastEmailText(
    recipientName: string,
    title: string,
    content: string,
    priority: BroadcastPriority,
    broadcastLink: string,
  ): string {
    const priorityLabel = this.priorityToLabel(priority);
    const priorityPrefix =
      priority === BroadcastPriority.URGENT || priority === BroadcastPriority.HIGH
        ? `[${priorityLabel}] `
        : '';

    return `
${priorityPrefix}${title}

Hello ${recipientName},

${content}

View all announcements at: ${broadcastLink}

This is an automated announcement from the Annix platform.
    `.trim();
  }

  private overdueResponseEmailHtml(
    recipientName: string,
    subject: string,
    slaHours: number,
    hoursOverdue: number,
    conversationLink: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Response Overdue - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Response Overdue</h1>
          <p>Hello ${recipientName},</p>
          <p>A message in the following conversation requires your response:</p>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <strong>Subject:</strong> ${subject}<br/>
            <strong>SLA:</strong> ${slaHours} hours<br/>
            <strong>Overdue by:</strong> ${hoursOverdue} hours
          </div>

          <p>Please respond to this conversation as soon as possible to maintain your response rating.</p>

          <p style="margin: 30px 0;">
            <a href="${conversationLink}"
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Respond Now
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated SLA reminder from the Annix platform.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private overdueResponseEmailText(
    recipientName: string,
    subject: string,
    slaHours: number,
    hoursOverdue: number,
    conversationLink: string,
  ): string {
    return `
Response Overdue

Hello ${recipientName},

A message in the following conversation requires your response:

Subject: ${subject}
SLA: ${slaHours} hours
Overdue by: ${hoursOverdue} hours

Please respond to this conversation as soon as possible to maintain your response rating.

Respond at: ${conversationLink}

This is an automated SLA reminder from the Annix platform.
    `.trim();
  }
}
