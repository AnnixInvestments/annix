import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";
import { StockTake } from "./stock-take.entity";

export type StockHoldReason =
  | "damaged"
  | "expired"
  | "contaminated"
  | "recalled"
  | "wrong_spec"
  | "other";

export type StockHoldDispositionStatus =
  | "pending"
  | "scrapped"
  | "returned_to_supplier"
  | "repaired"
  | "donated"
  | "other";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_stock_hold_item")
export class StockHoldItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @ManyToOne(() => StockTake, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "stock_take_id" })
  stockTake: StockTake | null;

  @Column({ name: "stock_take_id", type: "integer", nullable: true })
  stockTakeId: number | null;

  @ManyToOne(() => IssuableProduct, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "product_id", type: "integer" })
  productId: number;

  @Column({
    name: "quantity",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  quantity: number | null;

  @Column({ name: "dimensions_json", type: "jsonb", nullable: true })
  dimensionsJson: { widthMm?: number; lengthM?: number; thicknessMm?: number } | null;

  @Column({ name: "reason", type: "varchar", length: 32 })
  reason: StockHoldReason;

  @Column({ name: "reason_notes", type: "text" })
  reasonNotes: string;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "flagged_by_staff_id", type: "integer" })
  flaggedByStaffId: number;

  @CreateDateColumn({ name: "flagged_at" })
  flaggedAt: Date;

  @Column({
    name: "write_off_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  writeOffValueR: number;

  @Column({ name: "hold_movement_id", type: "integer", nullable: true })
  holdMovementId: number | null;

  @Column({ name: "disposition_status", type: "varchar", length: 32, default: "pending" })
  dispositionStatus: StockHoldDispositionStatus;

  @Column({ name: "disposition_action", type: "text", nullable: true })
  dispositionAction: string | null;

  @Column({ name: "disposition_by_staff_id", type: "integer", nullable: true })
  dispositionByStaffId: number | null;

  @Column({ name: "disposition_at", type: "timestamp", nullable: true })
  dispositionAt: Date | null;

  @Column({ name: "disposition_ref_id", type: "integer", nullable: true })
  dispositionRefId: number | null;

  @Column({ name: "disposition_notes", type: "text", nullable: true })
  dispositionNotes: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
