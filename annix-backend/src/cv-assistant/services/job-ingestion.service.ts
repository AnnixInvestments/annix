import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DateTime, fromISO } from "../../lib/datetime";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource } from "../entities/job-market-source.entity";
import { AdzunaJobResult, AdzunaService } from "./adzuna.service";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { EmbeddingService } from "./embedding.service";

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    private readonly adzunaService: AdzunaService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async pollSources(): Promise<void> {
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

    if (!source.apiId || !source.apiKeyEncrypted) {
      this.logger.warn(`Source ${source.name} missing API credentials`);
      return { ingested: 0, skipped: 0 };
    }

    const countryCategories = source.countryCodes.flatMap((country) => {
      const categories =
        source.categories.length > 0 ? source.categories : [undefined as string | undefined];
      return categories.map((category) => ({ country, category }));
    });

    const totals = await countryCategories.reduce(
      async (accPromise, { country, category }) => {
        const acc = await accPromise;
        if (source.requestsToday >= source.rateLimitPerDay) {
          return acc;
        }

        try {
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

    this.logger.log(`Source ${source.name}: ingested ${totals.ingested}, skipped ${totals.skipped}`);

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

    qb.orderBy("job.posted_at", "DESC", "NULLS LAST")
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await qb.getManyAndCount();
    return { jobs, total };
  }

  async externalJobById(jobId: number): Promise<ExternalJob | null> {
    return this.externalJobRepo.findOne({ where: { id: jobId }, relations: ["source"] });
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

  private async upsertJobs(
    jobs: AdzunaJobResult[],
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
          expiresAt: this.adzunaService.estimateExpiry(job.created),
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
