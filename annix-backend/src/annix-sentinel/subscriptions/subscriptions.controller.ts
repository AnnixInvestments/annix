import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelUpgradeTierDto } from "./dto/upgrade-tier.dto";
import { AnnixSentinelWebhookDto } from "./dto/webhook.dto";
import { AnnixSentinelSubscriptionsService } from "./subscriptions.service";

@ApiTags("annix-sentinel/subscriptions")
@Controller("annix-sentinel/subscriptions")
export class AnnixSentinelSubscriptionsController {
  constructor(private readonly subscriptionsService: AnnixSentinelSubscriptionsService) {}

  @ApiBearerAuth()
  @UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
  @Get("status")
  async status(@Req() req: { user: { companyId: number } }) {
    return this.subscriptionsService.subscriptionStatus(req.user.companyId);
  }

  @ApiBearerAuth()
  @UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
  @Post("upgrade")
  async upgrade(
    @Req() req: { user: { companyId: number } },
    @Body() dto: AnnixSentinelUpgradeTierDto,
  ) {
    return this.subscriptionsService.upgradeTier(req.user.companyId, dto.tier);
  }

  @ApiBearerAuth()
  @UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
  @Post("cancel")
  async cancel(@Req() req: { user: { companyId: number } }) {
    return this.subscriptionsService.cancelSubscription(req.user.companyId);
  }

  @Post("webhook")
  async webhook(@Body() dto: AnnixSentinelWebhookDto) {
    return this.subscriptionsService.handleWebhook(dto.event, dto.data);
  }
}
