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

export enum QcpPlanType {
  PAINT_EXTERNAL = "paint_external",
  PAINT_INTERNAL = "paint_internal",
  RUBBER = "rubber",
  HDPE = "hdpe",
}

export enum InterventionType {
  HOLD = "H",
  INSPECTION = "I",
  WITNESS = "W",
  REVIEW = "R",
  SURVEILLANCE = "S",
  VERIFY = "V",
}

export interface PartySignOff {
  interventionType: InterventionType | null;
  initial: string | null;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

export interface QcpActivity {
  operationNumber: number;
  description: string;
  specification: string | null;
  procedureRequired: string | null;
  documentation: string | null;
  pls: PartySignOff;
  mps: PartySignOff;
  client: PartySignOff;
  thirdParty: PartySignOff;
  remarks: string | null;
}

export interface QcpApprovalSignature {
  party: string;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

@Entity("qc_control_plans")
export class QcControlPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @Column({ name: "cpo_id", nullable: true })
  cpoId: number | null;

  @Column({ name: "plan_type", type: "varchar", length: 30 })
  planType: QcpPlanType;

  @Column({ name: "qcp_number", type: "varchar", length: 100, nullable: true })
  qcpNumber: string | null;

  @Column({ name: "document_ref", type: "varchar", length: 50, nullable: true })
  documentRef: string | null;

  @Column({ name: "revision", type: "varchar", length: 20, nullable: true })
  revision: string | null;

  @Column({ name: "customer_name", type: "varchar", length: 255, nullable: true })
  customerName: string | null;

  @Column({ name: "order_number", type: "varchar", length: 255, nullable: true })
  orderNumber: string | null;

  @Column({ name: "job_number", type: "varchar", length: 50, nullable: true })
  jobNumber: string | null;

  @Column({ name: "job_name", type: "varchar", length: 255, nullable: true })
  jobName: string | null;

  @Column({ name: "specification", type: "varchar", length: 500, nullable: true })
  specification: string | null;

  @Column({ name: "item_description", type: "varchar", length: 500, nullable: true })
  itemDescription: string | null;

  @Column({ name: "version", type: "int", default: 1 })
  version: number;

  @Column({ name: "approval_status", type: "varchar", length: 30, default: "draft" })
  approvalStatus: string;

  @Column({ name: "client_email", type: "varchar", length: 255, nullable: true })
  clientEmail: string | null;

  @Column({ name: "third_party_email", type: "varchar", length: 255, nullable: true })
  thirdPartyEmail: string | null;

  @Column({ name: "active_parties", type: "jsonb", nullable: true })
  activeParties: string[] | null;

  @Column({ name: "activities", type: "jsonb" })
  activities: QcpActivity[];

  @Column({ name: "approval_signatures", type: "jsonb" })
  approvalSignatures: QcpApprovalSignature[];

  @Column({ name: "created_by_name", type: "varchar", length: 255 })
  createdByName: string;

  @Column({ name: "created_by_id", type: "integer", nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
