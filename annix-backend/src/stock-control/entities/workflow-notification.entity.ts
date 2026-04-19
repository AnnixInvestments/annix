import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum NotificationActionType {
  APPROVAL_REQUIRED = "approval_required",
  APPROVAL_COMPLETED = "approval_completed",
  APPROVAL_REJECTED = "approval_rejected",
  STOCK_ALLOCATED = "stock_allocated",
  DISPATCH_READY = "dispatch_ready",
  DISPATCH_COMPLETED = "dispatch_completed",
  OVER_ALLOCATION_APPROVAL = "over_allocation_approval",
  JOB_CARDS_IMPORTED = "job_cards_imported",
  CPO_CALLOFF_NEEDED = "cpo_calloff_needed",
  CPO_INVOICE_OVERDUE = "cpo_invoice_overdue",
  CALIBRATION_EXPIRY_WARNING = "calibration_expiry_warning",
  CALIBRATION_EXPIRED = "calibration_expired",
  BACKGROUND_STEP_REQUIRED = "background_step_required",
  BACKGROUND_STEP_COMPLETED = "background_step_completed",
  DOCUMENT_ARRIVED = "document_arrived",
  QA_REJECTION_ESCALATION = "qa_rejection_escalation",
  QCP_CHANGES_REQUESTED = "qcp_changes_requested",
}

@Entity("workflow_notifications")
export class WorkflowNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard | null;

  @Column({ name: "job_card_id", nullable: true })
  jobCardId: number | null;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  message: string | null;

  @Column({ name: "action_type", type: "varchar", length: 50 })
  actionType: NotificationActionType;

  @Column({ name: "action_url", type: "text", nullable: true })
  actionUrl: string | null;

  @Column({ name: "read_at", type: "timestamp", nullable: true })
  readAt: Date | null;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "sender_id" })
  sender: StockControlUser | null;

  @Column({ name: "sender_id", nullable: true })
  senderId: number | null;

  @Column({ name: "sender_name", type: "varchar", length: 255, nullable: true })
  senderName: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_sender_id" })
  unifiedSender?: User | null;

  @Column({ name: "unified_sender_id", nullable: true })
  unifiedSenderId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
