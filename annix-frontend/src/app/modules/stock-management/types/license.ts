export const STOCK_MANAGEMENT_FEATURE_KEYS = [
  "BASIC_ISSUING",
  "PRODUCT_CATEGORIES",
  "PHOTO_IDENTIFICATION",
  "CPO_BATCH_ISSUING",
  "RUBBER_ROLL_TRACKING",
  "RUBBER_OFFCUT_TRACKING",
  "RUBBER_WASTAGE_BINS",
  "PAINT_CATALOGUE",
  "PRODUCT_DATASHEETS",
  "FIFO_BATCH_TRACKING",
  "STOCK_TAKE",
  "STOCK_HOLD_QUEUE",
  "VARIANCE_REPORTING",
  "VALUATION_EXPORTS",
] as const;

export type StockManagementFeatureKey = (typeof STOCK_MANAGEMENT_FEATURE_KEYS)[number];

export type StockManagementTier = "basic" | "standard" | "premium" | "enterprise";

export interface StockManagementLicenseSnapshot {
  companyId: number;
  tier: StockManagementTier;
  features: Record<StockManagementFeatureKey, boolean>;
  active: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export const STOCK_MANAGEMENT_TIER_RANK: Record<StockManagementTier, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
  enterprise: 3,
};
