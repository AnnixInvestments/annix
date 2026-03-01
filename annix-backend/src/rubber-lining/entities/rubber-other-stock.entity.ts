import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberStockLocation } from "./rubber-stock-location.entity";

export enum OtherStockUnitOfMeasure {
  EACH = "EACH",
  BOX = "BOX",
  PACK = "PACK",
  KG = "KG",
  LITERS = "LITERS",
  METERS = "METERS",
  ROLLS = "ROLLS",
  SHEETS = "SHEETS",
  PAIRS = "PAIRS",
  SETS = "SETS",
}

@Entity("rubber_other_stock")
export class RubberOtherStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "item_code", type: "varchar", length: 50, unique: true })
  itemCode: string;

  @Column({ name: "item_name", type: "varchar", length: 200 })
  itemName: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string | null;

  @Column({ name: "category", type: "varchar", length: 100, nullable: true })
  category: string | null;

  @Column({
    name: "unit_of_measure",
    type: "enum",
    enum: OtherStockUnitOfMeasure,
    default: OtherStockUnitOfMeasure.EACH,
  })
  unitOfMeasure: OtherStockUnitOfMeasure;

  @Column({
    name: "quantity",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  quantity: number;

  @Column({
    name: "min_stock_level",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  minStockLevel: number;

  @Column({
    name: "reorder_point",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  reorderPoint: number;

  @Column({
    name: "cost_per_unit",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPerUnit: number | null;

  @Column({
    name: "price_per_unit",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pricePerUnit: number | null;

  @Column({ name: "location", type: "varchar", length: 100, nullable: true })
  location: string | null;

  @Column({ name: "location_id", type: "int", nullable: true })
  locationId: number | null;

  @ManyToOne(() => RubberStockLocation, { nullable: true })
  @JoinColumn({ name: "location_id" })
  stockLocation: RubberStockLocation | null;

  @Column({ name: "supplier", type: "varchar", length: 200, nullable: true })
  supplier: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
