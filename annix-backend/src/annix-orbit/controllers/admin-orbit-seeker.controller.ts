import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard, type AdminRequest } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import {
  InviteSeekerTrialDto,
  SetPendingSeekerTierDto,
  SetSeekerMatchTierDto,
} from "../dto/seeker-match-tier.dto";
import { AdminOrbitUserService } from "../services/admin-orbit-user.service";
import { IndividualProfileService } from "../services/individual-profile.service";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

@Controller("admin/annix-orbit/seekers")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitSeekerController {
  constructor(
    private readonly feedService: SeekerJobFeedService,
    private readonly userService: AdminOrbitUserService,
    private readonly individualProfileService: IndividualProfileService,
  ) {}

  @Get("identity-reviews")
  @Roles("admin")
  identityReviews(@Request() req: { user?: { email?: string } }) {
    return this.individualProfileService.identityReviewQueue(req.user?.email ?? null);
  }

  @Post(":id/identity-resolution")
  @Roles("admin")
  resolveIdentity(
    @Param("id") id: string,
    @Body() body: { action?: string },
    @Request() req: { user?: { email?: string } },
  ) {
    const action =
      body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
    if (!action) {
      throw new BadRequestException("action must be 'approve' or 'reject'");
    }
    return this.individualProfileService.resolveIdentityReview(
      Number(id),
      action,
      req.user?.email ?? null,
    );
  }

  @Get()
  @Roles("admin")
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
        status: prospect.isRegistered || prospect.hasLoggedIn ? "registered" : "invited",
        hasCv: prospect.hasCv,
        lastActiveAt: prospect.lastLoginAt,
        createdAt: prospect.invitedAt,
        whatsappOptIn: prospect.whatsappOptIn,
        whatsappConsentRequestedAt: prospect.whatsappConsentRequestedAt,
        whatsappPhone: prospect.whatsappPhone,
        isProspect: true,
      }));
    return {
      seekers: [...result.seekers, ...prospects],
      total: result.total + prospects.length,
    };
  }

  @Get("lookup")
  @Roles("admin")
  async lookup(@Query("email") email?: string) {
    return this.feedService.matchTierForSeeker(email ?? null);
  }

  @Get(":id")
  @Roles("admin")
  async detail(@Param("id") id: string) {
    return this.feedService.seekerDetail(Number(id));
  }

  @Patch("match-tier")
  @Roles("admin")
  async setMatchTier(@Body() dto: SetSeekerMatchTierDto) {
    return this.feedService.setMatchTierForSeeker(dto.email, dto.tier);
  }

  @Post("invite-trial")
  @Roles("admin")
  async inviteTrial(@Body() dto: InviteSeekerTrialDto, @Request() req: AdminRequest) {
    return this.feedService.inviteSeekerTrial(
      dto.email,
      dto.tier,
      dto.freeDays,
      req.user?.userId ?? null,
    );
  }

  @Post("pending-tier")
  @Roles("admin")
  async setPendingTier(@Body() dto: SetPendingSeekerTierDto, @Request() req: AdminRequest) {
    return this.feedService.setPendingSeekerTier(
      dto.email,
      dto.tier,
      dto.permanent,
      dto.trialDays ?? null,
      req.user?.userId ?? null,
    );
  }
}
