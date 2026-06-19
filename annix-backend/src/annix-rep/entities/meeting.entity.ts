import { User } from "../../user/entities/user.entity";
import { CalendarEvent } from "./calendar-event.entity";
import { Organization } from "./organization.entity";
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

export class Meeting {
  id: number;

  prospect: Prospect | null;

  prospectId: number | null;

  salesRep: User;

  salesRepId: number;

  calendarEvent: CalendarEvent | null;

  calendarEventId: number | null;

  title: string;

  description: string | null;

  meetingType: MeetingType;

  status: MeetingStatus;

  scheduledStart: Date;

  scheduledEnd: Date;

  actualStart: Date | null;

  actualEnd: Date | null;

  location: string | null;

  latitude: number | null;

  longitude: number | null;

  attendees: string[] | null;

  agenda: string | null;

  notes: string | null;

  outcomes: string | null;

  actionItems: Array<{ task: string; assignee: string | null; dueDate: string | null }> | null;

  summarySent: boolean;

  summarySentAt: Date | null;

  crmExternalId: string | null;

  crmSyncStatus: string | null;

  crmLastSyncedAt: Date | null;

  isRecurring: boolean;

  recurrenceRule: string | null;

  recurringParent: Meeting | null;

  recurringParentId: number | null;

  recurrenceExceptionDates: string | null;

  organization: Organization | null;

  organizationId: number | null;

  notesVisibleToTeam: boolean;

  createdAt: Date;

  updatedAt: Date;
}
