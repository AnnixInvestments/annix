import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberRollIssuanceItem } from "../entities/rubber-roll-issuance.entity";

export abstract class RubberRollIssuanceItemRepository extends CrudRepository<RubberRollIssuanceItem> {
  abstract build(data: Partial<RubberRollIssuanceItem>): RubberRollIssuanceItem;
  abstract saveMany(entities: RubberRollIssuanceItem[]): Promise<RubberRollIssuanceItem[]>;
}
