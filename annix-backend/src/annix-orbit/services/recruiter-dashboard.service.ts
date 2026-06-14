import { Injectable } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { LicensingService } from "../../licensing/licensing.service";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { UserRepository } from "../../user/user.repository";
import {
  ANNIX_ORBIT_RECRUITER_FEATURES,
  ANNIX_ORBIT_RECRUITER_MODULE_KEY,
} from "../config/annix-orbit-recruiter-licensing";
import type {
  DashboardKpis,
  KpiValue,
  RecruiterDashboardDto,
  TopConsultant,
} from "../dto/recruiter-dashboard.dto";
import type { AnnixOrbitSubmissionStatus } from "../entities/annix-orbit-submission.entity";
import { AnnixOrbitClientRepository } from "../repositories/annix-orbit-client.repository";
import { AnnixOrbitPlacementRepository } from "../repositories/annix-orbit-placement.repository";
import { AnnixOrbitSubmissionRepository } from "../repositories/annix-orbit-submission.repository";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { AnnixOrbitTalentCredentialService } from "./annix-orbit-talent-credential.service";
import { AnnixOrbitTaskService } from "./annix-orbit-task.service";
import {
  buildRevenueSeries,
  buildSourceBreakdown,
  computeRange,
  groupConsultants,
  inRange,
  isoDateOf,
  pctChange,
} from "./recruiter-dashboard.util";
import { buildPipelineFunnel, effectiveStageIndex } from "./recruiter-pipeline";

const OPEN_SUBMISSION_STATUSES = new Set<AnnixOrbitSubmissionStatus>([
  "submitted",
  "viewed",
  "interested",
  "interview",
  "offer",
]);
const LEADERBOARD_LIMIT = 5;
const RECENT_LIMIT = 5;
const COMPLIANCE_WINDOW_DAYS = 30;

