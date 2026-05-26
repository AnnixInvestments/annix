import { CrudRepository } from "../lib/persistence/crud-repository";
import type { PumpProduct, PumpProductCategory } from "./entities/pump-product.entity";
import type { PumpProductQueryParams } from "./pump-product.service";

export abstract class PumpProductRepository extends CrudRepository<PumpProduct> {
  abstract findBySku(sku: string): Promise<PumpProduct | null>;
  abstract searchPaged(
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }>;
  abstract findByCategory(category: PumpProductCategory): Promise<PumpProduct[]>;
  abstract findByManufacturerLike(manufacturer: string): Promise<PumpProduct[]>;
  abstract manufacturers(): Promise<string[]>;
  abstract fullTextSearchPaged(
    query: string,
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }>;
  abstract findByIdList(ids: number[]): Promise<PumpProduct[]>;
  abstract findSimilarProducts(product: PumpProduct, limit: number): Promise<PumpProduct[]>;
}
