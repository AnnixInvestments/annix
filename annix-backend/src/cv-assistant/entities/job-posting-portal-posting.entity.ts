import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { JobPosting } from "./job-posting.entity";

export enum JobPostingPortalStatus {
  PENDING = "pending",
  POSTED = "posted",
  FAILED = "failed",
  UNPOSTED = "unposted",
}

@Entity("cv_assistant_job_posting_portal_postings")
@Unique("uniq_jp_portal_posting_job_portal", ["jobPostingId", "portalCode"])
@Index("idx_jp_portal_postings_job", ["jobPostingId"])
export class JobPostingPortalPosting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => JobPosting, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id", type: "int" })
  jobPostingId: number;

  @Column({ name: "portal_code", type: "varchar", length: 50 })
  portalCode: string;

  @Column({ name: "portal_job_id", type: "varchar", length: 255, nullable: true })
  portalJobId: string | null;

  @Column({ name: "portal_url", type: "varchar", length: 500, nullable: true })
  portalUrl: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: JobPostingPortalStatus.PENDING,
  })
  status: JobPostingPortalStatus;

  @Column({ name: "posted_at", type: "timestamptz", nullable: true })
  postedAt: Date | null;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
