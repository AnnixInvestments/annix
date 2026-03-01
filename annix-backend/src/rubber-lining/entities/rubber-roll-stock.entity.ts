import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompany } from "./rubber-company.entity";
import { RubberProductCoding } from "./rubber-product-coding.entity";
import { RubberStockLocation } from "./rubber-stock-location.entity";

export enum RollStockStatus {
  IN_STOCK = "IN_STOCK",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  SCRAPPED = "SCRAPPED",
}

@Entity("rubber_roll_stock")
export class RubberRollStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "roll_number", type: "varchar", length: 100, unique: true })
  rollNumber: string;

  @Column({ name: "compound_coding_id", type: "int", nullable: true })
  compoundCodingId: number | null;

  @ManyToOne(() => RubberProductCoding, { nullable: true })
  @JoinColumn({ name: "compound_coding_id" })
  compoundCoding: RubberProductCoding | null;

  @Column({
    name: "weight_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
  })
  weightKg: number;

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

  @Column({
    name: "status",
    type: "enum",
    enum: RollStockStatus,
    default: RollStockStatus.IN_STOCK,
  })
  status: RollStockStatus;

  @Column({ name: "linked_batch_ids", type: "jsonb", default: "[]" })
  linkedBatchIds: number[];

  @Column({ name: "delivery_note_item_id", type: "int", nullable: true })
  deliveryNoteItemId: number | null;

  @Column({ name: "sold_to_company_id", type: "int", nullable: true })
  soldToCompanyId: number | null;

  @ManyToOne(() => RubberCompany, { nullable: true })
  @JoinColumn({ name: "sold_to_company_id" })
  soldToCompany: RubberCompany | null;

  @Column({ name: "au_coc_id", type: "int", nullable: true })
  auCocId: number | null;

  @Column({ name: "reserved_by", type: "varchar", length: 100, nullable: true })
  reservedBy: string | null;

  @Column({ name: "reserved_at", type: "timestamp", nullable: true })
  reservedAt: Date | null;

  @Column({ name: "sold_at", type: "timestamp", nullable: true })
  soldAt: Date | null;

  @Column({ name: "location", type: "varchar", length: 100, nullable: true })
  location: string | null;

  @Column({ name: "location_id", type: "int", nullable: true })
  locationId: number | null;

  @ManyToOne(() => RubberStockLocation, { nullable: true })
  @JoinColumn({ name: "location_id" })
  stockLocation: RubberStockLocation | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({
    name: "cost_zar",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  costZar: number | null;

  @Column({
    name: "price_zar",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  priceZar: number | null;

  @Column({ name: "production_date", type: "date", nullable: true })
  productionDate: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
