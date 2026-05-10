import {
  Controller,
  Get,
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
}
