import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { IndividualProfileService } from "../services/individual-profile.service";

@Controller("annix-orbit/public/account")
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class PublicAccountController {
  constructor(private readonly individualProfileService: IndividualProfileService) {}

  @Post("confirm-delete")
  confirmDelete(@Body() body: { token: string }) {
    return this.individualProfileService.confirmAccountDeletion(body.token);
  }
}
