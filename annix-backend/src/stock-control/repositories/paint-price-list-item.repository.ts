import { CrudRepository } from "../../lib/persistence/crud-repository";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";

export abstract class PaintPriceListItemRepository extends CrudRepository<PaintPriceListItem> {
  abstract findAllForCompany(companyId: number): Promise<PaintPriceListItem[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<PaintPriceListItem | null>;
}
