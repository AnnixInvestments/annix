import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberStockLocation } from "../entities/rubber-stock-location.entity";

export abstract class RubberStockLocationRepository extends CrudRepository<RubberStockLocation> {
  abstract build(data: Partial<RubberStockLocation>): RubberStockLocation;
  abstract findAllOrdered(includeInactive: boolean): Promise<RubberStockLocation[]>;
}
