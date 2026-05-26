import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberAuCocItem } from "../entities/rubber-au-coc-item.entity";

export abstract class RubberAuCocItemRepository extends CrudRepository<RubberAuCocItem> {
  abstract build(data: Partial<RubberAuCocItem>): RubberAuCocItem;
  abstract saveMany(entities: RubberAuCocItem[]): Promise<RubberAuCocItem[]>;
  abstract findByAuCocIdWithRolls(auCocId: number): Promise<RubberAuCocItem[]>;
  abstract deleteByAuCocId(auCocId: number): Promise<void>;
}
