import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A learner-tracked university application (#304 Phase 1). Learner-owned data —
 * the student records where they've applied and the status. `programmeId` links
 * to the curated catalog when known; otherwise the institution/programme names
 * are free-text so students can track applications we don't yet curate.
 */
@Entity("orbit_education_applications")
@Index("idx_orbit_education_applications_profile", ["educationProfileId"])
export class EducationApplication {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid" })
  educationProfileId: string;

  @Column({ name: "programme_id", type: "uuid", nullable: true })
  programmeId: string | null;

  @Column({ name: "institution_name", type: "varchar", length: 255 })
  institutionName: string;

  @Column({ name: "programme_name", type: "varchar", length: 255 })
  programmeName: string;

  @Column({ type: "varchar", length: 16, default: "interested" })
  status: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
