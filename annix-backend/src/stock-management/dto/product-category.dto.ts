import type { ProductCategoryType } from "../entities/product-category.entity";

export interface CreateProductCategoryDto {
  productType: ProductCategoryType;
  slug: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  iconKey?: string | null;
  workflowHints?: Record<string, unknown>;
  active?: boolean;
}

export interface UpdateProductCategoryDto {
  name?: string;
  description?: string | null;
  sortOrder?: number;
  iconKey?: string | null;
  workflowHints?: Record<string, unknown>;
  active?: boolean;
}
