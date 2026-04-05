import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebPushChannel, WebPushSendResult } from "../../notifications/channels/web-push.channel";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";

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

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly webPushChannel: WebPushChannel,
  ) {}

  vapidPublicKey(): string | null {
    return this.webPushChannel.vapidPublicKey();
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
    if (!this.webPushChannel.isEnabled()) {
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user && user.pushNotificationsEnabled === false) {
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

    const [result] = await this.dispatcher.dispatch({
      recipient: {
        userId,
        pushSubscriptions: subscriptions.map((sub) => ({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
        })),
      },
      content: {
        subject: payload.title,
        body: payload.body,
        tag: payload.tag ?? null,
        actionUrl: payload.data?.url ?? null,
      },
      channels: ["web_push"],
    });

    const pushResult = result as WebPushSendResult;
    if (pushResult.staleEndpoints.length > 0) {
      const staleIds = subscriptions
        .filter((sub) => pushResult.staleEndpoints.includes(sub.endpoint))
        .map((sub) => sub.id);
      if (staleIds.length > 0) {
        await this.subscriptionRepo.delete(staleIds);
        this.logger.log(`Cleaned up ${staleIds.length} stale push subscriptions`);
      }
    }
  }

  async sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, payload)));
  }
}
