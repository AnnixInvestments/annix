import { RubberCompoundStock } from "./rubber-compound-stock.entity";
import { RubberProduct } from "./rubber-product.entity";

export enum RubberProductionStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export class RubberProduction {
  id: number;

  firebaseUid: string;

  productionNumber: string;

  productId: number;

  product: RubberProduct;

  compoundStockId: number;

  compoundStock: RubberCompoundStock;

  thicknessMm: number;

  widthMm: number;

  lengthM: number;

  quantity: number;

  compoundUsedKg: number | null;

  status: RubberProductionStatus;

  orderId: number | null;

  notes: string | null;

  createdBy: string | null;

  completedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
