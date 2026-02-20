export type CalendarProvider = "google" | "microsoft" | "zoom";

export interface CalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface CalendarEventAttendee {
  email: string;
  name: string | null;
  responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
  self?: boolean;
  organizer?: boolean;
}

export interface CalendarEventData {
  externalId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  attendees: CalendarEventAttendee[];
  organizerEmail: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  rawData: Record<string, unknown>;
}

export interface CalendarSyncResult {
  events: CalendarEventData[];
  nextSyncToken: string | null;
  deleted: string[];
}

export interface ICalendarProvider {
  provider: CalendarProvider;

  refreshAccessToken(refreshToken: string): Promise<CalendarCredentials>;

  listEvents(
    credentials: CalendarCredentials,
    options: {
      fromDate: Date;
      toDate: Date;
      syncToken?: string;
    },
  ): Promise<CalendarSyncResult>;

  getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEventData | null>;
}

export function extractMeetingUrl(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  const patterns = [
    /https:\/\/[\w-]+\.zoom\.us\/j\/\d+(\?pwd=[\w-]+)?/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+/i,
    /https:\/\/meet\.google\.com\/[\w-]+/i,
    /https:\/\/[\w-]+\.webex\.com\/[\w-]+\/j\.php\?[^\s"<>]+/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}
