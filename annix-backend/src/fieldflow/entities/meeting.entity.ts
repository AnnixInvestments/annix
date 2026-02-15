import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { CalendarEvent } from "./calendar-event.entity";
import { Prospect } from "./prospect.entity";

export enum MeetingStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export enum MeetingType {
  IN_PERSON = "in_person",
  PHONE = "phone",
  VIDEO = "video",
}

@Entity("fieldflow_meetings")
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Prospect, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "prospect_id" })
  prospect: Prospect | null;

  @Column({ name: "prospect_id", nullable: true })
  prospectId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sales_rep_id" })
  salesRep: User;

  @Column({ name: "sales_rep_id" })
  salesRepId: number;

  @OneToOne(() => CalendarEvent, { nullable: true })
  @JoinColumn({ name: "calendar_event_id" })
  calendarEvent: CalendarEvent | null;

  @Column({ name: "calendar_event_id", nullable: true })
  calendarEventId: number | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    name: "meeting_type",
    type: "enum",
    enum: MeetingType,
    default: MeetingType.IN_PERSON,
  })
  meetingType: MeetingType;

  @Column({
    type: "enum",
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @Column({ name: "scheduled_start", type: "timestamp" })
  scheduledStart: Date;

  @Column({ name: "scheduled_end", type: "timestamp" })
  scheduledEnd: Date;

  @Column({ name: "actual_start", type: "timestamp", nullable: true })
  actualStart: Date | null;

  @Column({ name: "actual_end", type: "timestamp", nullable: true })
  actualEnd: Date | null;

  @Column({ length: 500, nullable: true })
  location: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: "simple-array", nullable: true })
  attendees: string[] | null;

  @Column({ type: "text", nullable: true })
  agenda: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "text", nullable: true })
  outcomes: string | null;

  @Column({ name: "action_items", type: "json", nullable: true })
  actionItems: Array<{ task: string; assignee: string | null; dueDate: string | null }> | null;

  @Column({ name: "summary_sent", default: false })
  summarySent: boolean;

  @Column({ name: "summary_sent_at", type: "timestamp", nullable: true })
  summarySentAt: Date | null;

  @Column({ name: "crm_external_id", length: 255, nullable: true })
  crmExternalId: string | null;

  @Column({ name: "crm_sync_status", length: 50, nullable: true })
  crmSyncStatus: string | null;

  @Column({ name: "crm_last_synced_at", type: "timestamp", nullable: true })
  crmLastSyncedAt: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
