import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface OutreachScheduleRecipient {
  email: string;
  firstName: string | null;
  device: string | null;
}

@Entity("orbit_outreach_schedules")
@Index("idx_orbit_outreach_schedule_status", ["status", "scheduledAt"])
export class OrbitOutreachSchedule {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "subject", type: "varchar", length: 200 })
  subject: string;

  @Column({ name: "body", type: "text" })
  body: string;

  @Column({ name: "environment", type: "varchar", length: 10, default: "prod" })
  environment: string;

  @Column({ name: "recipients", type: "jsonb", default: () => "'[]'" })
  recipients: OutreachScheduleRecipient[];

  @Column({ name: "include_device_guide", type: "boolean", default: true })
  includeDeviceGuide: boolean;

  @Column({ name: "include_fbw_guide", type: "boolean", default: true })
  includeFbwGuide: boolean;

  @Column({ name: "extra_asset_ids", type: "jsonb", default: () => "'[]'" })
  extraAssetIds: string[];

  @Column({ name: "track_early_access", type: "boolean", default: false })
  trackEarlyAccess: boolean;

  @Column({ name: "scheduled_at", type: "timestamptz" })
  scheduledAt: Date;

  @Column({ name: "status", type: "varchar", length: 20, default: "pending" })
  status: string;

  @Column({ name: "sent_count", type: "int", default: 0 })
  sentCount: number;

  @Column({ name: "failed_count", type: "int", default: 0 })
  failedCount: number;

  @Column({ name: "failures", type: "jsonb", default: () => "'[]'" })
  failures: string[];

  @Column({ name: "sent_at", type: "timestamptz", nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