@Injectable()
export class RecruiterDashboardService {
  constructor(
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly submissionRepo: AnnixOrbitSubmissionRepository,
    private readonly placementRepo: AnnixOrbitPlacementRepository,
    private readonly clientRepo: AnnixOrbitClientRepository,
    private readonly credentialService: AnnixOrbitTalentCredentialService,
    private readonly taskService: AnnixOrbitTaskService,
    private readonly licensing: LicensingService,
    private readonly userRepo: UserRepository,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async dashboard(
    companyId: number,
    userId: number,
    from?: string,
    to?: string,
  ): Promise<RecruiterDashboardDto> {
    return this.metrics.time("orbit-recruiter-dashboard", "aggregate", () =>
      this.build(companyId, userId, from, to),
    );
  }

  private today(): string {
    return DateTime.now().toISODate() ?? new Date().toISOString().slice(0, 10);
  }

  private async build(
    companyId: number,
    userId: number,
    from?: string,
    to?: string,
  ): Promise<RecruiterDashboardDto> {
    const range = computeRange(from, to, this.today());
    const [candidates, submissions, placements, clients] = await Promise.all([
      this.candidateRepo.findVisibleForCompany(companyId, userId),
      this.submissionRepo.findByCompany(companyId),
      this.placementRepo.findByCompany(companyId),
      this.clientRepo.findByCompany(companyId),
    ]);

    const candidateName = new Map(candidates.map((c) => [c.id, c.fullName]));
    const clientName = new Map(clients.map((c) => [c.id, c.name]));

    const kpis = this.buildKpis(range, candidates, submissions, placements, clients);
    const pipeline = this.buildFunnel(candidates, submissions);
    const revenue = buildRevenueSeries(placements, range.from, range.to);
    const topConsultants = await this.buildLeaderboard(companyId, range, placements);
    const sourceBreakdown = buildSourceBreakdown(candidates.map((c) => c.source));

    const recentPlacements = placements
      .slice()
      .sort((a, b) => this.createdMs(b) - this.createdMs(a))
      .slice(0, RECENT_LIMIT)
      .map((placement) => ({
        id: placement.id,
        candidateName: placement.candidateName,
        jobTitle: placement.jobTitle,
        clientName: placement.clientId ? (clientName.get(placement.clientId) ?? null) : null,
        fee: placement.placementFee ?? null,
        date: isoDateOf(placement.startDate ?? placement.createdAt),
      }));

    const upcomingInterviews = submissions
      .filter((submission) => submission.status === "interview")
      .sort((a, b) => this.interviewSortMs(a) - this.interviewSortMs(b))
      .slice(0, RECENT_LIMIT)
      .map((submission) => ({
        submissionId: submission.id,
        candidateName: candidateName.get(submission.candidateId) ?? "Candidate",
        jobTitle: submission.jobTitle,
        clientName: submission.clientId ? (clientName.get(submission.clientId) ?? null) : null,
        interviewAt: submission.interviewAt ?? null,
      }));

    const [expiring, tasksDue] = await Promise.all([
      this.credentialService.expiringSummaryForCompany(companyId, COMPLIANCE_WINDOW_DAYS),
      this.taskService.dueTodayCount(companyId),
    ]);

    return {
      range: { from: range.from, to: range.to },
      kpis,
      pipeline,
      revenueSeries: revenue.series,
      revenueTotal: revenue.total,
      topConsultants,
      recentPlacements,
      sourceBreakdown,
      upcomingInterviews,
      complianceAlerts: {
        candidateCount: expiring.candidateCount,
        credentialCount: expiring.credentialCount,
      },
      tasksDue,
    };
  }

  private createdMs(row: { createdAt: Date }): number {
    return row.createdAt ? new Date(row.createdAt).getTime() : 0;
  }

  private updatedMs(row: { updatedAt: Date }): number {
    return row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  }

  // Scheduled interviews first (earliest upcoming); unscheduled ones
  // sink to the end.
  private interviewSortMs(row: { interviewAt: string | null }): number {
    return row.interviewAt ? new Date(row.interviewAt).getTime() : Number.MAX_SAFE_INTEGER;
  }

  private kpi(value: number, currentWindow: number, priorWindow: number): KpiValue {
    return { value, deltaPct: pctChange(currentWindow, priorWindow) };
  }

  private countCreatedIn(rows: Array<{ createdAt: Date }>, from: string, to: string): number {
    return rows.reduce(
      (acc, row) => (inRange(isoDateOf(row.createdAt), from, to) ? acc + 1 : acc),
      0,
    );
  }

  private buildKpis(
    range: ReturnType<typeof computeRange>,
    candidates: Array<{ createdAt: Date }>,
    submissions: Array<{ createdAt: Date; status: AnnixOrbitSubmissionStatus; jobTitle: string }>,
    placements: Array<{ createdAt: Date; placementFee: number | null }>,
    clients: Array<{ createdAt: Date; status: string }>,
  ): DashboardKpis {
    const activeJobTitles = new Set(
      submissions.filter((s) => OPEN_SUBMISSION_STATUSES.has(s.status)).map((s) => s.jobTitle),
    );
    const jobsCurrent = new Set(
      submissions
        .filter((s) => inRange(isoDateOf(s.createdAt), range.from, range.to))
        .map((s) => s.jobTitle),
    ).size;
    const jobsPrior = new Set(
      submissions
        .filter((s) => inRange(isoDateOf(s.createdAt), range.priorFrom, range.priorTo))
        .map((s) => s.jobTitle),
    ).size;

    const subCurrent = this.countCreatedIn(submissions, range.from, range.to);
    const subPrior = this.countCreatedIn(submissions, range.priorFrom, range.priorTo);
    const placeCurrent = this.countCreatedIn(placements, range.from, range.to);
    const placePrior = this.countCreatedIn(placements, range.priorFrom, range.priorTo);

    const revenueCurrent = placements
      .filter((p) => inRange(isoDateOf(p.createdAt), range.from, range.to))
      .reduce((acc, p) => acc + (p.placementFee ?? 0), 0);
    const revenuePrior = placements
      .filter((p) => inRange(isoDateOf(p.createdAt), range.priorFrom, range.priorTo))
      .reduce((acc, p) => acc + (p.placementFee ?? 0), 0);

    return {
      totalCandidates: this.kpi(
        candidates.length,
        this.countCreatedIn(candidates, range.from, range.to),
        this.countCreatedIn(candidates, range.priorFrom, range.priorTo),
      ),
      activeClients: this.kpi(
        clients.filter((c) => c.status === "active").length,
        this.countCreatedIn(clients, range.from, range.to),
        this.countCreatedIn(clients, range.priorFrom, range.priorTo),
      ),
      activeJobs: this.kpi(activeJobTitles.size, jobsCurrent, jobsPrior),
      submissions: this.kpi(subCurrent, subCurrent, subPrior),
      placements: this.kpi(placeCurrent, placeCurrent, placePrior),
      revenue: this.kpi(revenueCurrent, revenueCurrent, revenuePrior),
    };
  }

  private buildFunnel(
    candidates: Array<{ id: number; pipelineStage?: string | null; status?: string | null }>,
    submissions: Array<{ candidateId: number; status: AnnixOrbitSubmissionStatus }>,
  ) {
    const statusesByCandidate = submissions.reduce((acc, submission) => {
      const list = acc.get(submission.candidateId);
      if (list) {
        list.push(submission.status);
      } else {
        acc.set(submission.candidateId, [submission.status]);
      }
      return acc;
    }, new Map<number, AnnixOrbitSubmissionStatus[]>());

    const effectiveIndexes = candidates.map((candidate) =>
      effectiveStageIndex(candidate, statusesByCandidate.get(candidate.id) ?? []),
    );
    return buildPipelineFunnel(effectiveIndexes);
  }

  private async buildLeaderboard(
    companyId: number,
    range: ReturnType<typeof computeRange>,
    placements: Array<{
      createdAt: Date;
      consultantUserId: number | null;
      placementFee: number | null;
    }>,
  ): Promise<{ gated: boolean; items: TopConsultant[] }> {
    const allowed = await this.licensing.isFeatureEnabled(
      companyId,
      ANNIX_ORBIT_RECRUITER_MODULE_KEY,
      ANNIX_ORBIT_RECRUITER_FEATURES.ANALYTICS,
    );
    if (!allowed) {
      return { gated: true, items: [] };
    }

    const current = placements.filter((p) => inRange(isoDateOf(p.createdAt), range.from, range.to));
    const prior = placements.filter((p) =>
      inRange(isoDateOf(p.createdAt), range.priorFrom, range.priorTo),
    );
    const grouped = groupConsultants(current, prior, LEADERBOARD_LIMIT);

    const userIds = grouped.map((row) => row.userId).filter((id): id is number => id !== null);
    const users = await Promise.all(userIds.map((id) => this.userRepo.findById(id)));
    const nameById = new Map(
      users
        .filter((user): user is NonNullable<typeof user> => user !== null)
        .map((user) => {
          const parts = [user.firstName, user.lastName].filter(
            (part): part is string => !!part && part.length > 0,
          );
          const name = parts.length > 0 ? parts.join(" ") : (user.email ?? "Consultant");
          return [user.id, name];
        }),
    );

    const items = grouped.map((row) => ({
      userId: row.userId,
      name: row.userId === null ? "Unattributed" : (nameById.get(row.userId) ?? "Consultant"),
      placements: row.placements,
      revenue: row.revenue,
      deltaPct: row.deltaPct,
    }));
    return { gated: false, items };
  }
}
