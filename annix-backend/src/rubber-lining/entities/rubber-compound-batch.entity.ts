import { RubberCompoundStock } from "./rubber-compound-stock.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum BatchPassFailStatus {
  PASS = "PASS",
  FAIL = "FAIL",
}

export class RubberCompoundBatch {
  id: number;

  firebaseUid: string;

  supplierCocId: number;

  supplierCoc: RubberSupplierCoc;

  batchNumber: string;

  compoundStockId: number | null;

  compoundStock: RubberCompoundStock | null;

  shoreAHardness: number | null;

  specificGravity: number | null;

  reboundPercent: number | null;

  tearStrengthKnM: number | null;

  tensileStrengthMpa: number | null;

  elongationPercent: number | null;

  rheometerSMin: number | null;

  rheometerSMax: number | null;

  rheometerTs2: number | null;

  rheometerTc90: number | null;

  passFailStatus: BatchPassFailStatus | null;

  createdAt: Date;

  updatedAt: Date;
}
