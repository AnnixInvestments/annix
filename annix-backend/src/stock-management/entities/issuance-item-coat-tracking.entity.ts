import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

export type CoatTrackingType = "primer" | "intermediate" | "final" | "rubber_lining";

@Entity("sm_issuance_item_coat_tracking")
export class IssuanceItemCoatTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "issuance_row_id", type: "integer" })
  issuanceRowId: number;

  @ManyToOne(() => IssuanceRow, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issuance_row_id" })
  issuanceRow: IssuanceRow;

  @Column({ name: "job_card_id", type: "integer" })
  jobCardId: number;

  @Column({ name: "line_item_id", type: "integer" })
  lineItemId: number;

  @Column({ name: "coat_type", type: "varchar", length: 32 })
  coatType: CoatTrackingType;

  @Column({ name: "quantity_issued", type: "integer" })
  quantityIssued: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
