import { IssuableProduct } from "./issuable-product.entity";
import { StockTake } from "./stock-take.entity";

export type StockHoldReason =
  | "damaged"
  | "expired"
  | "contaminated"
  | "recalled"
  | "wrong_spec"
  | "other";

export type StockHoldDispositionStatus =
  | "pending"
  | "scrapped"
  | "returned_to_supplier"
  | "repaired"
  | "donated"
  | "other";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class StockHoldItem {
  id: number;

  companyId: number;

  stockTake: StockTake | null;

  stockTakeId: number | null;

  product: IssuableProduct;

  productId: number;

  quantity: number | null;

  dimensionsJson: { widthMm?: number; lengthM?: number; thicknessMm?: number } | null;

  reason: StockHoldReason;

  reasonNotes: string;

  photoUrl: string | null;

  flaggedByStaffId: number;

  flaggedAt: Date;

  writeOffValueR: number;

  holdMovementId: number | null;

  dispositionStatus: StockHoldDispositionStatus;

  dispositionAction: string | null;

  dispositionByStaffId: number | null;

  dispositionAt: Date | null;

  dispositionRefId: number | null;

  dispositionNotes: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
