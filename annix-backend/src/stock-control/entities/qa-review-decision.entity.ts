import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("qa_review_decisions")
export class QaReviewDecision {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "cycle_number", type: "int", default: 1 })
  cycleNumber: number;

  @Column({ name: "rubber_applicable", type: "boolean", default: false })
  rubberApplicable: boolean;

  @Column({ name: "paint_applicable", type: "boolean", default: false })
  paintApplicable: boolean;

  @Column({ name: "rubber_accepted", type: "boolean", nullable: true })
  rubberAccepted: boolean | null;

  @Column({ name: "paint_accepted", type: "boolean", nullable: true })
  paintAccepted: boolean | null;

  @Column({ name: "reviewed_by_id", type: "int", nullable: true })
  reviewedById: number | null;

  @Column({ name: "reviewed_by_name", type: "varchar", length: 255, nullable: true })
  reviewedByName: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", default: () => "NOW()" })
  reviewedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
