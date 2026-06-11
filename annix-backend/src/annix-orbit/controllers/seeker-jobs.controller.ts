import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { OrbitDismissReasonService } from "../services/orbit-dismiss-reason.service";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

class RecordApplyClickDto {
  @IsOptional()
  @IsInt()
  matchId?: number | null;

  @IsOptional()
  @IsInt()
  externalJobId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string | null;
}

class MuteCompanyDto {
  @IsString()
  @MaxLength(500)
  company: string;
}

class MuteCategoryDto {
  @IsString()
  @MaxLength(255)
  category: string;
}

class DismissMatchDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  reason?: string;
}

class ReportDelistedDto {
  @IsInt()
  externalJobId: number;
}

class SelectPlanDto {
  @IsString()
  @MaxLength(32)
  tier: string;
}

class SetTargetCountriesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(8, { each: true })
  countries: string[];
}

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("annix-orbit/seeker/jobs")
@UseGuards(AnnixOrbitAuthGuard)
export class SeekerJobsController {
  constructor(
    private readonly feedService: SeekerJobFeedService,
    private readonly dismissReasonService: OrbitDismissReasonService,
  ) {}

  @Get("dismiss-reasons")
  dismissReasons() {
    return this.dismissReasonService.listActive();
  }

  @Get("sources")
  sources() {
    return this.feedService.activeSourceProviders();
  }

  @Get("target-countries")
  targetCountries(@Request() req: SeekerAuthRequest) {
    return this.feedService.targetCountriesForSeeker(req.user.email);
  }

  @Get("enabled-countries")
  async enabledCountries() {
    const countries = await this.feedService.enabledJobCountries();
    return { countries };
  }

  @Put("target-countries")
  setTargetCountries(@Request() req: SeekerAuthRequest, @Body() dto: SetTargetCountriesDto) {
    return this.feedService.setTargetCountriesForSeeker(req.user.email, dto.countries);
  }

  @Get("facets")
  async facets(
    @Request() req: SeekerAuthRequest,
    @Query("region") region?: string,
    @Query("province") province?: string,
    @Query("city") city?: string,
    @Query("category") category?: string,
    @Query("minSalary") minSalary?: string,
    @Query("search") search?: string,
    @Query("provider") provider?: string,
  ) {
    const parsedMinSalary = minSalary ? Number.parseFloat(minSalary) : null;
    const filters = {
      region: region || null,
      province: province || null,
      city: city || null,
      category: category || null,
      minSalary:
        parsedMinSalary != null && Number.isFinite(parsedMinSalary) ? parsedMinSalary : null,
      search: search || null,
      provider: provider && provider !== "all" ? provider : null,
    };
    return this.feedService.recommendedFacetsForSeeker(req.user.email, { filters });
  }

  @Get("recommended")
  async recommended(
    @Request() req: SeekerAuthRequest,
    @Query("region") region?: string,
    @Query("province") province?: string,
    @Query("city") city?: string,
    @Query("category") category?: string,
    @Query("minSalary") minSalary?: string,
    @Query("search") search?: string,
    @Query("provider") provider?: string,
  ) {
    const parsedMinSalary = minSalary ? Number.parseFloat(minSalary) : null;
    const filters = {
      region: region || null,
      province: province || null,
      city: city || null,
      category: category || null,
      minSalary:
        parsedMinSalary != null && Number.isFinite(parsedMinSalary) ? parsedMinSalary : null,
      search: search || null,
      provider: provider && provider !== "all" ? provider : null,
    };
    const result = await this.feedService.recommendedForSeeker(req.user.email, { filters });
    return {
      matches: result.matches,
      candidateIds: result.candidateIds,
      hasCandidate: result.candidateIds.length > 0,
      total: result.total,
    };
  }

  @Get("entitlements")
  async entitlements(@Request() req: SeekerAuthRequest) {
    return this.feedService.entitlementsForSeeker(req.user.email);
  }

  @Post("plan")
  async selectPlan(@Request() req: SeekerAuthRequest, @Body() dto: SelectPlanDto) {
    return this.feedService.selectPlanForSeeker(req.user.email, dto.tier);
  }

