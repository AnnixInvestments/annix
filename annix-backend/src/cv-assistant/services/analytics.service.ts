import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DateTime, fromISO, now } from "../../lib/datetime";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { CandidateStatus, Candidate } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";

export interface FunnelStage {
  label: string;
  count: number;
  rate: number;
}

export interface ScoreBand {
  range: string;
  total: number;
  accepted: number;
  accuracy: number;
}

export interface TimeToFillByJob {
  title: string;
  averageDays: number;
  candidateCount: number;
}

export interface MarketCategoryCount {
  category: string;
  count: number;
}

export interface MarketLocationCount {
  location: string;
  count: number;
}

export interface MarketSalaryByCategory {
  category: string;
  averageSalaryMin: number;
  averageSalaryMax: number;
}

export interface MonthlyJobCount {
  month: string;
  count: number;
}

export interface SkillCount {
  skill: string;
  count: number;
}

const PAST_SCREENING_STATUSES = [
  CandidateStatus.SHORTLISTED,
  CandidateStatus.REFERENCE_CHECK,
  CandidateStatus.ACCEPTED,
  CandidateStatus.REJECTED,
];

const FUNNEL_STAGE_LABELS = [
  "CV Uploaded",
  "Screened",
  "Shortlisted",
  "Reference Check",
  "Accepted",
];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
  ) {}

  async conversionFunnel(
    companyId: number,
    dateFrom?: string | null,
    dateTo?: string | null,
  ): Promise<{ stages: FunnelStage[]; dateFrom: string | null; dateTo: string | null }> {
    const baseQuery = this.candidateRepo
      .createQueryBuilder("c")
      .innerJoin("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId });

    if (dateFrom) {
      baseQuery.andWhere("c.createdAt >= :dateFrom", {
        dateFrom: fromISO(dateFrom).toJSDate(),
      });
    }
    if (dateTo) {
      baseQuery.andWhere("c.createdAt <= :dateTo", {
        dateTo: fromISO(dateTo).toJSDate(),
      });
    }

    const totalCount = await baseQuery.clone().getCount();

    const screenedCount = await baseQuery
      .clone()
      .andWhere("c.status IN (:...statuses)", {
        statuses: PAST_SCREENING_STATUSES,
      })
      .getCount();

    const shortlistedCount = await baseQuery
      .clone()
      .andWhere("c.status IN (:...statuses)", {
        statuses: [
          CandidateStatus.SHORTLISTED,
          CandidateStatus.REFERENCE_CHECK,
          CandidateStatus.ACCEPTED,
        ],
      })
      .getCount();

    const referenceCheckCount = await baseQuery
      .clone()
      .andWhere("c.status IN (:...statuses)", {
        statuses: [CandidateStatus.REFERENCE_CHECK, CandidateStatus.ACCEPTED],
      })
      .getCount();

    const acceptedCount = await baseQuery
      .clone()
      .andWhere("c.status = :status", { status: CandidateStatus.ACCEPTED })
      .getCount();

    const counts = [
      totalCount,
      screenedCount,
      shortlistedCount,
      referenceCheckCount,
      acceptedCount,
    ];

    const stages = FUNNEL_STAGE_LABELS.map((label, index) => ({
      label,
      count: counts[index],
      rate:
        index === 0
          ? 100
          : counts[index - 1] > 0
            ? Math.round((counts[index] / counts[index - 1]) * 10000) / 100
            : 0,
    }));

    return {
      stages,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
    };
  }

  async matchAccuracy(companyId: number): Promise<{
    bands: ScoreBand[];
    overall: { total: number; accepted: number; accuracy: number };
  }> {
    const candidates = await this.candidateRepo
      .createQueryBuilder("c")
      .innerJoin("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId })
      .andWhere("c.matchScore IS NOT NULL")
      .select(["c.matchScore", "c.status"])
      .getMany();

    const bandRanges = [
      { range: "0-25", min: 0, max: 25 },
      { range: "25-50", min: 25, max: 50 },
      { range: "50-75", min: 50, max: 75 },
      { range: "75-100", min: 75, max: 100 },
    ];

    const bands = bandRanges.map(({ range, min, max }) => {
      const inBand = candidates.filter((c) => {
        const score = c.matchScore as number;
        if (max === 100) {
          return score >= min && score <= max;
        }
        return score >= min && score < max;
      });
      const accepted = inBand.filter((c) => c.status === CandidateStatus.ACCEPTED);
      return {
        range,
        total: inBand.length,
        accepted: accepted.length,
        accuracy:
          inBand.length > 0 ? Math.round((accepted.length / inBand.length) * 10000) / 100 : 0,
      };
    });

    const overallAccepted = candidates.filter((c) => c.status === CandidateStatus.ACCEPTED).length;

    return {
      bands,
      overall: {
        total: candidates.length,
        accepted: overallAccepted,
        accuracy:
          candidates.length > 0
            ? Math.round((overallAccepted / candidates.length) * 10000) / 100
            : 0,
      },
    };
  }

  async timeToFill(companyId: number): Promise<{
    overall: { averageDays: number; medianDays: number; count: number };
    byJob: TimeToFillByJob[];
  }> {
    const closedJobs = await this.jobPostingRepo.find({
      where: { companyId, status: JobPostingStatus.CLOSED },
      relations: ["candidates"],
    });

    const jobMetrics = closedJobs
      .map((job) => {
        const acceptedCandidates = job.candidates.filter(
          (c) => c.status === CandidateStatus.ACCEPTED,
        );

        if (acceptedCandidates.length === 0) {
          return null;
        }

        const firstAccepted = acceptedCandidates.reduce((earliest, c) =>
          c.updatedAt < earliest.updatedAt ? c : earliest,
        );

        const jobCreated = DateTime.fromJSDate(job.createdAt);
        const acceptedAt = DateTime.fromJSDate(firstAccepted.updatedAt);
        const days = acceptedAt.diff(jobCreated, "days").days;

        return {
          title: job.title,
          days: Math.round(days * 100) / 100,
          candidateCount: acceptedCandidates.length,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (jobMetrics.length === 0) {
      return {
        overall: { averageDays: 0, medianDays: 0, count: 0 },
        byJob: [],
      };
    }

    const allDays = jobMetrics.map((m) => m.days);
    const sortedDays = [...allDays].sort((a, b) => a - b);
    const averageDays =
      Math.round((allDays.reduce((sum, d) => sum + d, 0) / allDays.length) * 100) / 100;
    const medianDays =
      sortedDays.length % 2 === 0
        ? Math.round(
            ((sortedDays[sortedDays.length / 2 - 1] + sortedDays[sortedDays.length / 2]) / 2) * 100,
          ) / 100
        : sortedDays[Math.floor(sortedDays.length / 2)];

    const byJob = jobMetrics.map((m) => ({
      title: m.title,
      averageDays: m.days,
      candidateCount: m.candidateCount,
    }));

    return {
      overall: { averageDays, medianDays, count: jobMetrics.length },
      byJob,
    };
  }

  async marketTrends(companyId: number): Promise<{
    byCategory: MarketCategoryCount[];
    byLocation: MarketLocationCount[];
    salaryByCategory: MarketSalaryByCategory[];
    monthlyJobs: MonthlyJobCount[];
    topSkills: SkillCount[];
  }> {
    const twelveMonthsAgo = now().minus({ months: 12 }).toJSDate();

    const byCategory: MarketCategoryCount[] = await this.externalJobRepo
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.category IS NOT NULL")
      .select("ej.category", "category")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("ej.category")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    const byLocation: MarketLocationCount[] = await this.externalJobRepo
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.locationArea IS NOT NULL")
      .select("ej.location_area", "location")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("ej.location_area")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    const salaryByCategory: MarketSalaryByCategory[] = await this.externalJobRepo
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.category IS NOT NULL")
      .andWhere("ej.salaryMin IS NOT NULL")
      .select("ej.category", "category")
      .addSelect("ROUND(AVG(ej.salary_min)::numeric, 2)", "averageSalaryMin")
      .addSelect("ROUND(AVG(ej.salary_max)::numeric, 2)", "averageSalaryMax")
      .groupBy("ej.category")
      .orderBy('"averageSalaryMin"', "DESC")
      .limit(10)
      .getRawMany();

    const monthlyJobs: MonthlyJobCount[] = await this.externalJobRepo
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.postedAt >= :twelveMonthsAgo", { twelveMonthsAgo })
      .andWhere("ej.postedAt IS NOT NULL")
      .select("TO_CHAR(ej.posted_at, 'YYYY-MM')", "month")
      .addSelect("COUNT(*)::int", "count")
      .groupBy("TO_CHAR(ej.posted_at, 'YYYY-MM')")
      .orderBy("month", "ASC")
      .getRawMany();

    const jobsWithSkills = await this.externalJobRepo
      .createQueryBuilder("ej")
      .innerJoin("ej.source", "s")
      .where("s.companyId = :companyId", { companyId })
      .andWhere("ej.extractedSkills != '[]'::jsonb")
      .select("ej.extractedSkills")
      .getMany();

    const skillCounts = jobsWithSkills
      .flatMap((j) => j.extractedSkills)
      .reduce(
        (acc, skill) => {
          const lower = skill.toLowerCase();
          return { ...acc, [lower]: (acc[lower] ?? 0) + 1 };
        },
        {} as Record<string, number>,
      );

    const topSkills: SkillCount[] = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    return {
      byCategory,
      byLocation,
      salaryByCategory,
      monthlyJobs,
      topSkills,
    };
  }

  async funnelExportData(
    companyId: number,
    dateFrom?: string | null,
    dateTo?: string | null,
  ): Promise<string> {
    const query = this.candidateRepo
      .createQueryBuilder("c")
      .innerJoinAndSelect("c.jobPosting", "jp")
      .where("jp.companyId = :companyId", { companyId })
      .orderBy("c.createdAt", "DESC");

    if (dateFrom) {
      query.andWhere("c.createdAt >= :dateFrom", {
        dateFrom: fromISO(dateFrom).toJSDate(),
      });
    }
    if (dateTo) {
      query.andWhere("c.createdAt <= :dateTo", {
        dateTo: fromISO(dateTo).toJSDate(),
      });
    }

    const candidates = await query.getMany();

    const header = "Name,Email,Job Title,Match Score,Status,Created At,Updated At";

    const rows = candidates.map((c) =>
      [
        csvEscape(c.name),
        csvEscape(c.email),
        csvEscape(c.jobPosting.title),
        c.matchScore ?? "",
        c.status,
        DateTime.fromJSDate(c.createdAt).toISO(),
        DateTime.fromJSDate(c.updatedAt).toISO(),
      ].join(","),
    );

    return [header, ...rows].join("\n");
  }

  async timeToFillExportData(companyId: number): Promise<string> {
    const closedJobs = await this.jobPostingRepo.find({
      where: { companyId, status: JobPostingStatus.CLOSED },
      relations: ["candidates"],
    });

    const header = "Job Title,Status,Created At,First Accepted At,Days To Fill,Candidate Count";

    const rows = closedJobs.map((job) => {
      const acceptedCandidates = job.candidates.filter(
        (c) => c.status === CandidateStatus.ACCEPTED,
      );

      const firstAccepted =
        acceptedCandidates.length > 0
          ? acceptedCandidates.reduce((earliest, c) =>
              c.updatedAt < earliest.updatedAt ? c : earliest,
            )
          : null;

      const jobCreated = DateTime.fromJSDate(job.createdAt);
      const firstAcceptedAt = firstAccepted ? DateTime.fromJSDate(firstAccepted.updatedAt) : null;
      const daysToFill = firstAcceptedAt
        ? Math.round(firstAcceptedAt.diff(jobCreated, "days").days * 100) / 100
        : "";

      return [
        csvEscape(job.title),
        job.status,
        jobCreated.toISO(),
        firstAcceptedAt ? firstAcceptedAt.toISO() : "",
        daysToFill,
        acceptedCandidates.length,
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }
}

const csvEscape = (value: string | null): string => {
  if (value === null) {
    return "";
  }
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};
