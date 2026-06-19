import { IssuableProduct } from "./issuable-product.entity";
import { StockTake } from "./stock-take.entity";
import { StockTakeVarianceCategory } from "./stock-take-variance-category.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class StockTakeLine {
  id: number;

  stockTake: StockTake;

  stockTakeId: number;

  companyId: number;

  product: IssuableProduct;

  productId: number;

  locationId: number | null;

  expectedQty: number;

  expectedCostPerUnit: number;

  expectedValueR: number;

  countedQty: number | null;

  countedAt: Date | null;

  countedByStaffId: number | null;

  expectedAtCountTime: number | null;

  expectedAtSnapshot: number | null;

  inFlightMovementIds: number[] | null;

  varianceQty: number | null;

  varianceValueR: number | null;

  varianceCategory: StockTakeVarianceCategory | null;

  varianceCategoryId: number | null;

  varianceReason: string | null;

  photoUrl: string | null;

  resolved: boolean;

  resolvedByStaffId: number | null;

  resolvedAt: Date | null;

  resolutionNotes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
