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
import { CreateJobMarketSourceDto, UpdateJobMarketSourceDto } from "../dto/job-market.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { AdzunaService } from "../services/adzuna.service";
import { EmbeddingService } from "../services/embedding.service";
import { JobIngestionService } from "../services/job-ingestion.service";
import { JobMarketSourceService } from "../services/job-market-source.service";

interface AuthRequest {
  user: { companyId: number };
}

@Controller("cv-assistant/job-market")
@UseGuards(CvAssistantAuthGuard)
export class JobMarketController {
  constructor(
    private readonly sourceService: JobMarketSourceService,
    private readonly ingestionService: JobIngestionService,
    private readonly adzunaService: AdzunaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Get("sources")
  async sources(@Request() req: AuthRequest) {
    return this.sourceService.findAllForCompany(req.user.companyId);
  }

  @Post("sources")
  async createSource(@Request() req: AuthRequest, @Body() dto: CreateJobMarketSourceDto) {
    return this.sourceService.create(req.user.companyId, dto);
  }

  @Get("sources/:id")
  async sourceById(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    return this.sourceService.findById(id, req.user.companyId);
  }

  @Put("sources/:id")
  async updateSource(
    @Request() req: AuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobMarketSourceDto,
  ) {
    return this.sourceService.update(id, req.user.companyId, dto);
  }

  @Delete("sources/:id")
  async removeSource(@Request() req: AuthRequest, @Param("id", ParseIntPipe) id: number) {
    await this.sourceService.remove(id, req.user.companyId);
    return { message: "Source deleted" };
  }

  @Post("sources/:id/ingest")
  async triggerIngestion(@Param("id", ParseIntPipe) id: number) {
    const result = await this.ingestionService.triggerIngestion(id);
    return result;
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
}
