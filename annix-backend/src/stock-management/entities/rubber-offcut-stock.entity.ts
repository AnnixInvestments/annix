import { IssuableProduct } from "./issuable-product.entity";

export type RubberOffcutStatus = "available" | "allocated" | "issued" | "missing" | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberOffcutStock {
  productId: number;

  product: IssuableProduct;

  offcutNumber: string;

  sourceRollId: number | null;

  sourcePurchaseBatchId: number | null;

  sourceIssuanceRowId: number | null;

  compoundCode: string | null;

  compoundId: number | null;

  colour: string | null;

  widthMm: number;

  lengthM: number;

  thicknessMm: number;

  computedWeightKg: number | null;

  status: RubberOffcutStatus;

  locationId: number | null;

  receivedAt: Date;

  receivedByStaffId: number | null;

  photoUrl: string | null;

  lastCountedAt: Date | null;

  lastCountedByStaffId: number | null;

  lastCountedVariance: Record<string, unknown> | null;

  writtenOffAt: Date | null;

  writtenOffByStaffId: number | null;

  writeOffReason: string | null;

  notes: string | null;

  get id(): number {
    return this.productId;
  }

  set id(value: number) {
    this.productId = value;
  }
}
