import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_workflow_progress")
export class SeekerWorkflowProgress {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "participant_id", type: "varchar", length: 200 })
  participantId: string;

  @Column({ name: "candidate_id", type: "int" })
  candidateId: number;

  @Column({ name: "registered_at", type: "timestamptz", nullable: true })
  registeredAt: Date | null;

  @Column({ name: "cv_uploaded_at", type: "timestamptz", nullable: true })
  cvUploadedAt: Date | null;

  @Column({ name: "career_score_generated_at", type: "timestamptz", nullable: true })
  careerScoreGeneratedAt: Date | null;

  @Column({ name: "first_jobs_viewed_at", type: "timestamptz", nullable: true })
  firstJobsViewedAt: Date | null;

  @Column({ name: "time_to_first_value_seconds", type: "int", nullable: true })
  timeToFirstValueSeconds: number | null;

  @Column({ name: "completed_steps", type: "int", default: 0 })
  completedSteps: number;

  @Column({ name: "last_active_at", type: "timestamptz", nullable: true })
  lastActiveAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
