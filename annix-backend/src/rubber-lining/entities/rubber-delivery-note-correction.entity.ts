import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

@Entity("rubber_delivery_note_corrections")
export class RubberDeliveryNoteCorrection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RubberDeliveryNote, { onDelete: "CASCADE" })
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: RubberDeliveryNote;

  @Column({ name: "delivery_note_id" })
  deliveryNoteId: number;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "field_name", type: "varchar", length: 100 })
  fieldName: string;

  @Column({ name: "original_value", type: "text", nullable: true })
  originalValue: string | null;

  @Column({ name: "corrected_value", type: "text" })
  correctedValue: string;

  @Column({ name: "corrected_by", type: "varchar", length: 100, nullable: true })
  correctedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
