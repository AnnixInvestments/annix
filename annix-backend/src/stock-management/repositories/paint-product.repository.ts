import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { PaintProduct } from "../entities/paint-product.entity";

export abstract class PaintProductRepository extends CrudRepository<PaintProduct> {
  abstract build(data: DeepPartial<PaintProduct>): PaintProduct;
  abstract findByProductId(productId: number): Promise<PaintProduct | null>;
}
