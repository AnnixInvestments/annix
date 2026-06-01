import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface OrbitTierFeatures {
  applyToJobs: boolean;
  viewSalaries: boolean;
  nixCvBuilder: boolean;
  jobListingSite: boolean;
}

@Entity("cv_assistant_tier_capabilities")
export class OrbitTierCapability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "tier", type: "varchar", length: 32, unique: true })
  tier: string;

  @Column({ name: "label", type: "varchar", length: 64 })
  label: string;

  @Column({ name: "match_strictness", type: "varchar", length: 16 })
  matchStrictness: string;

  @Column({ name: "max_job_results", type: "int", nullable: true })
  maxJobResults: number | null;

  @Column({ name: "monthly_nix_runs", type: "int", nullable: true })
  monthlyNixRuns: number | null;

  @Column({ name: "features", type: "jsonb" })
  features: OrbitTierFeatures;

  @Column({ name: "display_order", type: "int", default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
