import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { chunk } from "es-toolkit/compat";
import { DateTime, fromISO, now } from "../../lib/datetime";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import type {
  EeDisabilityStatus,
  EeGender,
  EeNationalityStatus,
  EePopulationGroup,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import { CandidateStatus } from "../entities/candidate.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { JobPostingRepository } from "../repositories/job-posting.repository";
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
    private readonly candidateRepo: CandidateRepository,
    private readonly jobPostingRepo: JobPostingRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly cvAuditService: CvAuditService,
  ) {}

  async conversionFunnel(
    companyId: number,
    dateFrom?: string | null,
    dateTo?: string | null,
  ): Promise<{ stages: FunnelStage[]; dateFrom: string | null; dateTo: string | null }> {
    const fromDate = dateFrom ? fromISO(dateFrom).toJSDate() : null;
    const toDate = dateTo ? fromISO(dateTo).toJSDate() : null;

    const totalCount = await this.candidateRepo.countForCompanyByStatuses(
      companyId,
      null,
      fromDate,
      toDate,
    );

    const screenedCount = await this.candidateRepo.countForCompanyByStatuses(
      companyId,
      PAST_SCREENING_STATUSES,
      fromDate,
      toDate,
    );

    const shortlistedCount = await this.candidateRepo.countForCompanyByStatuses(
      companyId,
      [CandidateStatus.SHORTLISTED, CandidateStatus.REFERENCE_CHECK, CandidateStatus.ACCEPTED],
      fromDate,
      toDate,
    );

    const referenceCheckCount = await this.candidateRepo.countForCompanyByStatuses(
      companyId,
      [CandidateStatus.REFERENCE_CHECK, CandidateStatus.ACCEPTED],
      fromDate,
      toDate,
    );

    const acceptedCount = await this.candidateRepo.countForCompanyByStatuses(
      companyId,
      [CandidateStatus.ACCEPTED],
      fromDate,
      toDate,
    );

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
    const candidates = await this.candidateRepo.matchAccuracyData(companyId);

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
    const closedJobs = await this.jobPostingRepo.closedForCompanyWithCandidates(companyId);

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

    const byCategory: MarketCategoryCount[] =
      await this.externalJobRepo.marketByCategory(companyId);

    const byLocation: MarketLocationCount[] =
      await this.externalJobRepo.marketByLocation(companyId);

    const salaryByCategory: MarketSalaryByCategory[] =
      await this.externalJobRepo.marketSalaryByCategory(companyId);

    const monthlyJobs: MonthlyJobCount[] = await this.externalJobRepo.marketMonthlyJobs(
      companyId,
      twelveMonthsAgo,
    );

    const jobsWithSkills = await this.externalJobRepo.marketJobsWithSkills(companyId);

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
    const candidates = await this.candidateRepo.funnelExportCandidates(
      companyId,
      dateFrom ? fromISO(dateFrom).toJSDate() : null,
      dateTo ? fromISO(dateTo).toJSDate() : null,
    );

    const header = "Name,Email,Job Title,Match Score,Status,Created At,Updated At";

    const rows = candidates.map((c) =>
      [
        csvEscape(c.name),
        csvEscape(c.email),
        csvEscape(c.jobPosting?.title ?? ""),
        c.matchScore ?? "",
        c.status,
        DateTime.fromJSDate(c.createdAt).toISO(),
        DateTime.fromJSDate(c.updatedAt).toISO(),
      ].join(","),
    );

    return [header, ...rows].join("\n");
  }

  async timeToFillExportData(companyId: number): Promise<string> {
    const closedJobs = await this.jobPostingRepo.closedForCompanyWithCandidates(companyId);

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

  @Cron("0 8 * * *", { name: "annix-orbit:disparate-impact-monitor" })
  async runDisparateImpactMonitor(): Promise<{
    jobsChecked: number;
    breaches: number;
    automatedBreaches: number;
    skippedNoData: number;
  }> {
    if (!isAnnixOrbitCronEnabled())
      return { jobsChecked: 0, breaches: 0, automatedBreaches: 0, skippedNoData: 0 };

    const activeJobs = await this.jobPostingRepo.activeJobsForFairness();

    // Bound concurrency so a large active-job set can't fan out one fairness
    // analysis per job all at once against M0 (#396 finding 11).
    const reports = await chunk(activeJobs, FAIRNESS_CONCURRENCY).reduce<
      Promise<JobFairnessReport[]>
    >(async (prev, batch) => {
      const acc = await prev;
      const batchReports = await Promise.all(
        batch.map((job) => this.analyseJobFairness(job.id, job.companyId, job.title)),
      );
      return [...acc, ...batchReports];
    }, Promise.resolve([]));

    const breachReports = reports.filter(
      (r) => r.breaches.length > 0 || r.automated.breaches.length > 0,
    );
    const automatedBreachReports = reports.filter((r) => r.automated.breaches.length > 0);
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
          automatedTotalAnalysed: report.automated.totalAnalysed,
          automatedBreaches: report.automated.breaches,
          automatedPassRateByPopulation: report.automated.passRateByPopulation,
          automatedPassRateByGender: report.automated.passRateByGender,
          automatedPassRateByDisability: report.automated.passRateByDisability,
        }),
      ),
    );

    if (breachReports.length > 0) {
      this.logger.warn(
        `EE fairness monitor: ${breachReports.length} of ${activeJobs.length} active jobs breached the 4/5 rule (last ${FAIRNESS_WINDOW} apps)`,
      );
    }
    if (automatedBreachReports.length > 0) {
      this.logger.warn(
        `EE fairness monitor: ${automatedBreachReports.length} active job(s) breached the 4/5 rule on AUTOMATED decisions specifically — review the auto-reject/auto-shortlist thresholds`,
      );
    }

    return {
      jobsChecked: activeJobs.length,
      breaches: breachReports.length,
      automatedBreaches: automatedBreachReports.length,
      skippedNoData,
    };
  }

  async analyseJobFairness(
    jobPostingId: number,
    companyId: number,
    jobTitle: string,
  ): Promise<JobFairnessReport> {
    const rawRows = await this.candidateRepo.fairnessRows(
      jobPostingId,
      PAST_SCREENING_STATUSES,
      FAIRNESS_WINDOW,
    );
    const rows = rawRows.map((row) => ({
      candidate_id: row.candidate_id,
      status: row.status as CandidateStatus,
      decision_source: row.decision_source,
      population_group: row.population_group as EePopulationGroup,
      gender: row.gender as EeGender,
      disability_status: row.disability_status as EeDisabilityStatus,
      nationality_status: row.nationality_status as EeNationalityStatus,
    }));

    const overall = fairnessSliceFor(rows);
    const automatedRows = rows.filter((row) => row.decision_source === "automated");
    const automated = fairnessSliceFor(automatedRows);

    return {
      jobPostingId,
      companyId,
      jobTitle,
      totalAnalysed: rows.length,
      passRateByPopulation: overall.passRateByPopulation,
      passRateByGender: overall.passRateByGender,
      passRateByDisability: overall.passRateByDisability,
      breaches: overall.breaches,
      automated: {
        totalAnalysed: automatedRows.length,
        passRateByPopulation: automated.passRateByPopulation,
        passRateByGender: automated.passRateByGender,
        passRateByDisability: automated.passRateByDisability,
        breaches: automated.breaches,
      },
    };
  }
}

