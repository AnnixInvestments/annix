import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";
import { JobPosting } from "./job-posting.entity";

@Entity("cv_assistant_interview_invites")
@Index(["candidateId"])
export class InterviewInvite {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Candidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate: Candidate;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @ManyToOne(() => JobPosting, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @Column({ type: "varchar", length: 120, unique: true })
  token: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
