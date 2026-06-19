import { IssuanceRow } from "./issuance-row.entity";

export type RubberRollIssuanceRowStatus =
  | "active"
  | "partial_return"
  | "fully_returned"
  | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class RubberRollIssuanceRow {
  rowId: number;

  row: IssuanceRow;

  weightKgIssued: number;

  issuedWidthMm: number | null;

  issuedLengthM: number | null;

  issuedThicknessMm: number | null;

  expectedReturnDimensions: { widthMm?: number; lengthM?: number; thicknessMm?: number } | null;

  status: RubberRollIssuanceRowStatus;

  get id(): number {
    return this.rowId;
  }

  set id(value: number) {
    this.rowId = value;
  }
}
