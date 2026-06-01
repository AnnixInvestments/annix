import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { InviteSeekerTrialDto, SetSeekerMatchTierDto } from "../dto/seeker-match-tier.dto";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

@Controller("admin/annix-orbit/seekers")
@UseGuards(AdminAuthGuard)
export class AdminOrbitSeekerController {
  constructor(private readonly feedService: SeekerJobFeedService) {}

  @Get()
  async list(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.feedService.listSeekers({
      search: search ?? null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get("lookup")
  async lookup(@Query("email") email?: string) {
    return this.feedService.matchTierForSeeker(email ?? null);
  }

  @Get(":id")
  async detail(@Param("id") id: string) {
    return this.feedService.seekerDetail(Number(id));
  }

  @Patch("match-tier")
  async setMatchTier(@Body() dto: SetSeekerMatchTierDto) {
    return this.feedService.setMatchTierForSeeker(dto.email, dto.tier);
  }

  @Post("invite-trial")
  async inviteTrial(@Body() dto: InviteSeekerTrialDto) {
    return this.feedService.inviteSeekerTrial(dto.email, dto.tier, dto.freeDays);
  }
}
