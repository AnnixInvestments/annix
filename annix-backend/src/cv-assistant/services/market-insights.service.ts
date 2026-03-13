import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DateTime } from "../../lib/datetime";
import { SA_SALARY_RANGES } from "../config/sa-market.config";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource } from "../entities/job-market-source.entity";

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
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
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
    const sources = await this.sourceRepo.find({
      where: { companyId },
      select: ["id"],
    });
    return sources.map((s) => s.id);
  }

  private async salaryBenchmarks(sourceIds: number[]): Promise<SalaryBenchmark[]> {
    const results = await this.externalJobRepo
      .createQueryBuilder("job")
      .select("job.category", "category")
      .addSelect(
        "AVG((COALESCE(job.salary_min, 0) + COALESCE(job.salary_max, 0)) / 2)",
        "avgSalary",
      )
      .addSelect("MIN(job.salary_min)", "minSalary")
      .addSelect("MAX(job.salary_max)", "maxSalary")
      .addSelect("COUNT(*)", "sampleSize")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.salary_min IS NOT NULL OR job.salary_max IS NOT NULL")
      .andWhere("job.category IS NOT NULL")
      .groupBy("job.category")
      .orderBy('"sampleSize"', "DESC")
      .limit(10)
      .getRawMany();

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

    const currentCounts = await this.externalJobRepo
      .createQueryBuilder("job")
      .select("job.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.created_at >= :start", { start: currentStart })
      .andWhere("job.category IS NOT NULL")
      .groupBy("job.category")
      .getRawMany();

    const previousCounts = await this.externalJobRepo
      .createQueryBuilder("job")
      .select("job.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.created_at >= :start AND job.created_at < :end", {
        start: previousStart,
        end: currentStart,
      })
      .andWhere("job.category IS NOT NULL")
      .groupBy("job.category")
      .getRawMany();

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
    const results = await this.externalJobRepo
      .createQueryBuilder("job")
      .select("job.location_area", "location")
      .addSelect("COUNT(*)", "jobCount")
      .addSelect(
        "AVG((COALESCE(job.salary_min, 0) + COALESCE(job.salary_max, 0)) / 2)",
        "avgSalary",
      )
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("job.location_area IS NOT NULL")
      .groupBy("job.location_area")
      .orderBy('"jobCount"', "DESC")
      .limit(10)
      .getRawMany();

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
    const jobs = await this.externalJobRepo
      .createQueryBuilder("job")
      .select("job.extracted_skills", "skills")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("jsonb_array_length(job.extracted_skills) > 0")
      .orderBy("job.created_at", "DESC")
      .limit(500)
      .getRawMany();

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
    return this.externalJobRepo
      .createQueryBuilder("job")
      .where("job.source_id IN (:...sourceIds)", { sourceIds })
      .andWhere("(job.expires_at IS NULL OR job.expires_at > NOW())")
      .getCount();
  }
}
