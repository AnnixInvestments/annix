import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { chunk } from "es-toolkit/compat";
import { In, IsNull, MoreThan, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { DateTime, fromISO, nowMillis } from "../../lib/datetime";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { AnnixOrbitCompany } from "../entities/annix-orbit-company.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { ExternalJobAlternate } from "../entities/external-job-alternate.entity";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { AdzunaService } from "./adzuna.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { SitemapCrawlIngestionService } from "./crawl/sitemap-crawl-ingestion.service";
import { isSitemapCrawlProvider } from "./crawl/sitemap-crawl-profiles";
import { DpsaCircularService } from "./dpsa-circular.service";
import { EmbeddingService } from "./embedding.service";
import { GeocodeService } from "./geocode.service";
import { IngestedJobResult } from "./ingested-job.types";
import { JobCategorizationService } from "./job-categorization.service";
import { JobVettingService } from "./job-vetting.service";
import { RemotiveService } from "./remotive.service";

const HEALTH_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const ADZUNA_PAGE_SIZE = 50;
const ADZUNA_PAGES_PER_CATEGORY = 4;
const ADZUNA_CATEGORIES_PER_DAY = 5;
const ADZUNA_MAX_DAYS_OLD = 21;
const CRAWL_MAX_PAGES_PER_RUN = 150;
const ADZUNA_ZA_CATEGORIES = [
  "accounting-finance-jobs",
  "it-jobs",
  "sales-jobs",
  "customer-services-jobs",
  "engineering-jobs",
  "hr-jobs",
  "healthcare-nursing-jobs",
  "hospitality-catering-jobs",
  "pr-advertising-marketing-jobs",
  "logistics-warehouse-jobs",
  "teaching-jobs",
  "trade-construction-jobs",
  "admin-jobs",
  "legal-jobs",
  "creative-design-jobs",
  "graduate-jobs",
  "retail-jobs",
  "consultancy-jobs",
  "manufacturing-jobs",
  "scientific-qa-jobs",
  "social-work-jobs",
  "travel-jobs",
  "energy-oil-gas-jobs",
  "property-jobs",
  "charity-voluntary-jobs",
  "domestic-help-cleaning-jobs",
  "maintenance-jobs",
  "part-time-jobs",
  "other-general-jobs",
];

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);
  private readonly lastHealthAlertBySource = new Map<number, number>();
  private readonly lastIngestionErrorBySource = new Map<number, string>();

  constructor(
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    @InjectRepository(ExternalJobAlternate)
    private readonly alternateRepo: Repository<ExternalJobAlternate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(AnnixOrbitCompany)
    private readonly companyRepo: Repository<AnnixOrbitCompany>,
    private readonly adzunaService: AdzunaService,
    private readonly remotiveService: RemotiveService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly geocodeService: GeocodeService,
    private readonly jobVettingService: JobVettingService,
    private readonly dpsaCircularService: DpsaCircularService,
    private readonly jobCategorizationService: JobCategorizationService,
    private readonly sitemapCrawlIngestionService: SitemapCrawlIngestionService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: "annix-orbit:poll-job-sources" })
  async pollSources(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) return;
    const sources = await this.sourceRepo.find({ where: { enabled: true } });

    const dueForIngestion = sources.filter((source) => this.isDueForIngestion(source));

    await dueForIngestion.reduce(async (prev, source) => {
      await prev;
      try {
        await this.ingestFromSource(source);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.lastIngestionErrorBySource.set(source.id, message);
        this.logger.error(`Failed to ingest from source ${source.name} (${source.id}): ${message}`);
      }
    }, Promise.resolve());

    await this.backfillCanonicalCategories().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Canonical category backfill failed: ${message}`);
    });
  }

  async backfillCanonicalCategories(limit = 200): Promise<{ updated: number }> {
    const aiBudget = 25;
    const pending = await this.externalJobRepo.find({
      where: { canonicalCategory: IsNull() },
      select: ["id", "title", "category", "description"],
      take: limit,
      order: { id: "DESC" },
    });
    if (pending.length === 0) return { updated: 0 };

    const ruled = pending.map((job) => ({
      job,
      key: this.jobCategorizationService.ruleBased({
        title: job.title,
        providerCategory: job.category,
      }),
    }));
    const matched = ruled.filter((entry) => entry.key !== null);
    const misses = ruled.filter((entry) => entry.key === null).slice(0, aiBudget);

    await Promise.all(
      matched.map((entry) =>
        this.externalJobRepo.update(entry.job.id, { canonicalCategory: entry.key }),
      ),
    );

    const aiResults = await Promise.all(
      misses.map(async (entry) => {
        const key = await this.jobCategorizationService.categorize({
          title: entry.job.title,
          providerCategory: entry.job.category,
          description: entry.job.description,
        });
        return { id: entry.job.id, key };
      }),
    );
    await Promise.all(
      aiResults.map((result) =>
        this.externalJobRepo.update(result.id, { canonicalCategory: result.key }),
      ),
    );

    return { updated: matched.length + aiResults.length };
  }

  async ingestFromSource(
    source: JobMarketSource,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const vetInline = (options.vetInline ?? true) && source.requiresVetting;

    if (source.provider === JobSourceProvider.DPSA) {
      return this.ingestDpsaSource(source, { vetInline });
    }

    this.resetDailyCounterIfNeeded(source);

    if (source.requestsToday >= source.rateLimitPerDay) {
      this.logger.warn(
        `Rate limit reached for source ${source.name} (${source.requestsToday}/${source.rateLimitPerDay})`,
      );
      return { ingested: 0, skipped: 0, savedIds: [] };
    }

    if (!this.hasRequiredCredentials(source)) {
      this.logger.warn(`Source ${source.name} missing API credentials`);
      return { ingested: 0, skipped: 0, savedIds: [] };
    }

    const countryCategories = source.countryCodes.flatMap((country) => {
      const categories = source.categories.length > 0 ? source.categories : [undefined];
      return categories.map((category) => ({ country, category }));
    });

    const totals = await countryCategories.reduce(
      async (accPromise, { country, category }) => {
        const acc = await accPromise;
        if (source.requestsToday >= source.rateLimitPerDay) {
          return acc;
        }

        try {
          const jobs = await this.fetchJobsFromProvider(source, country, category ?? null);

          const result = await this.upsertJobs(jobs, source, country, { vetInline });
          return {
            ingested: acc.ingested + result.ingested,
            skipped: acc.skipped + result.skipped,
            savedIds: [...acc.savedIds, ...result.savedIds],
          };
        } catch (error) {
          this.logger.error(
            `Error fetching ${category ?? "all"} jobs for ${country}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return acc;
        }
      },
      Promise.resolve({ ingested: 0, skipped: 0, savedIds: [] as number[] }),
    );

    source.lastIngestedAt = DateTime.now().toJSDate();
    await this.sourceRepo.save(source);

    if (totals.ingested > 0) {
      this.lastIngestionErrorBySource.delete(source.id);
    }

    this.logger.log(
      `Source ${source.name}: ingested ${totals.ingested}, skipped ${totals.skipped}`,
    );

    await this.maybeEmitZeroJobsAlert(source);

    return totals;
  }

  private async maybeEmitZeroJobsAlert(source: JobMarketSource): Promise<void> {
    const cutoff = DateTime.now().minus({ hours: 24 }).toJSDate();
    const recentCount = await this.externalJobRepo.count({
      where: { sourceId: source.id, createdAt: MoreThan(cutoff) },
    });

    if (recentCount > 0) {
      return;
    }

    const lastAlert = this.lastHealthAlertBySource.get(source.id);
    const cooledDown = !lastAlert || nowMillis() - lastAlert >= HEALTH_ALERT_COOLDOWN_MS;
    if (!cooledDown) {
      return;
    }

    const recipient =
      this.configService.get<string>("SUPPORT_EMAIL") ||
      this.configService.get<string>("EMAIL_FROM") ||
      "info@annix.co.za";
    const lastError = this.lastIngestionErrorBySource.get(source.id) ?? "none recorded";
    const lastIngestedLabel = source.lastIngestedAt
      ? DateTime.fromJSDate(source.lastIngestedAt).toISO()
      : "never";

    const subject = `[Annix Orbit] Adapter ${source.name} returned 0 jobs in the last 24h`;
    const lines = [
      `Source: ${source.name} (id=${source.id}, provider=${source.provider})`,
      `Last ingestion attempt: ${lastIngestedLabel}`,
      `Last recorded error: ${lastError}`,
      "No new external jobs from this source in the past 24h.",
      "Check for revoked API keys, rate limits, or upstream API changes.",
    ];
    const text = lines.join("\n");
    const html = `<p>${lines.map((line) => escapeHtml(line)).join("</p><p>")}</p>`;

    try {
      await this.emailService.sendEmail({ to: recipient, subject, text, html });
      this.lastHealthAlertBySource.set(source.id, nowMillis());
      this.logger.warn(`Emitted zero-jobs health alert for source ${source.name} (${source.id})`);
    } catch (err) {
      this.logger.error(
        `Failed to emit zero-jobs alert for ${source.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async triggerIngestion(
    sourceId: number,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    return this.ingestFromSource(source, options);
  }

  async vetSingleJob(jobId: number): Promise<{ acceptsZa: boolean | null; notes: string }> {
    const job = await this.externalJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    const result = await this.jobVettingService.vet({
      title: job.title,
      company: job.company,
      locationRaw: job.locationRaw,
      description: job.description,
    });
    await this.externalJobRepo.update(jobId, {
      acceptsZa: result.acceptsZa,
      vettingNotes: result.notes,
      vettedAt: DateTime.now().toJSDate(),
    });
    return result;
  }

  async externalJobsForCompany(
    companyId: number,
    options: {
      country?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.externalJobRepo
      .createQueryBuilder("job")
      .innerJoin("job.source", "source")
      .where("source.company_id = :companyId", { companyId });

    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    qb.orderBy("job.postedAt", "DESC", "NULLS LAST")
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  async platformGlobalExternalJobs(
    options: {
      country?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ jobs: ExternalJob[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.externalJobRepo
      .createQueryBuilder("job")
      .innerJoin("job.source", "source")
      .where("source.company_id IS NULL")
      .andWhere("(job.accepts_za IS NULL OR job.accepts_za = true)")
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())");

    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }

    qb.orderBy("job.postedAt", "DESC", "NULLS LAST")
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  private async ingestDpsaSource(
    source: JobMarketSource,
    options: { vetInline: boolean },
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    if (process.env.DPSA_INGESTION_ENABLED !== "true") {
      this.logger.warn("DPSA ingestion disabled — set DPSA_INGESTION_ENABLED=true to enable");
      return { ingested: 0, skipped: 0, savedIds: [] };
    }

    const result = await this.dpsaCircularService.ingestLatestCircular(source);

    if (options.vetInline && result.savedIds.length > 0) {
      const savedJobs = await this.externalJobRepo.find({
        where: { id: In(result.savedIds) },
      });
      await this.vetSavedJobs(savedJobs);
    }

    source.lastIngestedAt = DateTime.now().toJSDate();
    await this.sourceRepo.save(source);

    return { ingested: result.ingested, skipped: 0, savedIds: result.savedIds };
  }

  private async vetSavedJobs(savedJobs: ExternalJob[]): Promise<void> {
    if (savedJobs.length === 0) return;
    const batches = chunk(savedJobs, 5);
    await batches.reduce(async (prev, batch) => {
      await prev;
      await Promise.all(
        batch.map(async (saved) => {
          try {
            const result = await this.jobVettingService.vet({
              title: saved.title,
              company: saved.company,
              locationRaw: saved.locationRaw,
              description: saved.description,
            });
            await this.externalJobRepo.update(saved.id, {
              acceptsZa: result.acceptsZa,
              vettingNotes: result.notes,
              vettedAt: DateTime.now().toJSDate(),
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Failed to vet job ${saved.id}: ${message}`);
          }
        }),
      );
    }, Promise.resolve());
  }

  async vetPendingJobs(limit: number = 100): Promise<{
    vetted: number;
    accepted: number;
    rejected: number;
    ambiguous: number;
  }> {
    const pending = await this.externalJobRepo.find({
      where: { acceptsZa: IsNull() },
      take: limit,
    });

    let accepted = 0;
    let rejected = 0;
    let ambiguous = 0;

    for (const job of pending) {
      const result = await this.jobVettingService.vet({
        title: job.title,
        company: job.company,
        locationRaw: job.locationRaw,
        description: job.description,
      });
      await this.externalJobRepo.update(job.id, {
        acceptsZa: result.acceptsZa,
        vettingNotes: result.notes,
        vettedAt: DateTime.now().toJSDate(),
      });
      if (result.acceptsZa === true) accepted += 1;
      else if (result.acceptsZa === false) rejected += 1;
      else ambiguous += 1;
    }

    return {
      vetted: pending.length,
      accepted,
      rejected,
      ambiguous,
    };
  }

  async platformGlobalIngestionStats(): Promise<{
    totalJobs: number;
    jobsLast7Days: number;
    sources: Array<{
      id: number;
      name: string;
      provider: string;
      enabled: boolean;
      lastIngestedAt: Date | null;
      requestsToday: number;
      rateLimitPerDay: number;
    }>;
  }> {
    const sources = await this.sourceRepo.find({ where: { companyId: IsNull() } });
    const sourceIds = sources.map((s) => s.id);

    const totalJobs =
      sourceIds.length > 0
        ? await this.externalJobRepo
            .createQueryBuilder("job")
            .where("job.source_id IN (:...sourceIds)", { sourceIds })
            .getCount()
        : 0;

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const jobsLast7Days =
      sourceIds.length > 0
        ? await this.externalJobRepo
            .createQueryBuilder("job")
            .where("job.source_id IN (:...sourceIds)", { sourceIds })
            .andWhere("job.created_at >= :sevenDaysAgo", { sevenDaysAgo })
            .getCount()
        : 0;

    return {
      totalJobs,
      jobsLast7Days,
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.provider,
        enabled: s.enabled,
        lastIngestedAt: s.lastIngestedAt,
        requestsToday: s.requestsToday,
        rateLimitPerDay: s.rateLimitPerDay,
      })),
    };
  }

  async externalJobById(jobId: number): Promise<ExternalJob | null> {
    return this.externalJobRepo.findOne({ where: { id: jobId }, relations: ["source"] });
  }

  async publicJobs(
    options: {
      country?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ jobs: PublicJob[]; total: number }> {
    const requestedLimit = options.limit ?? 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const page = Math.max(options.page ?? 1, 1);

    const annixJobs = await this.activeAnnixPublicJobs(options);

    const qb = this.externalJobRepo
      .createQueryBuilder("job")
      .where("(job.accepts_za IS NULL OR job.accepts_za = true)")
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())");
    if (options.country) {
      qb.andWhere("job.country = :country", { country: options.country });
    }
    if (options.category) {
      qb.andWhere("job.category = :category", { category: options.category });
    }
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.company ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }
    qb.orderBy("job.postedAt", "DESC", "NULLS LAST");
    const externals = await qb.getMany();
    const externalPublic = externals.map(toPublicJob);

    const merged = [...annixJobs, ...externalPublic].sort((a, b) => {
      const aPosted = a.postedAt;
      const bPosted = b.postedAt;
      if (!aPosted && !bPosted) return 0;
      if (!aPosted) return 1;
      if (!bPosted) return -1;
      return bPosted.localeCompare(aPosted);
    });

    const total = merged.length;
    const start = (page - 1) * limit;
    const jobs = merged.slice(start, start + limit);
    return { jobs, total };
  }

  private async activeAnnixPublicJobs(options: {
    country?: string;
    search?: string;
  }): Promise<PublicJob[]> {
    if (options.country && options.country.toUpperCase() !== "ZA") {
      return [];
    }
    const qb = this.jobPostingRepo
      .createQueryBuilder("job")
      .where("job.status = :status", { status: JobPostingStatus.ACTIVE })
      .andWhere("(job.test_mode IS NULL OR job.test_mode = false)");
    if (options.search) {
      qb.andWhere("(job.title ILIKE :search OR job.industry ILIKE :search)", {
        search: `%${options.search}%`,
      });
    }
    const jobs = await qb.orderBy("job.activatedAt", "DESC", "NULLS LAST").getMany();
    if (jobs.length === 0) return [];
    const companyIds = [...new Set(jobs.map((j) => j.companyId))];
    const companies = await this.companyRepo.find({ where: { id: In(companyIds) } });
    const nameById = new Map(companies.map((c) => [c.id, c.name]));
    return jobs.map((j) => annixJobToPublic(j, nameById.get(j.companyId) ?? null));
  }

  async publicJobById(jobId: number): Promise<PublicJob | null> {
    const job = await this.externalJobRepo.findOne({ where: { id: jobId } });
    return job ? toPublicJob(job) : null;
  }

  async ingestionStats(companyId: number): Promise<{
    totalJobs: number;
    jobsLast7Days: number;
    sources: Array<{
      id: number;
      name: string;
      provider: string;
      enabled: boolean;
      lastIngestedAt: Date | null;
      requestsToday: number;
      rateLimitPerDay: number;
    }>;
  }> {
    const sources = await this.sourceRepo.find({ where: { companyId } });
    const sourceIds = sources.map((s) => s.id);

    const totalJobs =
      sourceIds.length > 0
        ? await this.externalJobRepo
            .createQueryBuilder("job")
            .where("job.source_id IN (:...sourceIds)", { sourceIds })
            .getCount()
        : 0;

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const jobsLast7Days =
      sourceIds.length > 0
        ? await this.externalJobRepo
            .createQueryBuilder("job")
            .where("job.source_id IN (:...sourceIds)", { sourceIds })
            .andWhere("job.created_at >= :sevenDaysAgo", { sevenDaysAgo })
            .getCount()
        : 0;

    return {
      totalJobs,
      jobsLast7Days,
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        provider: s.provider,
        enabled: s.enabled,
        lastIngestedAt: s.lastIngestedAt,
        requestsToday: s.requestsToday,
        rateLimitPerDay: s.rateLimitPerDay,
      })),
    };
  }

  private hasRequiredCredentials(source: JobMarketSource): boolean {
    if (source.provider === JobSourceProvider.REMOTIVE) {
      return true;
    }
    if (isSitemapCrawlProvider(source.provider)) {
      return true;
    }
    return Boolean(source.apiId && source.apiKeyEncrypted);
  }

  private async fetchJobsFromProvider(
    source: JobMarketSource,
    country: string,
    category: string | null,
  ): Promise<IngestedJobResult[]> {
    if (source.provider === JobSourceProvider.REMOTIVE) {
      source.requestsToday += 1;
      const { jobs } = await this.remotiveService.searchJobs({
        category: category ?? undefined,
        resultsPerPage: 200,
      });
      return jobs;
    }
    if (isSitemapCrawlProvider(source.provider)) {
      return this.fetchCrawledJobs(source);
    }
    return this.fetchAdzunaPaginated(source, country, category);
  }

  private async fetchCrawledJobs(source: JobMarketSource): Promise<IngestedJobResult[]> {
    const remainingBudget = source.rateLimitPerDay - source.requestsToday;
    const maxPages = Math.min(Math.max(remainingBudget, 0), CRAWL_MAX_PAGES_PER_RUN);
    if (maxPages <= 0) {
      return [];
    }
    const { jobs, pagesFetched } = await this.sitemapCrawlIngestionService.crawl(source, {
      maxPages,
    });
    source.requestsToday += pagesFetched;
    return jobs;
  }

  private async fetchAdzunaPaginated(
    source: JobMarketSource,
    country: string,
    category: string | null,
  ): Promise<IngestedJobResult[]> {
    const categories = category ? [category] : this.adzunaCategoriesForToday();
    const collected: IngestedJobResult[] = [];
    for (const cat of categories) {
      if (source.requestsToday >= source.rateLimitPerDay) {
        this.logger.warn(`Adzuna daily request limit reached for source ${source.name}`);
        break;
      }
      const catJobs = await this.fetchAdzunaCategoryPages(source, country, cat);
      collected.push(...catJobs);
    }
    return collected;
  }

  private async fetchAdzunaCategoryPages(
    source: JobMarketSource,
    country: string,
    category: string,
  ): Promise<IngestedJobResult[]> {
    const collected: IngestedJobResult[] = [];
    // eslint-disable-next-line no-restricted-syntax -- sequential paginated fetch that must stop early on daily rate limit or a short page
    for (let page = 1; page <= ADZUNA_PAGES_PER_CATEGORY; page += 1) {
      if (source.requestsToday >= source.rateLimitPerDay) break;
      source.requestsToday += 1;
      const { jobs } = await this.adzunaService.searchJobs(
        source.apiId!,
        source.apiKeyEncrypted!,
        country,
        {
          category,
          maxDaysOld: ADZUNA_MAX_DAYS_OLD,
          resultsPerPage: ADZUNA_PAGE_SIZE,
          page,
        },
      );
      collected.push(...jobs);
      if (jobs.length < ADZUNA_PAGE_SIZE) break;
    }
    return collected;
  }

  private adzunaCategoriesForToday(): string[] {
    const groupCount = Math.ceil(ADZUNA_ZA_CATEGORIES.length / ADZUNA_CATEGORIES_PER_DAY);
    const dayIndex = Math.floor(nowMillis() / 86_400_000) % groupCount;
    const start = dayIndex * ADZUNA_CATEGORIES_PER_DAY;
    return ADZUNA_ZA_CATEGORIES.slice(start, start + ADZUNA_CATEGORIES_PER_DAY);
  }

  private async upsertJobs(
    jobs: IngestedJobResult[],
    source: JobMarketSource,
    country: string,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const vetInline = options.vetInline ?? true;
    const externalIds = jobs.map((job) => job.id);
    if (externalIds.length === 0) {
      return { ingested: 0, skipped: 0, savedIds: [] };
    }

    const existingJobs = await this.externalJobRepo.find({
      where: { sourceExternalId: In(externalIds), sourceId: source.id },
      select: ["sourceExternalId"],
    });
    const existingAlternates = await this.alternateRepo.find({
      where: { sourceExternalId: In(externalIds), sourceId: source.id },
      select: ["sourceExternalId"],
    });

    const alreadyKnown = new Set<string>();
    existingJobs.forEach((j) => alreadyKnown.add(j.sourceExternalId));
    existingAlternates.forEach((a) => alreadyKnown.add(a.sourceExternalId));

    const candidates = jobs.filter((job) => !alreadyKnown.has(job.id));

    const dedupResults = await Promise.all(
      candidates.map(async (job) => {
        const duplicate = await this.findDuplicateCanonicalJob(job, source, country);
        return { job, duplicate };
      }),
    );

    const alternates = dedupResults.filter((r) => r.duplicate !== null);
    const fresh = dedupResults.filter((r) => r.duplicate === null).map((r) => r.job);

    if (alternates.length > 0) {
      await Promise.all(
        alternates.map(({ job, duplicate }) =>
          this.alternateRepo.save(
            this.alternateRepo.create({
              canonicalExternalJobId: duplicate!.id,
              sourceId: source.id,
              sourceExternalId: job.id,
              sourceUrl: job.redirectUrl,
              title: job.title,
              company: job.company,
              locationArea: job.locationArea,
            }),
          ),
        ),
      );
    }

    const savedJobs = await Promise.all(
      fresh.map((job) => {
        const externalJob = this.externalJobRepo.create({
          title: job.title,
          company: job.company,
          country,
          locationRaw: job.locationDisplayName,
          locationArea: job.locationArea,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: country === "za" ? "ZAR" : null,
          description: job.description,
          category: job.category,
          canonicalCategory: this.jobCategorizationService.ruleBased({
            title: job.title,
            providerCategory: job.category,
          }),
          sourceExternalId: job.id,
          sourceUrl: job.redirectUrl,
          postedAt: job.created ? fromISO(job.created).toJSDate() : null,
          expiresAt: this.estimateExpiryForSource(source, job.created),
          sourceId: source.id,
        });
        return this.externalJobRepo.save(externalJob);
      }),
    );

    savedJobs.forEach((saved) => {
      if (!saved.canonicalCategory) {
        this.jobCategorizationService
          .categorize({
            title: saved.title,
            providerCategory: saved.category,
            description: saved.description,
          })
          .then((canonicalCategory) => this.externalJobRepo.update(saved.id, { canonicalCategory }))
          .catch((err) => {
            this.logger.warn(`Failed to categorize job ${saved.id}: ${err.message}`);
          });
      }

      const addressForGeocode = saved.locationRaw ?? saved.locationArea;
      if (addressForGeocode) {
        this.geocodeService
          .geocode(addressForGeocode)
          .then((coords) => {
            if (!coords) return;
            return this.externalJobRepo.update(saved.id, {
              locationLat: coords.lat,
              locationLon: coords.lon,
            });
          })
          .catch((err) => {
            this.logger.warn(`Failed to geocode job ${saved.id}: ${err.message}`);
          });
      }

      this.embeddingService
        .embedExternalJob(saved.id)
        .then((embedded) => {
          if (embedded) {
            return this.candidateJobMatchingService.matchJobToCandidates(saved.id);
          }
          return null;
        })
        .catch((err) => {
          this.logger.warn(`Failed to embed/match job ${saved.id}: ${err.message}`);
        });
    });

    if (vetInline) {
      await this.vetSavedJobs(savedJobs);
    }

    const skipped = alreadyKnown.size + alternates.length;
    return {
      ingested: savedJobs.length,
      skipped,
      savedIds: savedJobs.map((job) => job.id),
    };
  }

  private async findDuplicateCanonicalJob(
    candidate: IngestedJobResult,
    source: JobMarketSource,
    country: string,
  ): Promise<ExternalJob | null> {
    const title = candidate.title?.trim();
    if (!title || title.length < 3) {
      return null;
    }
    const normalisedCompany = normaliseCompanyName(candidate.company);
    const normalisedLocation = (candidate.locationArea ?? "").trim().toLowerCase();

    const result = await this.externalJobRepo.query(
      `
      SELECT j.id
      FROM cv_assistant_external_jobs j
      WHERE LOWER(j.country) = LOWER($1)
        AND j.source_id <> $2
        AND similarity(LOWER(j.title), LOWER($3)) > 0.6
        AND (
          ($4 = '' OR LOWER(COALESCE(j.location_area, '')) = $4)
          OR ($5 = '' OR LOWER(COALESCE(j.company, '')) LIKE '%' || $5 || '%')
        )
      ORDER BY similarity(LOWER(j.title), LOWER($3)) DESC
      LIMIT 1
      `,
      [country, source.id, title, normalisedLocation, normalisedCompany],
    );

    if (!result || result.length === 0) {
      return null;
    }
    return this.externalJobRepo.findOne({ where: { id: result[0].id } });
  }

  private estimateExpiryForSource(source: JobMarketSource, postedDate: string | null): Date | null {
    if (source.provider === JobSourceProvider.REMOTIVE) {
      return this.remotiveService.estimateExpiry(postedDate);
    }
    return this.adzunaService.estimateExpiry(postedDate);
  }

  private isDueForIngestion(source: JobMarketSource): boolean {
    if (!source.lastIngestedAt) {
      return true;
    }
    const lastIngested = DateTime.fromJSDate(source.lastIngestedAt);
    const hoursSince = DateTime.now().diff(lastIngested, "hours").hours;
    return hoursSince >= source.ingestionIntervalHours;
  }

  private resetDailyCounterIfNeeded(source: JobMarketSource): void {
    if (!source.requestsResetAt) {
      source.requestsToday = 0;
      source.requestsResetAt = DateTime.now().endOf("day").toJSDate();
      return;
    }

    const resetAt = DateTime.fromJSDate(source.requestsResetAt);
    if (DateTime.now() > resetAt) {
      source.requestsToday = 0;
      source.requestsResetAt = DateTime.now().endOf("day").toJSDate();
    }
  }
}

