import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum QcpApprovalTokenStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  SUPERSEDED = "SUPERSEDED",
}

export type QcpPartyRole = "client" | "third_party";

@Entity("qcp_approval_tokens")
export class QcpApprovalToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "control_plan_id" })
  controlPlanId: number;

  @Column({ name: "control_plan_version", type: "int" })
  controlPlanVersion: number;

  @Column({ name: "party_role", type: "varchar", length: 20 })
  partyRole: QcpPartyRole;

  @Column({ name: "recipient_email", type: "varchar", length: 255 })
  recipientEmail: string;

  @Column({ name: "recipient_name", type: "varchar", length: 255, nullable: true })
  recipientName: string | null;

  @Column({ name: "token", type: "varchar", length: 100, unique: true })
  token: string;

  @Column({ name: "token_expires_at", type: "timestamp" })
  tokenExpiresAt: Date;

  @Column({
    name: "status",
    type: "varchar",
    length: 20,
    default: QcpApprovalTokenStatus.PENDING,
  })
  status: QcpApprovalTokenStatus;

  @Column({ name: "activities_snapshot", type: "jsonb", nullable: true })
  activitiesSnapshot: any[] | null;

  @Column({ name: "submitted_activities", type: "jsonb", nullable: true })
  submittedActivities: any[] | null;

  @Column({ name: "line_remarks", type: "jsonb", nullable: true })
  lineRemarks: Array<{ operationNumber: number; remark: string }> | null;

  @Column({ name: "overall_comments", type: "text", nullable: true })
  overallComments: string | null;

  @Column({ name: "signature_name", type: "varchar", length: 255, nullable: true })
  signatureName: string | null;

  @Column({ name: "signature_url", type: "text", nullable: true })
  signatureUrl: string | null;

  @Column({ name: "signed_at", type: "timestamp", nullable: true })
  signedAt: Date | null;

  @Column({ name: "sent_by_party", type: "varchar", length: 20, nullable: true })
  sentByParty: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
