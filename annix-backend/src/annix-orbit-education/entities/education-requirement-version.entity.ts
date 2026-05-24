import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * An IMMUTABLE, per-intake-year snapshot of a programme's admission requirement
 * spec (#308). Admissions rules mutate yearly; a new rule = a NEW row, never an
 * update — so historical recommendations stay reproducible. The `spec` jsonb is
 * a serialized `RequirementSpec` from @annix/product-data/orbit-education.
 */
@Entity("orbit_education_requirement_versions")
@Index("idx_orbit_education_reqver_programme", ["programmeId"])
@Index("idx_orbit_education_reqver_programme_year", ["programmeId", "intakeYear"])
export class EducationRequirementVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "programme_id", type: "uuid" })
  programmeId: string;

  @Column({ name: "intake_year", type: "int" })
  intakeYear: number;

  /** Serialized RequirementSpec. */
  @Column({ type: "jsonb" })
  spec: Record<string, unknown>;

  @Column({ name: "valid_from", type: "date" })
  validFrom: string;

  @Column({ name: "valid_to", type: "date", nullable: true })
  validTo: string | null;

  @Column({ type: "varchar", length: 16, default: "NEEDS_REVIEW" })
  confidence: string;

  @Column({ name: "verification_status", type: "varchar", length: 24, default: "NEEDS_REVIEW" })
  verificationStatus: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
