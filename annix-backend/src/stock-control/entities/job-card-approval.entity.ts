import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum WorkflowStep {
  DOCUMENT_UPLOAD = "document_upload",
  ADMIN_APPROVAL = "admin_approval",
  MANAGER_APPROVAL = "manager_approval",
  REQUISITION_SENT = "requisition_sent",
  STOCK_ALLOCATION = "stock_allocation",
  MANAGER_FINAL = "manager_final",
  READY_FOR_DISPATCH = "ready_for_dispatch",
  DISPATCHED = "dispatched",
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("job_card_approvals")
export class JobCardApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobCard,
    (jobCard) => jobCard.approvals,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ type: "varchar", length: 50 })
  step: WorkflowStep;

  @Column({ type: "varchar", length: 20, default: ApprovalStatus.PENDING })
  status: ApprovalStatus;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "approved_by_id" })
  approvedBy: StockControlUser | null;

  @Column({ name: "approved_by_id", nullable: true })
  approvedById: number | null;

  @Column({ name: "approved_by_name", type: "varchar", length: 255, nullable: true })
  approvedByName: string | null;

  @Column({ name: "signature_url", type: "text", nullable: true })
  signatureUrl: string | null;

  @Column({ type: "text", nullable: true })
  comments: string | null;

  @Column({ name: "rejected_reason", type: "text", nullable: true })
  rejectedReason: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
