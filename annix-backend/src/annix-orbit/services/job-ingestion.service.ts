import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { chunk } from "es-toolkit/compat";
import { EmailService } from "../../email/email.service";
import { DateTime, fromISO, now, nowMillis } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { DESCRIPTION_LIMIT } from "../config/external-job-ingest";
import { sourceRespectRank } from "../config/job-source-providers";
import { resolveMonthlySalary } from "../config/salary-period";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { coordsForLocation, resolveLocation } from "../lib/sa-locations";
import { currentOrbitEnvironment } from "../orbit-environment";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import {
  DedupCandidateRow,
  DuplicateJobPair,
  ExternalJobRepository,
} from "../repositories/external-job.repository";
import { normaliseTitleKey } from "../repositories/external-job.repository.mongo";
import { ExternalJobAlternateRepository } from "../repositories/external-job-alternate.repository";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
import { SourceRespectRankRepository } from "../repositories/source-respect-rank.repository";
import { AdzunaService } from "./adzuna.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { CareerjetService } from "./careerjet.service";
import { SitemapCrawlIngestionService } from "./crawl/sitemap-crawl-ingestion.service";
import { isSitemapCrawlProvider } from "./crawl/sitemap-crawl-profiles";
import { DpsaCircularService } from "./dpsa-circular.service";
import { EmbeddingService } from "./embedding.service";
import { GeocodeService } from "./geocode.service";
import { IngestedJobResult } from "./ingested-job.types";
import { JobCategorizationService } from "./job-categorization.service";
import { JobVettingService } from "./job-vetting.service";
import { JoobleService, joobleLocationForCountry } from "./jooble.service";
import { RemotiveService } from "./remotive.service";

