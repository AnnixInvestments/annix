import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_seeker_interview_events")
@Index("idx_seeker_interview_events_candidate_starts", ["candidateId", "startsAt"])
export class SeekerInterviewEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ name: "apply_click_id", type: "int", nullable: true })
  applyClickId: number | null;

  @Column({ name: "external_job_id", type: "int", nullable: true })
  externalJobId: number | null;

  @Column({ name: "company_name", type: "varchar", length: 300, nullable: true })
  companyName: string | null;

  @Column({ name: "role_title", type: "varchar", length: 300, nullable: true })
  roleTitle: string | null;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz", nullable: true })
  endsAt: Date | null;

  @Column({ name: "location_label", type: "varchar", length: 500, nullable: true })
  locationLabel: string | null;

  @Column({ name: "location_address", type: "varchar", length: 1000, nullable: true })
  locationAddress: string | null;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
