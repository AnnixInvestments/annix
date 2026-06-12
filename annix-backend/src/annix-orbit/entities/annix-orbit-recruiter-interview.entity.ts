import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export const ORBIT_INTERVIEW_TYPES = ["phone", "video", "in_person"] as const;
export type AnnixOrbitInterviewType = (typeof ORBIT_INTERVIEW_TYPES)[number];

export const ORBIT_INTERVIEW_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
  "rescheduled",
  "passed",
  "rejected",
] as const;
export type AnnixOrbitInterviewStatus = (typeof ORBIT_INTERVIEW_STATUSES)[number];

@Entity("orbit_recruiter_interviews")
@Index(["companyId"])
export class AnnixOrbitRecruiterInterview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "candidate_id", type: "int", nullable: true })
  candidateId: number | null;

  @Column({ name: "client_id", type: "int", nullable: true })
  clientId: number | null;

  @Column({ name: "candidate_name", type: "varchar", length: 255 })
  candidateName: string;

  @Column({ name: "job_title", type: "varchar", length: 255, nullable: true })
  jobTitle: string | null;

  @Column({ name: "scheduled_at", type: "varchar", length: 30, nullable: true })
  scheduledAt: string | null;

  @Column({ name: "interview_type", type: "varchar", length: 20, default: "video" })
  interviewType: AnnixOrbitInterviewType;

  @Column({ type: "varchar", length: 20, default: "scheduled" })
  status: AnnixOrbitInterviewStatus;

  @Column({ type: "text", nullable: true })
  feedback: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
