import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

@Entity("rubber_cutting_training")
export class RubberCuttingTraining {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlCompany)
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "job_card_id", type: "int" })
  jobCardId: number;

  @Column({ name: "panel_fingerprint", type: "varchar", length: 64 })
  panelFingerprint: string;

  @Column({ name: "panel_count", type: "int" })
  panelCount: number;

  @Column({ name: "panel_summary", type: "jsonb" })
  panelSummary: Array<{ widthMm: number; lengthMm: number; quantity: number }>;

  @Column({ name: "auto_plan_snapshot", type: "jsonb" })
  autoPlanSnapshot: Record<string, any>;

  @Column({ name: "manual_plan", type: "jsonb" })
  manualPlan: Record<string, any>;

  @Column({ name: "auto_waste_pct", type: "numeric", precision: 5, scale: 2 })
  autoWastePct: number;

  @Column({ name: "manual_waste_pct", type: "numeric", precision: 5, scale: 2 })
  manualWastePct: number;

  @Column({ name: "roll_width_mm", type: "int" })
  rollWidthMm: number;

  @Column({ name: "roll_length_mm", type: "int" })
  rollLengthMm: number;

  @Column({ name: "usage_count", type: "int", default: 1 })
  usageCount: number;

  @Column({ name: "times_suggested", type: "int", default: 0 })
  timesSuggested: number;

  @Column({ name: "times_applied", type: "int", default: 0 })
  timesApplied: number;

  @Column({ name: "times_applied_modified", type: "int", default: 0 })
  timesAppliedModified: number;

  @Column({ name: "times_ignored", type: "int", default: 0 })
  timesIgnored: number;

  @Column({ name: "feedback_score", type: "numeric", precision: 4, scale: 2, default: 0 })
  feedbackScore: number;

  @Column({ name: "reviewed_by", type: "varchar", length: 255, nullable: true })
  reviewedBy: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({ name: "last_used_at", type: "timestamptz" })
  lastUsedAt: Date;
}
