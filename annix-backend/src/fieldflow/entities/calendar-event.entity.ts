import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CalendarConnection, CalendarProvider } from "./calendar-connection.entity";

export enum CalendarEventStatus {
  CONFIRMED = "confirmed",
  TENTATIVE = "tentative",
  CANCELLED = "cancelled",
}

@Entity("fieldflow_calendar_events")
export class CalendarEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => CalendarConnection,
    (connection) => connection.events,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "connection_id" })
  connection: CalendarConnection;

  @Column({ name: "connection_id" })
  connectionId: number;

  @Column({ name: "external_id", length: 500 })
  externalId: string;

  @Column({ name: "calendar_id", length: 255, nullable: true })
  calendarId: string | null;

  @Column({
    type: "enum",
    enum: CalendarProvider,
  })
  provider: CalendarProvider;

  @Column({ length: 500 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ name: "start_time", type: "timestamp" })
  startTime: Date;

  @Column({ name: "end_time", type: "timestamp" })
  endTime: Date;

  @Column({ name: "is_all_day", default: false })
  isAllDay: boolean;

  @Column({ length: 100, nullable: true })
  timezone: string | null;

  @Column({ length: 500, nullable: true })
  location: string | null;

  @Column({
    type: "enum",
    enum: CalendarEventStatus,
    default: CalendarEventStatus.CONFIRMED,
  })
  status: CalendarEventStatus;

  @Column({ type: "simple-array", nullable: true })
  attendees: string[] | null;

  @Column({ name: "organizer_email", length: 255, nullable: true })
  organizerEmail: string | null;

  @Column({ name: "meeting_url", length: 500, nullable: true })
  meetingUrl: string | null;

  @Column({ name: "is_recurring", default: false })
  isRecurring: boolean;

  @Column({ name: "recurrence_rule", length: 500, nullable: true })
  recurrenceRule: string | null;

  @Column({ name: "raw_data", type: "json", nullable: true })
  rawData: Record<string, unknown> | null;

  @Column({ name: "etag", length: 255, nullable: true })
  etag: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
