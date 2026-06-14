import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { RecruiterFindCandidatesDto } from "../dto/annix-orbit-recruiter-assistant.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRecruiterAssistantService } from "../services/annix-orbit-recruiter-assistant.service";

interface RecruiterAuthRequest {
  user: { companyId: number; id: number };
}

@Controller("annix-orbit")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitRecruiterAssistantController {
  constructor(private readonly assistant: AnnixOrbitRecruiterAssistantService) {}

  // Natural-language talent search — powers the dashboard "Ask Orbit AI"
  // card (#362 phase 5).
  @Post("recruiter-assistant/find-candidates")
  findCandidates(@Request() req: RecruiterAuthRequest, @Body() dto: RecruiterFindCandidatesDto) {
    return this.assistant.findCandidates(req.user.companyId, req.user.id, dto.query);
  }

  // AI-narrated compliance gap analysis for one candidate.
  @Get("talent-candidates/:candidateId/compliance-gap")
  complianceGap(
    @Request() req: RecruiterAuthRequest,
    @Param("candidateId", ParseIntPipe) candidateId: number,
  ) {
    return this.assistant.complianceGapAnalysis(candidateId, req.user.companyId);
  }
}
