export interface PaintDiscountTier {
  name: string;
  discountPercent: number;
}

export interface PaintBlastTierPrice {
  name: string;
  pricePerM2: number;
}

export interface PaintBlastGrade {
  grade: string;
  pricePerM2: number;
  tierPrices: PaintBlastTierPrice[];
}

export interface PaintPricingConfig {
  lossPct: number;
  applicationCostPerM2: number;
  markupFactor: number;
  discountTiers: PaintDiscountTier[];
  blastGrades: PaintBlastGrade[];
}

export const DEFAULT_PAINT_BLAST_GRADES: PaintBlastGrade[] = [
  { grade: "SA3", pricePerM2: 0, tierPrices: [] },
  { grade: "SA2.5", pricePerM2: 0, tierPrices: [] },
  { grade: "SA2", pricePerM2: 0, tierPrices: [] },
  { grade: "Flash blast", pricePerM2: 0, tierPrices: [] },
];

export const DEFAULT_PAINT_PRICING_CONFIG: PaintPricingConfig = {
  lossPct: 45,
  applicationCostPerM2: 7.7,
  markupFactor: 1.85,
  discountTiers: [{ name: "MPS", discountPercent: 15 }],
  blastGrades: DEFAULT_PAINT_BLAST_GRADES,
};
