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
import { MeetingType } from "./meeting.entity";

export interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

@Entity("annix_rep_booking_links")
export class BookingLink {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ type: "uuid", unique: true, default: () => "gen_random_uuid()" })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: "meeting_duration_minutes", default: 30 })
  meetingDurationMinutes: number;

  @Column({ name: "buffer_before_minutes", default: 0 })
  bufferBeforeMinutes: number;

  @Column({ name: "buffer_after_minutes", default: 0 })
  bufferAfterMinutes: number;

  @Column({ name: "available_days", default: "1,2,3,4,5" })
  availableDays: string;

  @Column({ name: "available_start_hour", default: 8 })
  availableStartHour: number;

  @Column({ name: "available_end_hour", default: 17 })
  availableEndHour: number;

  @Column({ name: "max_days_ahead", default: 30 })
  maxDaysAhead: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "custom_questions", type: "jsonb", nullable: true })
  customQuestions: CustomQuestion[] | null;

  @Column({
    name: "meeting_type",
    type: "varchar",
    length: 20,
    default: MeetingType.VIDEO,
  })
  meetingType: MeetingType;

  @Column({ type: "varchar", length: 500, nullable: true })
  location: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
