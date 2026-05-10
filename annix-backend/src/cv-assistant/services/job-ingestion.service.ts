import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DateTime, fromISO } from "../../lib/datetime";
import { isCvAssistantCronEnabled } from "../cv-assistant-cron.config";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { AdzunaService } from "./adzuna.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { EmbeddingService } from "./embedding.service";
import { IngestedJobResult } from "./ingested-job.types";
import { JoobleService } from "./jooble.service";

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly adzunaService: AdzunaService,
    private readonly joobleService: JoobleService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: "cv-assistant:poll-job-sources" })
  async pollSources(): Promise<void> {
    if (!isCvAssistantCronEnabled()) return;
    const sources = await this.sourceRepo.find({ where: { enabled: true } });

    const dueForIngestion = sources.filter((source) => this.isDueForIngestion(source));

    await dueForIngestion.reduce(async (prev, source) => {
      await prev;
      try {
        await this.ingestFromSource(source);
      } catch (error) {
        this.logger.error(
          `Failed to ingest from source ${source.name} (${source.id}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }, Promise.resolve());
  }

  async ingestFromSource(source: JobMarketSource): Promise<{ ingested: number; skipped: number }> {
    this.resetDailyCounterIfNeeded(source);

    if (source.requestsToday >= source.rateLimitPerDay) {
      this.logger.warn(
        `Rate limit reached for source ${source.name} (${source.requestsToday}/${source.rateLimitPerDay})`,
      );
      return { ingested: 0, skipped: 0 };
    }

    if (!this.hasRequiredCredentials(source)) {
      this.logger.warn(`Source ${source.name} missing API credentials`);
      return { ingested: 0, skipped: 0 };
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

          source.requestsToday += 1;

          const result = await this.upsertJobs(jobs, source, country);
          return {
            ingested: acc.ingested + result.ingested,
            skipped: acc.skipped + result.skipped,
          };
        } catch (error) {
          this.logger.error(
            `Error fetching ${category ?? "all"} jobs for ${country}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return acc;
        }
      },
      Promise.resolve({ ingested: 0, skipped: 0 }),
    );

    source.lastIngestedAt = DateTime.now().toJSDate();
    await this.sourceRepo.save(source);

    this.logger.log(
      `Source ${source.name}: ingested ${totals.ingested}, skipped ${totals.skipped}`,
    );

    return totals;
  }

  async triggerIngestion(sourceId: number): Promise<{ ingested: number; skipped: number }> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    return this.ingestFromSource(source);
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

    const qb = this.externalJobRepo.createQueryBuilder("job");
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
    if (source.provider === JobSourceProvider.JOOBLE) {
      return Boolean(source.apiKeyEncrypted);
    }
    return Boolean(source.apiId && source.apiKeyEncrypted);
  }

  private async fetchJobsFromProvider(
    source: JobMarketSource,
    country: string,
    category: string | null,
  ): Promise<IngestedJobResult[]> {
    if (source.provider === JobSourceProvider.JOOBLE) {
      const { jobs } = await this.joobleService.searchJobs(source.apiKeyEncrypted!, {
        keywords: category ?? undefined,
        location: joobleLocationForCountry(country),
        resultsPerPage: 50,
      });
      return jobs;
    }
    const { jobs } = await this.adzunaService.searchJobs(
      source.apiId!,
      source.apiKeyEncrypted!,
      country,
      {
        category: category ?? undefined,
        maxDaysOld: 7,
        resultsPerPage: 50,
      },
    );
    return jobs;
  }

  private async upsertJobs(
    jobs: IngestedJobResult[],
    source: JobMarketSource,
    country: string,
  ): Promise<{ ingested: number; skipped: number }> {
    const externalIds = jobs.map((job) => job.id);

    const existingJobs = await this.externalJobRepo.find({
      where: { sourceExternalId: In(externalIds), sourceId: source.id },
      select: ["sourceExternalId"],
    });

    const existingExternalIds = new Set(existingJobs.map((j) => j.sourceExternalId));

    const newJobs = jobs.filter((job) => !existingExternalIds.has(job.id));

    const savedJobs = await Promise.all(
      newJobs.map((job) => {
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

    return { ingested: savedJobs.length, skipped: jobs.length - newJobs.length };
  }

  private estimateExpiryForSource(source: JobMarketSource, postedDate: string | null): Date | null {
    if (source.provider === JobSourceProvider.JOOBLE) {
      return this.joobleService.estimateExpiry(postedDate);
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

function joobleLocationForCountry(country: string): string {
  const code = country.toLowerCase();
  if (code === "za") return "South Africa";
  if (code === "gb" || code === "uk") return "United Kingdom";
  if (code === "us") return "United States";
  if (code === "ca") return "Canada";
  if (code === "au") return "Australia";
  return country;
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
