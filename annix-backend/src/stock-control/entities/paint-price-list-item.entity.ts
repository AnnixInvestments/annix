export type PaintCoatRole = "primer" | "intermediate" | "final";

export class PaintPriceListItem {
  id: number;

  companyId: number;

  supplierName: string;

  coatType: PaintCoatRole | null;

  productName: string;

  paintType: string | null;

  packSizeLitres: number | null;

  volumeSolidsPercent: number;

  costPerLitre: number;

  costPerKit: number | null;

  upliftPercent: number;

  recommendedMicrons: number | null;

  micronsOverride: number | null;

  thinnerName: string | null;

  thinnerPricePerLitre: number | null;

  maxThinningPercent: number | null;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
