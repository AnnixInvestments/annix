import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DeliveryNote } from "./delivery-note.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("dn_extraction_corrections")
export class DnExtractionCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "supplier_name", type: "varchar", length: 255 })
  supplierName: string;

  @ManyToOne(() => DeliveryNote, { onDelete: "CASCADE" })
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: DeliveryNote;

  @Column({ name: "delivery_note_id" })
  deliveryNoteId: number;

  @Column({ name: "field_name", type: "varchar", length: 100 })
  fieldName: string;

  @Column({ name: "original_value", type: "text", nullable: true })
  originalValue: string | null;

  @Column({ name: "corrected_value", type: "text" })
  correctedValue: string;

  @Column({ name: "item_description", type: "text", nullable: true })
  itemDescription: string | null;

  @Column({ name: "item_index", type: "int", nullable: true })
  itemIndex: number | null;

  @ManyToOne(() => StockControlUser, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "corrected_by" })
  correctedByUser: StockControlUser | null;

  @Column({ name: "corrected_by", nullable: true })
  correctedBy: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
