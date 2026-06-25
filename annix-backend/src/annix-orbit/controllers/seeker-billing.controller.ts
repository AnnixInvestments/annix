import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { IsIn, IsString } from "class-validator";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import {
  SeekerBillingService,
  type SeekerBillingStatusView,
  type SeekerCheckoutResult,
} from "../services/seeker-billing.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class StartCheckoutDto {
  @IsString()
  @IsIn(["medium", "hard"])
  tier: string;
}

@Controller("annix-orbit/seeker/billing")
@UseGuards(AnnixOrbitAuthGuard)
export class SeekerBillingController {
  constructor(private readonly billingService: SeekerBillingService) {}

  @Post("checkout")
  async checkout(
    @Request() req: SeekerAuthRequest,
    @Body() body: StartCheckoutDto,
  ): Promise<SeekerCheckoutResult> {
    return this.billingService.startCheckout(req.user.id, body.tier);
  }

  @Get("status")
  async status(@Request() req: SeekerAuthRequest): Promise<SeekerBillingStatusView> {
    return this.billingService.status(req.user.id);
  }

  @Post("cancel")
  async cancel(@Request() req: SeekerAuthRequest): Promise<SeekerBillingStatusView> {
    return this.billingService.cancel(req.user.id);
  }
}
