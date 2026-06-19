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

export class SyncConflict {
  id: number;

  userId: number;

  user: User;

  meetingId: number | null;

  meeting: Meeting | null;

  calendarEventId: number | null;

  calendarEvent: CalendarEvent | null;

  conflictType: ConflictType;

  localData: ConflictData;

  remoteData: ConflictData;

  resolution: ConflictResolution;

  resolvedAt: Date | null;

  resolvedById: number | null;

  resolvedBy: User | null;

  createdAt: Date;
}
