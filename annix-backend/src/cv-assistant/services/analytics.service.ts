import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DateTime, fromISO, now } from "../../lib/datetime";
import { isCvAssistantCronEnabled } from "../cv-assistant-cron.config";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import {
  CvAssistantCandidateEeAttributes,
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
} from "../entities/cv-assistant-candidate-ee-attributes.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobPosting, JobPostingStatus } from "../entities/job-posting.entity";
import { CvAuditService } from "./cv-audit.service";

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
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    @InjectRepository(CvAssistantCandidateEeAttributes)
    private readonly eeAttributesRepo: Repository<CvAssistantCandidateEeAttributes>,
    private readonly cvAuditService: CvAuditService,
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

  @Cron("0 8 * * *", { name: "cv-assistant:disparate-impact-monitor" })
  async runDisparateImpactMonitor(): Promise<{
    jobsChecked: number;
    breaches: number;
    skippedNoData: number;
  }> {
    if (!isCvAssistantCronEnabled()) return { jobsChecked: 0, breaches: 0, skippedNoData: 0 };

    const activeJobs = await this.jobPostingRepo.find({
      where: { status: JobPostingStatus.ACTIVE },
      select: ["id", "companyId", "title"],
    });

    const reports = await Promise.all(
      activeJobs.map((job) => this.analyseJobFairness(job.id, job.companyId, job.title)),
    );

    const breachReports = reports.filter((r) => r.breaches.length > 0);
    const skippedNoData = reports.filter((r) => r.totalAnalysed < FAIRNESS_MIN_GROUP_SAMPLE).length;

    await Promise.all(
      breachReports.map((report) =>
        this.cvAuditService.logFairnessBreach(report.jobPostingId, report.companyId, {
          jobTitle: report.jobTitle,
          totalAnalysed: report.totalAnalysed,
          breaches: report.breaches,
          passRateByPopulation: report.passRateByPopulation,
          passRateByGender: report.passRateByGender,
          passRateByDisability: report.passRateByDisability,
        }),
      ),
    );

    if (breachReports.length > 0) {
      this.logger.warn(
        `EE fairness monitor: ${breachReports.length} of ${activeJobs.length} active jobs breached the 4/5 rule (last ${FAIRNESS_WINDOW} apps)`,
      );
    }

    return {
      jobsChecked: activeJobs.length,
      breaches: breachReports.length,
      skippedNoData,
    };
  }

  async analyseJobFairness(
    jobPostingId: number,
    companyId: number,
    jobTitle: string,
  ): Promise<JobFairnessReport> {
    const rows = await this.candidateRepo
      .createQueryBuilder("c")
      .innerJoin(
        "cv_assistant_candidate_ee_attributes",
        "ee",
        "ee.candidate_id = c.id AND ee.deleted_at IS NULL",
      )
      .where("c.job_posting_id = :jobPostingId", { jobPostingId })
      .andWhere("c.status IN (:...screeningStatuses)", {
        screeningStatuses: PAST_SCREENING_STATUSES,
      })
      .select([
        "c.id AS candidate_id",
        "c.status AS status",
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
        "ee.nationality_status AS nationality_status",
      ])
      .orderBy("c.created_at", "DESC")
      .limit(FAIRNESS_WINDOW)
      .getRawMany<{
        candidate_id: number;
        status: CandidateStatus;
        population_group: EePopulationGroup;
        gender: EeGender;
        disability_status: EeDisabilityStatus;
        nationality_status: EeNationalityStatus;
      }>();

    const passRateByPopulation = passRatesFor(rows, "population_group");
    const passRateByGender = passRatesFor(rows, "gender");
    const passRateByDisability = passRatesFor(rows, "disability_status");

    const breaches: string[] = [
      ...checkFourFifthsRule("population_group", passRateByPopulation),
      ...checkFourFifthsRule("gender", passRateByGender),
      ...checkFourFifthsRule("disability_status", passRateByDisability),
    ];

    return {
      jobPostingId,
      companyId,
      jobTitle,
      totalAnalysed: rows.length,
      passRateByPopulation,
      passRateByGender,
      passRateByDisability,
      breaches,
    };
  }
}

interface DemographicPassRate {
  group: string;
  passes: number;
  total: number;
  passRate: number;
}

export interface JobFairnessReport {
  jobPostingId: number;
  companyId: number;
  jobTitle: string;
  totalAnalysed: number;
  passRateByPopulation: DemographicPassRate[];
  passRateByGender: DemographicPassRate[];
  passRateByDisability: DemographicPassRate[];
  breaches: string[];
}

const FAIRNESS_WINDOW = 100;
const FAIRNESS_THRESHOLD = 0.8;
const FAIRNESS_MIN_GROUP_SAMPLE = 5;
const PASS_STATUSES = new Set<CandidateStatus>([
  CandidateStatus.SHORTLISTED,
  CandidateStatus.REFERENCE_CHECK,
  CandidateStatus.ACCEPTED,
]);

const passRatesFor = <K extends string>(
  rows: Array<Record<K, string> & { status: CandidateStatus }>,
  key: K,
): DemographicPassRate[] => {
  const buckets = rows.reduce((acc, row) => {
    const groupValue = row[key];
    if (groupValue === "prefer_not_to_say") return acc;
    const existing = acc.get(groupValue) ?? { passes: 0, total: 0 };
    const updated = {
      passes: existing.passes + (PASS_STATUSES.has(row.status) ? 1 : 0),
      total: existing.total + 1,
    };
    acc.set(groupValue, updated);
    return acc;
  }, new Map<string, { passes: number; total: number }>());

  return Array.from(buckets.entries()).map(([group, counts]) => ({
    group,
    passes: counts.passes,
    total: counts.total,
    passRate: counts.total === 0 ? 0 : counts.passes / counts.total,
  }));
};

const checkFourFifthsRule = (dimension: string, rates: DemographicPassRate[]): string[] => {
  const eligible = rates.filter((r) => r.total >= FAIRNESS_MIN_GROUP_SAMPLE);
  if (eligible.length < 2) return [];

  const maxRate = eligible.reduce((acc, r) => (r.passRate > acc.passRate ? r : acc), eligible[0]);
  if (maxRate.passRate === 0) return [];

  return eligible
    .filter((r) => r !== maxRate)
    .filter((r) => r.passRate / maxRate.passRate < FAIRNESS_THRESHOLD)
    .map(
      (r) =>
        `${dimension}: group "${r.group}" pass-rate ${r.passRate.toFixed(2)} vs max group "${maxRate.group}" ${maxRate.passRate.toFixed(2)} (ratio ${(r.passRate / maxRate.passRate).toFixed(2)} < 4/5)`,
    );
};

const csvEscape = (value: string | null): string => {
  if (value === null) {
    return "";
  }
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};
