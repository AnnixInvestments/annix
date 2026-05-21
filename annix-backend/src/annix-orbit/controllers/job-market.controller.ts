import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JOB_SOURCE_PROVIDERS } from "../config/job-source-providers";
import { CreateJobMarketSourceDto, UpdateJobMarketSourceDto } from "../dto/job-market.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AdzunaService } from "../services/adzuna.service";
import { CandidateJobMatchingService } from "../services/candidate-job-matching.service";
import { EmbeddingService } from "../services/embedding.service";
import { JobIngestionService } from "../services/job-ingestion.service";
import { JobMarketSourceService } from "../services/job-market-source.service";

interface AuthRequest {
  user: { companyId: number };
}

@Controller("annix-orbit/job-market")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
export class JobMarketController {
  constructor(
    private readonly sourceService: JobMarketSourceService,
    private readonly ingestionService: JobIngestionService,
    private readonly adzunaService: AdzunaService,
    private readonly embeddingService: EmbeddingService,
    private readonly matchingService: CandidateJobMatchingService,
  ) {}

  @Get("providers")
  providers() {
    return JOB_SOURCE_PROVIDERS;
  }

  @Get("sources")
  async sources(@Request() req: AuthRequest) {
    return this.sourceService.findAllForCompany(req.user.companyId);
  }

  @Post("sources")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async createSource(@Request() req: AuthRequest, @Body() dto: CreateJobMarketSourceDto) {
    return this.sourceService.create(req.user.companyId, dto);
  }

  @Get("sources/:id")
  async sourceById(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    return this.sourceService.findById(id, req.user.companyId);
  }

  @Put("sources/:id")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async updateSource(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobMarketSourceDto,
  ) {
    return this.sourceService.update(id, req.user.companyId, dto);
  }

  @Delete("sources/:id")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async removeSource(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    await this.sourceService.remove(id, req.user.companyId);
    return { message: "Source deleted" };
  }

  @Post("sources/:id/ingest")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async triggerIngestion(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    await this.sourceService.findById(id, req.user.companyId);
    return this.ingestionService.triggerIngestion(id);
  }

  @Get("jobs")
  async jobs(
    @Request() req: AuthRequest,
    @Query("country") country?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ingestionService.externalJobsForCompany(req.user.companyId, {
      country,
      category,
      search,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get("jobs/:id")
  async jobById(@Param("id", ParseIntPipe) id: number) {
    const job = await this.ingestionService.externalJobById(id);
    if (!job) {
      return { error: "Job not found" };
    }
    return job;
  }

  @Get("stats")
  async stats(@Request() req: AuthRequest) {
    return this.ingestionService.ingestionStats(req.user.companyId);
  }

  @Get("categories/:country")
  async adzunaCategories(
    @Param("country") country: string,
    @Query("apiId") apiId: string,
    @Query("apiKey") apiKey: string,
  ) {
    return this.adzunaService.categories(apiId, apiKey, country);
  }

  @Post("embeddings/backfill")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async backfillEmbeddings() {
    const [candidates, jobs] = await Promise.all([
      this.embeddingService.backfillCandidateEmbeddings(),
      this.embeddingService.backfillExternalJobEmbeddings(),
    ]);
    return {
      candidates,
      jobs,
    };
  }

  @Get("candidates/:candidateId/recommended-jobs")
  async recommendedJobs(@Param("candidateId", ParseIntPipe) candidateId: number) {
    return this.matchingService.recommendedJobsForCandidate(candidateId);
  }

  @Post("candidates/:candidateId/match")
  async triggerCandidateMatch(@Param("candidateId", ParseIntPipe) candidateId: number) {
    const matches = await this.matchingService.matchCandidateToJobs(candidateId);
    return { matched: matches.length };
  }

  @Get("jobs/:jobId/matching-candidates")
  async matchingCandidates(@Param("jobId", ParseIntPipe) jobId: number) {
    return this.matchingService.matchingCandidatesForJob(jobId);
  }

  @Post("jobs/:jobId/match")
  async triggerJobMatch(@Param("jobId", ParseIntPipe) jobId: number) {
    const matches = await this.matchingService.matchJobToCandidates(jobId);
    return { matched: matches.length };
  }

  @Post("matches/:matchId/dismiss")
  async dismissMatch(@Param("matchId", ParseIntPipe) matchId: number) {
    await this.matchingService.dismissMatch(matchId);
    return { message: "Match dismissed" };
  }
}
