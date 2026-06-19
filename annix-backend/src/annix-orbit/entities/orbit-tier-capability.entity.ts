export interface OrbitTierFeatures {
  applyToJobs: boolean;
  viewSalaries: boolean;
  nixCvBuilder: boolean;
  jobListingSite: boolean;
  multiChannelReminders?: boolean;
  photoCredentialCapture?: boolean;
}

export interface OrbitTierPricing {
  monthlyPrice: number | null;
  perNixRun: number | null;
  perCvBuild: number | null;
}

export const DEFAULT_TIER_PRICING: OrbitTierPricing = {
  monthlyPrice: null,
  perNixRun: null,
  perCvBuild: null,
};

export const DEFAULT_TIER_FEATURES: OrbitTierFeatures = {
  applyToJobs: true,
  viewSalaries: false,
  nixCvBuilder: false,
  jobListingSite: false,
  multiChannelReminders: false,
  photoCredentialCapture: false,
};

export class OrbitTierCapability {
  id: number;

  tier: string;

  label: string;

  matchStrictness: string;

  maxJobResults: number | null;

  monthlyNixRuns: number | null;

  monthlyCvBuilds: number | null;

  features: OrbitTierFeatures;

  pricing: OrbitTierPricing | null;

  displayOrder: number;

  createdAt: Date;

  updatedAt: Date;
}
