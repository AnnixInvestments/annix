import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { JobPosting } from "./job-posting.entity";

export enum SuccessMetricTimeframe {
  THREE_MONTHS = "3_months",
  TWELVE_MONTHS = "12_months",
}

@Entity("cv_assistant_job_success_metrics")
export class JobSuccessMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => JobPosting,
    (jobPosting) => jobPosting.successMetrics,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @Column({ type: "varchar", length: 16 })
  timeframe: SuccessMetricTimeframe;

  @Column({ type: "text" })
  metric: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
