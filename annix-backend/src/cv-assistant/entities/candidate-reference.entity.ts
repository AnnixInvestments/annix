import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";

export enum ReferenceStatus {
  PENDING = "pending",
  REQUESTED = "requested",
  RESPONDED = "responded",
  EXPIRED = "expired",
}

@Entity("cv_assistant_candidate_references")
export class CandidateReference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  relationship: string | null;

  @Column({ name: "feedback_token", type: "varchar", length: 255, unique: true })
  feedbackToken: string;

  @Column({ name: "token_expires_at", type: "timestamptz" })
  tokenExpiresAt: Date;

  @Column({ name: "feedback_rating", type: "int", nullable: true })
  feedbackRating: number | null;

  @Column({ name: "feedback_text", type: "text", nullable: true })
  feedbackText: string | null;

  @Column({ name: "feedback_submitted_at", type: "timestamptz", nullable: true })
  feedbackSubmittedAt: Date | null;

  @Column({ type: "varchar", length: 30, default: ReferenceStatus.PENDING })
  status: ReferenceStatus;

  @Column({ name: "request_sent_at", type: "timestamptz", nullable: true })
  requestSentAt: Date | null;

  @Column({ name: "reminder_sent_at", type: "timestamptz", nullable: true })
  reminderSentAt: Date | null;

  @ManyToOne(
    () => Candidate,
    (candidate) => candidate.references,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "candidate_id" })
  candidate: Candidate;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
