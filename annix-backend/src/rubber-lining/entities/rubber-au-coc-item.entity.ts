import { RubberAuCoc } from "./rubber-au-coc.entity";
import { RubberRollStock } from "./rubber-roll-stock.entity";

export interface TestDataSummary {
  batchNumbers: string[];
  shoreAHardness?: { min: number; max: number; avg: number };
  specificGravity?: { min: number; max: number; avg: number };
  reboundPercent?: { min: number; max: number; avg: number };
  tearStrengthKnM?: { min: number; max: number; avg: number };
  tensileStrengthMpa?: { min: number; max: number; avg: number };
  elongationPercent?: { min: number; max: number; avg: number };
  rheometerSMin?: { min: number; max: number; avg: number };
  rheometerSMax?: { min: number; max: number; avg: number };
  rheometerTs2?: { min: number; max: number; avg: number };
  rheometerTc90?: { min: number; max: number; avg: number };
  allBatchesPassed: boolean;
}

export class RubberAuCocItem {
  id: number;

  firebaseUid: string;

  auCocId: number;

  auCoc: RubberAuCoc;

  rollStockId: number;

  rollStock: RubberRollStock;

  testDataSummary: TestDataSummary | null;

  createdAt: Date;
}
