export type ProductCategoryType =
  | "consumable"
  | "paint"
  | "rubber_roll"
  | "rubber_offcut"
  | "solution";

export class ProductCategory {
  id: number;

  companyId: number;

  productType: ProductCategoryType;

  slug: string;

  name: string;

  description: string | null;

  sortOrder: number;

  iconKey: string | null;

  workflowHints: Record<string, unknown>;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
