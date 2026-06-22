import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";

export abstract class DeliveryNoteItemRepository extends TenantScopedRepository<DeliveryNoteItem> {
  abstract withTransaction(context: TransactionContext): DeliveryNoteItemRepository;
  abstract saveForCompany(companyId: number, entity: DeliveryNoteItem): Promise<DeliveryNoteItem>;
  abstract removeForCompany(companyId: number, entity: DeliveryNoteItem): Promise<void>;
  abstract createMany(rows: Array<DeepPartial<DeliveryNoteItem>>): Promise<DeliveryNoteItem[]>;
  abstract findManyByStockItemForCompany(
    companyId: number,
    stockItemId: number,
  ): Promise<DeliveryNoteItem[]>;
  abstract supplierNamesForStockItems(
    companyId: number,
    itemIds: number[],
  ): Promise<Array<{ stockItemId: number; supplierName: string }>>;
}
