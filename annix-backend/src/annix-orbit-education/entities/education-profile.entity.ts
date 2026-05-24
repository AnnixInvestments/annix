import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A learner's FuturePath education profile. One per student User (D3: students
 * reuse Orbit's existing registration). `dateOfBirth` drives minor determination
 * for the guardian-consent gate; `jurisdiction` is derived from country (D4).
 */
@Entity("orbit_education_profiles")
@Index("idx_orbit_education_profiles_user", ["userId"])
export class EducationProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 32, default: "Other" })
  curriculum: string;

  @Column({ name: "country", type: "varchar", length: 2, nullable: true })
  country: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  nationality: string | null;

  @Column({ type: "jsonb", default: "[]" })
  languages: string[];

  @Column({ type: "varchar", length: 255, nullable: true })
  school: string | null;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth: string | null;

  @Column({ type: "varchar", length: 16, default: "POPIA" })
  jurisdiction: string;

  @Column({ name: "target_categories", type: "jsonb", nullable: true })
  targetCategories: string[] | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
