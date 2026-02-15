import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { CalendarProvider, CalendarSyncStatus } from "./calendar.enums";
import { CalendarEvent } from "./calendar-event.entity";

export { CalendarProvider, CalendarSyncStatus };

@Entity("fieldflow_calendar_connections")
export class CalendarConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({
    type: "enum",
    enum: CalendarProvider,
  })
  provider: CalendarProvider;

  @Column({ name: "account_email", length: 255 })
  accountEmail: string;

  @Column({ name: "account_name", type: "varchar", length: 255, nullable: true })
  accountName: string | null;

  @Column({ name: "access_token_encrypted", type: "text" })
  accessTokenEncrypted: string;

  @Column({ name: "refresh_token_encrypted", type: "text", nullable: true })
  refreshTokenEncrypted: string | null;

  @Column({ name: "token_expires_at", type: "timestamp", nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: "caldav_url", type: "varchar", length: 500, nullable: true })
  caldavUrl: string | null;

  @Column({
    name: "sync_status",
    type: "enum",
    enum: CalendarSyncStatus,
    default: CalendarSyncStatus.ACTIVE,
  })
  syncStatus: CalendarSyncStatus;

  @Column({ name: "last_sync_at", type: "timestamp", nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: "last_sync_error", type: "text", nullable: true })
  lastSyncError: string | null;

  @Column({ name: "sync_token", type: "varchar", length: 500, nullable: true })
  syncToken: string | null;

  @Column({ name: "selected_calendars", type: "simple-array", nullable: true })
  selectedCalendars: string[] | null;

  @Column({ name: "is_primary", default: false })
  isPrimary: boolean;

  @OneToMany(
    () => CalendarEvent,
    (event) => event.connection,
  )
  events: CalendarEvent[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
