import { StockPurchaseBatch } from "./stock-purchase-batch.entity";
import { StockTakeLine } from "./stock-take-line.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

export class StockTakeAdjustment {
  id: number;

  stockTakeLine: StockTakeLine;

  stockTakeLineId: number;

  companyId: number;

  adjustmentQty: number;

  adjustmentValueR: number;

  purchaseBatch: StockPurchaseBatch | null;

  purchaseBatchId: number | null;

  postedAt: Date;

  postedByStaffId: number | null;

  notes: string | null;
}
