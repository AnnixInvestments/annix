import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { SetSeekerMatchTierDto } from "../dto/seeker-match-tier.dto";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

@Controller("admin/annix-orbit/seekers")
@UseGuards(AdminAuthGuard)
export class AdminOrbitSeekerController {
  constructor(private readonly feedService: SeekerJobFeedService) {}

  @Get("lookup")
  async lookup(@Query("email") email?: string) {
    return this.feedService.matchTierForSeeker(email ?? null);
  }

  @Patch("match-tier")
  async setMatchTier(@Body() dto: SetSeekerMatchTierDto) {
    return this.feedService.setMatchTierForSeeker(dto.email, dto.tier);
  }
}
