import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { ConsumableProduct } from "../entities/consumable-product.entity";

export abstract class ConsumableProductRepository extends CrudRepository<ConsumableProduct> {
  abstract build(data: DeepPartial<ConsumableProduct>): ConsumableProduct;
  abstract findByProductId(productId: number): Promise<ConsumableProduct | null>;
}
