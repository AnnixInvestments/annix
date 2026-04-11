import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { IssuanceRow } from "./issuance-row.entity";

export type IssuanceSessionKind = "standard" | "cpo_batch" | "rubber_roll" | "mixed";

export type IssuanceSessionStatus =
  | "active"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "undone";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

@Entity("sm_issuance_session")
export class IssuanceSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id", type: "integer" })
  companyId: number;

  @Column({ name: "session_kind", type: "varchar", length: 32, default: "standard" })
  sessionKind: IssuanceSessionKind;

  @Column({ name: "status", type: "varchar", length: 32, default: "active" })
  status: IssuanceSessionStatus;

  @Column({ name: "issuer_staff_id", type: "integer", nullable: true })
  issuerStaffId: number | null;

  @Column({ name: "recipient_staff_id", type: "integer", nullable: true })
  recipientStaffId: number | null;

  @Column({ name: "cpo_id", type: "integer", nullable: true })
  cpoId: number | null;

  @Column({ name: "job_card_ids", type: "integer", array: true, nullable: true })
  jobCardIds: number[] | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({
    name: "approval_threshold_value_r",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  approvalThresholdValueR: number | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @Column({ name: "approved_by_staff_id", type: "integer", nullable: true })
  approvedByStaffId: number | null;

  @Column({ name: "rejected_at", type: "timestamp", nullable: true })
  rejectedAt: Date | null;

  @Column({ name: "rejected_by_staff_id", type: "integer", nullable: true })
  rejectedByStaffId: number | null;

  @Column({ name: "rejection_reason", type: "text", nullable: true })
  rejectionReason: string | null;

  @Column({ name: "undone_at", type: "timestamp", nullable: true })
  undoneAt: Date | null;

  @Column({ name: "undone_by_staff_id", type: "integer", nullable: true })
  undoneByStaffId: number | null;

  @Column({ name: "legacy_session_id", type: "integer", nullable: true })
  legacySessionId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => IssuanceRow,
    (row) => row.session,
  )
  rows: IssuanceRow[];
}
