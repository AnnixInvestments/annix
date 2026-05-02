import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from "@nestjs/common";
import { JobIngestionService } from "../services/job-ingestion.service";

@Controller("cv-assistant/public/jobs")
export class PublicJobMarketController {
  constructor(private readonly ingestionService: JobIngestionService) {}

  @Get()
  async jobs(
    @Query("country") country?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ingestionService.publicJobs({
      country,
      category,
      search,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  async jobById(@Param("id", ParseIntPipe) id: number) {
    const job = await this.ingestionService.publicJobById(id);
    if (!job) {
      throw new NotFoundException("Job not found");
    }
    return job;
  }
}
