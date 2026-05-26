import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberOtherStock } from "../entities/rubber-other-stock.entity";

export abstract class RubberOtherStockRepository extends CrudRepository<RubberOtherStock> {
  abstract build(data: Partial<RubberOtherStock>): RubberOtherStock;
  abstract findAllWithLocation(includeInactive: boolean): Promise<RubberOtherStock[]>;
  abstract findLowStockWithLocation(): Promise<RubberOtherStock[]>;
  abstract findByIdWithLocation(id: number): Promise<RubberOtherStock | null>;
  abstract findOneByItemCode(itemCode: string): Promise<RubberOtherStock | null>;
}
