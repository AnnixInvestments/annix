import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { JOB_SOURCE_PROVIDERS } from "../config/job-source-providers";
import {
  BulkDeleteJobsDto,
  CreateJobMarketSourceDto,
  SetRetentionCapDto,
  UpdateJobMarketSourceDto,
} from "../dto/job-market.dto";
import { DEFAULT_EXTERNAL_JOB_RETENTION_CAP } from "../repositories/external-job.repository.mongo";
import { isSitemapCrawlProvider } from "../services/crawl/sitemap-crawl-profiles";
import { EmbeddingService } from "../services/embedding.service";
import { JobIngestionService } from "../services/job-ingestion.service";
import {
  ALL_JOB_COUNTRIES,
  JobMarketCountriesService,
} from "../services/job-market-countries.service";
import { JobMarketSourceService } from "../services/job-market-source.service";

const ORBIT_SETTINGS_COLLECTION = "cv_assistant_orbit_settings";
const DEFAULT_RETENTION_CAP = DEFAULT_EXTERNAL_JOB_RETENTION_CAP;

@Controller("admin/annix-orbit/job-market")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitJobMarketController {
  private readonly logger = new Logger(AdminOrbitJobMarketController.name);

  constructor(
    private readonly sourceService: JobMarketSourceService,
    private readonly ingestionService: JobIngestionService,
    private readonly embeddingService: EmbeddingService,
    private readonly countriesService: JobMarketCountriesService,
    @InjectConnection(ORBIT_CONNECTION) private readonly orbitConnection: Connection,
  ) {}

  // Live admin toggle: which job-source countries seekers can pick from. Disabling
  // a country (e.g. gb) hides it from the seeker "Where do you want to work?" picker
  // and drops it from match scoping immediately.
  @Get("enabled-countries")
  async enabledCountries() {
    const enabled = await this.countriesService.enabledCountries();
    return { all: [...ALL_JOB_COUNTRIES], enabled };
  }

  @Put("enabled-countries")
  @Roles("admin")
  async setEnabledCountries(@Body() body: { countries: string[] }) {
    const enabled = await this.countriesService.setEnabledCountries(body.countries ?? []);
    this.logger.log(`Enabled job countries set to [${enabled.join(", ")}]`);
    return { all: [...ALL_JOB_COUNTRIES], enabled };
  }

  // Atlas M0 enforces its 512 MB cap on LOGICAL size (dataSize + indexSize), not
  // the on-disk high-water mark — so this reports logical usage per env DB on the
  // shared Orbit cluster, giving early warning before the cap bites.
  @Get("cluster-usage")
  async clusterUsage() {
    const capMb = 512;
    const client = this.orbitConnection.getClient();
    const { databases } = await client.db().admin().listDatabases();
    const orbitDbs = databases.filter((d) => d.name.startsWith("orbit_"));
    const perDb = await Promise.all(
      orbitDbs.map(async (d) => {
        const stats = await client.db(d.name).command({ dbStats: 1 });
        const logicalMb = ((stats.dataSize ?? 0) + (stats.indexSize ?? 0)) / 1024 / 1024;
        return { name: d.name, logicalMb: Math.round(logicalMb * 10) / 10 };
      }),
    );
    perDb.sort((a, b) => b.logicalMb - a.logicalMb);
    const totalMb = perDb.reduce((sum, d) => sum + d.logicalMb, 0);
    const roundedTotal = Math.round(totalMb * 10) / 10;
    return {
      capMb,
      totalMb: roundedTotal,
      freeMb: Math.round((capMb - roundedTotal) * 10) / 10,
      percentUsed: Math.round((roundedTotal / capMb) * 100),
      databases: perDb,
    };
  }

  // Per-environment external-job retention cap. Stored in this env's own Orbit
  // database, so each environment (local/test/prod) sets its own value from the
  // admin portal. expireStaleJobs trims to this on every poll.
  @Get("retention-cap")
  async retentionCap() {
    const db = this.orbitConnection.db;
    if (!db) return { cap: DEFAULT_RETENTION_CAP };
    const doc = await db
      .collection<{ _id: string; externalJobRetentionCap?: number }>(ORBIT_SETTINGS_COLLECTION)
      .findOne({ _id: "default" });
    const cap =
      typeof doc?.externalJobRetentionCap === "number"
        ? doc.externalJobRetentionCap
        : DEFAULT_RETENTION_CAP;
    return { cap };
  }

  @Put("retention-cap")
  @Roles("admin")
  async setRetentionCap(@Body() body: SetRetentionCapDto) {
    const cap = body.cap;
    const db = this.orbitConnection.db;
    if (db) {
      await db
        .collection<{ _id: string; externalJobRetentionCap?: number }>(ORBIT_SETTINGS_COLLECTION)
        .updateOne(
          { _id: "default" },
          { $set: { externalJobRetentionCap: cap, updatedAt: new Date() } },
          { upsert: true },
        );
    }
    this.logger.log(`External-job retention cap set to ${cap}`);
    return { cap };
  }

  @Get("providers")
  providers() {
    return JOB_SOURCE_PROVIDERS;
  }

  @Get("sources")
  async sources() {
    return this.sourceService.findAllPlatformGlobal();
  }

  @Post("sources")
  @Roles("admin")
  async createSource(@Body() dto: CreateJobMarketSourceDto) {
    return this.sourceService.createPlatformGlobal(dto);
  }

  @Get("sources/:id")
  async sourceById(@Param("id", ParseIntPipe) id: number) {
    return this.sourceService.findByIdPlatformGlobal(id);
  }

  @Put("sources/:id")
  @Roles("admin")
  async updateSource(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateJobMarketSourceDto) {
    return this.sourceService.updatePlatformGlobal(id, dto);
  }

  @Delete("sources/:id")
  @Roles("admin")
  async removeSource(@Param("id", ParseIntPipe) id: number) {
    await this.sourceService.removePlatformGlobal(id);
    return { message: "Source deleted" };
  }

  @Post("sources/:id/ingest")
  @Roles("admin")
  async triggerIngestion(@Param("id", ParseIntPipe) id: number) {
    await this.sourceService.findByIdPlatformGlobal(id);
    return this.ingestionService.triggerIngestion(id);
  }

  @Post("sources/:id/fetch")
  @Roles("admin")
  async fetchOnly(@Param("id", ParseIntPipe) id: number) {
    const source = await this.sourceService.findByIdPlatformGlobal(id);

    // Every ingest runs in the background so the HTTP request returns immediately.
    // API-paginated sources (Adzuna — hundreds of jobs plus per-job embedding),
    // DPSA (~36 Gemini calls over a 1MB+ circular) and sitemap-crawl sources (up to
    // 150 page fetches + per-page Gemini extraction) all exceed the HTTP proxy
    // timeout, so a synchronous request gets dropped and surfaces a misleading
    // "server unreachable". The admin UI polls the source's lastIngestedAt to
    // surface completion. Crawl sources vet inline in the background; others vet later.
    const vetInline = isSitemapCrawlProvider(source.provider);
    void this.ingestionService
      .triggerIngestion(id, { vetInline })
      .then((result) =>
        this.logger.log(`${source.provider} background ingestion done: ${result.ingested} new`),
      )
      .catch((err) =>
        this.logger.error(
          `${source.provider} background ingestion failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    return { ingested: 0, skipped: 0, savedIds: [] as number[], started: true };
  }

  @Post("jobs/:id/vet")
  @Roles("admin")
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

  @Get("duplicates")
  async duplicates(@Query("limit") limit?: string) {
    return this.ingestionService.findDuplicateJobPairs(
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Post("duplicates/auto-resolve")
  @Roles("admin")
  async autoResolveDuplicates() {
    return this.ingestionService.autoResolveDuplicates();
  }

  @Post("jobs/bulk-delete")
  @Roles("admin")
  async bulkDeleteJobs(@Body() dto: BulkDeleteJobsDto) {
    return this.ingestionService.deleteExternalJobs(dto.ids);
  }

  @Delete("jobs/:id")
  @Roles("admin")
  async deleteJob(@Param("id", ParseIntPipe) id: number) {
    await this.ingestionService.deleteExternalJob(id);
    return { message: "Job deleted" };
  }

  @Get("stats")
  async stats() {
    return this.ingestionService.platformGlobalIngestionStats();
  }

  @Post("vet-pending")
  @Roles("admin")
  async vetPending(@Query("limit") limit?: string) {
    return this.ingestionService.vetPendingJobs(limit ? Number.parseInt(limit, 10) : undefined);
  }

  // Embedding the candidate CV + all external jobs runs far longer than the HTTP
  // proxy timeout (sequential Gemini calls over ~1,300+ jobs), so kick it off in
  // the background and let the client poll coverage for progress.
  @Post("embeddings/backfill")
  @Roles("admin")
  backfillEmbeddings() {
    return this.embeddingService.startBackfillInBackground();
  }

  @Get("embeddings/coverage")
  async embeddingCoverage() {
    return this.embeddingService.embeddingCoverage();
  }

  // Categorizing the backlog runs sequential Gemini calls over hundreds of jobs,
  // far past the HTTP proxy timeout, so background it and poll coverage.
  @Post("categories/backfill")
  @Roles("admin")
  backfillCategories() {
    return this.ingestionService.startCategoryBackfillInBackground();
  }

  @Get("categories/coverage")
  async categoryCoverage() {
    return this.ingestionService.categoryCoverage();
  }
}
