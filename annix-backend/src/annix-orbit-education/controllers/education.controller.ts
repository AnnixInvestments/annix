import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AnnixOrbitAuthGuard } from "../../annix-orbit/guards/annix-orbit-auth.guard";
import { now } from "../../lib/datetime";
import { ORBIT_EDUCATION_CURRICULA } from "../annix-orbit-education.constants";
import { EducationConsentService } from "../services/education-consent.service";
import { EducationMentorService } from "../services/education-mentor.service";
import { EducationProfileService } from "../services/education-profile.service";
import { EducationRecommendationService } from "../services/education-recommendation.service";
import { GuardianLinkService } from "../services/guardian-link.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class UpsertProfileDto {
  @IsOptional()
  @IsIn(ORBIT_EDUCATION_CURRICULA as unknown as string[])
  curriculum?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  school?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateOfBirth?: string | null;
}

class AddResultDto {
  @IsString()
  @MaxLength(120)
  subject: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  mark?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  predictedMark?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  term?: string | null;
}

class InviteGuardianDto {
  @IsString()
  @MaxLength(255)
  guardianEmail: string;
}

class MentorDto {
  @IsString()
  @MaxLength(2000)
  question: string;
}

@Controller("annix-orbit/education/me")
@UseGuards(AnnixOrbitAuthGuard)
export class EducationController {
  constructor(
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
    private readonly guardianLinkService: GuardianLinkService,
    private readonly mentorService: EducationMentorService,
    private readonly recommendationService: EducationRecommendationService,
  ) {}

  @Get()
  async profile(@Request() req: SeekerAuthRequest) {
    const profile = await this.profileService.profileForUser(req.user.id);
    if (!profile) {
      return {
        profile: null,
        results: [],
        guardianLinks: [],
        isMinor: null,
        consentRequired: false,
      };
    }
    const [results, guardianLinks] = await Promise.all([
      this.profileService.resultsForProfile(profile.id),
      this.guardianLinkService.linksForProfile(profile.id),
    ]);
    const isMinor = this.consentService.isMinor(profile);
    const hasConsent = await this.consentService.hasValidConsent(profile.id);
    return {
      profile,
      results,
      guardianLinks,
      isMinor,
      consentRequired: isMinor && !hasConsent,
    };
  }

  @Put()
  async upsertProfile(@Request() req: SeekerAuthRequest, @Body() body: UpsertProfileDto) {
    const profile = await this.profileService.upsertProfile(req.user.id, body);
    return { profile };
  }

  @Get("results")
  async results(@Request() req: SeekerAuthRequest) {
    const profile = await this.profileService.profileForUser(req.user.id);
    if (!profile) return { results: [] };
    const results = await this.profileService.resultsForProfile(profile.id);
    return { results };
  }

  @Post("results")
  async addResult(@Request() req: SeekerAuthRequest, @Body() body: AddResultDto) {
    const profile = await this.profileService.upsertProfile(req.user.id, {});
    const result = await this.profileService.addResult(profile.id, {
      subject: body.subject,
      mark: body.mark ?? null,
      predictedMark: body.predictedMark ?? null,
      year: body.year ?? null,
      term: body.term ?? null,
    });
    return { result };
  }

  @Delete("results/:id")
  async deleteResult(@Request() req: SeekerAuthRequest, @Param("id") id: string) {
    const profile = await this.profileService.profileForUser(req.user.id);
    const deleted = profile ? await this.profileService.deleteResult(profile.id, id) : false;
    return { deleted };
  }

  @Post("consent")
  async recordConsent(@Request() req: SeekerAuthRequest) {
    const profile = await this.profileService.upsertProfile(req.user.id, {});
    const isMinor = this.consentService.isMinor(profile);
    const consent = await this.consentService.recordConsent({
      educationProfileId: profile.id,
      grantedByUserId: req.user.id,
      grantedByRole: isMinor ? "guardian" : "self",
      jurisdiction: this.consentService.jurisdictionForCountry(profile.country),
    });
    return { consent };
  }

  @Post("guardian-invite")
  async inviteGuardian(@Request() req: SeekerAuthRequest, @Body() body: InviteGuardianDto) {
    const profile = await this.profileService.upsertProfile(req.user.id, {});
    const link = await this.guardianLinkService.invite(profile.id, body.guardianEmail);
    return { guardianLink: link };
  }

  @Post("mentor")
  async mentor(@Request() req: SeekerAuthRequest, @Body() body: MentorDto) {
    const profile = await this.profileService.upsertProfile(req.user.id, {});
    const answer = await this.mentorService.ask(profile.id, body.question);
    return answer;
  }

  @Get("recommendations")
  async recommendations(
    @Request() req: SeekerAuthRequest,
    @Query("intakeYear") intakeYear?: string,
  ) {
    const parsedYear = intakeYear ? Number.parseInt(intakeYear, 10) : Number.NaN;
    const year = Number.isFinite(parsedYear) ? parsedYear : now().year + 1;
    const recommendations = await this.recommendationService.recommendForUser(req.user.id, year);
    return { intakeYear: year, recommendations };
  }
}
