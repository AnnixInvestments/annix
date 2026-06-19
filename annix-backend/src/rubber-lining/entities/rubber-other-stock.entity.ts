import { RubberStockLocation } from "./rubber-stock-location.entity";

export enum OtherStockUnitOfMeasure {
  EACH = "EACH",
  BOX = "BOX",
  PACK = "PACK",
  KG = "KG",
  LITERS = "LITERS",
  METERS = "METERS",
  ROLLS = "ROLLS",
  SHEETS = "SHEETS",
  PAIRS = "PAIRS",
  SETS = "SETS",
}

export class RubberOtherStock {
  id: number;

  firebaseUid: string;

  itemCode: string;

  itemName: string;

  description: string | null;

  category: string | null;

  unitOfMeasure: OtherStockUnitOfMeasure;

  quantity: number;

  minStockLevel: number;

  reorderPoint: number;

  costPerUnit: number | null;

  pricePerUnit: number | null;

  location: string | null;

  locationId: number | null;

  stockLocation: RubberStockLocation | null;

  supplier: string | null;

  notes: string | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
