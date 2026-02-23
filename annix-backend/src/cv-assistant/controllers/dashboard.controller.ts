import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ReferenceStatus } from "../entities/candidate-reference.entity";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CandidateService } from "../services/candidate.service";
import { JobPostingService } from "../services/job-posting.service";
import { ReferenceService } from "../services/reference.service";

@Controller("cv-assistant/dashboard")
@UseGuards(CvAssistantAuthGuard)
export class DashboardController {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly jobPostingService: JobPostingService,
    private readonly referenceService: ReferenceService,
  ) {}

  @Get("stats")
  async stats(@Request() req: { user: { companyId: number } }) {
    const [candidateStats, jobPostings, pendingReferences] = await Promise.all([
      this.candidateService.stats(req.user.companyId),
      this.jobPostingService.findAll(req.user.companyId),
      this.referenceService.referencesForCompany(req.user.companyId, ReferenceStatus.REQUESTED),
    ]);

    const activeJobs = jobPostings.filter((j) => j.status === "active").length;

    return {
      totalCandidates: candidateStats.total,
      candidatesByStatus: candidateStats.byStatus,
      averageScore: candidateStats.avgScore,
      totalJobPostings: jobPostings.length,
      activeJobPostings: activeJobs,
      pendingReferences: pendingReferences.length,
    };
  }

  @Get("top-candidates")
  async topCandidates(@Request() req: { user: { companyId: number } }) {
    return this.candidateService.topCandidates(req.user.companyId, 10);
  }
}
