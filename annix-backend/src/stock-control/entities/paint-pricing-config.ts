export interface PaintDiscountTier {
  name: string;
  discountPercent: number;
}

export interface PaintPricingConfig {
  lossPct: number;
  applicationCostPerM2: number;
  markupFactor: number;
  discountTiers: PaintDiscountTier[];
}

export const DEFAULT_PAINT_PRICING_CONFIG: PaintPricingConfig = {
  lossPct: 45,
  applicationCostPerM2: 7.7,
  markupFactor: 1.85,
  discountTiers: [{ name: "MPS", discountPercent: 15 }],
};
