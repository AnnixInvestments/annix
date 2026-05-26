import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";

export abstract class DeliveryNoteItemRepository extends CrudRepository<DeliveryNoteItem> {
  abstract withTransaction(context: TransactionContext): CrudRepository<DeliveryNoteItem>;
  abstract createMany(rows: Array<DeepPartial<DeliveryNoteItem>>): Promise<DeliveryNoteItem[]>;
  abstract supplierNamesForStockItems(
    companyId: number,
    itemIds: number[],
  ): Promise<Array<{ stockItemId: number; supplierName: string }>>;
}
