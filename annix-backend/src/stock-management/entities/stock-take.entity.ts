import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockTakeLine } from "./stock-take-line.entity";

export type StockTakeStatus =
  | "draft"
  | "counting"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted"
  | "archived";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_stock_take")
export class StockTake {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "period_label", type: "varchar", length: 64, nullable: true })
  periodLabel: string | null;

  @Column({ name: "period_start", type: "date", nullable: true })
  periodStart: string | null;

  @Column({ name: "period_end", type: "date", nullable: true })
  periodEnd: string | null;

  @Column({ name: "status", type: "varchar", length: 32, default: "draft" })
  status: StockTakeStatus;

  @Column({ name: "snapshot_at", type: "timestamp", nullable: true })
  snapshotAt: Date | null;

  @CreateDateColumn({ name: "started_at" })
  startedAt: Date;

  @Column({ name: "started_by_staff_id", type: "integer", nullable: true })
  startedByStaffId: number | null;

  @Column({ name: "submitted_at", type: "timestamp", nullable: true })
  submittedAt: Date | null;

  @Column({ name: "submitted_by_staff_id", type: "integer", nullable: true })
  submittedByStaffId: number | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "approved_by_staff_id", type: "integer", nullable: true })
  approvedByStaffId: number | null;

  @Column({ name: "approver_role", type: "varchar", length: 32, nullable: true })
  approverRole: string | null;

  @Column({ name: "rejected_at", type: "timestamp", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "rejected_by_staff_id", type: "integer", nullable: true })
  rejectedByStaffId: number | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ name: "posted_at", type: "timestamp", nullable: true })
  postedAt: Date | null;

  @Column({ name: "posted_by_staff_id", type: "integer", nullable: true })
  postedByStaffId: number | null;

  @Column({
    name: "valuation_before_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  valuationBeforeR: number | null;

  @Column({
    name: "valuation_after_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  valuationAfterR: number | null;

  @Column({
    name: "total_variance_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  totalVarianceR: number | null;

  @Column({
    name: "total_variance_abs_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  totalVarianceAbsR: number | null;

  @Column({ name: "requires_escalated_review", type: "boolean", default: false })
  requiresEscalatedReview: boolean;

  @Column({ name: "requires_high_value_approval", type: "boolean", default: false })
  requiresHighValueApproval: boolean;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => StockTakeLine,
    (line) => line.stockTake,
  )
  lines: StockTakeLine[];
}
