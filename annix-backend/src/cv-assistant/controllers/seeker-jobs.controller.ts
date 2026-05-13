import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
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

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("cv-assistant/seeker/jobs")
@UseGuards(CvAssistantAuthGuard)
export class SeekerJobsController {
  constructor(private readonly feedService: SeekerJobFeedService) {}

  @Get("recommended")
  async recommended(@Request() req: SeekerAuthRequest) {
    const result = await this.feedService.recommendedForSeeker(req.user.email);
    return {
      matches: result.matches,
      candidateIds: result.candidateIds,
      hasCandidate: result.candidateIds.length > 0,
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
  ) {
    const dismissed = await this.feedService.dismissForSeeker(req.user.email, matchId);
    if (!dismissed) {
      throw new NotFoundException("Match not found or not owned by user");
    }
    return { success: true };
  }

  @Post("withdraw-matching")
  async withdrawMatching(@Request() req: SeekerAuthRequest) {
    return this.feedService.withdrawMatchingForSeeker(req.user.email);
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

  @Post("rematch")
  async rematch(@Request() req: SeekerAuthRequest) {
    const result = await this.feedService.rematchForSeeker(req.user.email);
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
