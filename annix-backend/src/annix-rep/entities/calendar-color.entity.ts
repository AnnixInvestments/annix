import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "../../user/entities/user.entity";

export type CalendarColorType = "meeting_type" | "status" | "calendar";

@Entity("annix_rep_calendar_colors")
@Unique(["userId", "colorType", "colorKey"])
export class CalendarColor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "color_type", type: "varchar", length: 50 })
  colorType: CalendarColorType;

  @Column({ name: "color_key", type: "varchar", length: 50 })
  colorKey: string;

  @Column({ name: "color_value", type: "varchar", length: 7 })
  colorValue: string;
}

export const DEFAULT_MEETING_TYPE_COLORS: Record<string, string> = {
  in_person: "#10B981",
  phone: "#6366F1",
  video: "#F59E0B",
};

export const DEFAULT_STATUS_COLORS: Record<string, string> = {
  scheduled: "#3B82F6",
  in_progress: "#EAB308",
  completed: "#22C55E",
  cancelled: "#6B7280",
  no_show: "#EF4444",
};
