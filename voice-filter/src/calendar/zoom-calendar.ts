import type {
  CalendarCredentials,
  CalendarEventAttendee,
  CalendarEventData,
  CalendarSyncResult,
  ICalendarProvider,
} from "./types.js";

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API = "https://api.zoom.us/v2";

interface ZoomTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface ZoomMeeting {
  id: number;
  uuid: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  agenda?: string;
  join_url: string;
  host_email?: string;
  created_at: string;
  status?: string;
  recurrence?: {
    type: number;
    repeat_interval: number;
    weekly_days?: string;
    monthly_day?: number;
    end_times?: number;
    end_date_time?: string;
  };
}

interface ZoomMeetingDetails extends ZoomMeeting {
  registrants?: Array<{
    email: string;
    first_name?: string;
    last_name?: string;
    status: string;
  }>;
}

interface ZoomMeetingListResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  next_page_token?: string;
  meetings: ZoomMeeting[];
}

export class ZoomCalendarProvider implements ICalendarProvider {
  readonly provider = "zoom" as const;

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(ZOOM_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Zoom token: ${error}`);
    }

    const data = (await response.json()) as ZoomTokenResponse;

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
    let nextPageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        type: "scheduled",
        page_size: "100",
        from: options.fromDate.toISOString().split("T")[0],
        to: options.toDate.toISOString().split("T")[0],
      });

      if (nextPageToken) {
        params.set("next_page_token", nextPageToken);
      }

      const url = `${ZOOM_API}/users/me/meetings?${params}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Zoom API error: ${error}`);
      }

      const data = (await response.json()) as ZoomMeetingListResponse;

      for (const meeting of data.meetings) {
        const eventData = this.mapZoomMeeting(meeting);
        if (eventData) {
          const startDate = new Date(eventData.startTime);
          const endDate = new Date(eventData.endTime);

          if (startDate >= options.fromDate && startDate <= options.toDate) {
            events.push(eventData);
          }
        }
      }

      nextPageToken = data.next_page_token;
    } while (nextPageToken);

    return { events, nextSyncToken: null, deleted: [] };
  }

  async getEvent(
    credentials: CalendarCredentials,
    eventId: string,
  ): Promise<CalendarEventData | null> {
    const url = `${ZOOM_API}/meetings/${eventId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${error}`);
    }

    const meeting = (await response.json()) as ZoomMeetingDetails;
    return this.mapZoomMeeting(meeting);
  }

  private mapZoomMeeting(meeting: ZoomMeeting): CalendarEventData | null {
    if (!meeting.start_time) {
      return null;
    }

    const startTime = meeting.start_time;
    const durationMs = (meeting.duration ?? 60) * 60 * 1000;
    const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();

    const attendees: CalendarEventAttendee[] = [];

    if (meeting.host_email) {
      attendees.push({
        email: meeting.host_email,
        name: null,
        responseStatus: "accepted",
        organizer: true,
      });
    }

    const meetingDetails = meeting as ZoomMeetingDetails;
    if (meetingDetails.registrants && Array.isArray(meetingDetails.registrants)) {
      for (const reg of meetingDetails.registrants) {
        attendees.push({
          email: reg.email,
          name: [reg.first_name, reg.last_name].filter(Boolean).join(" ") || null,
          responseStatus: reg.status === "approved" ? "accepted" : "needsAction",
        });
      }
    }

    return {
      externalId: meeting.id.toString(),
      title: meeting.topic,
      description: meeting.agenda ?? null,
      startTime,
      endTime,
      timezone: meeting.timezone ?? "UTC",
      location: null,
      meetingUrl: meeting.join_url,
      attendees,
      organizerEmail: meeting.host_email ?? null,
      isRecurring: meeting.type === 8 || !!meeting.recurrence,
      recurrenceRule: meeting.recurrence ? JSON.stringify(meeting.recurrence) : null,
      status: meeting.status === "cancelled" ? "cancelled" : "confirmed",
      rawData: meeting as unknown as Record<string, unknown>,
    };
  }
}
