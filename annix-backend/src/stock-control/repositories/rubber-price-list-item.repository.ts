import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberPriceListItem } from "../entities/rubber-price-list-item.entity";

export abstract class RubberPriceListItemRepository extends CrudRepository<RubberPriceListItem> {
  abstract findAllForCompany(companyId: number): Promise<RubberPriceListItem[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<RubberPriceListItem | null>;
}
