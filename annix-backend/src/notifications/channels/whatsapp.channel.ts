import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppCloudApiService } from "../../whatsapp/services/whatsapp-cloud-api.service";
import { WhatsAppConversationService } from "../../whatsapp/services/whatsapp-conversation.service";
import {
  DispatchResult,
  NotificationChannel,
  NotificationContent,
  NotificationRecipient,
} from "../interfaces/notification-channel.interface";

function normaliseWaId(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/**
 * Sends WhatsApp notifications through the platform's global number on Meta's
 * Cloud API (no phone, no Twilio). Every send is also recorded into the shared
 * WhatsApp conversation store so replies and history show up in the
 * Admin → WhatsApp inbox.
 */
@Injectable()
export class WhatsAppChannel implements NotificationChannel {
  private readonly logger = new Logger(WhatsAppChannel.name);

  constructor(
    private readonly cloudApi: WhatsAppCloudApiService,
    private readonly conversations: WhatsAppConversationService,
  ) {}

  channelName(): string {
    return "whatsapp";
  }

  isEnabled(): boolean {
    return this.cloudApi.isConfigured();
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
        error: "WhatsApp is not configured in this environment",
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

    const waId = normaliseWaId(phone);

    try {
      const result = await this.cloudApi.sendText(waId, content.body);

      const appContext =
        content.data && typeof content.data.appContext === "string"
          ? content.data.appContext
          : null;
      await this.conversations
        .recordOutbound(waId, {
          body: content.body,
          waMessageId: result.waMessageId,
          appContext,
          sentBy: "system:notification",
        })
        .catch((recordError) =>
          this.logger.warn(
            `WhatsApp notification sent but could not be recorded in the inbox: ${
              recordError instanceof Error ? recordError.message : String(recordError)
            }`,
          ),
        );

      return {
        channel: this.channelName(),
        success: true,
        recipientRef: phone,
        providerMessageId: result.waMessageId,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`WhatsApp send failed for ${phone}: ${msg}`);
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: phone,
        error: msg,
      };
    }
  }
}
