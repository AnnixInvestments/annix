import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberCompoundStock } from "./rubber-compound-stock.entity";

export enum CompoundMovementType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum CompoundMovementReferenceType {
  PURCHASE = "PURCHASE",
  PRODUCTION = "PRODUCTION",
  MANUAL = "MANUAL",
  STOCK_TAKE = "STOCK_TAKE",
}

@Entity("rubber_compound_movements")
export class RubberCompoundMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "compound_stock_id", type: "int" })
  compoundStockId: number;

  @ManyToOne(() => RubberCompoundStock)
  @JoinColumn({ name: "compound_stock_id" })
  compoundStock: RubberCompoundStock;

  @Column({
    name: "movement_type",
    type: "enum",
    enum: CompoundMovementType,
  })
  movementType: CompoundMovementType;

  @Column({
    name: "quantity_kg",
    type: "decimal",
    precision: 12,
    scale: 3,
  })
  quantityKg: number;

  @Column({
    name: "reference_type",
    type: "enum",
    enum: CompoundMovementReferenceType,
  })
  referenceType: CompoundMovementReferenceType;

  @Column({ name: "reference_id", type: "int", nullable: true })
  referenceId: number | null;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "created_by", type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
