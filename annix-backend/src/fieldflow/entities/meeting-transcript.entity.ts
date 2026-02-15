import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MeetingRecording } from "./meeting-recording.entity";

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speakerLabel: string;
  confidence: number | null;
}

export interface ActionItem {
  task: string;
  assignee: string | null;
  dueDate: string | null;
  extracted: boolean;
}

export interface MeetingAnalysis {
  topics: string[];
  questions: string[];
  objections: string[];
  actionItems: ActionItem[];
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative" | null;
  sentimentScore: number | null;
}

@Entity("fieldflow_meeting_transcripts")
export class MeetingTranscript {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => MeetingRecording, { onDelete: "CASCADE" })
  @JoinColumn({ name: "recording_id" })
  recording: MeetingRecording;

  @Column({ name: "recording_id" })
  recordingId: number;

  @Column({ name: "full_text", type: "text" })
  fullText: string;

  @Column({ type: "json" })
  segments: TranscriptSegment[];

  @Column({ name: "word_count", type: "int" })
  wordCount: number;

  @Column({ type: "json", nullable: true })
  analysis: MeetingAnalysis | null;

  @Column({ type: "text", nullable: true })
  summary: string | null;

  @Column({ name: "whisper_model", type: "varchar", length: 50, nullable: true })
  whisperModel: string | null;

  @Column({ length: 10, default: "en" })
  language: string;

  @Column({ name: "processing_time_ms", type: "int", nullable: true })
  processingTimeMs: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
