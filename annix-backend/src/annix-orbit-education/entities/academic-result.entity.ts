import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** A single subject result on a learner's education profile. */
@Entity("orbit_education_academic_results")
@Index("idx_orbit_education_results_profile", ["educationProfileId"])
export class AcademicResult {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "education_profile_id", type: "uuid" })
  educationProfileId: string;

  @Column({ type: "varchar", length: 120 })
  subject: string;

  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
  mark: string | null;

  @Column({ name: "predicted_mark", type: "numeric", precision: 5, scale: 2, nullable: true })
  predictedMark: string | null;

  @Column({ type: "int", nullable: true })
  year: number | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  term: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
