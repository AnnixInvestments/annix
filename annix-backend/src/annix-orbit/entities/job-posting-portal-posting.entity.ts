import { JobPosting } from "./job-posting.entity";

export enum JobPostingPortalStatus {
  PENDING = "pending",
  POSTED = "posted",
  /**
   * Handed off for manual/out-of-band posting (e.g. emailed to a listings
   * inbox). Not live on the external portal yet — a human still has to finish.
   */
  SUBMITTED = "submitted",
  /** Passive/feed channel: the job is discoverable via a feed we control. */
  IN_FEED = "in_feed",
  FAILED = "failed",
  /** Deliberately not dispatched (see skipReason: budget / unknown_channel). */
  SKIPPED = "skipped",
  UNPOSTED = "unposted",
  ABANDONED = "abandoned",
}

export type JobPostingPortalSkipReason = "budget" | "unknown_channel";

export class JobPostingPortalPosting {
  id: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  /** Denormalised owner — lets the cost guard sum monthly spend per company. */
  companyId: number | null;

  portalCode: string;

  portalJobId: string | null;

  /** Actual cost of this dispatch in the channel's currency (paid channels). */
  cost: number | null;

  portalUrl: string | null;

  status: JobPostingPortalStatus;

  skipReason: JobPostingPortalSkipReason | null;

  postedAt: Date | null;

  lastError: string | null;

  retryCount: number;

  nextRetryAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