const HEALTH_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Only email a health alert once a source has failed this many runs in a row,
// so a single transient upstream blip (e.g. an Adzuna 503 that recovers next
// run) does not page anyone.
const ALERT_AFTER_CONSECUTIVE_FAILURES = 2;
const ADZUNA_PAGE_SIZE = 50;
const ADZUNA_PAGES_PER_CATEGORY = 4;
const ADZUNA_CATEGORIES_PER_DAY = 29;
const ADZUNA_MAX_DAYS_OLD = 45;
const UPSERT_BATCH_SIZE = 50;
const ENRICH_CONCURRENCY = 6;
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
  private readonly lastIngestionErrorBySource = new Map<number, string>();
  private pollInFlight = false;
  private readonly ingestingSourceIds = new Set<number>();
  private categoryBackfillRunning = false;
  private lastCategoryBackfillError: string | null = null;

  constructor(
    private readonly sourceRepo: JobMarketSourceRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly alternateRepo: ExternalJobAlternateRepository,
    private readonly sourceRespectRankRepo: SourceRespectRankRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly companyRepo: AnnixOrbitCompanyRepository,
    private readonly adzunaService: AdzunaService,
    private readonly remotiveService: RemotiveService,
    private readonly careerjetService: CareerjetService,
    private readonly joobleService: JoobleService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly geocodeService: GeocodeService,
    private readonly jobVettingService: JobVettingService,
    private readonly dpsaCircularService: DpsaCircularService,
    private readonly jobCategorizationService: JobCategorizationService,
    private readonly sitemapCrawlIngestionService: SitemapCrawlIngestionService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS, { name: "annix-orbit:poll-job-sources" })
  async pollSources(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) return;
    if (this.pollInFlight) {
      this.logger.warn("Skipping scheduled poll — a previous ingestion run is still in progress");
      return;
    }
    this.pollInFlight = true;
    try {
      await this.runPollCycle();
    } finally {
      this.pollInFlight = false;
    }
  }

  private async runPollCycle(): Promise<void> {
    const sources = await this.sourceRepo.findEnabled();

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
      // Interim cap guard: enforceRetentionCap is a cheap countDocuments({})
      // check that no-ops below the cap, so at steady state this is one count
      // per source and only trims when a source pushes the pool over the cap —
      // bounding mid-cycle overshoot without re-trimming after every source.
      await this.externalJobRepo.enforceRetentionCap().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Interim retention-cap enforcement failed: ${message}`);
      });
    }, Promise.resolve());

    await this.backfillCanonicalCategories().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Backfill canonical categories failed: ${message}`);
    });

    await this.backfillJobSkills().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Backfill job skills failed: ${message}`);
    });

    await this.backfillJobCoords().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Backfill job coords failed: ${message}`);
    });

    await this.autoResolveDuplicates().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auto-resolve duplicates failed: ${message}`);
    });

    await this.externalJobRepo.enforceRetentionCap().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Retention-cap enforcement failed: ${message}`);
    });

    await this.expireStaleJobs().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Stale-job sweep failed: ${message}`);
    });
  }

  async backfillCanonicalCategories(limit = 200): Promise<{ updated: number }> {
    const aiBudget = 25;
    const pending = await this.externalJobRepo.findPendingCanonicalCategory(limit);
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
      matched.map((entry) => this.externalJobRepo.updateCanonicalCategory(entry.job.id, entry.key)),
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
        this.externalJobRepo.updateCanonicalCategory(result.id, result.key),
      ),
    );

    return { updated: matched.length + aiResults.length };
  }

  // Lazy skills analysis: only jobs that matched a candidate (i.e. will be
  // surfaced to a seeker) get the Gemini category+skills pass. After it lands we
  // re-embed (so the vector includes the skills text) and re-match (so the skills
  // score is reflected). Guarded by skillsAnalyzedAt so a re-match never
  // re-triggers analysis. Jobs that match nobody are never analysed — this is the
  // main lever that stops paying Gemini for jobs no one sees.
  private async enrichMatchedJobSkills(job: ExternalJob): Promise<void> {
    if (job.skillsAnalyzedAt) {
      return;
    }
    const analysis = await this.jobCategorizationService.analyzeJob({
      title: job.title,
      providerCategory: job.category,
      description: job.description,
    });
    if (analysis.skipped) {
      // Daily analysis cap hit — leave unstamped so it's retried another day.
      return;
    }
    await this.externalJobRepo.updateExtractedSkills(job.id, analysis.skills);
    if (!job.canonicalCategory && analysis.category) {
      await this.externalJobRepo.updateCanonicalCategory(job.id, analysis.category);
    }
    const embedded = await this.embeddingService.embedExternalJob(job.id);
    if (embedded) {
      await this.candidateJobMatchingService.matchJobToCandidates(job.id);
    }
  }

  // Embed + match every job (no AI cost), but only spend a Gemini skills
  // analysis on jobs that actually matched a candidate — i.e. jobs a seeker will
  // see. Jobs that match nobody (the bulk of ingestion) never cost an analysis
  // call. Runs in the background (not awaited by the upsert) but bounded to
  // ENRICH_CONCURRENCY in-flight chains so a large cycle can't launch thousands
  // of concurrent embed/match chains — capping memory and Mongo pool pressure.
  private enrichSavedJobsInBackground(savedJobs: ExternalJob[]): void {
    if (savedJobs.length === 0) return;
    void chunk(savedJobs, ENRICH_CONCURRENCY)
      .reduce(async (prev, batch) => {
        await prev;
        await Promise.all(batch.map((saved) => this.enrichSavedJob(saved)));
      }, Promise.resolve())
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Background enrichment batch failed: ${message}`);
      });
  }

  private async enrichSavedJob(saved: ExternalJob): Promise<void> {
    try {
      // C1 demand gate: only embed (and thus match + skills-analyse) a freshly
      // ingested job when SOME active candidate targets its category+country. If
      // no one targets it, defer — the job stays without an embedding sibling
      // (its "pending" state) and is excluded from matching until a candidate for
      // that category+country appears, at which point the lazy backfill embeds it.
      const inDemand = await this.embeddingService.jobIsInActiveDemand(
        saved.canonicalCategory,
        saved.country,
      );
      if (!inDemand) {
        return;
      }
      const embedded = await this.embeddingService.embedExternalJob(saved.id);
      const matches = embedded
        ? await this.candidateJobMatchingService.matchJobToCandidates(saved.id)
        : [];
      if (matches.length > 0) {
        await this.enrichMatchedJobSkills(saved);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to embed/match/enrich job ${saved.id}: ${message}`);
    }
  }

  // Bounded safety net: re-analyses matched jobs whose ingest-time enrich failed.
  // One Gemini analysis call per job, capped by aiBudget so each 6-hourly run
  // stays cheap; jobs that got skills are re-embedded so the vector reflects them.
  // The bulk one-time backfill is the pnpm backfill:job-skills script.
  async backfillJobSkills(limit = 200): Promise<{ updated: number }> {
    const aiBudget = 25;
    const pending = (await this.externalJobRepo.jobsMissingSkills(limit)).slice(0, aiBudget);
    if (pending.length === 0) return { updated: 0 };

    const results = await Promise.all(
      pending.map(async (job) => {
        const analysis = await this.jobCategorizationService.analyzeJob({
          title: job.title,
          providerCategory: job.category,
          description: job.description,
        });
        return { id: job.id, skills: analysis.skills, skipped: analysis.skipped ?? false };
      }),
    );
    // Stamp every analysed job (even those with no extractable skills) so they
    // leave the queue and aren't re-analysed forever; re-embed the ones that
    // gained skills so their vector reflects them. Skip jobs the daily cap
    // deferred so they're retried another day.
    const analysed = results.filter((result) => !result.skipped);
    await Promise.all(
      analysed.map(async (result) => {
        await this.externalJobRepo.updateExtractedSkills(result.id, result.skills);
        if (result.skills.length > 0) {
          await this.embeddingService.embedExternalJob(result.id);
        }
      }),
    );
    const withSkills = analysed.filter((result) => result.skills.length > 0).length;
    this.logger.log(`Analysed ${analysed.length} job(s) for skills, ${withSkills} had skills`);
    return { updated: withSkills };
  }

  // Gradual self-healing backfill of job coordinates (and any new job whose
  // ingest-time geocode missed). The free static SA gazetteer resolves most jobs;
  // only the misses hit the paid Google fallback, so each 6-hourly run is bounded
  // by geocodeBudget. The bulk one-time backfill is the pnpm backfill:job-coords
  // script. Every attempt is stamped so unresolved jobs aren't retried forever.
  async backfillJobCoords(limit = 200): Promise<{ updated: number }> {
    const geocodeBudget = 25;
    const pending = (await this.externalJobRepo.jobsMissingCoords(limit)).slice(0, geocodeBudget);
    if (pending.length === 0) return { updated: 0 };

    const results = await Promise.all(
      pending.map(async (job) => {
        const address = job.locationRaw ?? job.locationArea;
        const coords = address ? await this.resolveCoordinates(address) : null;
        return { id: job.id, lat: coords?.lat ?? null, lon: coords?.lon ?? null };
      }),
    );
    await Promise.all(
      results.map((result) =>
        this.externalJobRepo.markJobGeocoded(result.id, result.lat, result.lon),
      ),
    );
    const located = results.filter((result) => result.lat !== null).length;
    this.logger.log(`Geocoded ${results.length} job(s), ${located} located`);
    return { updated: located };
  }

  // Free SA gazetteer first (city/province centroid, no API, no key), then the
  // paid Google geocoder only for what it can't resolve (which no-ops to null
  // until a backend geocode key is configured).
  private async resolveCoordinates(address: string): Promise<{ lat: number; lon: number } | null> {
    const staticCoords = coordsForLocation(address);
    if (staticCoords) {
      return staticCoords;
    }
    return this.geocodeService.geocode(address);
  }

  // On-demand background pass that keeps categorizing pending jobs (rule-based,
  // then AI for the misses) until none remain — far faster than waiting for the
  // 6-hourly poll to chip away at the backlog. The admin UI polls categoryCoverage.
  startCategoryBackfillInBackground(): { started: boolean; alreadyRunning: boolean } {
    if (this.categoryBackfillRunning) {
      return { started: false, alreadyRunning: true };
    }
    this.categoryBackfillRunning = true;
    this.lastCategoryBackfillError = null;
    void this.extractionMetricService
      .time("orbit-category-backfill", "all", async () => {
        let totalUpdated = 0;
        for (let pass = 0; pass < 500; pass += 1) {
          const { updated } = await this.backfillCanonicalCategories(200);
          totalUpdated += updated;
          if (updated === 0) break;
        }
        this.logger.log(`On-demand category backfill complete: ${totalUpdated} jobs categorized`);
        return totalUpdated;
      })
      .catch((err) => {
        this.lastCategoryBackfillError = err instanceof Error ? err.message : String(err);
        this.logger.error(`On-demand category backfill failed: ${this.lastCategoryBackfillError}`);
      })
      .finally(() => {
        this.categoryBackfillRunning = false;
      });
    return { started: true, alreadyRunning: false };
  }

  async categoryCoverage(): Promise<{
    total: number;
    classified: number;
    running: boolean;
    lastError: string | null;
  }> {
    const { total, classified } = await this.externalJobRepo.canonicalCategoryCoverage();
    return {
      total,
      classified,
      running: this.categoryBackfillRunning,
      lastError: this.lastCategoryBackfillError,
    };
  }

  async ingestFromSource(
    source: JobMarketSource,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    if (this.ingestingSourceIds.has(source.id)) {
      this.logger.warn(`Skipping ingest for ${source.name} (${source.id}) — already in progress`);
      return { ingested: 0, skipped: 0, savedIds: [] };
    }
    this.ingestingSourceIds.add(source.id);
    try {
      return await this.performIngestFromSource(source, options);
    } finally {
      this.ingestingSourceIds.delete(source.id);
    }
  }

  private async performIngestFromSource(
    source: JobMarketSource,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const vetInline = (options.vetInline ?? true) && source.requiresVetting;

    if (source.provider === JobSourceProvider.DPSA) {
      return this.ingestDpsaSource(source);
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

          const result = await chunk(jobs, UPSERT_BATCH_SIZE).reduce(
            async (batchAccPromise, batch) => {
              const batchAcc = await batchAccPromise;
              const batchResult = await this.upsertJobs(batch, source, country, { vetInline });
              return {
                ingested: batchAcc.ingested + batchResult.ingested,
                skipped: batchAcc.skipped + batchResult.skipped,
                savedIds: [...batchAcc.savedIds, ...batchResult.savedIds],
              };
            },
            Promise.resolve({ ingested: 0, skipped: 0, savedIds: [] as number[] }),
          );
          return {
            ingested: acc.ingested + result.ingested,
            skipped: acc.skipped + result.skipped,
            savedIds: [...acc.savedIds, ...result.savedIds],
            error: acc.error,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error fetching ${category ?? "all"} jobs for ${country}: ${message}`);
          return { ...acc, error: message };
        }
      },
      Promise.resolve({
        ingested: 0,
        skipped: 0,
        savedIds: [] as number[],
        error: null as string | null,
      }),
    );

    source.lastIngestedAt = DateTime.now().toJSDate();
    if (totals.error) {
      this.lastIngestionErrorBySource.set(source.id, totals.error);
      source.lastIngestionError = totals.error;
      source.consecutiveIngestFailures = (source.consecutiveIngestFailures ?? 0) + 1;
    } else {
      this.lastIngestionErrorBySource.delete(source.id);
      source.lastIngestionError = null;
      source.consecutiveIngestFailures = 0;
    }
    await this.sourceRepo.save(source);

    this.logger.log(
      `Source ${source.name}: ingested ${totals.ingested}, skipped ${totals.skipped}`,
    );

    await this.maybeEmitZeroJobsAlert(source);

    return totals;
  }

  private async maybeEmitZeroJobsAlert(source: JobMarketSource): Promise<void> {
    // Only alert on a genuine fault — a recorded ingestion error this run. After
    // idempotent ingest "0 new jobs" is the normal steady state, so a quiet source
    // is not alert-worthy; staleness is surfaced on the admin dashboard instead.
    const recordedError = this.lastIngestionErrorBySource.get(source.id) ?? null;
    if (!recordedError) {
      return;
    }

    // Only prod is worth paging on — test/staging ingestion 503s are noise and
    // were doubling these emails (prod + test both alerting to the same inbox).
    if (currentOrbitEnvironment() !== "prod") {
      return;
    }

    // Suppress until the failure is sustained: a single transient blip that
    // recovers on the next scheduled run should not email.
    if ((source.consecutiveIngestFailures ?? 0) < ALERT_AFTER_CONSECUTIVE_FAILURES) {
      this.logger.warn(
        `Source ${source.name} failed (${source.consecutiveIngestFailures ?? 0}/${ALERT_AFTER_CONSECUTIVE_FAILURES}) — holding alert until sustained`,
      );
      return;
    }

    // Persisted cooldown so backend restarts/deploys don't re-trigger the alert.
    const lastAlertMs = source.lastHealthAlertAt
      ? DateTime.fromJSDate(source.lastHealthAlertAt).toMillis()
      : null;
    const cooledDown = !lastAlertMs || nowMillis() - lastAlertMs >= HEALTH_ALERT_COOLDOWN_MS;
    if (!cooledDown) {
      return;
    }

    const recipient =
      this.configService.get<string>("SUPPORT_EMAIL") ||
      this.configService.get<string>("EMAIL_FROM") ||
      "info@annix.co.za";
    const lastIngestedLabel = source.lastIngestedAt
      ? DateTime.fromJSDate(source.lastIngestedAt).toISO()
      : "never";
    const subject = `[Annix Orbit] Adapter ${source.name} may be failing`;
    const lines = [
      `Source: ${source.name} (id=${source.id}, provider=${source.provider})`,
      `Last ingestion attempt: ${lastIngestedLabel}`,
      `Ingestion error: ${recordedError}`,
      "Check for revoked API keys, rate limits, or upstream API changes.",
    ];
    const text = lines.join("\n");
    const html = `<p>${lines.map((line) => escapeHtml(line)).join("</p><p>")}</p>`;

    try {
      await this.emailService.sendEmail({ to: recipient, subject, text, html });
      source.lastHealthAlertAt = DateTime.now().toJSDate();
      await this.sourceRepo.save(source);
      this.logger.warn(`Emitted health alert for source ${source.name} (${source.id})`);
    } catch (err) {
      this.logger.error(
        `Failed to emit health alert for ${source.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async triggerIngestion(
    sourceId: number,
    options: { vetInline?: boolean } = {},
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    return this.extractionMetricService.time("orbit-source-ingest", source.provider, () =>
      this.ingestFromSource(source, options),
    );
  }

  async vetSingleJob(jobId: number): Promise<{ acceptsZa: boolean | null; notes: string }> {
    const job = await this.externalJobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    const result = await this.jobVettingService.vet({
      title: job.title,
      company: job.company,
      locationRaw: job.locationRaw,
      description: job.description,
    });
    await this.externalJobRepo.updateVetting(jobId, {
      acceptsZa: result.acceptsZa,
      vettingNotes: result.notes,
      vettedAt: DateTime.now().toJSDate(),
    });
    return result;
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
    const result = await this.externalJobRepo.platformGlobalExternalJobs(options);
    await this.attachSourceInfo(result.jobs);
    return result;
  }

  private async attachSourceInfo(jobs: ExternalJob[]): Promise<void> {
    const sourceIds = [...new Set(jobs.map((job) => job.sourceId))];
    if (sourceIds.length === 0) return;
    const sources = await this.sourceRepo.findByIds(sourceIds);
    const byId = new Map(sources.map((source) => [source.id, source]));
    jobs.forEach((job) => {
      const source = byId.get(job.sourceId);
      if (source) job.source = source;
    });
  }

  private async ingestDpsaSource(
    source: JobMarketSource,
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    const result = await this.dpsaCircularService.ingestLatestCircular(source);

    source.lastIngestedAt = DateTime.now().toJSDate();
    source.lastIngestionError = null;
    this.lastIngestionErrorBySource.delete(source.id);
    await this.sourceRepo.save(source);

    return { ingested: result.ingested, skipped: 0, savedIds: [] };
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
            await this.externalJobRepo.updateVetting(saved.id, {
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
    const pending = await this.externalJobRepo.findPendingVetting(limit);

    const tally = await pending.reduce(
      async (accPromise, job) => {
        const acc = await accPromise;
        const result = await this.jobVettingService.vet({
          title: job.title,
          company: job.company,
          locationRaw: job.locationRaw,
          description: job.description,
        });
        await this.externalJobRepo.updateVetting(job.id, {
          acceptsZa: result.acceptsZa,
          vettingNotes: result.notes,
          vettedAt: DateTime.now().toJSDate(),
        });
        if (result.acceptsZa === true) {
          return { ...acc, accepted: acc.accepted + 1 };
        } else if (result.acceptsZa === false) {
          return { ...acc, rejected: acc.rejected + 1 };
        } else {
          return { ...acc, ambiguous: acc.ambiguous + 1 };
        }
      },
      Promise.resolve({ accepted: 0, rejected: 0, ambiguous: 0 }),
    );

    return {
      vetted: pending.length,
      accepted: tally.accepted,
      rejected: tally.rejected,
      ambiguous: tally.ambiguous,
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
      jobCount: number;
    }>;
  }> {
    const sources = await this.sourceRepo.findPlatformGlobal();
    const sourceIds = sources.map((s) => s.id);

    const perSourceCounts = await this.externalJobRepo.perSourceJobCounts(sourceIds);
    const countBySource = new Map<number, number>(
      perSourceCounts.map((row) => [row.sourceId, row.count]),
    );

    const totalJobs = await this.externalJobRepo.countForSources(sourceIds);

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const jobsLast7Days = await this.externalJobRepo.countForSourcesSince(sourceIds, sevenDaysAgo);

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
        jobCount: countBySource.get(s.id) ?? 0,
      })),
    };
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
    return this.externalJobRepo.externalJobsForCompany(companyId, options);
  }

  async externalJobById(jobId: number): Promise<ExternalJob | null> {
    return this.externalJobRepo.findByIdWithSource(jobId);
  }

  async findDuplicateJobPairs(limit = 100): Promise<DuplicateJobPair[]> {
    const capped = Math.min(Math.max(limit, 1), 500);
    return this.externalJobRepo.findDuplicateJobPairs(capped);
  }

  async deleteExternalJob(jobId: number): Promise<void> {
    await this.alternateRepo.deleteByCanonicalId(jobId);
    await this.externalJobRepo.deleteById(jobId);
  }

  async deleteExternalJobs(ids: number[]): Promise<{ deleted: number }> {
    const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) {
      return { deleted: 0 };
    }
    await this.alternateRepo.deleteByCanonicalIds(unique);
    await this.externalJobRepo.deleteByIds(unique);
    this.logger.log(`Bulk-deleted ${unique.length} external job listing(s)`);
    return { deleted: unique.length };
  }

  async expireStaleJobs(): Promise<{ expired: number }> {
    const expired = await this.externalJobRepo.expireStaleJobs();
    if (expired > 0) {
      this.logger.log(
        `Stale-job sweep: hid ${expired} listing(s) absent from their source for 14+ days`,
      );
    }
    return { expired };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "annix-orbit:prune-stale-jobs" })
  async pruneStaleJobs(): Promise<{ pruned: number }> {
    if (!isAnnixOrbitCronEnabled()) return { pruned: 0 };
    const staleDeleteDays = 30;
    const cutoff = now().minus({ days: staleDeleteDays }).toJSDate();
    const staleIds = await this.externalJobRepo.idsLastSeenBefore(cutoff);
    let deleted = 0;
    if (staleIds.length > 0) {
      deleted = (await this.deleteExternalJobs(staleIds)).deleted;
      this.logger.log(
        `Stale-job prune: deleted ${deleted} listing(s) unseen for ${staleDeleteDays}+ days`,
      );
    }
    await this.candidateJobMatchingService.pruneMatchStorage().catch((error) => {
      this.logger.warn(`Match storage prune failed: ${error.message}`);
    });
    return { pruned: deleted };
  }

  async autoResolveDuplicates(): Promise<{ deleted: number; groups: number }> {
    const rows = await this.externalJobRepo.dedupCandidateRows();

    const rankRows = await this.sourceRespectRankRepo.findAll();
    const rankByProvider = new Map(rankRows.map((row) => [row.provider, row.rank]));
    const rankFor = (provider: string): number =>
      rankByProvider.get(provider) ?? sourceRespectRank(provider);

    const preferenceSort = (bucket: DedupCandidateRow[]): DedupCandidateRow[] =>
      [...bucket].sort((a, b) => {
        const rankDiff = rankFor(b.provider) - rankFor(a.provider);
        if (rankDiff !== 0) return rankDiff;
        const compDiff = (b.company === "" ? 0 : 1) - (a.company === "" ? 0 : 1);
        if (compDiff !== 0) return compDiff;
        const lenDiff = b.descriptionLength - a.descriptionLength;
        if (lenDiff !== 0) return lenDiff;
        const aTime = a.createdAt ? DateTime.fromJSDate(a.createdAt).toMillis() : 0;
        const bTime = b.createdAt ? DateTime.fromJSDate(b.createdAt).toMillis() : 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.id - b.id;
      });

    const deletionsFor = (bucket: DedupCandidateRow[]): number[] => {
      const named = bucket.filter((r) => r.company !== "");
      const distinctEmployers = new Set(named.map((r) => r.company));
      if (distinctEmployers.size <= 1) {
        return preferenceSort(bucket)
          .slice(1)
          .map((r) => r.id);
      }
      const byEmployer = named.reduce((map, row) => {
        const sub = map.get(row.company);
        if (sub) sub.push(row);
        else map.set(row.company, [row]);
        return map;
      }, new Map<string, DedupCandidateRow[]>());
      const sameEmployerDeletions = [...byEmployer.values()]
        .filter((sub) => sub.length > 1)
        .flatMap((sub) =>
          preferenceSort(sub)
            .slice(1)
            .map((r) => r.id),
        );
      const namedProviders = new Set(named.map((r) => r.provider));
      const blankSameSourceDeletions = bucket
        .filter((r) => r.company === "" && namedProviders.has(r.provider))
        .map((r) => r.id);
      return [...sameEmployerDeletions, ...blankSameSourceDeletions];
    };

    const grouped = rows.reduce((map, row) => {
      const key = `${row.title}||${row.locationArea}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
      return map;
    }, new Map<string, DedupCandidateRow[]>());

    const bucketDeletions = [...grouped.values()]
      .filter((bucket) => bucket.length > 1)
      .map((bucket) => deletionsFor(bucket));

    const idsToDelete = bucketDeletions.flat();
    const resolvedGroups = bucketDeletions.filter((ids) => ids.length > 0).length;

    if (idsToDelete.length === 0) {
      return { deleted: 0, groups: 0 };
    }

    await this.alternateRepo.deleteByCanonicalIds(idsToDelete);
    await this.externalJobRepo.deleteByIds(idsToDelete);

    this.logger.log(
      `Auto-resolved ${resolvedGroups} duplicate group(s), removed ${idsToDelete.length} listing(s)`,
    );
    return { deleted: idsToDelete.length, groups: resolvedGroups };
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
    const externalLimit = page * limit;

    const annixJobs = await this.activeAnnixPublicJobs(options);

    const externalPage = await this.externalJobRepo.publicExternalJobs({
      ...options,
      page: 1,
      limit: externalLimit,
    });
    const externalPublic = externalPage.jobs.map(toPublicJob);

    const merged = [...annixJobs, ...externalPublic].sort((a, b) => {
      const aPosted = a.postedAt;
      const bPosted = b.postedAt;
      if (!aPosted && !bPosted) return 0;
      if (!aPosted) return 1;
      if (!bPosted) return -1;
      return bPosted.localeCompare(aPosted);
    });

    const total = annixJobs.length + externalPage.total;
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
    const jobs = await this.jobPostingRepo.activePublicJobs(options.search);
    if (jobs.length === 0) return [];
    const companyIds = [...new Set(jobs.map((j) => j.companyId))];
    const companies = await Promise.all(companyIds.map((id) => this.companyRepo.findById(id)));
    const nameById = new Map(
      companies.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c.id, c.name]),
    );
    return jobs.map((j) => annixJobToPublic(j, nameById.get(j.companyId) ?? null));
  }

  async publicJobById(jobId: number): Promise<PublicJob | null> {
    const job = await this.externalJobRepo.findById(jobId);
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
    const sources = await this.sourceRepo.findForCompany(companyId);
    const sourceIds = sources.map((s) => s.id);

    const totalJobs = await this.externalJobRepo.countForSources(sourceIds);

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const jobsLast7Days = await this.externalJobRepo.countForSourcesSince(sourceIds, sevenDaysAgo);

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
    if (
      source.provider === JobSourceProvider.CAREERJET ||
      source.provider === JobSourceProvider.JOOBLE
    ) {
      return Boolean(source.apiKeyEncrypted);
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
    if (source.provider === JobSourceProvider.CAREERJET) {
      const { jobs, requests } = await this.careerjetService.searchAcrossCategories(
        source.apiKeyEncrypted!,
      );
      source.requestsToday += requests;
      return jobs;
    }
    if (source.provider === JobSourceProvider.JOOBLE) {
      source.requestsToday += 1;
      const { jobs } = await this.joobleService.searchJobs(source.apiKeyEncrypted!, {
        keywords: category ?? undefined,
        location: joobleLocationForCountry(country),
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
    const collected = await categories.reduce(
      async (accPromise, cat) => {
        const acc = await accPromise;
        if (source.requestsToday >= source.rateLimitPerDay) {
          this.logger.warn(`Adzuna daily request limit reached for source ${source.name}`);
          return acc;
        }
        const catJobs = await this.fetchAdzunaCategoryPages(source, country, cat);
        return [...acc, ...catJobs];
      },
      Promise.resolve([] as IngestedJobResult[]),
    );
    return collected;
  }

  private async fetchAdzunaCategoryPages(
    source: JobMarketSource,
    country: string,
    category: string,
  ): Promise<IngestedJobResult[]> {
    const pages = Array.from({ length: ADZUNA_PAGES_PER_CATEGORY }, (_, index) => index + 1);
    const collected = await pages.reduce(
      async (accPromise, page) => {
        const acc = await accPromise;
        if (acc.stop || source.requestsToday >= source.rateLimitPerDay) {
          return { ...acc, stop: true };
        }
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
        const next = [...acc.jobs, ...jobs];
        return { jobs: next, stop: jobs.length < ADZUNA_PAGE_SIZE };
      },
      Promise.resolve({ jobs: [] as IngestedJobResult[], stop: false }),
    );
    return collected.jobs;
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

    const existingJobs = await this.externalJobRepo.findByExternalIds(externalIds, source.id);
    const existingAlternates = await this.alternateRepo.findByExternalIds(externalIds, source.id);

    const alreadyKnown = new Set<string>();
    existingJobs.forEach((j) => alreadyKnown.add(j.sourceExternalId));
    existingAlternates.forEach((a) => alreadyKnown.add(a.sourceExternalId));

    const seenAt = DateTime.now().toJSDate();
    await this.externalJobRepo.stampLastSeenByExternalIds(source.id, externalIds, seenAt);
    const canonicalIdsFromAlternates = [
      ...new Set(existingAlternates.map((a) => a.canonicalExternalJobId)),
    ];
    await this.externalJobRepo.stampLastSeenByIds(canonicalIdsFromAlternates, seenAt);

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
      );
    }

    const savedJobsRaw = await Promise.all(
      fresh.map(async (job) => {
        try {
          const resolvedLocation = resolveLocation(
            `${job.locationArea ?? ""} ${job.locationDisplayName ?? ""}`,
          );
          const monthly = resolveMonthlySalary(source.provider, job.salaryMin, job.salaryMax);
          return await this.externalJobRepo.create({
            title: job.title,
            titleKey: normaliseTitleKey(job.title),
            company: job.company,
            country,
            locationRaw: job.locationDisplayName,
            locationArea: job.locationArea,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: country === "za" ? "ZAR" : null,
            salaryPeriod: monthly.salaryPeriod,
            salaryMonthlyMin: monthly.salaryMonthlyMin,
            salaryMonthlyMax: monthly.salaryMonthlyMax,
            description: capDescription(job.description),
            category: job.category,
            canonicalCategory: this.jobCategorizationService.ruleBased({
              title: job.title,
              providerCategory: job.category,
            }),
            canonicalProvince: resolvedLocation.province,
            canonicalCity: resolvedLocation.city,
            sourceExternalId: job.id,
            sourceUrl: job.redirectUrl,
            postedAt: job.created ? fromISO(job.created).toJSDate() : null,
            expiresAt: this.estimateExpiryForSource(source, job.created),
            lastSeenAt: seenAt,
            sourceId: source.id,
          });
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            await this.externalJobRepo.stampLastSeenByExternalIds(source.id, [job.id], seenAt);
            return null;
          }
          throw error;
        }
      }),
    );
    const savedJobs = savedJobsRaw.filter((job): job is ExternalJob => job !== null);

    savedJobs.forEach((saved) => {
      const addressForGeocode = saved.locationRaw ?? saved.locationArea;
      if (addressForGeocode) {
        this.resolveCoordinates(addressForGeocode)
          .then((coords) =>
            // Stamp geocodeAttemptedAt even on a miss so the backfill doesn't retry it.
            this.externalJobRepo.markJobGeocoded(
              saved.id,
              coords?.lat ?? null,
              coords?.lon ?? null,
            ),
          )
          .catch((err) => {
            this.logger.warn(`Failed to geocode job ${saved.id}: ${err.message}`);
          });
      }
    });

    this.enrichSavedJobsInBackground(savedJobs);

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

    return this.externalJobRepo.findDuplicateCanonicalJob(
      title,
      source.id,
      country,
      normalisedLocation,
      normalisedCompany,
    );
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

function capDescription(description: string | null): string | null {
  if (description === null) return null;
  return description.length > DESCRIPTION_LIMIT
    ? description.slice(0, DESCRIPTION_LIMIT)
    : description;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
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
  const country = "ZA";
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
