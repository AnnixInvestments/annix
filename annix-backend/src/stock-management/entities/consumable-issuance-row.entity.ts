import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null ? 0 : Number(value)),
};

export class ConsumableIssuanceRow {
  rowId: number;

  row: IssuanceRow;

  quantity: number;

  batchNumber: string | null;

  get id(): number {
    return this.rowId;
  }

  set id(value: number) {
    this.rowId = value;
  }
}
