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
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { JOB_SOURCE_PROVIDERS } from "../config/job-source-providers";
import { CreateJobMarketSourceDto, UpdateJobMarketSourceDto } from "../dto/job-market.dto";
import { JobIngestionService } from "../services/job-ingestion.service";
import { JobMarketSourceService } from "../services/job-market-source.service";

@Controller("admin/annix-orbit/job-market")
@UseGuards(AdminAuthGuard)
export class AdminOrbitJobMarketController {
  constructor(
    private readonly sourceService: JobMarketSourceService,
    private readonly ingestionService: JobIngestionService,
  ) {}

  @Get("providers")
  providers() {
    return JOB_SOURCE_PROVIDERS;
  }

  @Get("sources")
  async sources() {
    return this.sourceService.findAllPlatformGlobal();
  }

  @Post("sources")
  async createSource(@Body() dto: CreateJobMarketSourceDto) {
    return this.sourceService.createPlatformGlobal(dto);
  }

  @Get("sources/:id")
  async sourceById(@Param("id", ParseIntPipe) id: number) {
    return this.sourceService.findByIdPlatformGlobal(id);
  }

  @Put("sources/:id")
  async updateSource(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateJobMarketSourceDto) {
    return this.sourceService.updatePlatformGlobal(id, dto);
  }

  @Delete("sources/:id")
  async removeSource(@Param("id", ParseIntPipe) id: number) {
    await this.sourceService.removePlatformGlobal(id);
    return { message: "Source deleted" };
  }

  @Post("sources/:id/ingest")
  async triggerIngestion(@Param("id", ParseIntPipe) id: number) {
    await this.sourceService.findByIdPlatformGlobal(id);
    return this.ingestionService.triggerIngestion(id);
  }

  @Post("sources/:id/fetch")
  async fetchOnly(@Param("id", ParseIntPipe) id: number) {
    await this.sourceService.findByIdPlatformGlobal(id);
    return this.ingestionService.triggerIngestion(id, { vetInline: false });
  }

  @Post("jobs/:id/vet")
  async vetJob(@Param("id", ParseIntPipe) id: number) {
    return this.ingestionService.vetSingleJob(id);
  }

  @Get("jobs")
  async jobs(
    @Query("country") country?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ingestionService.platformGlobalExternalJobs({
      country,
      category,
      search,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Get("stats")
  async stats() {
    return this.ingestionService.platformGlobalIngestionStats();
  }

  @Post("vet-pending")
  async vetPending(@Query("limit") limit?: string) {
    return this.ingestionService.vetPendingJobs(limit ? Number.parseInt(limit, 10) : undefined);
  }
}
