import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Meeting } from "./meeting.entity";

export enum TeamsBotSessionStatus {
  JOINING = "joining",
  ACTIVE = "active",
  LEAVING = "leaving",
  ENDED = "ended",
  FAILED = "failed",
}

export interface TeamsBotParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface TeamsBotTranscriptEntry {
  timestamp: string;
  speakerId: string | null;
  speakerName: string;
  text: string;
  confidence: number;
}

@Entity("annix_rep_teams_bot_sessions")
export class TeamsBotSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => Meeting, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "meeting_id" })
  meeting: Meeting | null;

  @Column({ name: "meeting_id", nullable: true })
  meetingId: number | null;

  @Column({ name: "session_id", type: "varchar", length: 100, unique: true })
  sessionId: string;

  @Column({ name: "call_id", type: "varchar", length: 255, nullable: true })
  callId: string | null;

  @Column({ name: "meeting_url", type: "text" })
  meetingUrl: string;

  @Column({ name: "meeting_thread_id", type: "varchar", length: 255, nullable: true })
  meetingThreadId: string | null;

  @Column({ name: "meeting_organizer_id", type: "varchar", length: 255, nullable: true })
  meetingOrganizerId: string | null;

  @Column({
    name: "status",
    type: "enum",
    enum: TeamsBotSessionStatus,
    default: TeamsBotSessionStatus.JOINING,
  })
  status: TeamsBotSessionStatus;

  @Column({
    name: "bot_display_name",
    type: "varchar",
    length: 255,
    default: "Annix AI Meeting Assistant",
  })
  botDisplayName: string;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ name: "participants", type: "jsonb", nullable: true })
  participants: TeamsBotParticipant[] | null;

  @Column({ name: "participant_count", type: "int", default: 0 })
  participantCount: number;

  @Column({ name: "transcript_entries", type: "jsonb", default: [] })
  transcriptEntries: TeamsBotTranscriptEntry[];

  @Column({ name: "transcript_entry_count", type: "int", default: 0 })
  transcriptEntryCount: number;

  @Column({ name: "started_at", type: "timestamp", nullable: true })
  startedAt: Date | null;

  @Column({ name: "ended_at", type: "timestamp", nullable: true })
  endedAt: Date | null;

  @Column({ name: "last_activity_at", type: "timestamp", nullable: true })
  lastActivityAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
