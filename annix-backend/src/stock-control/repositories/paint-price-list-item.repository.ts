import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaintPriceListItem } from "../entities/paint-price-list-item.entity";

export abstract class PaintPriceListItemRepository extends CrudRepository<PaintPriceListItem> {
  abstract withTransaction(context: TransactionContext): CrudRepository<PaintPriceListItem>;
  abstract findAllForCompany(companyId: number): Promise<PaintPriceListItem[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<PaintPriceListItem | null>;
}
