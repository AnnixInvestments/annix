import type {
  CalendarCredentials,
  CalendarEventAttendee,
  CalendarEventData,
  CalendarSyncResult,
  ICalendarProvider,
} from "./types.js";
import { extractMeetingUrl } from "./types.js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  status: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    self?: boolean;
    organizer?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  recurrence?: string[];
  recurringEventId?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

export class GoogleCalendarProvider implements ICalendarProvider {
  readonly provider = "google" as const;

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Google token: ${error}`);
    }

    const data = (await response.json()) as GoogleTokenResponse;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async listEvents(
    credentials: CalendarCredentials,
    options: { fromDate: Date; toDate: Date; syncToken?: string },
  ): Promise<CalendarSyncResult> {
    const events: CalendarEventData[] = [];
    const deleted: string[] = [];
    let nextPageToken: string | undefined;
    let nextSyncToken: string | null = null;

    do {
      const params = new URLSearchParams({
        maxResults: "250",
        singleEvents: "true",
        orderBy: "startTime",
      });

      if (options.syncToken) {
        params.set("syncToken", options.syncToken);
      } else {
        params.set("timeMin", options.fromDate.toISOString());
        params.set("timeMax", options.toDate.toISOString());
      }

      if (nextPageToken) {
        params.set("pageToken", nextPageToken);
      }

      const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (response.status === 410) {
        return this.listEvents(credentials, {
          fromDate: options.fromDate,
          toDate: options.toDate,
        });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Calendar API error: ${error}`);
      }

      const data = (await response.json()) as GoogleCalendarListResponse;

      for (const item of data.items) {
        if (item.status === "cancelled") {
          deleted.push(item.id);
          continue;
        }

        const eventData = this.mapGoogleEvent(item);
        if (eventData) {
          events.push(eventData);
        }
      }

      nextPageToken = data.nextPageToken;
      nextSyncToken = data.nextSyncToken ?? null;
    } while (nextPageToken);

    return { events, nextSyncToken, deleted };
  }

  async getEvent(
    credentials: CalendarCredentials,
    eventId: string,
  ): Promise<CalendarEventData | null> {
    const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const item = (await response.json()) as GoogleCalendarEvent;
    return this.mapGoogleEvent(item);
  }

  private mapGoogleEvent(item: GoogleCalendarEvent): CalendarEventData | null {
    const startDateTime = item.start.dateTime ?? item.start.date;
    const endDateTime = item.end.dateTime ?? item.end.date;

    if (!startDateTime || !endDateTime) {
      return null;
    }

    let meetingUrl = item.hangoutLink ?? null;

    if (!meetingUrl && item.conferenceData?.entryPoints) {
      const videoEntry = item.conferenceData.entryPoints.find((e) => e.entryPointType === "video");
      if (videoEntry) {
        meetingUrl = videoEntry.uri;
      }
    }

    if (!meetingUrl) {
      meetingUrl = extractMeetingUrl(item.description) ?? extractMeetingUrl(item.location);
    }

    const attendees: CalendarEventAttendee[] = (item.attendees ?? []).map((a) => ({
      email: a.email,
      name: a.displayName ?? null,
      responseStatus: this.mapResponseStatus(a.responseStatus),
      self: a.self,
      organizer: a.organizer,
    }));

    return {
      externalId: item.id,
      title: item.summary ?? "(No title)",
      description: item.description ?? null,
      startTime: startDateTime,
      endTime: endDateTime,
      timezone: item.start.timeZone ?? "UTC",
      location: item.location ?? null,
      meetingUrl,
      attendees,
      organizerEmail: item.organizer?.email ?? null,
      isRecurring: !!item.recurringEventId || !!item.recurrence,
      recurrenceRule: item.recurrence?.[0] ?? null,
      status: this.mapStatus(item.status),
      rawData: item as unknown as Record<string, unknown>,
    };
  }

  private mapResponseStatus(status: string): "accepted" | "declined" | "tentative" | "needsAction" {
    const statusMap: Record<string, CalendarEventAttendee["responseStatus"]> = {
      accepted: "accepted",
      declined: "declined",
      tentative: "tentative",
      needsAction: "needsAction",
    };
    return statusMap[status] ?? "needsAction";
  }

  private mapStatus(status: string): "confirmed" | "tentative" | "cancelled" {
    const statusMap: Record<string, CalendarEventData["status"]> = {
      confirmed: "confirmed",
      tentative: "tentative",
      cancelled: "cancelled",
    };
    return statusMap[status] ?? "confirmed";
  }
}
