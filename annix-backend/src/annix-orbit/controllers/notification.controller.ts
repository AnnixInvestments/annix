import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitUser } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitUserRepository } from "../repositories/annix-orbit-user.repository";
import { CvNotificationService } from "../services/cv-notification.service";

@Controller("annix-orbit/notifications")
@UseGuards(AnnixOrbitAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: CvNotificationService,
    private readonly userRepo: AnnixOrbitUserRepository,
  ) {}

  @Get("vapid-key")
  vapidKey() {
    return { key: this.notificationService.vapidPublicKey() };
  }

  @Post("subscribe")
  async subscribe(
    @Request() req: { user: { id: number; companyId: number | null } },
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.notificationService.subscribe(req.user.id, req.user.companyId, body);
    return { message: "Subscribed to push notifications" };
  }

  @Delete("unsubscribe")
  async unsubscribe(@Request() req: { user: { id: number } }, @Body() body: { endpoint: string }) {
    await this.notificationService.unsubscribe(req.user.id, body.endpoint);
    return { message: "Unsubscribed from push notifications" };
  }

  @Get("preferences")
  async preferences(@Request() req: { user: { id: number } }) {
    const user = await this.userRepo.findById(req.user.id);
    return {
      matchAlertThreshold: user?.matchAlertThreshold ?? 80,
      digestEnabled: user?.digestEnabled ?? true,
      pushEnabled: user?.pushEnabled ?? false,
    };
  }

  @Patch("preferences")
  async updatePreferences(
    @Request() req: { user: { id: number } },
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

    await this.userRepo.updatePreferences(req.user.id, updates);
    return { message: "Notification preferences updated" };
  }
}
