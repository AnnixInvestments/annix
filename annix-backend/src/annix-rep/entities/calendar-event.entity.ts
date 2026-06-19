import { CalendarEventStatus, CalendarProvider } from "./calendar.enums";
import { CalendarConnection } from "./calendar-connection.entity";

export { CalendarEventStatus, CalendarProvider };

export class CalendarEvent {
  id: number;

  connection: CalendarConnection;

  connectionId: number;

  externalId: string;

  calendarId: string | null;

  provider: CalendarProvider;

  title: string;

  description: string | null;

  startTime: Date;

  endTime: Date;

  isAllDay: boolean;

  timezone: string | null;

  location: string | null;

  status: CalendarEventStatus;

  attendees: string[] | null;

  organizerEmail: string | null;

  meetingUrl: string | null;

  isRecurring: boolean;

  recurrenceRule: string | null;

  rawData: Record<string, unknown> | null;

  etag: string | null;

  createdAt: Date;

  updatedAt: Date;
}
