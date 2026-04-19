import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { DeliveryNote } from "./delivery-note.entity";
import { StockControlCompany } from "./stock-control-company.entity";
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

  @Column({ name: "quantity_received", type: "numeric", precision: 12, scale: 2 })
  quantityReceived: number;

  @Column({ name: "roll_number", type: "varchar", length: 50, nullable: true })
  rollNumber: string | null;

  @Column({ name: "weight_kg", type: "numeric", precision: 10, scale: 2, nullable: true })
  weightKg: number | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;
}
