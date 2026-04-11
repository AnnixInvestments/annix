import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => (value === null ? 0 : Number(value)),
};

@Entity("sm_consumable_issuance_row")
export class ConsumableIssuanceRow {
  @PrimaryColumn({ name: "row_id", type: "integer" })
  rowId: number;

  @OneToOne(
    () => IssuanceRow,
    (row) => row.consumable,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "row_id" })
  row: IssuanceRow;

  @Column({
    name: "quantity",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  quantity: number;

  @Column({ name: "batch_number", type: "varchar", length: 100, nullable: true })
  batchNumber: string | null;
}
