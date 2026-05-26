import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberPoExtractionRegion } from "../entities/rubber-po-extraction-region.entity";

export abstract class RubberPoExtractionRegionRepository extends CrudRepository<RubberPoExtractionRegion> {
  abstract build(data: Partial<RubberPoExtractionRegion>): RubberPoExtractionRegion;
  abstract saveMany(entities: RubberPoExtractionRegion[]): Promise<RubberPoExtractionRegion[]>;
}
