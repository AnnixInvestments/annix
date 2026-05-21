import { Body, Controller, Post } from "@nestjs/common";
import { IndividualProfileService } from "../services/individual-profile.service";

@Controller("annix-orbit/public/account")
export class PublicAccountController {
  constructor(private readonly individualProfileService: IndividualProfileService) {}

  @Post("confirm-delete")
  confirmDelete(@Body() body: { token: string }) {
    return this.individualProfileService.confirmAccountDeletion(body.token);
  }
}
