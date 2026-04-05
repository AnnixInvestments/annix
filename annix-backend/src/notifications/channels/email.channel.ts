import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../email/email.service";
import {
  DispatchResult,
  NotificationChannel,
  NotificationContent,
  NotificationRecipient,
} from "../interfaces/notification-channel.interface";

@Injectable()
export class EmailChannel implements NotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly emailService: EmailService) {}

  channelName(): string {
    return "email";
  }

  isEnabled(): boolean {
    return true;
  }

  async send(
    recipient: NotificationRecipient,
    content: NotificationContent,
  ): Promise<DispatchResult> {
    const to = recipient.email;
    if (!to) {
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: String(recipient.userId ?? ""),
        error: "Recipient has no email address",
      };
    }

    try {
      const sent = await this.emailService.sendEmail({
        to,
        subject: content.subject,
        html: content.html || `<p>${content.body}</p>`,
        text: content.body,
      });

      return {
        channel: this.channelName(),
        success: sent,
        recipientRef: to,
        error: sent ? null : "Email send returned false",
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Email send failed for ${to}: ${msg}`);
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: to,
        error: msg,
      };
    }
  }
}
