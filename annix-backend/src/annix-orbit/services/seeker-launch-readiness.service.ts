import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { SeekerLaunchReadinessSnapshot } from "../entities/seeker-launch-readiness-snapshot.entity";
import { READINESS_CRITERIA, READINESS_STATUS } from "../lib/seeker-testing.constants";
import { SeekerLaunchReadinessSnapshotRepository } from "../repositories/seeker-launch-readiness-snapshot.repository";
import { SeekerTestingIssueRepository } from "../repositories/seeker-testing-issue.repository";
import { SeekerTelemetryService } from "./seeker-telemetry.service";
import { SeekerWorkflowProgressService } from "./seeker-workflow-progress.service";

export interface ReadinessCriterion {
  key: string;
  label: string;
  actual: number | null;
  target: number;
  pass: boolean;
}

export interface ReadinessResult {
  cvUploads: number;
  completedProfiles: number;
  successfulAnalyses: number;
  jobViews: number;
  applications: number;
  errorRatePct: number;
  avgTtfvSeconds: number | null;
  openCriticalBugs: number;
  status: string;
  criteria: ReadinessCriterion[];
  readyForSoftLaunch: boolean;
  readyForPublicLaunch: boolean;
}

@Injectable()
export class SeekerLaunchReadinessService {
  private readonly logger = new Logger(SeekerLaunchReadinessService.name);

  constructor(
    private readonly progress: SeekerWorkflowProgressService,
    private readonly telemetry: SeekerTelemetryService,
    private readonly issues: SeekerTestingIssueRepository,
    private readonly snapshots: SeekerLaunchReadinessSnapshotRepository,
  ) {}

  async compute(options?: {
    counts?: Map<string, number>;
    syncReconcile?: boolean;
  }): Promise<ReadinessResult> {
    if (options?.syncReconcile) {
      await this.progress.reconcile();
    } else {
      this.progress.reconcileIfStale();
    }
    const counts = options?.counts ?? (await this.progress.stepCounts());
    const cvUploads = counts.get("uploaded_cv") ?? 0;
    const completedProfiles = counts.get("completed_profile") ?? 0;
    const successfulAnalyses = counts.get("ai_cv_analysis") ?? 0;
    const jobViews = counts.get("viewed_matched_jobs") ?? 0;
    const applications = counts.get("applied_job") ?? 0;
    const error = await this.telemetry.errorRatePct();
    const avgTtfvSeconds = await this.progress.avgTimeToFirstValueSeconds();
    const openCriticalBugs = await this.issues.countOpenCritical();

    const criteria: ReadinessCriterion[] = [
      criterion("cvUploads", "100+ CV uploads", cvUploads, READINESS_CRITERIA.minCvUploads),
      criterion(
        "completedProfiles",
        "75+ completed profiles",
        completedProfiles,
        READINESS_CRITERIA.minCompletedProfiles,
      ),
      criterion(
        "successfulAnalyses",
        "75+ successful AI analyses",
        successfulAnalyses,
        READINESS_CRITERIA.minSuccessfulAnalyses,
      ),
      criterion("jobViews", "50+ job views", jobViews, READINESS_CRITERIA.minJobViews),
      criterion(
        "applications",
        "25+ applications",
        applications,
        READINESS_CRITERIA.minApplications,
      ),
      maxCriterion(
        "errorRate",
        "Error rate < 5%",
        error.ratePct,
        READINESS_CRITERIA.maxErrorRatePct,
      ),
      ttfvCriterion(avgTtfvSeconds, READINESS_CRITERIA.maxAvgTtfvSeconds),
      criterion("noCriticalBugs", "0 unresolved critical bugs", openCriticalBugs, 0, true),
    ];

    const allPass = criteria.every((c) => c.pass);
    const readyForPublicLaunch = allPass;
    const readyForSoftLaunch =
      openCriticalBugs === 0 &&
      error.ratePct < READINESS_CRITERIA.maxErrorRatePct &&
      cvUploads >= Math.round(READINESS_CRITERIA.minCvUploads / 2) &&
      completedProfiles >= Math.round(READINESS_CRITERIA.minCompletedProfiles / 3);
    const anyProgress = cvUploads > 0 || completedProfiles > 0;
    const status = readyForPublicLaunch
      ? READINESS_STATUS.readyForPublicLaunch
      : readyForSoftLaunch
        ? READINESS_STATUS.readyForSoftLaunch
        : anyProgress
          ? READINESS_STATUS.almostReady
          : READINESS_STATUS.notReady;

    return {
      cvUploads,
      completedProfiles,
      successfulAnalyses,
      jobViews,
      applications,
      errorRatePct: error.ratePct,
      avgTtfvSeconds,
      openCriticalBugs,
      status,
      criteria,
      readyForSoftLaunch,
      readyForPublicLaunch,
    };
  }

  async snapshot(): Promise<SeekerLaunchReadinessSnapshot> {
    const result = await this.compute({ syncReconcile: true });
    const snapshotDate = now().toFormat("yyyy-MM-dd");
    const existing = await this.snapshots.findByDate(snapshotDate);
    if (existing) {
      existing.cvUploads = result.cvUploads;
      existing.completedProfiles = result.completedProfiles;
      existing.successfulAnalyses = result.successfulAnalyses;
      existing.jobViews = result.jobViews;
      existing.applications = result.applications;
      existing.errorRatePct = result.errorRatePct;
      existing.avgTtfvSeconds = result.avgTtfvSeconds;
      existing.openCriticalBugs = result.openCriticalBugs;
      existing.status = result.status;
      existing.readyForSoftLaunch = result.readyForSoftLaunch;
      existing.readyForPublicLaunch = result.readyForPublicLaunch;
      return this.snapshots.save(existing);
    }
    return this.snapshots.create({
      snapshotDate,
      cvUploads: result.cvUploads,
      completedProfiles: result.completedProfiles,
      successfulAnalyses: result.successfulAnalyses,
      jobViews: result.jobViews,
      applications: result.applications,
      errorRatePct: result.errorRatePct,
      avgTtfvSeconds: result.avgTtfvSeconds,
      openCriticalBugs: result.openCriticalBugs,
      status: result.status,
      readyForSoftLaunch: result.readyForSoftLaunch,
      readyForPublicLaunch: result.readyForPublicLaunch,
    });
  }

  history(limit = 30): Promise<SeekerLaunchReadinessSnapshot[]> {
    return this.snapshots.listNewestFirst(limit);
  }

  @Cron("0 5 * * *", { name: "annix-orbit:readiness-snapshot" })
  async runDailySnapshot(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) {
      return;
    }
    try {
      const snapshot = await this.snapshot();
      this.logger.log(`Seeker readiness snapshot: ${snapshot.status}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Seeker readiness snapshot failed: ${message}`);
    }
  }
}

function criterion(
  key: string,
  label: string,
  actual: number,
  target: number,
  exact = false,
): ReadinessCriterion {
  return { key, label, actual, target, pass: exact ? actual === target : actual >= target };
}

function maxCriterion(key: string, label: string, actual: number, max: number): ReadinessCriterion {
  return { key, label, actual, target: max, pass: actual < max };
}

function ttfvCriterion(actual: number | null, maxSeconds: number): ReadinessCriterion {
  return {
    key: "avgTtfv",
    label: "Avg time-to-first-value < 5 min",
    actual,
    target: maxSeconds,
    pass: actual !== null && actual < maxSeconds,
  };
}
