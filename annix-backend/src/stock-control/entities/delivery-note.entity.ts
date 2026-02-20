import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeliveryNoteItem } from "./delivery-note-item.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("delivery_notes")
export class DeliveryNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "delivery_number", type: "varchar", length: 100 })
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

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @OneToMany(
    () => DeliveryNoteItem,
    (item) => item.deliveryNote,
  )
  items: DeliveryNoteItem[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
