import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import {
  InviteSeekerTrialDto,
  SetPendingSeekerTierDto,
  SetSeekerMatchTierDto,
} from "../dto/seeker-match-tier.dto";
import { AdminOrbitUserService } from "../services/admin-orbit-user.service";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

@Controller("admin/annix-orbit/seekers")
@UseGuards(AdminAuthGuard)
export class AdminOrbitSeekerController {
  constructor(
    private readonly feedService: SeekerJobFeedService,
    private readonly userService: AdminOrbitUserService,
  ) {}

  @Get()
  async list(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNumber = page ? Number(page) : 1;
    const result = await this.feedService.listSeekers({
      search: search ?? null,
      page: pageNumber,
      limit: limit ? Number(limit) : 20,
    });
    if (pageNumber > 1) {
      return result;
    }
    const term = search ? search.trim().toLowerCase() : "";
    const prospects = (await this.userService.seekerProspects())
      .filter((prospect) => !prospect.hasCandidate)
      .filter(
        (prospect) =>
          term.length === 0 ||
          prospect.email.toLowerCase().includes(term) ||
          (prospect.name ?? "").toLowerCase().includes(term),
      )
      .map((prospect) => ({
        id: -prospect.userId,
        name: prospect.name,
        email: prospect.email,
        matchTier: "none",
        matchScore: null,
        status: prospect.hasLoggedIn ? "registered" : "invited",
        hasCv: prospect.hasCv,
        lastActiveAt: prospect.lastLoginAt,
        createdAt: prospect.invitedAt,
        isProspect: true,
      }));
    return {
      seekers: [...result.seekers, ...prospects],
      total: result.total + prospects.length,
    };
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

  @Post("pending-tier")
  async setPendingTier(@Body() dto: SetPendingSeekerTierDto) {
    return this.feedService.setPendingSeekerTier(
      dto.email,
      dto.tier,
      dto.permanent,
      dto.trialDays ?? null,
    );
  }
}
