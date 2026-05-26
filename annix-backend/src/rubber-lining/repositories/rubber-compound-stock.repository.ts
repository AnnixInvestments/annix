import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberCompoundStock } from "../entities/rubber-compound-stock.entity";

export abstract class RubberCompoundStockRepository extends CrudRepository<RubberCompoundStock> {
  abstract build(data: Partial<RubberCompoundStock>): RubberCompoundStock;
  abstract findAllWithCodingOrderedById(): Promise<RubberCompoundStock[]>;
  abstract findOneByIdWithCoding(id: number): Promise<RubberCompoundStock | null>;
  abstract findOneByCompoundCodingId(compoundCodingId: number): Promise<RubberCompoundStock | null>;
  abstract findOneByCompoundCodingIdWithCoding(
    compoundCodingId: number,
  ): Promise<RubberCompoundStock | null>;
  abstract findLowStockWithCodingOrdered(): Promise<RubberCompoundStock[]>;
  abstract findLowStockBelowMinWithCoding(): Promise<RubberCompoundStock[]>;
  abstract deleteById(id: number): Promise<boolean>;
}
