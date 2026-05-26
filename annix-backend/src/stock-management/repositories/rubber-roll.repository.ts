import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { RubberRoll } from "../entities/rubber-roll.entity";

export abstract class RubberRollRepository extends CrudRepository<RubberRoll> {
  abstract build(data: DeepPartial<RubberRoll>): RubberRoll;
  abstract findByProductId(productId: number): Promise<RubberRoll | null>;
}
