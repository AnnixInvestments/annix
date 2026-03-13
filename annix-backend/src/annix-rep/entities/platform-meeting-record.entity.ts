import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Meeting } from "./meeting.entity";
import { PlatformRecordingStatus } from "./meeting-platform.enums";
import { MeetingPlatformConnection } from "./meeting-platform-connection.entity";

export { PlatformRecordingStatus };

export interface PlatformMeetingRawData {
  uuid?: string;
  id?: string | number;
  type?: number;
  timezone?: string;
  created_at?: string;
  share_url?: string;
  [key: string]: unknown;
}

export interface PlatformRecordingRawData {
  id?: string;
  file_id?: string;
  file_type?: string;
  file_extension?: string;
  file_size?: number;
  play_url?: string;
  download_url?: string;
  recording_start?: string;
  recording_end?: string;
  [key: string]: unknown;
}

@Entity("annix_rep_platform_meeting_records")
@Unique(["connectionId", "platformMeetingId"])
@Index(["platformMeetingId"])
@Index(["recordingStatus"])
@Index(["startTime"])
export class PlatformMeetingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => MeetingPlatformConnection,
    (conn) => conn.meetingRecords,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "connection_id" })
  connection: MeetingPlatformConnection;

  @Column({ name: "connection_id" })
  connectionId: number;

  @ManyToOne(() => Meeting, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "meeting_id" })
  meeting: Meeting | null;

  @Column({ name: "meeting_id", nullable: true })
  meetingId: number | null;

  @Column({ name: "platform_meeting_id", length: 255 })
  platformMeetingId: string;

  @Column({ name: "platform_recording_id", type: "varchar", length: 255, nullable: true })
  platformRecordingId: string | null;

  @Column({ length: 500 })
  title: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  topic: string | null;

  @Column({ name: "host_email", type: "varchar", length: 255, nullable: true })
  hostEmail: string | null;

  @Column({ name: "start_time", type: "timestamp" })
  startTime: Date;

  @Column({ name: "end_time", type: "timestamp", nullable: true })
  endTime: Date | null;

  @Column({ name: "duration_seconds", type: "integer", nullable: true })
  durationSeconds: number | null;

  @Column({ name: "recording_url", type: "text", nullable: true })
  recordingUrl: string | null;

  @Column({ name: "recording_password", type: "varchar", length: 100, nullable: true })
  recordingPassword: string | null;

  @Column({ name: "recording_file_type", type: "varchar", length: 50, nullable: true })
  recordingFileType: string | null;

  @Column({ name: "recording_file_size_bytes", type: "bigint", nullable: true })
  recordingFileSizeBytes: number | null;

  @Column({ name: "s3_storage_path", type: "varchar", length: 500, nullable: true })
  s3StoragePath: string | null;

  @Column({ name: "s3_storage_bucket", type: "varchar", length: 100, nullable: true })
  s3StorageBucket: string | null;

  @Column({
    name: "recording_status",
    type: "enum",
    enum: PlatformRecordingStatus,
    default: PlatformRecordingStatus.PENDING,
  })
  recordingStatus: PlatformRecordingStatus;

  @Column({ name: "recording_error", type: "text", nullable: true })
  recordingError: string | null;

  @Column({ type: "text", array: true, nullable: true })
  participants: string[] | null;

  @Column({ name: "participant_count", type: "integer", nullable: true })
  participantCount: number | null;

  @Column({ name: "join_url", type: "varchar", length: 500, nullable: true })
  joinUrl: string | null;

  @Column({ name: "raw_meeting_data", type: "jsonb", nullable: true })
  rawMeetingData: PlatformMeetingRawData | null;

  @Column({ name: "raw_recording_data", type: "jsonb", nullable: true })
  rawRecordingData: PlatformRecordingRawData | null;

  @Column({ name: "fetched_at", type: "timestamp", nullable: true })
  fetchedAt: Date | null;

  @Column({ name: "downloaded_at", type: "timestamp", nullable: true })
  downloadedAt: Date | null;

  @Column({ name: "processed_at", type: "timestamp", nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
