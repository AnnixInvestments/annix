import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_paint_issuance_row")
export class PaintIssuanceRow {
  @PrimaryColumn({ name: "row_id", type: "integer" })
  rowId: number;

  @OneToOne(
    () => IssuanceRow,
    (row) => row.paint,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "row_id" })
  row: IssuanceRow;

  @Column({
    name: "litres",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  litres: number;

  @Column({
    name: "coverage_m2",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  coverageM2: number | null;

  @Column({ name: "coat_count", type: "integer", nullable: true })
  coatCount: number | null;

  @Column({ name: "coating_analysis_id", type: "integer", nullable: true })
  coatingAnalysisId: number | null;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;

  @Column({ name: "cpo_pro_rata_split", type: "jsonb", nullable: true })
  cpoProRataSplit: Record<string, number> | null;
}