interface DemographicPassRate {
  group: string;
  passes: number;
  total: number;
  passRate: number;
}

export interface FairnessSlice {
  totalAnalysed: number;
  passRateByPopulation: DemographicPassRate[];
  passRateByGender: DemographicPassRate[];
  passRateByDisability: DemographicPassRate[];
  breaches: string[];
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
  automated: FairnessSlice;
}

interface FairnessRow {
  status: CandidateStatus;
  population_group: string;
  gender: string;
  disability_status: string;
}

const fairnessSliceFor = (rows: FairnessRow[]): Omit<FairnessSlice, "totalAnalysed"> => {
  const passRateByPopulation = passRatesFor(rows, "population_group");
  const passRateByGender = passRatesFor(rows, "gender");
  const passRateByDisability = passRatesFor(rows, "disability_status");
  const breaches: string[] = [
    ...checkFourFifthsRule("population_group", passRateByPopulation),
    ...checkFourFifthsRule("gender", passRateByGender),
    ...checkFourFifthsRule("disability_status", passRateByDisability),
  ];
  return { passRateByPopulation, passRateByGender, passRateByDisability, breaches };
};

const FAIRNESS_WINDOW = 100;
const FAIRNESS_THRESHOLD = 0.8;
const FAIRNESS_MIN_GROUP_SAMPLE = 5;
const FAIRNESS_CONCURRENCY = 5;
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
