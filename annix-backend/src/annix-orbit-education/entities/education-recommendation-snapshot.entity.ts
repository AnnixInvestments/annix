import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * A persisted evaluation result (#308). Captures the EXACT requirement version
 * used so a learner returning months later gets a reproducible recommendation
 * (supports appeals/debugging). `result` is a serialized EvaluationResult.
 */
@Entity("orbit_education_recommendation_snapshots")
@Index("idx_orbit_education_recsnap_profile", ["educationProfileId"])
@Index("idx_orbit_education_recsnap_programme", ["programmeId"])
export class EducationRecommendationSnapshot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid", nullable: true })
  educationProfileId: string | null;

  @Column({ name: "programme_id", type: "uuid" })
  programmeId: string;

  @Column({ name: "intake_year", type: "int" })
  intakeYear: number;

  @Column({ name: "requirement_version_id", type: "uuid", nullable: true })
  requirementVersionId: string | null;

  @Column({ type: "varchar", length: 16 })
  band: string;

  /** Serialized EvaluationResult (eligibility + scoring + competitiveness + explanation). */
  @Column({ type: "jsonb" })
  result: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
