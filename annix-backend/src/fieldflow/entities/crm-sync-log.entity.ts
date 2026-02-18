import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CrmConfig } from "./crm-config.entity";

export enum SyncDirection {
  PUSH = "push",
  PULL = "pull",
}

export enum SyncStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIAL = "partial",
}

export interface SyncErrorDetail {
  recordId: string | number;
  recordType: "prospect" | "meeting";
  error: string;
  timestamp: string;
}

@Entity("annix_rep_crm_sync_logs")
export class CrmSyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CrmConfig, { onDelete: "CASCADE" })
  @JoinColumn({ name: "config_id" })
  config: CrmConfig;

  @Column({ name: "config_id" })
  configId: number;

  @Column({
    type: "enum",
    enum: SyncDirection,
  })
  direction: SyncDirection;

  @Column({
    type: "enum",
    enum: SyncStatus,
    default: SyncStatus.IN_PROGRESS,
  })
  status: SyncStatus;

  @Column({ name: "records_processed", type: "integer", default: 0 })
  recordsProcessed: number;

  @Column({ name: "records_succeeded", type: "integer", default: 0 })
  recordsSucceeded: number;

  @Column({ name: "records_failed", type: "integer", default: 0 })
  recordsFailed: number;

  @Column({ name: "error_details", type: "json", nullable: true })
  errorDetails: SyncErrorDetail[] | null;

  @Column({ name: "sync_token", type: "text", nullable: true })
  syncToken: string | null;

  @CreateDateColumn({ name: "started_at" })
  startedAt: Date;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt: Date | null;
}
