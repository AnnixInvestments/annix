import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberProductCoding } from "./rubber-product-coding.entity";

@Entity("rubber_compound_stock")
export class RubberCompoundStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "compound_coding_id", type: "int" })
  compoundCodingId: number;

  @ManyToOne(() => RubberProductCoding)
  @JoinColumn({ name: "compound_coding_id" })
  compoundCoding: RubberProductCoding;

  @Column({
    name: "quantity_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  quantityKg: number;

  @Column({
    name: "min_stock_level_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  minStockLevelKg: number;

  @Column({
    name: "reorder_point_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
  })
  reorderPointKg: number;

  @Column({
    name: "cost_per_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPerKg: number | null;

  @Column({ name: "location", type: "varchar", length: 100, nullable: true })
  location: string | null;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
