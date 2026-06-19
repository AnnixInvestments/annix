import { RubberCompoundStock } from "./rubber-compound-stock.entity";

export enum CompoundMovementType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum CompoundMovementReferenceType {
  PURCHASE = "PURCHASE",
  PRODUCTION = "PRODUCTION",
  MANUAL = "MANUAL",
  STOCK_TAKE = "STOCK_TAKE",
  COC_RECEIPT = "COC_RECEIPT",
  CALENDARING = "CALENDARING",
  OPENING_STOCK = "OPENING_STOCK",
  INVOICE_RECEIPT = "INVOICE_RECEIPT",
  DELIVERY_DEDUCTION = "DELIVERY_DEDUCTION",
}

export class RubberCompoundMovement {
  id: number;

  compoundStockId: number;

  compoundStock: RubberCompoundStock;

  movementType: CompoundMovementType;

  quantityKg: number;

  referenceType: CompoundMovementReferenceType;

  referenceId: number | null;

  batchNumber: string | null;

  notes: string | null;

  movementDate: Date | null;

  createdBy: string | null;

  createdAt: Date;
}
