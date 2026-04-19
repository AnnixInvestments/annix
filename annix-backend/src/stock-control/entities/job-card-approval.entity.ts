import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

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
  step: string;

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

  @Column({ name: "outcome_key", type: "varchar", length: 50, nullable: true })
  outcomeKey: string | null;

  @Column({ name: "approved_at", type: "timestamp", nullable: true })
  approvedAt: Date | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_approved_by_id" })
  unifiedApprovedBy?: User | null;

  @Column({ name: "unified_approved_by_id", nullable: true })
  unifiedApprovedById?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
