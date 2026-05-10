import {
  BadRequestException,
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
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { SeekerJobFeedService } from "../services/seeker-job-feed.service";

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
