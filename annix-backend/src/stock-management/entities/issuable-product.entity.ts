import { ConsumableProduct } from "./consumable-product.entity";
import { PaintProduct } from "./paint-product.entity";
import { ProductCategory } from "./product-category.entity";
import { RubberOffcutStock } from "./rubber-offcut-stock.entity";
import { RubberRoll } from "./rubber-roll.entity";
import { SolutionProduct } from "./solution-product.entity";

export type IssuableProductType =
  | "consumable"
  | "paint"
  | "rubber_roll"
  | "rubber_offcut"
  | "solution";

export class IssuableProduct {
  id: number;

  companyId: number;

  productType: IssuableProductType;

  sku: string;

  name: string;

  description: string | null;

  category: ProductCategory | null;

  categoryId: number | null;

  unitOfMeasure: string;

  costPerUnit: number;

  quantity: number;

  minStockLevel: number;

  locationId: number | null;

  photoUrl: string | null;

  active: boolean;

  legacyStockItemId: number | null;

  createdAt: Date;

  updatedAt: Date;

  consumable?: ConsumableProduct | null;

  paint?: PaintProduct | null;

  rubberRoll?: RubberRoll | null;

  rubberOffcut?: RubberOffcutStock | null;

  solution?: SolutionProduct | null;
}
