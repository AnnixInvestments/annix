export interface TierPricingOverride {
  name?: string;
  description?: string;
  monthlyPriceCents?: number;
  annualPriceCents?: number;
  includedSeats?: number;
  aiDocAllowance?: number;
  visibility?: string;
}

export interface AddOnOverride {
  label?: string;
  description?: string;
  monthlyPriceCents?: number;
  discountable?: boolean;
}

export class ModuleCatalogOverride {
  id: number;

  moduleKey: string;

  tierOverrides: Record<string, TierPricingOverride>;

  tierFeatures: Record<string, string[]>;

  addOnOverrides: Record<string, AddOnOverride>;

  updatedById: number | null;

  createdAt: Date;

  updatedAt: Date;
}
