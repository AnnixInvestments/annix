import { Injectable } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { SA_SALARY_RANGES } from "../config/sa-market.config";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";

export interface SalaryBenchmark {
  category: string;
  averageSalary: number | null;
  medianSalary: number | null;
  minSalary: number | null;
  maxSalary: number | null;
  sampleSize: number;
  salaryBand: string | null;
}

export interface DemandTrend {
  category: string;
  currentCount: number;
  previousCount: number;
  changePercent: number;
  trend: "rising" | "falling" | "stable";
}

export interface LocationDemand {
  location: string;
  jobCount: number;
  averageSalary: number | null;
  costOfLivingIndex: number;
  adjustedSalary: number | null;
}

export interface MarketInsights {
  salaryBenchmarks: SalaryBenchmark[];
  demandTrends: DemandTrend[];
  topLocations: LocationDemand[];
  topSkills: Array<{ skill: string; count: number }>;
  totalActiveJobs: number;
  dataAsOf: string;
}

@Injectable()
export class MarketInsightsService {
  constructor(
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly sourceRepo: JobMarketSourceRepository,
  ) {}

  async insights(companyId: number): Promise<MarketInsights> {
    const sourceIds = await this.companySourceIds(companyId);

    if (sourceIds.length === 0) {
      return {
        salaryBenchmarks: [],
        demandTrends: [],
        topLocations: [],
        topSkills: [],
        totalActiveJobs: 0,
        dataAsOf: DateTime.now().toISO() ?? "",
      };
    }

    const [salaryBenchmarks, demandTrends, topLocations, topSkills, totalActiveJobs] =
      await Promise.all([
        this.salaryBenchmarks(sourceIds),
        this.demandTrends(sourceIds),
        this.locationDemand(sourceIds),
        this.topExtractedSkills(sourceIds),
        this.activeJobCount(sourceIds),
      ]);

    return {
      salaryBenchmarks,
      demandTrends,
      topLocations,
      topSkills,
      totalActiveJobs,
      dataAsOf: DateTime.now().toISO() ?? "",
    };
  }

  private async companySourceIds(companyId: number): Promise<number[]> {
    return this.sourceRepo.sourceIdsForCompany(companyId);
  }

  private async salaryBenchmarks(sourceIds: number[]): Promise<SalaryBenchmark[]> {
    const results = await this.externalJobRepo.salaryBenchmarks(sourceIds);

    return results.map((row) => {
      const avgSalary = row.avgSalary ? Math.round(Number(row.avgSalary)) : null;
      const salaryBand = avgSalary
        ? (SA_SALARY_RANGES.bands.find(
            (b) => avgSalary >= b.min && (b.max === null || avgSalary < b.max),
          )?.monthly ?? null)
        : null;

      return {
        category: row.category,
        averageSalary: avgSalary,
        medianSalary: avgSalary,
        minSalary: row.minSalary ? Math.round(Number(row.minSalary)) : null,
        maxSalary: row.maxSalary ? Math.round(Number(row.maxSalary)) : null,
        sampleSize: Number(row.sampleSize),
        salaryBand,
      };
    });
  }

  private async demandTrends(sourceIds: number[]): Promise<DemandTrend[]> {
    const now = DateTime.now();
    const currentStart = now.minus({ days: 7 }).toJSDate();
    const previousStart = now.minus({ days: 14 }).toJSDate();

    const currentCounts = await this.externalJobRepo.demandCounts(sourceIds, currentStart, null);

    const previousCounts = await this.externalJobRepo.demandCounts(
      sourceIds,
      previousStart,
      currentStart,
    );

    const previousMap = new Map(previousCounts.map((r) => [r.category, Number(r.count)]));

    return currentCounts
      .map((row) => {
        const currentCount = Number(row.count);
        const previousCount = previousMap.get(row.category) ?? 0;
        const changePercent =
          previousCount > 0
            ? Math.round(((currentCount - previousCount) / previousCount) * 100)
            : currentCount > 0
              ? 100
              : 0;

        const trend: "rising" | "falling" | "stable" =
          changePercent > 10 ? "rising" : changePercent < -10 ? "falling" : "stable";

        return {
          category: row.category,
          currentCount,
          previousCount,
          changePercent,
          trend,
        };
      })
      .sort((a, b) => b.currentCount - a.currentCount);
  }

  private async locationDemand(sourceIds: number[]): Promise<LocationDemand[]> {
    const results = await this.externalJobRepo.locationDemand(sourceIds);

    return results.map((row) => {
      const avgSalary = row.avgSalary ? Math.round(Number(row.avgSalary)) : null;
      const costOfLivingIndex = SA_SALARY_RANGES.costOfLivingIndex[row.location] ?? 1.0;
      const adjustedSalary = avgSalary ? Math.round(avgSalary / costOfLivingIndex) : null;

      return {
        location: row.location,
        jobCount: Number(row.jobCount),
        averageSalary: avgSalary,
        costOfLivingIndex,
        adjustedSalary,
      };
    });
  }

  private async topExtractedSkills(
    sourceIds: number[],
  ): Promise<Array<{ skill: string; count: number }>> {
    const jobs = await this.externalJobRepo.topExtractedSkillRows(sourceIds);

    const skillCounts = jobs
      .flatMap((row) => {
        const skills: string[] = Array.isArray(row.skills) ? row.skills : [];
        return skills.map((skill) => skill.toLowerCase().trim());
      })
      .reduce<Map<string, number>>((acc, normalised) => {
        const current = acc.get(normalised) ?? 0;
        return new Map([...acc, [normalised, current + 1]]);
      }, new Map());

    return Array.from(skillCounts.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private async activeJobCount(sourceIds: number[]): Promise<number> {
    return this.externalJobRepo.activeJobCount(sourceIds);
  }
}
