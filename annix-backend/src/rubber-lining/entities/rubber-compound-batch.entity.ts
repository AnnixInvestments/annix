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
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum BatchPassFailStatus {
  PASS = "PASS",
  FAIL = "FAIL",
}

@Entity("rubber_compound_batches")
export class RubberCompoundBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "firebase_uid", type: "varchar", length: 100, unique: true })
  firebaseUid: string;

  @Column({ name: "supplier_coc_id", type: "int" })
  supplierCocId: number;

  @ManyToOne(() => RubberSupplierCoc)
  @JoinColumn({ name: "supplier_coc_id" })
  supplierCoc: RubberSupplierCoc;

  @Column({ name: "batch_number", type: "varchar", length: 100 })
  batchNumber: string;

  @Column({ name: "compound_stock_id", type: "int", nullable: true })
  compoundStockId: number | null;

  @ManyToOne(() => RubberCompoundStock, { nullable: true })
  @JoinColumn({ name: "compound_stock_id" })
  compoundStock: RubberCompoundStock | null;

  @Column({
    name: "shore_a_hardness",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  shoreAHardness: number | null;

  @Column({
    name: "specific_gravity",
    type: "decimal",
    precision: 5,
    scale: 3,
    nullable: true,
  })
  specificGravity: number | null;

  @Column({
    name: "rebound_percent",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  reboundPercent: number | null;

  @Column({
    name: "tear_strength_kn_m",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  tearStrengthKnM: number | null;

  @Column({
    name: "tensile_strength_mpa",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  tensileStrengthMpa: number | null;

  @Column({
    name: "elongation_percent",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  elongationPercent: number | null;

  @Column({
    name: "rheometer_s_min",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  rheometerSMin: number | null;

  @Column({
    name: "rheometer_s_max",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  rheometerSMax: number | null;

  @Column({
    name: "rheometer_ts2",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  rheometerTs2: number | null;

  @Column({
    name: "rheometer_tc90",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  rheometerTc90: number | null;

  @Column({
    name: "pass_fail_status",
    type: "enum",
    enum: BatchPassFailStatus,
    nullable: true,
  })
  passFailStatus: BatchPassFailStatus | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
