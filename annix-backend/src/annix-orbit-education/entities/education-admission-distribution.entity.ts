import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Historical admission distribution for a programme-year (#308). A single
 * cut-off misleads (cut-off 42 vs accepted-median 46), so we store the spread
 * to make Reach/Match/Safe honest. Numerics are nullable — curate what's known.
 */
@Entity("orbit_education_admission_distributions")
@Index("idx_orbit_education_admdist_programme_year", ["programmeId", "intakeYear"])
export class EducationAdmissionDistribution {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "programme_id", type: "uuid" })
  programmeId: string;

  @Column({ name: "intake_year", type: "int" })
  intakeYear: number;

  @Column({ name: "min_admitted", type: "numeric", precision: 7, scale: 2, nullable: true })
  minAdmitted: string | null;

  @Column({ name: "median_admitted", type: "numeric", precision: 7, scale: 2, nullable: true })
  medianAdmitted: string | null;

  @Column({ name: "p25_admitted", type: "numeric", precision: 7, scale: 2, nullable: true })
  p25Admitted: string | null;

  @Column({ name: "p75_admitted", type: "numeric", precision: 7, scale: 2, nullable: true })
  p75Admitted: string | null;

  @Column({ type: "int", nullable: true })
  seats: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  source: string | null;

  @Column({ name: "as_of", type: "date", nullable: true })
  asOf: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
