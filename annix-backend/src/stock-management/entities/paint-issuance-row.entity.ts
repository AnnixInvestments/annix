import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class PaintIssuanceRow {
  rowId: number;

  row: IssuanceRow;

  litres: number;

  coverageM2: number | null;

  coatCount: number | null;

  coatingAnalysisId: number | null;

  batchNumber: string | null;

  cpoProRataSplit: Record<string, number> | null;

  get id(): number {
    return this.rowId;
  }

  set id(value: number) {
    this.rowId = value;
  }
}
