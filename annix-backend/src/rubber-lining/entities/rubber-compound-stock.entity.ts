import { RubberProductCoding } from "./rubber-product-coding.entity";
import { RubberStockLocation } from "./rubber-stock-location.entity";

export class RubberCompoundStock {
  id: number;

  firebaseUid: string;

  compoundCodingId: number;

  compoundCoding: RubberProductCoding;

  quantityKg: number;

  minStockLevelKg: number;

  reorderPointKg: number;

  costPerKg: number | null;

  location: string | null;

  locationId: number | null;

  stockLocation: RubberStockLocation | null;

  batchNumber: string | null;

  createdAt: Date;

  updatedAt: Date;
}
