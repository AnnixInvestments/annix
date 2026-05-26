import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberRollIssuanceLineItem } from "../entities/rubber-roll-issuance.entity";

export abstract class RubberRollIssuanceLineItemRepository extends CrudRepository<RubberRollIssuanceLineItem> {
  abstract build(data: Partial<RubberRollIssuanceLineItem>): RubberRollIssuanceLineItem;
  abstract saveMany(entities: RubberRollIssuanceLineItem[]): Promise<RubberRollIssuanceLineItem[]>;
}
