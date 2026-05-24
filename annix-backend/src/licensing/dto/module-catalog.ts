import type { TierVisibility } from "../licensing.types";

export interface CatalogTier {
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
  featureKeys: string[];
}

export interface CatalogFeature {
  key: string;
  label: string;
  description: string;
  category: string;
  displayOrder: number;
}

export interface CatalogAddOn {
  key: string;
  label: string;
  description: string;
  monthlyPriceCents: number;
  discountable: boolean;
  requiresFeature: string | null;
}

export interface ModuleCatalog {
  moduleKey: string;
  defaultTier: string;
  tiers: CatalogTier[];
  features: CatalogFeature[];
  addOns: CatalogAddOn[];
}
