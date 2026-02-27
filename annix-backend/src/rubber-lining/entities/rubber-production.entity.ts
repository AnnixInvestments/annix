import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RubberCompoundStock } from "./rubber-compound-stock.entity";
import { RubberProduct } from "./rubber-product.entity";

export enum RubberProductionStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

@Entity("rubber_productions")
export class RubberProduction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "production_number", type: "varchar", length: 50 })
  productionNumber: string;

  @Column({ name: "product_id", type: "int" })
  productId: number;

  @ManyToOne(() => RubberProduct)
  @JoinColumn({ name: "product_id" })
  product: RubberProduct;

  @Column({ name: "compound_stock_id", type: "int" })
  compoundStockId: number;

  @ManyToOne(() => RubberCompoundStock)
  @JoinColumn({ name: "compound_stock_id" })
  compoundStock: RubberCompoundStock;

  @Column({
    name: "thickness_mm",
    type: "decimal",
    precision: 6,
    scale: 2,
  })
  thicknessMm: number;

  @Column({
    name: "width_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  widthMm: number;

  @Column({
    name: "length_m",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  lengthM: number;

  @Column({
    name: "quantity",
    type: "int",
  })
  quantity: number;

  @Column({
    name: "compound_used_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
  })
  compoundUsedKg: number | null;

  @Column({
    name: "status",
    type: "enum",
    enum: RubberProductionStatus,
    default: RubberProductionStatus.PENDING,
  })
  status: RubberProductionStatus;

  @Column({ name: "order_id", type: "int", nullable: true })
  orderId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
