import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PlatformDeliveryNote } from "./delivery-note.entity";

@Entity("platform_delivery_note_items")
export class DeliveryNoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "delivery_note_id", type: "int" })
  deliveryNoteId: number;

  @ManyToOne(
    () => PlatformDeliveryNote,
    (dn) => dn.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "delivery_note_id" })
  deliveryNote: PlatformDeliveryNote;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "int", nullable: true })
  quantity: number | null;

  @Column({ name: "quantity_received", type: "decimal", precision: 12, scale: 2, nullable: true })
  quantityReceived: number | null;

  @Column({ name: "stock_item_id", type: "int", nullable: true })
  stockItemId: number | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "roll_number", type: "varchar", length: 100, nullable: true })
  rollNumber: string | null;

  @Column({ name: "batch_number_start", type: "varchar", length: 100, nullable: true })
  batchNumberStart: string | null;

  @Column({ name: "batch_number_end", type: "varchar", length: 100, nullable: true })
  batchNumberEnd: string | null;

  @Column({ name: "weight_kg", type: "decimal", precision: 12, scale: 3, nullable: true })
  weightKg: number | null;

  @Column({ name: "roll_weight_kg", type: "decimal", precision: 12, scale: 3, nullable: true })
  rollWeightKg: number | null;

  @Column({ name: "width_mm", type: "decimal", precision: 8, scale: 2, nullable: true })
  widthMm: number | null;

  @Column({ name: "thickness_mm", type: "decimal", precision: 6, scale: 2, nullable: true })
  thicknessMm: number | null;

  @Column({ name: "length_m", type: "decimal", precision: 10, scale: 2, nullable: true })
  lengthM: number | null;

  @Column({ name: "compound_type", type: "varchar", length: 100, nullable: true })
  compoundType: string | null;

  @Column({ name: "item_category", type: "varchar", length: 50, default: "GENERAL" })
  itemCategory: string;

  @Column({ name: "linked_batch_ids", type: "jsonb", default: "[]" })
  linkedBatchIds: number[];

  @Column({ name: "coc_batch_numbers", type: "jsonb", nullable: true })
  cocBatchNumbers: string[] | null;

  @Column({
    name: "theoretical_weight_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  theoreticalWeightKg: number | null;

  @Column({ name: "weight_deviation_pct", type: "decimal", precision: 6, scale: 2, nullable: true })
  weightDeviationPct: number | null;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, nullable: true })
  firebaseUid: string | null;

  @Column({ name: "legacy_sc_item_id", type: "int", nullable: true })
  legacyScItemId: number | null;

  @Column({ name: "legacy_rubber_item_id", type: "int", nullable: true })
  legacyRubberItemId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
