import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ProductCategory, type ProductCategoryType } from "../entities/product-category.entity";

export abstract class ProductCategoryRepository extends CrudRepository<ProductCategory> {
  abstract build(data: DeepPartial<ProductCategory>): ProductCategory;
  abstract saveMany(categories: ProductCategory[]): Promise<ProductCategory[]>;
  abstract findForCompany(
    companyId: number,
    productType: ProductCategoryType | undefined,
  ): Promise<ProductCategory[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<ProductCategory | null>;
  abstract findOneByTypeSlug(
    companyId: number,
    productType: ProductCategoryType,
    slug: string,
  ): Promise<ProductCategory | null>;
  abstract findAllForCompany(companyId: number): Promise<ProductCategory[]>;
}
