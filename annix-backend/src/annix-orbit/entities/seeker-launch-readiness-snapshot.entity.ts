import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("orbit_seeker_readiness_snapshots")
export class SeekerLaunchReadinessSnapshot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "snapshot_date", type: "varchar", length: 10 })
  snapshotDate: string;

  @Column({ name: "cv_uploads", type: "int", default: 0 })
  cvUploads: number;

  @Column({ name: "completed_profiles", type: "int", default: 0 })
  completedProfiles: number;

  @Column({ name: "successful_analyses", type: "int", default: 0 })
  successfulAnalyses: number;

  @Column({ name: "job_views", type: "int", default: 0 })
  jobViews: number;

  @Column({ name: "applications", type: "int", default: 0 })
  applications: number;

  @Column({ name: "error_rate_pct", type: "float", default: 0 })
  errorRatePct: number;

  @Column({ name: "avg_ttfv_seconds", type: "float", nullable: true })
  avgTtfvSeconds: number | null;

  @Column({ name: "open_critical_bugs", type: "int", default: 0 })
  openCriticalBugs: number;

  @Column({ name: "status", type: "varchar", length: 60, default: "Not Ready" })
  status: string;

  @Column({ name: "ready_for_soft_launch", type: "boolean", default: false })
  readyForSoftLaunch: boolean;

  @Column({ name: "ready_for_public_launch", type: "boolean", default: false })
  readyForPublicLaunch: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
