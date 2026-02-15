import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Meeting } from "./meeting.entity";

export enum RecordingProcessingStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  PROCESSING = "processing",
  TRANSCRIBING = "transcribing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  speakerLabel: string;
  confidence: number | null;
}

@Entity("fieldflow_meeting_recordings")
export class MeetingRecording {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Meeting, { onDelete: "CASCADE" })
  @JoinColumn({ name: "meeting_id" })
  meeting: Meeting;

  @Column({ name: "meeting_id" })
  meetingId: number;

  @Column({ name: "storage_path", length: 500 })
  storagePath: string;

  @Column({ name: "storage_bucket", length: 100 })
  storageBucket: string;

  @Column({ name: "original_filename", length: 255, nullable: true })
  originalFilename: string | null;

  @Column({ name: "mime_type", length: 100 })
  mimeType: string;

  @Column({ name: "file_size_bytes", type: "bigint" })
  fileSizeBytes: number;

  @Column({ name: "duration_seconds", type: "int", nullable: true })
  durationSeconds: number | null;

  @Column({ name: "sample_rate", type: "int", default: 16000 })
  sampleRate: number;

  @Column({ type: "int", default: 1 })
  channels: number;

  @Column({
    name: "processing_status",
    type: "enum",
    enum: RecordingProcessingStatus,
    default: RecordingProcessingStatus.PENDING,
  })
  processingStatus: RecordingProcessingStatus;

  @Column({ name: "processing_error", type: "text", nullable: true })
  processingError: string | null;

  @Column({ name: "speaker_segments", type: "json", nullable: true })
  speakerSegments: SpeakerSegment[] | null;

  @Column({ name: "detected_speakers_count", type: "int", nullable: true })
  detectedSpeakersCount: number | null;

  @Column({ name: "speaker_labels", type: "json", nullable: true })
  speakerLabels: Record<string, string> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
