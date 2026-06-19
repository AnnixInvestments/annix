import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class SolutionIssuanceRow {
  rowId: number;

  row: IssuanceRow;

  volumeL: number;

  concentrationPct: number | null;

  batchNumber: string | null;

  get id(): number {
    return this.rowId;
  }

  set id(value: number) {
    this.rowId = value;
  }
}
