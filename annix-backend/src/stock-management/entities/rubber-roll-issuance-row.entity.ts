import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

export type RubberRollIssuanceRowStatus =
  | "active"
  | "partial_return"
  | "fully_returned"
  | "written_off";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_rubber_roll_issuance_row")
export class RubberRollIssuanceRow {
  @PrimaryColumn({ name: "row_id", type: "integer" })
  rowId: number;

  @OneToOne(
    () => IssuanceRow,
    (row) => row.rubberRoll,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "row_id" })
  row: IssuanceRow;

  @Column({
    name: "weight_kg_issued",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  weightKgIssued: number;

  @Column({
    name: "issued_width_mm",
    type: "numeric",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  issuedWidthMm: number | null;

  @Column({
    name: "issued_length_m",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  issuedLengthM: number | null;

  @Column({
    name: "issued_thickness_mm",
    type: "numeric",
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  issuedThicknessMm: number | null;

  @Column({ name: "expected_return_dimensions", type: "jsonb", nullable: true })
  expectedReturnDimensions: { widthMm?: number; lengthM?: number; thicknessMm?: number } | null;

  @Column({ name: "status", type: "varchar", length: 32, default: "active" })
  status: RubberRollIssuanceRowStatus;
}
