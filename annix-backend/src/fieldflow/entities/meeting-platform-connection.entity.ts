import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { MeetingPlatform, PlatformConnectionStatus } from "./meeting-platform.enums";
import { PlatformMeetingRecord } from "./platform-meeting-record.entity";

export { MeetingPlatform, PlatformConnectionStatus };

@Entity("annix_rep_meeting_platform_connections")
@Unique(["userId", "platform"])
export class MeetingPlatformConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    type: "enum",
    enum: MeetingPlatform,
  })
  platform: MeetingPlatform;

  @Column({ name: "account_email", length: 255 })
  accountEmail: string;

  @Column({ name: "account_name", type: "varchar", length: 255, nullable: true })
  accountName: string | null;

  @Column({ name: "account_id", type: "varchar", length: 255, nullable: true })
  accountId: string | null;

  @Column({ name: "access_token_encrypted", type: "text" })
  accessTokenEncrypted: string;

  @Column({ name: "refresh_token_encrypted", type: "text", nullable: true })
  refreshTokenEncrypted: string | null;

  @Column({ name: "token_expires_at", type: "timestamp", nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: "token_scope", type: "varchar", length: 1000, nullable: true })
  tokenScope: string | null;

  @Column({ name: "webhook_subscription_id", type: "varchar", length: 255, nullable: true })
  webhookSubscriptionId: string | null;

  @Column({ name: "webhook_expiry", type: "timestamp", nullable: true })
  webhookExpiry: Date | null;

  @Column({
    name: "connection_status",
    type: "enum",
    enum: PlatformConnectionStatus,
    default: PlatformConnectionStatus.ACTIVE,
  })
  connectionStatus: PlatformConnectionStatus;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError: string | null;

  @Column({ name: "last_error_at", type: "timestamp", nullable: true })
  lastErrorAt: Date | null;

  @Column({ name: "auto_fetch_recordings", default: true })
  autoFetchRecordings: boolean;

  @Column({ name: "auto_transcribe", default: true })
  autoTranscribe: boolean;

  @Column({ name: "auto_send_summary", default: true })
  autoSendSummary: boolean;

  @Column({ name: "last_recording_sync_at", type: "timestamp", nullable: true })
  lastRecordingSyncAt: Date | null;

  @OneToMany(
    () => PlatformMeetingRecord,
    (record) => record.connection,
  )
  meetingRecords: PlatformMeetingRecord[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
