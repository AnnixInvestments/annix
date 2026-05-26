import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { JobSourceProvider } from "../entities/job-market-source.entity";
import { SalaryBenchmark, SalaryBenchmarkSource } from "../entities/salary-benchmark.entity";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";
import { SalaryBenchmarkRepository } from "../repositories/salary-benchmark.repository";
import { AdzunaService } from "./adzuna.service";

/**
 * Top SA title × province combinations to cache. Curated rather than
 * derived from posting volume initially — once we have enough internal
 * job postings, the cron should pick the top N from
 * cv_assistant_job_postings instead.
 */
const SEED_COMBINATIONS: Array<{ title: string; province: string | null }> = [
  // National (any province)
  { title: "External Sales Representative", province: null },
  { title: "Internal Sales Consultant", province: null },
  { title: "Technical Sales Representative", province: null },
  { title: "Sales Manager", province: null },
  { title: "Account Manager", province: null },
  { title: "Software Developer", province: null },
  { title: "Senior Software Engineer", province: null },
  { title: "Project Manager", province: null },
  { title: "Mechanical Engineer", province: null },
  { title: "Electrical Engineer", province: null },
  { title: "Civil Engineer", province: null },
  { title: "Production Manager", province: null },
  { title: "Operations Manager", province: null },
  { title: "Finance Manager", province: null },
  { title: "Bookkeeper", province: null },
  { title: "Accountant", province: null },
  { title: "Receptionist", province: null },
  { title: "Administrator", province: null },
  { title: "Boilermaker", province: null },
  { title: "Diesel Mechanic", province: null },
  { title: "Driver", province: null },
  { title: "Warehouse Manager", province: null },
  { title: "Procurement Manager", province: null },
  { title: "HR Manager", province: null },
  { title: "Marketing Manager", province: null },
  // Province-specific (top 4 economic provinces)
  { title: "External Sales Representative", province: "Gauteng" },
  { title: "External Sales Representative", province: "Western Cape" },
  { title: "Software Developer", province: "Gauteng" },
  { title: "Software Developer", province: "Western Cape" },
  { title: "Mechanical Engineer", province: "Gauteng" },
];

const STALE_AFTER_HOURS = 26;
const ADZUNA_COUNTRY = "za";

@Injectable()
export class SalaryBenchmarkService {
  private readonly logger = new Logger(SalaryBenchmarkService.name);

  constructor(
    private readonly benchmarkRepo: SalaryBenchmarkRepository,
    private readonly jobMarketSourceRepo: JobMarketSourceRepository,
    private readonly adzunaService: AdzunaService,
  ) {}

  /**
   * Look up the cached benchmark for a title + province, or null if missing
   * or stale. Stale rows are returned by `freshBenchmark()` if they're
   * less than 7 days old as a stop-gap; the GET endpoint will use this.
   */
  async cachedBenchmark(
    normalizedTitle: string,
    province: string | null,
  ): Promise<SalaryBenchmark | null> {
    return this.benchmarkRepo.findByTitleAndProvince(normalizedTitle, province ?? "");
  }

  /**
   * Refresh up to N stale or missing benchmarks. Called by the daily cron
   * but also exposed so admin tooling can force-refresh.
   */
  async refreshStaleBenchmarks(maxToRefresh = SEED_COMBINATIONS.length): Promise<{
    refreshed: number;
    skipped: number;
    errors: number;
  }> {
    const adzunaSource = await this.jobMarketSourceRepo.findEnabledByProvider(
      JobSourceProvider.ADZUNA,
    );
    if (!adzunaSource?.apiId || !adzunaSource.apiKeyEncrypted) {
      this.logger.warn("Salary benchmark refresh skipped: no Adzuna JobMarketSource configured");
      return { refreshed: 0, skipped: SEED_COMBINATIONS.length, errors: 0 };
    }

    const staleCutoff = now().minus({ hours: STALE_AFTER_HOURS }).toJSDate();

    let refreshed = 0;
    let skipped = 0;
    let errors = 0;

    const toProcess = SEED_COMBINATIONS.slice(0, maxToRefresh);
    for (const combo of toProcess) {
      const provinceKey = combo.province ?? "";
      const existing = await this.benchmarkRepo.findByTitleAndProvince(combo.title, provinceKey);
      if (existing && existing.updatedAt > staleCutoff) {
        skipped++;
        continue;
      }

      try {
        const aggregates = await this.adzunaService.salaryAggregates(
          adzunaSource.apiId,
          adzunaSource.apiKeyEncrypted,
          ADZUNA_COUNTRY,
          {
            title: combo.title,
            province: combo.province,
            maxDaysOld: 60,
            maxPages: 2,
          },
        );

        if (aggregates.sampleSize < 5 || aggregates.p50 == null) {
          this.logger.warn(
            `Adzuna returned only ${aggregates.sampleSize} salaried results for ${combo.title} (${provinceKey || "ZA"}); skipping`,
          );
          skipped++;
          continue;
        }

        const confidence = Math.min(1, aggregates.sampleSize / 50);

        if (existing) {
          existing.minSalary = aggregates.p25 != null ? String(aggregates.p25) : null;
          existing.medianSalary = String(aggregates.p50);
          existing.maxSalary = aggregates.p75 != null ? String(aggregates.p75) : null;
          existing.sampleSize = aggregates.sampleSize;
          existing.source = SalaryBenchmarkSource.ADZUNA;
          existing.confidence = confidence.toFixed(2);
          await this.benchmarkRepo.save(existing);
        } else {
          await this.benchmarkRepo.create({
            normalizedTitle: combo.title,
            province: combo.province,
            minSalary: aggregates.p25 != null ? String(aggregates.p25) : null,
            medianSalary: String(aggregates.p50),
            maxSalary: aggregates.p75 != null ? String(aggregates.p75) : null,
            sampleSize: aggregates.sampleSize,
            source: SalaryBenchmarkSource.ADZUNA,
            confidence: confidence.toFixed(2),
          });
        }
        refreshed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Salary benchmark refresh failed for ${combo.title}: ${msg}`);
        errors++;
      }
    }

    this.logger.log(
      `Salary benchmark refresh complete: refreshed=${refreshed} skipped=${skipped} errors=${errors}`,
    );
    return { refreshed, skipped, errors };
  }

  /**
   * Drop benchmarks older than 14 days that haven't been re-fetched. Keeps
   * the cache from going stale if a title falls out of the seed list.
   */
  async pruneStale(): Promise<number> {
    const cutoff = now().minus({ days: 14 }).toJSDate();
    return this.benchmarkRepo.deleteOlderThan(cutoff);
  }

  @Cron("0 2 * * *", { name: "annix-orbit:refresh-salary-benchmarks" })
  async dailyRefresh(): Promise<void> {
    await this.refreshStaleBenchmarks();
    await this.pruneStale();
  }
}
