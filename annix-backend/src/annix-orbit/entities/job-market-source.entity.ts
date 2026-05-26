import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AnnixOrbitCompany } from "./annix-orbit-company.entity";

export enum JobSourceProvider {
  ADZUNA = "adzuna",
  REMOTIVE = "remotive",
  DPSA = "dpsa",
  EXECUTIVE_PLACEMENTS = "executiveplacements",
  JOB_PLACEMENTS = "jobplacements",
  JOBMAIL = "jobmail",
  CAREERJUNCTION = "careerjunction",
}

@Entity("cv_assistant_job_market_sources")
export class JobMarketSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  provider: JobSourceProvider;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "api_id", type: "varchar", length: 255, nullable: true })
  apiId: string | null;

  @Column({ name: "api_key_encrypted", type: "varchar", length: 500, nullable: true })
  apiKeyEncrypted: string | null;

  @Column({ name: "country_codes", type: "jsonb", default: '["za"]' })
  countryCodes: string[];

  @Column({ name: "categories", type: "jsonb", default: "[]" })
  categories: string[];

  /**
   * Seeker match-tiers (soft/medium/hard) this source's jobs are visible to.
   * Empty/null = visible to all tiers. Drives tier-gated source visibility in
   * the seeker job feed (#305).
   */
  @Column({ name: "visible_tiers", type: "jsonb", nullable: true })
  visibleTiers: string[] | null;

  @Column({ type: "boolean", default: true })
  enabled: boolean;

  @Column({ name: "rate_limit_per_day", type: "int", default: 250 })
  rateLimitPerDay: number;

  @Column({ name: "requests_today", type: "int", default: 0 })
  requestsToday: number;

  @Column({ name: "requests_reset_at", type: "timestamptz", nullable: true })
  requestsResetAt: Date | null;

  @Column({ name: "last_ingested_at", type: "timestamptz", nullable: true })
  lastIngestedAt: Date | null;

  @Column({ name: "ingestion_interval_hours", type: "int", default: 6 })
  ingestionIntervalHours: number;

  @Column({ name: "requires_vetting", type: "boolean", default: true })
  requiresVetting: boolean;

  @ManyToOne(() => AnnixOrbitCompany, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "company_id" })
  company: AnnixOrbitCompany | null;

  @Column({ name: "company_id", nullable: true })
  companyId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
