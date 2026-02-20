import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DeliveryNote } from "./delivery-note.entity";
import { StockItem } from "./stock-item.entity";

@Entity("delivery_note_items")
export class DeliveryNoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => DeliveryNote,
    (deliveryNote) => deliveryNote.items,
  )
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: DeliveryNote;

  @ManyToOne(
    () => StockItem,
    (stockItem) => stockItem.deliveryNoteItems,
  )
  @JoinColumn({ name: "stock_item_id" })
  stockItem: StockItem;

  @Column({ name: "quantity_received", type: "integer" })
  quantityReceived: number;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;
}
