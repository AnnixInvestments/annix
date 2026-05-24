export type TierVisibility = "public" | "hidden" | "contact-us";

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  displayOrder: number;
  requires?: string[];
  globalFlag?: string;
}

export interface TierDefinition {
  key: string;
  name: string;
  description: string;
  rank: number;
  monthlyPriceCents: number;
  annualPriceCents: number;
  includedSeats: number;
  aiDocAllowance: number;
  visibility: TierVisibility;
  displayOrder: number;
}

export interface ModuleLicensingDefinition {
  moduleKey: string;
  defaultTier: string;
  features: FeatureDefinition[];
  tiers: TierDefinition[];
  tierFeatures: Record<string, string[]>;
}

export interface LicenseSnapshot {
  companyId: number;
  moduleKey: string;
  tier: string;
  features: Record<string, boolean>;
  active: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
}