export interface PublicJob {
  id: number;
  kind: "external" | "annix";
  referenceNumber: string | null;
  title: string;
  company: string | null;
  country: string;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  extractedSkills: string[];
  category: string | null;
  sourceUrl: string | null;
  postedAt: string | null;
  expiresAt: string | null;
}

function toPublicJob(job: ExternalJob): PublicJob {
  return {
    id: job.id,
    kind: "external",
    referenceNumber: null,
    title: job.title,
    company: job.company,
    country: job.country,
    locationRaw: job.locationRaw,
    locationArea: job.locationArea,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    description: job.description,
    extractedSkills: job.extractedSkills ?? [],
    category: job.category,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt ? job.postedAt.toISOString() : null,
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
  };
}

function normaliseCompanyName(raw: string | null): string {
  if (!raw) return "";
  const stripped = raw
    .toLowerCase()
    .replace(/\(pty\)\s*ltd\.?$/u, "")
    .replace(/\bpty\s*ltd\.?$/u, "")
    .replace(/\blimited$/u, "")
    .replace(/\bltd\.?$/u, "")
    .replace(/\bllc$/u, "")
    .replace(/\binc\.?$/u, "")
    .replace(/[\s.,'"]+$/u, "")
    .trim();
  return stripped;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function annixJobToPublic(job: JobPosting, companyName: string | null): PublicJob {
  const postedDate = job.activatedAt ?? job.createdAt;
  const country = job.province ? "ZA" : "ZA";
  const locationParts = [job.location, job.province].filter((part): part is string =>
    Boolean(part),
  );
  const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : null;
  return {
    id: job.id,
    kind: "annix",
    referenceNumber: job.referenceNumber,
    title: job.title,
    company: companyName,
    country,
    locationRaw: locationLabel,
    locationArea: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    description: job.description,
    extractedSkills: job.requiredSkills ?? [],
    category: job.industry,
    sourceUrl: null,
    postedAt: postedDate ? postedDate.toISOString() : null,
    expiresAt: null,
  };
}
