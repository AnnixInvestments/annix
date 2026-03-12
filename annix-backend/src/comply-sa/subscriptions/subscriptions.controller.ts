import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaSubscriptionsService } from "./subscriptions.service";

@ApiTags("comply-sa/subscriptions")
@Controller("comply-sa/subscriptions")
export class ComplySaSubscriptionsController {
  constructor(private readonly subscriptionsService: ComplySaSubscriptionsService) {}

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard)
  @Get("status")
  async status(@Req() req: { user: { companyId: number } }) {
    return this.subscriptionsService.subscriptionStatus(req.user.companyId);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard)
  @Post("upgrade")
  async upgrade(@Req() req: { user: { companyId: number } }, @Body() body: { tier: string }) {
    return this.subscriptionsService.upgradeTier(req.user.companyId, body.tier);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard)
  @Post("cancel")
  async cancel(@Req() req: { user: { companyId: number } }) {
    return this.subscriptionsService.cancelSubscription(req.user.companyId);
  }

  @Post("webhook")
  async webhook(@Body() body: { event: string; data: Record<string, unknown> }) {
    return this.subscriptionsService.handleWebhook(body.event, body.data);
  }
}
