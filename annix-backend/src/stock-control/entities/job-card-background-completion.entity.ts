import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("job_card_background_completions")
@Unique(["jobCardId", "stepKey"])
export class JobCardBackgroundCompletion {
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

  @Column({ name: "step_key", type: "varchar", length: 50 })
  stepKey: string;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "completed_by_id" })
  completedBy: StockControlUser | null;

  @Column({ name: "completed_by_id", nullable: true })
  completedById: number | null;

  @Column({ name: "completed_by_name", type: "varchar", length: 255, nullable: true })
  completedByName: string | null;

  @Column({ name: "completed_at", type: "timestamp", default: () => "now()" })
  completedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "completion_type", type: "varchar", length: 20, default: "manual" })
  completionType: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
