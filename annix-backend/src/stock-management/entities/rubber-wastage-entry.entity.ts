import { RubberWastageBin } from "./rubber-wastage-bin.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

export class RubberWastageEntry {
  id: number;

  wastageBin: RubberWastageBin;

  wastageBinId: number;

  companyId: number;

  weightKgAdded: number;

  sourceOffcutProductId: number | null;

  sourceIssuanceRowId: number | null;

  sourcePurchaseBatchId: number | null;

  costPerKgAtEntry: number;

  totalCostR: number;

  addedAt: Date;

  addedByStaffId: number | null;

  notes: string | null;
}
