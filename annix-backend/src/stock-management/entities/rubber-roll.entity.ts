import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

export type RubberRollStatus =
  | "available"
  | "allocated"
  | "issued"
  | "partially_issued"
  | "consumed"
  | "missing"
  | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_roll")
export class RubberRoll {
  @PrimaryColumn({ name: "product_id", type: "integer" })
  productId: number;

  @OneToOne(
    () => IssuableProduct,
    (product) => product.rubberRoll,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "roll_number", type: "varchar", length: 100 })
  rollNumber: string;

  @Column({ name: "compound_code", type: "varchar", length: 100, nullable: true })
  compoundCode: string | null;

  @Column({ name: "compound_id", type: "integer", nullable: true })
  compoundId: number | null;

  @Column({ name: "colour", type: "varchar", length: 64, nullable: true })
  colour: string | null;

  @Column({
    name: "width_mm",
    type: "numeric",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  widthMm: number | null;

  @Column({
    name: "thickness_mm",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  thicknessMm: number | null;

  @Column({
    name: "length_m",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  lengthM: number | null;

  @Column({
    name: "weight_kg",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  weightKg: number | null;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;

  @Column({ name: "supplier_name", type: "varchar", length: 255, nullable: true })
  supplierName: string | null;

  @Column({ name: "received_at", type: "timestamp", nullable: true })
  receivedAt: Date | null;

  @Column({ name: "status", type: "varchar", length: 32, default: "available" })
  status: RubberRollStatus;

  @Column({
    name: "density_override_kg_per_m3",
    type: "numeric",
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  densityOverrideKgPerM3: number | null;

  @Column({ name: "legacy_rubber_roll_id", type: "integer", nullable: true })
  legacyRubberRollId: number | null;
}
