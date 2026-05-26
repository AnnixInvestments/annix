import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { SolutionProduct } from "../entities/solution-product.entity";

export abstract class SolutionProductRepository extends CrudRepository<SolutionProduct> {
  abstract build(data: DeepPartial<SolutionProduct>): SolutionProduct;
  abstract findByProductId(productId: number): Promise<SolutionProduct | null>;
}
