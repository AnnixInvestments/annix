import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DispatchResult,
  NotificationChannel,
  NotificationContent,
  NotificationRecipient,
} from "../interfaces/notification-channel.interface";

@Injectable()
export class SmsChannel implements NotificationChannel {
  private readonly logger = new Logger(SmsChannel.name);
  private readonly accountSid: string | null;
  private readonly authToken: string | null;
  private readonly fromNumber: string | null;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID") ?? null;
    this.authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN") ?? null;
    this.fromNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER") ?? null;
  }

  channelName(): string {
    return "sms";
  }

  isEnabled(): boolean {
    return this.accountSid !== null && this.authToken !== null && this.fromNumber !== null;
  }

  async send(
    recipient: NotificationRecipient,
    content: NotificationContent,
  ): Promise<DispatchResult> {
    if (!this.isEnabled()) {
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: recipient.phone ?? "",
        error: "Twilio SMS not configured",
      };
    }

    const phone = recipient.phone;
    if (!phone) {
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: String(recipient.userId ?? ""),
        error: "Recipient has no phone number",
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: phone,
        From: this.fromNumber as string,
        Body: content.body,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Twilio SMS failed (${response.status}): ${errorBody}`);
        return {
          channel: this.channelName(),
          success: false,
          recipientRef: phone,
          error: `HTTP ${response.status}: ${errorBody}`,
        };
      }

      const payload = (await response.json()) as { sid?: string };
      return {
        channel: this.channelName(),
        success: true,
        recipientRef: phone,
        providerMessageId: payload.sid ?? null,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMS send failed for ${phone}: ${msg}`);
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: phone,
        error: msg,
      };
    }
  }
}
