import type {
  CalendarCredentials,
  CalendarEventAttendee,
  CalendarEventData,
  CalendarSyncResult,
  ICalendarProvider,
} from "./types.js";
import { extractMeetingUrl } from "./types.js";

const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_GRAPH_API = "https://graph.microsoft.com/v1.0";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface MicrosoftCalendarEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName?: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status: {
      response: string;
    };
    type: string;
  }>;
  organizer?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  onlineMeeting?: {
    joinUrl?: string;
  };
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
    };
    range: {
      type: string;
      startDate: string;
      endDate?: string;
    };
  };
  seriesMasterId?: string;
  isCancelled?: boolean;
  showAs?: string;
  "@odata.deltaLink"?: string;
}

interface MicrosoftCalendarListResponse {
  value: MicrosoftCalendarEvent[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

export class MicrosoftCalendarProvider implements ICalendarProvider {
  readonly provider = "microsoft" as const;

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
    const response = await fetch(MS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "openid email profile User.Read Calendars.Read",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Microsoft token: ${error}`);
    }

    const data = (await response.json()) as MicrosoftTokenResponse;

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
    let nextLink: string | undefined;
    let deltaLink: string | null = null;

    if (options.syncToken) {
      nextLink = options.syncToken;
    } else {
      const params = new URLSearchParams({
        startDateTime: options.fromDate.toISOString(),
        endDateTime: options.toDate.toISOString(),
        $top: "100",
        $orderby: "start/dateTime",
        $select:
          "id,subject,bodyPreview,start,end,location,attendees,organizer,isOnlineMeeting,onlineMeetingUrl,onlineMeeting,recurrence,seriesMasterId,isCancelled,showAs",
      });
      nextLink = `${MS_GRAPH_API}/me/calendarView?${params}`;
    }

    do {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (response.status === 410 || response.status === 404) {
        return this.listEvents(credentials, {
          fromDate: options.fromDate,
          toDate: options.toDate,
        });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Microsoft Graph API error: ${error}`);
      }

      const data = (await response.json()) as MicrosoftCalendarListResponse;

      for (const item of data.value) {
        if (item.isCancelled || item.showAs === "free") {
          if (options.syncToken) {
            deleted.push(item.id);
          }
          continue;
        }

        const eventData = this.mapMicrosoftEvent(item);
        if (eventData) {
          events.push(eventData);
        }
      }

      nextLink = data["@odata.nextLink"];
      if (data["@odata.deltaLink"]) {
        deltaLink = data["@odata.deltaLink"];
      }
    } while (nextLink);

    return { events, nextSyncToken: deltaLink, deleted };
  }

  async getEvent(
    credentials: CalendarCredentials,
    eventId: string,
  ): Promise<CalendarEventData | null> {
    const url = `${MS_GRAPH_API}/me/events/${eventId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${error}`);
    }

    const item = (await response.json()) as MicrosoftCalendarEvent;
    return this.mapMicrosoftEvent(item);
  }

  private mapMicrosoftEvent(item: MicrosoftCalendarEvent): CalendarEventData | null {
    if (!item.start?.dateTime || !item.end?.dateTime) {
      return null;
    }

    let meetingUrl = item.onlineMeetingUrl ?? item.onlineMeeting?.joinUrl ?? null;

    if (!meetingUrl) {
      meetingUrl =
        extractMeetingUrl(item.bodyPreview) ??
        extractMeetingUrl(item.body?.content) ??
        extractMeetingUrl(item.location?.displayName);
    }

    const attendees: CalendarEventAttendee[] = (item.attendees ?? []).map((a) => ({
      email: a.emailAddress.address,
      name: a.emailAddress.name ?? null,
      responseStatus: this.mapResponseStatus(a.status.response),
      organizer:
        a.type === "required" && a.emailAddress.address === item.organizer?.emailAddress.address,
    }));

    const startTime = this.convertToIso(item.start.dateTime, item.start.timeZone);
    const endTime = this.convertToIso(item.end.dateTime, item.end.timeZone);

    return {
      externalId: item.id,
      title: item.subject ?? "(No title)",
      description: item.bodyPreview ?? null,
      startTime,
      endTime,
      timezone: item.start.timeZone,
      location: item.location?.displayName ?? null,
      meetingUrl,
      attendees,
      organizerEmail: item.organizer?.emailAddress.address ?? null,
      isRecurring: !!item.seriesMasterId || !!item.recurrence,
      recurrenceRule: item.recurrence ? JSON.stringify(item.recurrence) : null,
      status: item.isCancelled ? "cancelled" : "confirmed",
      rawData: item as unknown as Record<string, unknown>,
    };
  }

  private convertToIso(dateTime: string, timeZone: string): string {
    if (dateTime.endsWith("Z") || dateTime.includes("+") || dateTime.includes("-")) {
      return dateTime;
    }

    try {
      const date = new Date(dateTime);
      return date.toISOString();
    } catch {
      return dateTime;
    }
  }

  private mapResponseStatus(status: string): "accepted" | "declined" | "tentative" | "needsAction" {
    const statusMap: Record<string, CalendarEventAttendee["responseStatus"]> = {
      accepted: "accepted",
      declined: "declined",
      tentativelyAccepted: "tentative",
      notResponded: "needsAction",
      none: "needsAction",
    };
    return statusMap[status] ?? "needsAction";
  }
}
