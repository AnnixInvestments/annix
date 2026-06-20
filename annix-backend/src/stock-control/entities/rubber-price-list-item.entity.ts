export type RubberCureType = "steam" | "precured" | "chemical";

export class RubberPriceListItem {
  id: number;

  companyId: number;

  supplier: string;

  productCode: string;

  productName: string | null;

  cureType: RubberCureType | null;

  bondingType: string | null;

  colour: string | null;

  shoreHardness: number | null;

  specificGravity: number;

  costPerKg: number | null;

  upliftPercent: number;

  active: boolean;

  preferred: boolean;

  createdAt: Date;

  updatedAt: Date;
}
