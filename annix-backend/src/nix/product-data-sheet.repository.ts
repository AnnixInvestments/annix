import { CrudRepository } from "../lib/persistence/crud-repository";
import { ProductDataSheet } from "./entities/product-data-sheet.entity";

export abstract class ProductDataSheetRepository extends CrudRepository<ProductDataSheet> {
  abstract findLatestForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet | null>;
  abstract findVersionsForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet[]>;
  abstract searchLatest(terms: string[]): Promise<ProductDataSheet[]>;
}
