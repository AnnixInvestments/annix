import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnnixOrbitUser } from "../entities/cv-assistant-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CvNotificationService } from "../services/cv-notification.service";

@Controller("cv-assistant/notifications")
@UseGuards(AnnixOrbitAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: CvNotificationService,
    @InjectRepository(AnnixOrbitUser)
    private readonly userRepo: Repository<AnnixOrbitUser>,
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
    const updates: Partial<AnnixOrbitUser> = {};

    if (body.matchAlertThreshold != null) {
      updates.matchAlertThreshold = Math.max(0, Math.min(100, body.matchAlertThreshold));
    }
    if (body.digestEnabled != null) {
      updates.digestEnabled = body.digestEnabled;
    }
    if (body.pushEnabled != null) {
      updates.pushEnabled = body.pushEnabled;
    }

    await this.userRepo.update(req.user.userId, updates);
    return { message: "Notification preferences updated" };
  }
}
