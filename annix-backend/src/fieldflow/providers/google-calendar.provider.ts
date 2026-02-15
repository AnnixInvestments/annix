import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CalendarProvider } from "../entities";
import type {
  CalendarEventData,
  CalendarListItem,
  CalendarProviderConfig,
  ICalendarProvider,
  OAuthTokenResponse,
  SyncEventsResult,
  UserInfo,
} from "./calendar-provider.interface";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleCalendarListResponse {
  items: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
    accessRole: string;
  }>;
}

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  location?: string;
  status: "confirmed" | "tentative" | "cancelled";
  attendees?: GoogleEventAttendee[];
  organizer?: { email: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{ uri?: string; entryPointType?: string }>;
  };
  recurrence?: string[];
  recurringEventId?: string;
  etag?: string;
}

interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

interface GoogleUserInfo {
  email: string;
  name?: string;
}

@Injectable()
export class GoogleCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(GoogleCalendarProvider.name);
  readonly provider = CalendarProvider.GOOGLE;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl = "https://oauth2.googleapis.com/token";
  private readonly calendarApiUrl = "https://www.googleapis.com/calendar/v3";
  private readonly userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("GOOGLE_CALENDAR_CLIENT_SECRET") ?? "";
  }

  async exchangeAuthCode(authCode: string, redirectUri: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      code: authCode,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code");
    }

    const data: GoogleTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Google token refresh failed: ${error}`);
      throw new Error("Failed to refresh access token");
    }

    const data: GoogleTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: CalendarProviderConfig): Promise<UserInfo> {
    const response = await fetch(this.userInfoUrl, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data: GoogleUserInfo = await response.json();

    return {
      email: data.email,
      name: data.name ?? null,
    };
  }

  async listCalendars(config: CalendarProviderConfig): Promise<CalendarListItem[]> {
    const response = await fetch(`${this.calendarApiUrl}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch calendar list");
    }

    const data: GoogleCalendarListResponse = await response.json();

    return data.items.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      isPrimary: cal.primary ?? false,
      color: cal.backgroundColor ?? null,
      accessRole: cal.accessRole,
    }));
  }

  async syncEvents(
    config: CalendarProviderConfig,
    calendarIds: string[],
    syncToken: string | null,
    fullSync: boolean,
  ): Promise<SyncEventsResult> {
    const allEvents: CalendarEventData[] = [];
    const allDeletedIds: string[] = [];
    let combinedSyncToken: string | null = null;

    const syncTokens: Record<string, string> = syncToken ? JSON.parse(syncToken) : {};
    const newSyncTokens: Record<string, string> = {};

    for (const calendarId of calendarIds) {
      const result = await this.syncCalendarEvents(
        config,
        calendarId,
        fullSync ? null : (syncTokens[calendarId] ?? null),
      );

      if (result.requiresFullSync) {
        const fullResult = await this.syncCalendarEvents(config, calendarId, null);
        allEvents.push(...fullResult.events);
        allDeletedIds.push(...fullResult.deletedEventIds);
        if (fullResult.nextSyncToken) {
          newSyncTokens[calendarId] = fullResult.nextSyncToken;
        }
      } else {
        allEvents.push(...result.events);
        allDeletedIds.push(...result.deletedEventIds);
        if (result.nextSyncToken) {
          newSyncTokens[calendarId] = result.nextSyncToken;
        }
      }
    }

    if (Object.keys(newSyncTokens).length > 0) {
      combinedSyncToken = JSON.stringify(newSyncTokens);
    }

    return {
      events: allEvents,
      deletedEventIds: allDeletedIds,
      nextSyncToken: combinedSyncToken,
      requiresFullSync: false,
    };
  }

  private async syncCalendarEvents(
    config: CalendarProviderConfig,
    calendarId: string,
    syncToken: string | null,
  ): Promise<SyncEventsResult> {
    const events: CalendarEventData[] = [];
    const deletedEventIds: string[] = [];
    let pageToken: string | null = null;
    let nextSyncToken: string | null = null;

    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
      showDeleted: "true",
    });

    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 1);
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6);
      params.set("timeMin", timeMin.toISOString());
      params.set("timeMax", timeMax.toISOString());
    }

    do {
      if (pageToken) {
        params.set("pageToken", pageToken);
      }

      const url = `${this.calendarApiUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (response.status === 410) {
        return {
          events: [],
          deletedEventIds: [],
          nextSyncToken: null,
          requiresFullSync: true,
        };
      }

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to sync calendar ${calendarId}: ${error}`);
        throw new Error(`Failed to sync calendar events: ${error}`);
      }

      const data: GoogleEventsListResponse = await response.json();

      if (data.items) {
        for (const item of data.items) {
          if (item.status === "cancelled") {
            deletedEventIds.push(item.id);
          } else {
            events.push(this.mapGoogleEvent(item, calendarId));
          }
        }
      }

      pageToken = data.nextPageToken ?? null;
      nextSyncToken = data.nextSyncToken ?? null;
    } while (pageToken);

    return {
      events,
      deletedEventIds,
      nextSyncToken,
      requiresFullSync: false,
    };
  }

  private mapGoogleEvent(event: GoogleCalendarEvent, calendarId: string): CalendarEventData {
    const isAllDay = Boolean(event.start.date);
    const startTime = isAllDay
      ? new Date(`${event.start.date}T00:00:00`)
      : new Date(event.start.dateTime!);
    const endTime = isAllDay
      ? new Date(`${event.end.date}T00:00:00`)
      : new Date(event.end.dateTime!);

    let meetingUrl: string | null = event.hangoutLink ?? null;
    if (!meetingUrl && event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find((e) => e.entryPointType === "video");
      meetingUrl = videoEntry?.uri ?? null;
    }

    return {
      externalId: event.id,
      calendarId,
      title: event.summary ?? "(No title)",
      description: event.description ?? null,
      startTime,
      endTime,
      isAllDay,
      timezone: event.start.timeZone ?? null,
      location: event.location ?? null,
      status: event.status,
      attendees: event.attendees?.map((a) => a.email) ?? null,
      organizerEmail: event.organizer?.email ?? null,
      meetingUrl,
      isRecurring: Boolean(event.recurringEventId || event.recurrence),
      recurrenceRule: event.recurrence?.join(";") ?? null,
      etag: event.etag ?? null,
      rawData: event as unknown as Record<string, unknown>,
    };
  }
}
