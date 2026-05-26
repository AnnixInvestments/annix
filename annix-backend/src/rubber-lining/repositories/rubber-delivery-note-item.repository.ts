import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberDeliveryNoteItem } from "../entities/rubber-delivery-note-item.entity";

export interface DeliveryNoteRollNumberRow {
  deliveryNoteId: number;
  rollNumber: string;
}

export interface SourceSupplierCocRow {
  id: number;
  cocNumber: string | null;
  supplierCompanyId: number | null;
  supplierCompanyName: string | null;
  rollCount: number;
}

export abstract class RubberDeliveryNoteItemRepository extends CrudRepository<RubberDeliveryNoteItem> {
  abstract build(data: Partial<RubberDeliveryNoteItem>): RubberDeliveryNoteItem;
  abstract saveMany(entities: RubberDeliveryNoteItem[]): Promise<RubberDeliveryNoteItem[]>;
  abstract removeMany(entities: RubberDeliveryNoteItem[]): Promise<void>;
  abstract findByDeliveryNoteId(deliveryNoteId: number): Promise<RubberDeliveryNoteItem[]>;
  abstract findByDeliveryNoteIdOrderedById(
    deliveryNoteId: number,
  ): Promise<RubberDeliveryNoteItem[]>;
  abstract deleteByDeliveryNoteId(deliveryNoteId: number): Promise<void>;
  abstract findRollNumbersByDeliveryNoteIds(
    noteIds: number[],
  ): Promise<DeliveryNoteRollNumberRow[]>;
  abstract sourceSupplierCocsForCustomerDn(deliveryNoteId: number): Promise<SourceSupplierCocRow[]>;
}
