import { CalendarProvider } from "../entities";

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
  scope: string | null;
}

export interface CalendarProviderConfig {
  accessToken: string;
  refreshToken: string | null;
}

export interface CalendarListItem {
  id: string;
  name: string;
  isPrimary: boolean;
  color: string | null;
  accessRole: string;
}

export interface CalendarEventData {
  externalId: string;
  calendarId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timezone: string | null;
  location: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  attendees: string[] | null;
  organizerEmail: string | null;
  meetingUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  etag: string | null;
  rawData: Record<string, unknown>;
}

export interface SyncEventsResult {
  events: CalendarEventData[];
  deletedEventIds: string[];
  nextSyncToken: string | null;
  requiresFullSync: boolean;
}

export interface UserInfo {
  email: string;
  name: string | null;
}

export interface ICalendarProvider {
  provider: CalendarProvider;

  exchangeAuthCode(authCode: string, redirectUri: string): Promise<OAuthTokenResponse>;

  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;

  userInfo(config: CalendarProviderConfig): Promise<UserInfo>;

  listCalendars(config: CalendarProviderConfig): Promise<CalendarListItem[]>;

  syncEvents(
    config: CalendarProviderConfig,
    calendarIds: string[],
    syncToken: string | null,
    fullSync: boolean,
  ): Promise<SyncEventsResult>;
}
