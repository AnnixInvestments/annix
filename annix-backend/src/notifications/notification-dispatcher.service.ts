import { Injectable, Logger } from "@nestjs/common";
import { EmailChannel } from "./channels/email.channel";
import { SmsChannel } from "./channels/sms.channel";
import { WebPushChannel } from "./channels/web-push.channel";
import { WhatsAppChannel } from "./channels/whatsapp.channel";
import {
  DispatchResult,
  NotificationChannel,
  NotificationContent,
  NotificationRecipient,
} from "./interfaces/notification-channel.interface";

export type ChannelKey = "email" | "sms" | "whatsapp" | "web_push";

export interface DispatchRequest {
  recipient: NotificationRecipient;
  content: NotificationContent;
  channels: ChannelKey[];
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly registry: Map<ChannelKey, NotificationChannel>;

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly whatsappChannel: WhatsAppChannel,
    private readonly webPushChannel: WebPushChannel,
  ) {
    this.registry = new Map<ChannelKey, NotificationChannel>([
      ["email", emailChannel],
      ["sms", smsChannel],
      ["whatsapp", whatsappChannel],
      ["web_push", webPushChannel],
    ]);
  }

  channel(key: ChannelKey): NotificationChannel {
    const channel = this.registry.get(key);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${key}`);
    }
    return channel;
  }

  async dispatch(request: DispatchRequest): Promise<DispatchResult[]> {
    const { recipient, content, channels } = request;

    const results = await Promise.all(
      channels.map(async (key) => {
        const channel = this.registry.get(key);
        if (!channel) {
          return {
            channel: key,
            success: false,
            recipientRef: String(recipient.userId ?? ""),
            error: `Unknown channel ${key}`,
          };
        }
        if (!channel.isEnabled()) {
          return {
            channel: key,
            success: false,
            recipientRef: String(recipient.userId ?? ""),
            error: `Channel ${key} disabled`,
          };
        }
        try {
          return await channel.send(recipient, content);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Channel ${key} threw: ${msg}`);
          return {
            channel: key,
            success: false,
            recipientRef: String(recipient.userId ?? ""),
            error: msg,
          };
        }
      }),
    );

    return results;
  }

  async dispatchMany(requests: DispatchRequest[]): Promise<DispatchResult[][]> {
    return Promise.all(requests.map((req) => this.dispatch(req)));
  }
}
