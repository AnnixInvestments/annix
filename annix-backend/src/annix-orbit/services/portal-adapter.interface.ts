import { JobPosting } from "../entities/job-posting.entity";

// Cost and mechanism are ORTHOGONAL axes — a channel can be free-but-manual
// (assisted board) or paid-but-programmatic (Indeed API). They used to be
// conflated in a single 4-value costTier; they are now split.
export type PortalCostTier = "free" | "paid";
export type PortalPostingMode = "feed" | "api" | "assisted";

/**
 * What a successful adapter run actually achieved.
 * - "posted": live on the external portal under a real external id.
 * - "submitted": handed off for manual/out-of-band posting (e.g. emailed to a
 *   listings inbox). NOT live externally yet; never recorded as POSTED.
 * - "in_feed": discoverable via a feed we control (Google for Jobs, jobs.xml).
 * - "skipped": deliberately not dispatched (see skipReason).
 */
export type PortalPostingOutcome = "posted" | "submitted" | "in_feed" | "skipped";
export type PortalSkipReason = "budget" | "unknown_channel";

export interface PortalPostingResult {
  success: boolean;
  /** Defaults to "posted" when success is true and this is omitted. */
  outcome?: PortalPostingOutcome;
  /** True when a human still has to complete the posting before it is live. */
  requiresManualConfirmation?: boolean;
  portalJobId?: string;
  portalUrl?: string | null;
  skipReason?: PortalSkipReason;
  /** Actual cost of the dispatch, in the channel's currency (paid channels). */
  cost?: number;
  error?: string;
}

export interface PortalUnpostingResult {
  success: boolean;
  error?: string;
}

export interface AssistedPostingInstructions {
  targetUrl: string;
  copyTitle: string;
  copyBody: string;
  copyContact: string | null;
  notes: string | null;
}

export interface PortalAdapter {
  readonly portalCode: string;
  readonly displayName: string;
  readonly costTier: PortalCostTier;
  /** How this channel receives a job: passive feed, programmatic API, or manual. */
  readonly postingMode: PortalPostingMode;
  /**
   * Whether this channel is wired up and may be dispatched to. Defaults to true
   * when omitted. Set false for adapters that are scaffolded but not yet
   * functional (e.g. require partner approval) so the orchestrator skips them
   * instead of calling post() and recording a misleading failure.
   */
  readonly available?: boolean;
  post(jobPosting: JobPosting): Promise<PortalPostingResult>;
  unpost?(portalJobId: string): Promise<PortalUnpostingResult>;
  assistedInstructions?(jobPosting: JobPosting): AssistedPostingInstructions;
}
