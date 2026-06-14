import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_SUBMISSION_STATUSES = [
  "submitted",
  "viewed",
  "interested",
  "interview",
  "offer",
  "placed",
  "rejected",
  "no_response",
] as const;
export type AnnixOrbitSubmissionStatus = (typeof ORBIT_SUBMISSION_STATUSES)[number];

@Entity("orbit_submissions")
@Index(["companyId"])
export class AnnixOrbitSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  // Consultant who owns this submission — drives the dashboard
  // Top-Consultants leaderboard (issue #362). Stamped to the creating
  // user; null on rows created before attribution existed.
  @Column({ name: "consultant_user_id", type: "int", nullable: true })
  consultantUserId: number | null;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ name: "job_title", type: "varchar", length: 255 })
  jobTitle: string;

  @Column({ type: "varchar", length: 20, default: "submitted" })
  status: AnnixOrbitSubmissionStatus;

  @Column({ name: "submitted_at", type: "varchar", length: 30, nullable: true })
  submittedAt: string | null;

  // Scheduled interview date/time (ISO) — set when the submission
  // reaches the interview stage; powers the dashboard Upcoming
  // Interviews widget (issue #362 phase 6).
  @Column({ name: "interview_at", type: "varchar", length: 30, nullable: true })
  interviewAt: string | null;

  @Column({ type: "text", nullable: true })
  feedback: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
