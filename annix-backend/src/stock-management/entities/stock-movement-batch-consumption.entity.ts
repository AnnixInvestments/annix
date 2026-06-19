import { IssuableProduct } from "./issuable-product.entity";
import { StockPurchaseBatch } from "./stock-purchase-batch.entity";

export type StockMovementKind =
  | "issuance"
  | "allocation"
  | "return_to_supplier"
  | "stock_take_write_off"
  | "wastage"
  | "damaged_hold"
  | "manual_adjustment";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

export class StockMovementBatchConsumption {
  id: number;

  companyId: number;

  purchaseBatch: StockPurchaseBatch;

  purchaseBatchId: number;

  product: IssuableProduct;

  productId: number;

  movementKind: StockMovementKind;

  movementRefId: number | null;

  quantityConsumed: number;

  costPerUnitAtConsumption: number;

  totalCostConsumedR: number;

  consumedAt: Date;

  consumedByStaffId: number | null;

  notes: string | null;
}
