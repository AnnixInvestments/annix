import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

@Entity("rubber_delivery_note_items")
export class RubberDeliveryNoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "delivery_note_id", type: "int" })
  deliveryNoteId: number;

  @ManyToOne(() => RubberDeliveryNote, { onDelete: "CASCADE" })
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: RubberDeliveryNote;

  @Column({ name: "batch_number_start", type: "varchar", length: 100, nullable: true })
  batchNumberStart: string | null;

  @Column({ name: "batch_number_end", type: "varchar", length: 100, nullable: true })
  batchNumberEnd: string | null;

  @Column({
    name: "weight_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  weightKg: number | null;

  @Column({ name: "roll_number", type: "varchar", length: 100, nullable: true })
  rollNumber: string | null;

  @Column({
    name: "roll_weight_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  rollWeightKg: number | null;

  @Column({
    name: "width_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  widthMm: number | null;

  @Column({
    name: "thickness_mm",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  thicknessMm: number | null;

  @Column({
    name: "length_m",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  lengthM: number | null;

  @Column({ name: "linked_batch_ids", type: "jsonb", default: "[]" })
  linkedBatchIds: number[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
