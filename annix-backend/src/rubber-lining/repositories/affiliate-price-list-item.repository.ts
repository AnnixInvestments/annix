import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AffiliatePriceListItem } from "../entities/affiliate-price-list-item.entity";

export abstract class AffiliatePriceListItemRepository extends CrudRepository<AffiliatePriceListItem> {
  abstract build(data: Partial<AffiliatePriceListItem>): AffiliatePriceListItem;
  abstract findByPriceListId(priceListId: number): Promise<AffiliatePriceListItem[]>;
  abstract deleteByPriceListId(priceListId: number): Promise<void>;
}
