import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CalendarEventStatus, CalendarProvider } from "./calendar.enums";
import { CalendarConnection } from "./calendar-connection.entity";

export { CalendarEventStatus, CalendarProvider };

@Entity("annix_rep_calendar_events")
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

  @Column({ name: "calendar_id", type: "varchar", length: 255, nullable: true })
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

  @Column({ type: "varchar", length: 100, nullable: true })
  timezone: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  location: string | null;

  @Column({
    type: "enum",
    enum: CalendarEventStatus,
    default: CalendarEventStatus.CONFIRMED,
  })
  status: CalendarEventStatus;

  @Column({ type: "simple-array", nullable: true })
  attendees: string[] | null;

  @Column({ name: "organizer_email", type: "varchar", length: 255, nullable: true })
  organizerEmail: string | null;

  @Column({ name: "meeting_url", type: "varchar", length: 500, nullable: true })
  meetingUrl: string | null;

  @Column({ name: "is_recurring", default: false })
  isRecurring: boolean;

  @Column({ name: "recurrence_rule", type: "varchar", length: 500, nullable: true })
  recurrenceRule: string | null;

  @Column({ name: "raw_data", type: "json", nullable: true })
  rawData: Record<string, unknown> | null;

  @Column({ name: "etag", type: "varchar", length: 255, nullable: true })
  etag: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
