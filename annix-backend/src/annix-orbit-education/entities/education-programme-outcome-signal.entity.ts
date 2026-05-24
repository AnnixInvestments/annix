import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * A graduate-outcome / programme-quality signal for the choice-aid layer (#309).
 *
 * STRICT firewall: these signals only help a student *choose between programmes
 * they already qualify for* — they NEVER influence #308 eligibility. Each signal
 * carries its source + recency + verification status so the UI can show "signal,
 * source, as-of" honestly (no fabricated "best uni" score). MVP signal sources:
 * UK HESA Graduate Outcomes + our own FuturePath→Orbit conversion data; SA is
 * curated/manual. QS/THE rankings are license-restricted and MUST NOT be stored.
 */
@Entity("orbit_education_programme_outcome_signals")
@Index("idx_orbit_education_outcome_programme", ["programmeId"])
export class EducationProgrammeOutcomeSignal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "programme_id", type: "uuid" })
  programmeId: string;

  /** e.g. "HESA Graduate Outcomes", "FuturePath internal". NEVER QS/THE. */
  @Column({ type: "varchar", length: 120 })
  source: string;

  /** e.g. "employment_rate_15mo", "median_earnings", "further_study_rate". */
  @Column({ type: "varchar", length: 64 })
  metric: string;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  value: string;

  /** e.g. "percent", "GBP", "ZAR". */
  @Column({ type: "varchar", length: 16 })
  unit: string;

  @Column({ name: "as_of", type: "date", nullable: true })
  asOf: string | null;

  @Column({ type: "varchar", length: 16, default: "NEEDS_REVIEW" })
  confidence: string;

  @Column({ name: "verification_status", type: "varchar", length: 24, default: "NEEDS_REVIEW" })
  verificationStatus: string;

  @Column({ name: "source_url", type: "varchar", length: 500, nullable: true })
  sourceUrl: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
