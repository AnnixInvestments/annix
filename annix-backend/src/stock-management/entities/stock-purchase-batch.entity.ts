import { IssuableProduct } from "./issuable-product.entity";

export type StockPurchaseBatchSourceType =
  | "supplier_invoice"
  | "grn"
  | "manual_adjustment"
  | "stock_take_overage"
  | "customer_return"
  | "legacy";

export type StockPurchaseBatchStatus = "active" | "exhausted" | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? 0 : Number(value)),
};

export class StockPurchaseBatch {
  id: number;

  companyId: number;

  product: IssuableProduct;

  productId: number;

  sourceType: StockPurchaseBatchSourceType;

  sourceRefId: number | null;

  supplierName: string | null;

  supplierBatchRef: string | null;

  quantityPurchased: number;

  quantityRemaining: number;

  costPerUnit: number;

  totalCostR: number;

  receivedAt: Date;

  status: StockPurchaseBatchStatus;

  isLegacyBatch: boolean;

  createdByStaffId: number | null;

  reconciledInvoiceId: number | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
