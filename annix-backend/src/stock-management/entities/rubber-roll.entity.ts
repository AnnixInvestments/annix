import { IssuableProduct } from "./issuable-product.entity";

export type RubberRollStatus =
  | "available"
  | "allocated"
  | "issued"
  | "partially_issued"
  | "consumed"
  | "missing"
  | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberRoll {
  productId: number;

  product: IssuableProduct;

  rollNumber: string;

  compoundCode: string | null;

  compoundId: number | null;

  colour: string | null;

  widthMm: number | null;

  thicknessMm: number | null;

  lengthM: number | null;

  weightKg: number | null;

  batchNumber: string | null;

  supplierName: string | null;

  receivedAt: Date | null;

  status: RubberRollStatus;

  densityOverrideKgPerM3: number | null;

  legacyRubberRollId: number | null;

  get id(): number {
    return this.productId;
  }

  set id(value: number) {
    this.productId = value;
  }
}
