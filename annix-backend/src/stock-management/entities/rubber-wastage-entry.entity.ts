import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RubberWastageBin } from "./rubber-wastage-bin.entity";

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity("sm_rubber_wastage_entry")
export class RubberWastageEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RubberWastageBin, { onDelete: "CASCADE" })
  @JoinColumn({ name: "wastage_bin_id" })
  wastageBin: RubberWastageBin;

  @Column({ name: "wastage_bin_id", type: "integer" })
  wastageBinId: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({
    name: "weight_kg_added",
    type: "numeric",
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  weightKgAdded: number;

  @Column({ name: "source_offcut_product_id", type: "integer", nullable: true })
  sourceOffcutProductId: number | null;

  @Column({ name: "source_issuance_row_id", type: "integer", nullable: true })
  sourceIssuanceRowId: number | null;

  @Column({ name: "source_purchase_batch_id", type: "integer", nullable: true })
  sourcePurchaseBatchId: number | null;

  @Column({
    name: "cost_per_kg_at_entry",
    type: "numeric",
    precision: 12,
    scale: 4,
    transformer: numericTransformer,
  })
  costPerKgAtEntry: number;

  @Column({
    name: "total_cost_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    transformer: numericTransformer,
  })
  totalCostR: number;

  @CreateDateColumn({ name: "added_at" })
  addedAt: Date;

  @Column({ name: "added_by_staff_id", type: "integer", nullable: true })
  addedByStaffId: number | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;
}
