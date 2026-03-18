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

@Entity("job_card_action_completions")
@Unique(["jobCardId", "stepKey", "actionType"])
export class JobCardActionCompletion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "step_key", type: "varchar", length: 50 })
  stepKey: string;

  @Column({ name: "action_type", type: "varchar", length: 20, default: "primary" })
  actionType: string;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "completed_by_id" })
  completedBy: StockControlUser | null;

  @Column({ name: "completed_by_id" })
  completedById: number;

  @Column({ name: "completed_by_name", type: "varchar", length: 255 })
  completedByName: string;

  @Column({ name: "completed_at", type: "timestamptz", default: () => "now()" })
  completedAt: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
