import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { JobMarketSource } from "./job-market-source.entity";

@Entity("cv_assistant_external_jobs")
@Index("idx_external_jobs_source_id", ["sourceExternalId", "sourceId"], { unique: true })
@Index("idx_external_jobs_location", ["country", "locationArea"])
@Index("idx_external_jobs_category", ["category"])
@Index("idx_external_jobs_canonical_category", ["canonicalCategory"])
@Index("idx_external_jobs_canonical_province", ["canonicalProvince"])
export class ExternalJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 500 })
  title: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  company: string | null;

  @Column({ type: "varchar", length: 10, default: "za" })
  country: string;

  @Column({ name: "location_raw", type: "varchar", length: 500, nullable: true })
  locationRaw: string | null;

  @Column({ name: "location_area", type: "varchar", length: 255, nullable: true })
  locationArea: string | null;

  @Column({ name: "location_lat", type: "double precision", nullable: true })
  locationLat: number | null;

  @Column({ name: "location_lon", type: "double precision", nullable: true })
  locationLon: number | null;

  @Column({ name: "salary_min", type: "decimal", precision: 12, scale: 2, nullable: true })
  salaryMin: number | null;

  @Column({ name: "salary_max", type: "decimal", precision: 12, scale: 2, nullable: true })
  salaryMax: number | null;

  @Column({ name: "salary_currency", type: "varchar", length: 10, nullable: true })
  salaryCurrency: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "extracted_skills", type: "jsonb", default: "[]" })
  extractedSkills: string[];

  @Column({ type: "varchar", length: 255, nullable: true })
  category: string | null;

  @Column({ name: "canonical_category", type: "varchar", length: 64, nullable: true })
  canonicalCategory: string | null;

  @Column({ name: "canonical_province", type: "varchar", length: 64, nullable: true })
  canonicalProvince: string | null;

  @Column({ name: "canonical_city", type: "varchar", length: 64, nullable: true })
  canonicalCity: string | null;

  @Column({ name: "source_external_id", type: "varchar", length: 255 })
  sourceExternalId: string;

  @Column({ name: "source_url", type: "varchar", length: 1000, nullable: true })
  sourceUrl: string | null;

  @Column({ name: "posted_at", type: "timestamptz", nullable: true })
  postedAt: Date | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  lastSeenAt: Date | null;

  @ManyToOne(() => JobMarketSource, { onDelete: "CASCADE" })
  @JoinColumn({ name: "source_id" })
  source: JobMarketSource;

  @Column({ name: "source_id" })
  sourceId: number;

  @Column({ type: "varchar", nullable: true })
  embedding: string | null;

  @Column({ type: "boolean", default: false })
  delisted: boolean;

  @Column({ name: "delist_review", type: "varchar", length: 16, nullable: true })
  delistReview: string | null;

  @Column({ name: "delist_reported_at", type: "timestamptz", nullable: true })
  delistReportedAt: Date | null;

  @Column({ name: "delist_reported_by", type: "varchar", length: 320, nullable: true })
  delistReportedBy: string | null;

  @Column({ name: "delisted_at", type: "timestamptz", nullable: true })
  delistedAt: Date | null;

  @Column({ name: "accepts_za", type: "boolean", nullable: true })
  acceptsZa: boolean | null;

  @Column({ name: "vetting_notes", type: "text", nullable: true })
  vettingNotes: string | null;

  @Column({ name: "vetted_at", type: "timestamptz", nullable: true })
  vettedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
