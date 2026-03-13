import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { CalendarEvent } from "./calendar-event.entity";
import { Meeting } from "./meeting.entity";

export type ConflictType =
  | "time_overlap"
  | "data_conflict"
  | "deleted_locally"
  | "deleted_remotely";
export type ConflictResolution = "pending" | "keep_local" | "keep_remote" | "merged" | "dismissed";

export interface ConflictData {
  title?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  attendees?: string[];
  [key: string]: unknown;
}

@Entity("annix_rep_sync_conflicts")
export class SyncConflict {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "meeting_id", nullable: true })
  meetingId: number | null;

  @ManyToOne(() => Meeting, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "meeting_id" })
  meeting: Meeting | null;

  @Column({ name: "calendar_event_id", nullable: true })
  calendarEventId: number | null;

  @ManyToOne(() => CalendarEvent, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "calendar_event_id" })
  calendarEvent: CalendarEvent | null;

  @Column({ name: "conflict_type", type: "varchar", length: 20 })
  conflictType: ConflictType;

  @Column({ name: "local_data", type: "jsonb" })
  localData: ConflictData;

  @Column({ name: "remote_data", type: "jsonb" })
  remoteData: ConflictData;

  @Column({ name: "resolution", type: "varchar", length: 20, default: "pending" })
  resolution: ConflictResolution;

  @Column({ name: "resolved_at", type: "timestamp", nullable: true })
  resolvedAt: Date | null;

  @Column({ name: "resolved_by", nullable: true })
  resolvedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "resolved_by" })
  resolvedBy: User | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
