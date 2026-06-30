import { JobPosting } from "../entities/job-posting.entity";

export type PortalCostTier = "free" | "freemium" | "paid" | "assisted";

/**
 * What a successful adapter run actually achieved.
 * - "posted": the job is live on the external portal under a real external id.
 * - "submitted": the job was handed off for manual/out-of-band posting (e.g. an
 *   email to a listings inbox). It is NOT live externally yet and must never be
 *   recorded as POSTED with a fabricated external id.
 */
export type PortalPostingOutcome = "posted" | "submitted";

export interface PortalPostingResult {
  success: boolean;
  /** Defaults to "posted" when success is true and this is omitted. */
  outcome?: PortalPostingOutcome;
  /** True when a human still has to complete the posting before it is live. */
  requiresManualConfirmation?: boolean;
  portalJobId?: string;
  portalUrl?: string | null;
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
