import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { CvNotificationService } from "../services/cv-notification.service";

@Controller("annix-orbit/notifications")
@UseGuards(AnnixOrbitAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: CvNotificationService) {}

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
    return this.notificationService.getPreferences(req.user.id);
  }

  @Patch("preferences")
  async updatePreferences(
    @Request() req: { user: { id: number } },
    @Body() body: { matchAlertThreshold?: number; digestEnabled?: boolean; pushEnabled?: boolean },
  ) {
    await this.notificationService.updatePreferences(req.user.id, body);
    return { message: "Notification preferences updated" };
  }
}
