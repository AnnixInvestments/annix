export interface SeekerReadinessCriterion {
  key: string;
  label: string;
  actual: number | null;
  target: number;
  pass: boolean;
}

export interface SeekerReadinessResult {
  cvUploads: number;
  completedProfiles: number;
  successfulAnalyses: number;
  jobViews: number;
  applications: number;
  errorRatePct: number;
  avgTtfvSeconds: number | null;
  openCriticalBugs: number;
  status: string;
  criteria: SeekerReadinessCriterion[];
  readyForSoftLaunch: boolean;
  readyForPublicLaunch: boolean;
}

export interface SeekerFunnelRow {
  stepKey: string;
  count: number;
  pct: number;
}

export interface SeekerTestingOverview {
  readiness: SeekerReadinessResult;
  funnel: SeekerFunnelRow[];
}

export interface SeekerTestEventRow {
  id: string;
  candidateId: number | null;
  eventName: string;
  ts: string;
  durationMs: number | null;
  ok: boolean;
  errorMessage: string | null;
  page: string | null;
  phaseId: string | null;
}

export interface SeekerLatencyStat {
  eventName: string;
  samples: number;
  p50Ms: number;
  p95Ms: number;
}

export interface SeekerErrorsLatency {
  recentFailures: SeekerTestEventRow[];
  latency: SeekerLatencyStat[];
  errorRate: { total: number; failed: number; ratePct: number };
}

export interface SeekerStepState {
  key: string;
  completed: boolean;
  completedAt: string | null;
}

export interface SeekerProgressRow {
  id: string;
  participantId: string | null;
  candidateId: number | null;
  label?: string | null;
  status?: string;
  registeredAt: string | null;
  cvUploadedAt: string | null;
  careerScoreGeneratedAt: string | null;
  firstJobsViewedAt: string | null;
  timeToFirstValueSeconds: number | null;
  completedSteps: number;
  lastActiveAt: string | null;
  steps?: SeekerStepState[];
}

export interface SeekerTestPhase {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  targetUsers: number;
  actualUsers: number;
  notes: string | null;
  readinessPercentage: number;
}

export interface SeekerTestingIssue {
  id: string;
  source?: "manual" | "feedback";
  userId: number | null;
  phaseId: string | null;
  page: string | null;
  workflowStep: string | null;
  severity: string;
  title: string;
  description: string;
  screenshotUrl: string | null;
  status: string;
  submitterEmail?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface SeekerReadinessSnapshot {
  id: string;
  snapshotDate: string;
  cvUploads: number;
  completedProfiles: number;
  successfulAnalyses: number;
  jobViews: number;
  applications: number;
  errorRatePct: number;
  avgTtfvSeconds: number | null;
  openCriticalBugs: number;
  status: string;
  createdAt: string;
}

export interface SeekerReadinessReport {
  current: SeekerReadinessResult;
  history: SeekerReadinessSnapshot[];
}

export interface CreateSeekerTestPhaseInput {
  name: string;
  targetUsers?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateSeekerTestPhaseInput {
  status?: string;
  startDate?: string;
  endDate?: string;
  targetUsers?: number;
  actualUsers?: number;
  notes?: string;
  readinessPercentage?: number;
}

export interface CreateSeekerTestingIssueInput {
  title: string;
  description: string;
  severity?: string;
  page?: string;
  workflowStep?: string;
  userId?: number;
  phaseId?: string;
  screenshotUrl?: string;
}

export interface UpdateSeekerTestingIssueInput {
  status?: string;
  severity?: string;
}
