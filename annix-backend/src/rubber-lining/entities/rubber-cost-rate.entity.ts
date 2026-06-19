import { RubberProductCoding } from "./rubber-product-coding.entity";

export enum CostRateType {
  CALENDERER_UNCURED = "CALENDERER_UNCURED",
  CALENDERER_CURED_BUFFED = "CALENDERER_CURED_BUFFED",
  COMPOUND = "COMPOUND",
}

export class RubberCostRate {
  id: number;

  rateType: CostRateType;

  costPerKgZar: number;

  compoundCodingId: number | null;

  compoundCoding: RubberProductCoding | null;

  notes: string | null;

  updatedBy: string | null;

  createdAt: Date;

  updatedAt: Date;
}
