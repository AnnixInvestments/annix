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

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface MicrosoftCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  hexColor?: string;
  canEdit: boolean;
}

interface MicrosoftCalendarListResponse {
  value: MicrosoftCalendar[];
}

interface MicrosoftEventDateTime {
  dateTime: string;
  timeZone: string;
}

interface MicrosoftEventAttendee {
  emailAddress: { address: string; name?: string };
  status?: { response: string };
}

interface MicrosoftOnlineMeeting {
  joinUrl?: string;
}

interface MicrosoftCalendarEvent {
  id: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  start: MicrosoftEventDateTime;
  end: MicrosoftEventDateTime;
  isAllDay?: boolean;
  location?: { displayName?: string };
  showAs?: string;
  isCancelled?: boolean;
  attendees?: MicrosoftEventAttendee[];
  organizer?: { emailAddress?: { address: string } };
  onlineMeeting?: MicrosoftOnlineMeeting;
  webLink?: string;
  recurrence?: { pattern?: unknown };
  seriesMasterId?: string;
  changeKey?: string;
}

interface MicrosoftEventsResponse {
  value?: MicrosoftCalendarEvent[];
  "@odata.deltaLink"?: string;
  "@odata.nextLink"?: string;
}

interface MicrosoftUserInfo {
  mail?: string;
  userPrincipalName: string;
  displayName?: string;
}

@Injectable()
export class OutlookCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(OutlookCalendarProvider.name);
  readonly provider = CalendarProvider.OUTLOOK;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  private readonly graphApiUrl = "https://graph.microsoft.com/v1.0";

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>("MICROSOFT_CLIENT_ID") ?? "";
    this.clientSecret = this.configService.get<string>("MICROSOFT_CLIENT_SECRET") ?? "";
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
      this.logger.error(`Microsoft token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code");
    }

    const data: MicrosoftTokenResponse = await response.json();

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
      this.logger.error(`Microsoft token refresh failed: ${error}`);
      throw new Error("Failed to refresh access token");
    }

    const data: MicrosoftTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope,
    };
  }

  async userInfo(config: CalendarProviderConfig): Promise<UserInfo> {
    const response = await fetch(`${this.graphApiUrl}/me`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const data: MicrosoftUserInfo = await response.json();

    return {
      email: data.mail ?? data.userPrincipalName,
      name: data.displayName ?? null,
    };
  }

  async listCalendars(config: CalendarProviderConfig): Promise<CalendarListItem[]> {
    const response = await fetch(`${this.graphApiUrl}/me/calendars`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch calendar list");
    }

    const data: MicrosoftCalendarListResponse = await response.json();

    return data.value.map((cal) => ({
      id: cal.id,
      name: cal.name,
      isPrimary: cal.isDefaultCalendar ?? false,
      color: cal.hexColor ?? null,
      accessRole: cal.canEdit ? "writer" : "reader",
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

    const deltaLinks: Record<string, string> = syncToken ? JSON.parse(syncToken) : {};
    const newDeltaLinks: Record<string, string> = {};

    for (const calendarId of calendarIds) {
      const result = await this.syncCalendarEvents(
        config,
        calendarId,
        fullSync ? null : (deltaLinks[calendarId] ?? null),
      );

      if (result.requiresFullSync) {
        const fullResult = await this.syncCalendarEvents(config, calendarId, null);
        allEvents.push(...fullResult.events);
        allDeletedIds.push(...fullResult.deletedEventIds);
        if (fullResult.nextSyncToken) {
          newDeltaLinks[calendarId] = fullResult.nextSyncToken;
        }
      } else {
        allEvents.push(...result.events);
        allDeletedIds.push(...result.deletedEventIds);
        if (result.nextSyncToken) {
          newDeltaLinks[calendarId] = result.nextSyncToken;
        }
      }
    }

    if (Object.keys(newDeltaLinks).length > 0) {
      combinedSyncToken = JSON.stringify(newDeltaLinks);
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
    deltaLink: string | null,
  ): Promise<SyncEventsResult> {
    const events: CalendarEventData[] = [];
    const deletedEventIds: string[] = [];
    let nextLink: string | null = null;
    let nextDeltaLink: string | null = null;

    let url: string;

    if (deltaLink) {
      url = deltaLink;
    } else {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const params = new URLSearchParams({
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        $top: "100",
      });

      url = `${this.graphApiUrl}/me/calendars/${calendarId}/calendarView/delta?${params.toString()}`;
    }

    do {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });

      if (response.status === 410 || response.status === 404) {
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

      const data: MicrosoftEventsResponse = await response.json();

      if (data.value) {
        for (const item of data.value) {
          if (item.isCancelled || (item.showAs && item.showAs === "free" && !item.subject)) {
            deletedEventIds.push(item.id);
          } else {
            events.push(this.mapMicrosoftEvent(item, calendarId));
          }
        }
      }

      nextLink = data["@odata.nextLink"] ?? null;
      nextDeltaLink = data["@odata.deltaLink"] ?? null;

      if (nextLink) {
        url = nextLink;
      }
    } while (nextLink);

    return {
      events,
      deletedEventIds,
      nextSyncToken: nextDeltaLink,
      requiresFullSync: false,
    };
  }

  private mapMicrosoftEvent(event: MicrosoftCalendarEvent, calendarId: string): CalendarEventData {
    const startTime = new Date(`${event.start.dateTime}Z`);
    const endTime = new Date(`${event.end.dateTime}Z`);
    const isAllDay = event.isAllDay ?? false;

    let status: "confirmed" | "tentative" | "cancelled" = "confirmed";
    if (event.isCancelled) {
      status = "cancelled";
    } else if (event.showAs === "tentative") {
      status = "tentative";
    }

    const meetingUrl = event.onlineMeeting?.joinUrl ?? null;

    return {
      externalId: event.id,
      calendarId,
      title: event.subject ?? "(No title)",
      description: event.body?.content ?? null,
      startTime,
      endTime,
      isAllDay,
      timezone: event.start.timeZone ?? null,
      location: event.location?.displayName ?? null,
      status,
      attendees: event.attendees?.map((a) => a.emailAddress.address) ?? null,
      organizerEmail: event.organizer?.emailAddress?.address ?? null,
      meetingUrl,
      isRecurring: Boolean(event.seriesMasterId || event.recurrence),
      recurrenceRule: event.recurrence ? JSON.stringify(event.recurrence) : null,
      etag: event.changeKey ?? null,
      rawData: event as unknown as Record<string, unknown>,
    };
  }
}
