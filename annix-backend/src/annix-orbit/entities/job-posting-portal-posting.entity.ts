import { JobPosting } from "./job-posting.entity";

export enum JobPostingPortalStatus {
  PENDING = "pending",
  POSTED = "posted",
  FAILED = "failed",
  UNPOSTED = "unposted",
  ABANDONED = "abandoned",
}

export class JobPostingPortalPosting {
  id: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  portalCode: string;

  portalJobId: string | null;

  portalUrl: string | null;

  status: JobPostingPortalStatus;

  postedAt: Date | null;

  lastError: string | null;

  retryCount: number;

  nextRetryAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
