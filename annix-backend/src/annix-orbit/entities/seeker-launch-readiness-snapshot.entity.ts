export class SeekerLaunchReadinessSnapshot {
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

  readyForSoftLaunch: boolean;

  readyForPublicLaunch: boolean;

  createdAt: Date;

  updatedAt: Date;
}
