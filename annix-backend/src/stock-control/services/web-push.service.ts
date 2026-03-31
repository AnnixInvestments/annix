import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as webpush from "web-push";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: { url?: string };
}

interface SubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly configService: ConfigService,
  ) {
    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const subject = this.configService.get<string>("VAPID_SUBJECT", "mailto:admin@annix.co.za");

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log("Web push notifications enabled");
    } else {
      this.enabled = false;
      this.logger.warn("VAPID keys not configured — web push notifications disabled");
    }
  }

  vapidPublicKey(): string | null {
    return this.configService.get<string>("VAPID_PUBLIC_KEY") ?? null;
  }

  async subscribe(
    userId: number,
    companyId: number,
    subscription: SubscriptionInput,
  ): Promise<void> {
    const existing = await this.subscriptionRepo.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      existing.userId = userId;
      existing.companyId = companyId;
      existing.keyP256dh = subscription.keys.p256dh;
      existing.keyAuth = subscription.keys.auth;
      await this.subscriptionRepo.save(existing);
    } else {
      await this.subscriptionRepo.save(
        this.subscriptionRepo.create({
          userId,
          companyId,
          endpoint: subscription.endpoint,
          keyP256dh: subscription.keys.p256dh,
          keyAuth: subscription.keys.auth,
        }),
      );
    }
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.subscriptionRepo.delete({ userId, endpoint });
  }

  async sendToUser(userId: number, payload: PushPayload): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const subscriptions = await this.subscriptionRepo.find({ where: { userId } });

    if (subscriptions.length === 0) {
      this.logger.warn(`No push subscriptions found for user ${userId}`);
      return;
    }

    const companyId = subscriptions[0].companyId;
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (company && !company.notificationsEnabled) {
      this.logger.log(
        `Push notifications disabled for company ${companyId}, skipping user ${userId}`,
      );
      return;
    }

    this.logger.log(`Sending push to ${subscriptions.length} subscription(s) for user ${userId}`);

    const staleIds: number[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
            },
            JSON.stringify(payload),
          );
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            staleIds.push(sub.id);
          } else {
            this.logger.warn(`Push failed for subscription ${sub.id}: ${error.message}`);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await this.subscriptionRepo.delete(staleIds);
      this.logger.log(`Cleaned up ${staleIds.length} stale push subscriptions`);
    }
  }

  async sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, payload)));
  }
}
