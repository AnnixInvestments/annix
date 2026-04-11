import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuableProduct } from "./issuable-product.entity";

export type RubberOffcutStatus = "available" | "allocated" | "issued" | "missing" | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_offcut_stock")
export class RubberOffcutStock {
  @PrimaryColumn({ name: "product_id", type: "integer" })
  productId: number;

  @OneToOne(
    () => IssuableProduct,
    (product) => product.rubberOffcut,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "product_id" })
  product: IssuableProduct;

  @Column({ name: "offcut_number", type: "varchar", length: 100 })
  offcutNumber: string;

  @Column({ name: "source_roll_id", type: "integer", nullable: true })
  sourceRollId: number | null;

  @Column({ name: "source_purchase_batch_id", type: "integer", nullable: true })
  sourcePurchaseBatchId: number | null;

  @Column({ name: "source_issuance_row_id", type: "integer", nullable: true })
  sourceIssuanceRowId: number | null;

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
    transformer: numericTransformer,
  })
  widthMm: number;

  @Column({
    name: "length_m",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  lengthM: number;

  @Column({
    name: "thickness_mm",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  thicknessMm: number;

  @Column({
    name: "computed_weight_kg",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  computedWeightKg: number | null;

  @Column({ name: "status", type: "varchar", length: 32, default: "available" })
  status: RubberOffcutStatus;

  @Column({ name: "location_id", type: "integer", nullable: true })
  locationId: number | null;

  @Column({ name: "received_at", type: "timestamp", default: () => "now()" })
  receivedAt: Date;

  @Column({ name: "received_by_staff_id", type: "integer", nullable: true })
  receivedByStaffId: number | null;

  @Column({ name: "photo_url", type: "text", nullable: true })
  photoUrl: string | null;

  @Column({ name: "last_counted_at", type: "timestamp", nullable: true })
  lastCountedAt: Date | null;

  @Column({ name: "last_counted_by_staff_id", type: "integer", nullable: true })
  lastCountedByStaffId: number | null;

  @Column({ name: "last_counted_variance", type: "jsonb", nullable: true })
  lastCountedVariance: Record<string, unknown> | null;

  @Column({ name: "written_off_at", type: "timestamp", nullable: true })
  writtenOffAt: Date | null;

  @Column({ name: "written_off_by_staff_id", type: "integer", nullable: true })
  writtenOffByStaffId: number | null;

  @Column({ name: "write_off_reason", type: "text", nullable: true })
  writeOffReason: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