  @Get("cold-start")
  async coldStart(@Request() req: SeekerAuthRequest) {
    const result = await this.feedService.coldStartForSeeker(req.user.email);
    return {
      jobs: result.jobs,
      candidateIds: result.candidateIds,
      hasCandidate: result.candidateIds.length > 0,
      embeddingPending: result.embeddingPending,
    };
  }

  @Get("stats")
  async stats(@Request() req: SeekerAuthRequest) {
    return this.feedService.statsForSeeker(req.user.email);
  }

  @Get("consent")
  async consent(@Request() req: SeekerAuthRequest) {
    return this.feedService.consentStatusForSeeker(req.user.email);
  }

  @Post("consent")
  async grantConsent(@Request() req: SeekerAuthRequest) {
    return this.feedService.grantMatchingConsentForSeeker(req.user.email);
  }

  @Post(":matchId/dismiss")
  async dismiss(
    @Request() req: SeekerAuthRequest,
    @Param("matchId", ParseIntPipe) matchId: number,
    @Body() dto: DismissMatchDto,
  ) {
    const dismissed = await this.feedService.dismissForSeeker(
      req.user.email,
      matchId,
      dto.reason ?? null,
    );
    if (!dismissed) {
      throw new NotFoundException("Match not found or not owned by user");
    }
    return { success: true };
  }

  @Post("delist")
  async reportDelisted(@Request() req: SeekerAuthRequest, @Body() dto: ReportDelistedDto) {
    const result = await this.feedService.reportJobDelisted(req.user.email, dto.externalJobId);
    if (!result.reported) {
      throw new NotFoundException("Job not found");
    }
    return { success: true };
  }

  @Post("withdraw-matching")
  async withdrawMatching(@Request() req: SeekerAuthRequest) {
    return this.feedService.withdrawMatchingForSeeker(req.user.email);
  }

  @Post("mute-company")
  async muteCompany(@Request() req: SeekerAuthRequest, @Body() body: MuteCompanyDto) {
    const result = await this.feedService.muteCompanyForSeeker(req.user.email, body.company);
    if (!result.mute) {
      throw new BadRequestException("No candidate profile to mute against");
    }
    return { created: result.created, mute: result.mute };
  }

  @Post("mute-category")
  async muteCategory(@Request() req: SeekerAuthRequest, @Body() body: MuteCategoryDto) {
    const result = await this.feedService.muteCategoryForSeeker(req.user.email, body.category);
    if (!result.mute) {
      throw new BadRequestException("No candidate profile to mute against");
    }
    return { created: result.created, mute: result.mute };
  }

  @Get("mutes")
  async listMutes(@Request() req: SeekerAuthRequest) {
    const mutes = await this.feedService.mutesForSeeker(req.user.email);
    return { mutes };
  }

  @Delete("mutes/:muteId")
  async revokeMute(
    @Request() req: SeekerAuthRequest,
    @Param("muteId", ParseIntPipe) muteId: number,
  ) {
    const revoked = await this.feedService.revokeMuteForSeeker(req.user.email, muteId);
    if (!revoked) {
      throw new NotFoundException("Mute not found");
    }
    return { success: true };
  }

  @Post("clicks")
  async recordClick(@Request() req: SeekerAuthRequest, @Body() body: RecordApplyClickDto) {
    const matchId = body.matchId ?? null;
    const externalJobId = body.externalJobId ?? null;
    if (matchId === null && externalJobId === null) {
      throw new BadRequestException("matchId or externalJobId is required");
    }
    const result = await this.feedService.recordApplyClick(req.user.email, {
      matchId,
      externalJobId,
      sourceUrl: body.sourceUrl ?? null,
    });
    return result;
  }

  @Get("search-estimate")
  async searchEstimate() {
    const estimatedDurationMs = await this.feedService.nixSearchEstimateMs();
    return { estimatedDurationMs };
  }

  @Post("rematch")
  async rematch(@Request() req: SeekerAuthRequest) {
    const result = await this.feedService.rematchForSeeker(req.user.email, req.user.id);
    if (!result.triggered) {
      if (result.reason === "no-candidate") {
        throw new BadRequestException("Upload a CV before requesting a rematch");
      }
      if (result.reason === "rate-limited") {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rematch already triggered recently. Try again in ${result.retryAfterSeconds}s.`,
            retryAfterSeconds: result.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return result;
  }
}
