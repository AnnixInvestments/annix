import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_workflow_steps")
@Index("idx_orbit_seeker_workflow_step_unique", ["participantId", "stepKey"], { unique: true })
export class SeekerWorkflowStep {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "participant_id", type: "varchar", length: 200 })
  participantId: string;

  @Column({ name: "step_key", type: "varchar", length: 200 })
  stepKey: string;

  @Column({ name: "completed", type: "boolean", default: false })
  completed: boolean;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @Column({ name: "time_taken_seconds", type: "int", nullable: true })
  timeTakenSeconds: number | null;

  @Column({ name: "error_message", type: "varchar", length: 500, nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
