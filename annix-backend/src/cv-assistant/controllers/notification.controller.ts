import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CvNotificationService } from "../services/cv-notification.service";
import { InjectRepository } from "@nestjs/typeorm";
import { CvAssistantUser } from "../entities/cv-assistant-user.entity";
import { Repository } from "typeorm";

@Controller("cv-assistant/notifications")
@UseGuards(CvAssistantAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: CvNotificationService,
    @InjectRepository(CvAssistantUser)
    private readonly userRepo: Repository<CvAssistantUser>,
  ) {}

  @Get("vapid-key")
  vapidKey() {
    return { key: this.notificationService.vapidPublicKey() };
  }

  @Post("subscribe")
  async subscribe(
    @Request() req: { user: { userId: number; companyId: number } },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.notificationService.subscribe(req.user.userId, req.user.companyId, body);
    return { message: "Subscribed to push notifications" };
  }

  @Delete("unsubscribe")
  async unsubscribe(
    @Request() req: { user: { userId: number } },
    @Body() body: { endpoint: string },
  ) {
    await this.notificationService.unsubscribe(req.user.userId, body.endpoint);
    return { message: "Unsubscribed from push notifications" };
  }

  @Get("preferences")
  async preferences(@Request() req: { user: { userId: number } }) {
    const user = await this.userRepo.findOne({ where: { id: req.user.userId } });
    return {
      matchAlertThreshold: user?.matchAlertThreshold ?? 80,
      digestEnabled: user?.digestEnabled ?? true,
      pushEnabled: user?.pushEnabled ?? false,
    };
  }

  @Patch("preferences")
  async updatePreferences(
    @Request() req: { user: { userId: number } },
    @Body() body: { matchAlertThreshold?: number; digestEnabled?: boolean; pushEnabled?: boolean },
  ) {
    const updates: Partial<CvAssistantUser> = {};

    if (body.matchAlertThreshold !== undefined) {
      updates.matchAlertThreshold = Math.max(0, Math.min(100, body.matchAlertThreshold));
    }
    if (body.digestEnabled !== undefined) {
      updates.digestEnabled = body.digestEnabled;
    }
    if (body.pushEnabled !== undefined) {
      updates.pushEnabled = body.pushEnabled;
    }

    await this.userRepo.update(req.user.userId, updates);
    return { message: "Notification preferences updated" };
  }
}
