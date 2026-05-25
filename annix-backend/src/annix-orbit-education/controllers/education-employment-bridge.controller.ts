import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnnixOrbitAuthGuard } from "../../annix-orbit/guards/annix-orbit-auth.guard";
import {
  EducationEmploymentBridgeService,
  type PromotionResult,
} from "../services/education-employment-bridge.service";

@ApiTags("Orbit Education Employment Bridge")
@Controller("annix-orbit/education/me")
@UseGuards(AnnixOrbitAuthGuard)
@ApiBearerAuth()
export class EducationEmploymentBridgeController {
  constructor(private readonly bridgeService: EducationEmploymentBridgeService) {}

  @Post("promote-to-job-market")
  @ApiOperation({
    summary:
      "Promote this FuturePath graduate into the Orbit job market (creates/updates their seeker profile from education data)",
  })
  promote(@Req() req: { user: { id: number } }): Promise<PromotionResult> {
    return this.bridgeService.promoteToJobMarket(req.user.id);
  }
}
