import { RubberPriceFamily } from "./rubber-pricing-config";

export class RubberPriceListItem {
  id: number;

  companyId: number;

  family: RubberPriceFamily;

  supplier: string;

  productCode: string;

  productName: string | null;

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
