import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberProduct } from "../entities/rubber-product.entity";

export abstract class RubberProductRepository extends CrudRepository<RubberProduct> {
  abstract build(data: Partial<RubberProduct>): RubberProduct;
  abstract deleteById(id: number): Promise<boolean>;
  abstract findAllOrderedByTitle(): Promise<RubberProduct[]>;
  abstract findOneByCompoundFirebaseUid(compoundFirebaseUid: string): Promise<RubberProduct | null>;
}
