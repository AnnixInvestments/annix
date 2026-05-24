import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * A curated scholarship/bursary entry (#304 Phase 1). Owner-curated content (no
 * scraping — scholarship sources have high link-rot, so we keep a small,
 * high-quality set). `lastVerifiedAt` makes staleness visible; `active` lets
 * admins retire entries without deleting history.
 */
@Entity("orbit_education_scholarships")
@Index("idx_orbit_education_scholarships_active", ["active"])
export class EducationScholarship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255 })
  provider: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  country: string | null;

  /** Free-text amount, e.g. "Full tuition" or "ZAR 50,000 / year" — amounts vary too much for a number. */
  @Column({ name: "amount_display", type: "varchar", length: 120, nullable: true })
  amountDisplay: string | null;

  @Column({ type: "text", nullable: true })
  criteria: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  url: string | null;

  /** Optional career-cluster tag (see @annix/product-data/orbit-education) for filtering. */
  @Column({ name: "career_cluster", type: "varchar", length: 48, nullable: true })
  careerCluster: string | null;

  @Column({ name: "last_verified_at", type: "date", nullable: true })
  lastVerifiedAt: string | null;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
