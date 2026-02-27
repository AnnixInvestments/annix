import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
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

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
