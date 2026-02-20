import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DeliveryNoteItem } from "./delivery-note-item.entity";

@Entity("delivery_notes")
export class DeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "delivery_number", type: "varchar", length: 100, unique: true })
  deliveryNumber: string;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

  @Column({ name: "received_date", type: "timestamp", nullable: true })
  receivedDate: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "received_by", type: "varchar", length: 255, nullable: true })
  receivedBy: string | null;

  @OneToMany(
    () => DeliveryNoteItem,
    (item) => item.deliveryNote,
  )
  items: DeliveryNoteItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
