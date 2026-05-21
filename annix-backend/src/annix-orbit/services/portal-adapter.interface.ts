import { JobPosting } from "../entities/job-posting.entity";

export type PortalCostTier = "free" | "freemium" | "paid" | "assisted";

export interface PortalPostingResult {
  success: boolean;
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
  post(jobPosting: JobPosting): Promise<PortalPostingResult>;
  unpost?(portalJobId: string): Promise<PortalUnpostingResult>;
  assistedInstructions?(jobPosting: JobPosting): AssistedPostingInstructions;
}
