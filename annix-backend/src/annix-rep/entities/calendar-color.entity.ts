import { User } from "../../user/entities/user.entity";

export type CalendarColorType = "meeting_type" | "status" | "calendar";

export class CalendarColor {
  id: number;

  user: User;

  userId: number;

  colorType: CalendarColorType;

  colorKey: string;

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
