import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as webpush from "web-push";
import {
  DispatchResult,
  NotificationChannel,
  NotificationContent,
  NotificationRecipient,
  PushSubscriptionData,
} from "../interfaces/notification-channel.interface";

export interface WebPushSendResult extends DispatchResult {
  staleEndpoints: string[];
}

@Injectable()
export class WebPushChannel implements NotificationChannel {
  private readonly logger = new Logger(WebPushChannel.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.configService.get<string>("VAPID_SUBJECT", "mailto:admin@example.com");

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.enabled = false;
      this.logger.warn("VAPID keys not configured - web push disabled");
    }
  }

  channelName(): string {
    return "web_push";
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  vapidPublicKey(): string | null {
    return this.configService.get<string>("VAPID_PUBLIC_KEY") ?? null;
  }

  async send(
    recipient: NotificationRecipient,
    content: NotificationContent,
  ): Promise<WebPushSendResult> {
    const subs = recipient.pushSubscriptions ?? [];

    if (!this.enabled) {
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: String(recipient.userId ?? ""),
        error: "Web push not enabled",
        staleEndpoints: [],
      };
    }

    if (subs.length === 0) {
      return {
        channel: this.channelName(),
        success: false,
        recipientRef: String(recipient.userId ?? ""),
        error: "No push subscriptions on recipient",
        staleEndpoints: [],
      };
    }

    const payload = JSON.stringify({
      title: content.subject,
      body: content.body,
      tag: content.tag ?? undefined,
      icon: content.icon ?? undefined,
      badge: content.badge ?? undefined,
      data: {
        url: content.actionUrl ?? undefined,
        ...(content.data ?? {}),
      },
    });

    const staleEndpoints: string[] = [];
    const errors: string[] = [];

    const results = await Promise.all(
      subs.map(async (sub: PushSubscriptionData) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
            },
            payload,
          );
          return true;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          } else {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(msg);
            this.logger.warn(`Push failed for ${sub.endpoint}: ${msg}`);
          }
          return false;
        }
      }),
    );

    const anySuccess = results.some((r) => r);

    return {
      channel: this.channelName(),
      success: anySuccess,
      recipientRef: String(recipient.userId ?? ""),
      error: anySuccess ? null : errors.join("; ") || "All push deliveries failed",
      staleEndpoints,
    };
  }
}
