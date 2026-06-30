import { JobPosting } from "./job-posting.entity";

export enum JobPostingPortalStatus {
  PENDING = "pending",
  POSTED = "posted",
  /**
   * Handed off for manual/out-of-band posting (e.g. emailed to a listings
   * inbox). Not live on the external portal yet — a human still has to finish.
   */
  SUBMITTED = "submitted",
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
