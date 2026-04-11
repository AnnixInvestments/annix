import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_solution_issuance_row")
export class SolutionIssuanceRow {
  @PrimaryColumn({ name: "row_id", type: "integer" })
  rowId: number;

  @OneToOne(
    () => IssuanceRow,
    (row) => row.solution,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "row_id" })
  row: IssuanceRow;

  @Column({
    name: "volume_l",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  volumeL: number;

  @Column({
    name: "concentration_pct",
    type: "numeric",
    precision: 6,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  concentrationPct: number | null;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;
}
