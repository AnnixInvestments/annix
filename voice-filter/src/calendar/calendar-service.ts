import {
  type CalendarEvent,
  calendarEventsByUser,
  calendarSyncState,
  deleteCalendarEvent,
  oauthTokens,
  saveOAuthToken,
  upcomingCalendarEvents,
  upsertCalendarEvent,
  upsertCalendarSyncState,
} from "../auth/database.js";
import { GoogleCalendarProvider } from "./google-calendar.js";
import { MicrosoftCalendarProvider } from "./microsoft-calendar.js";
import type { CalendarCredentials, CalendarProvider, ICalendarProvider } from "./types.js";
import { ZoomCalendarProvider } from "./zoom-calendar.js";

interface CalendarServiceConfig {
  google?: { clientId: string; clientSecret: string };
  microsoft?: { clientId: string; clientSecret: string };
  zoom?: { clientId: string; clientSecret: string };
}

export class CalendarService {
  private providers: Map<CalendarProvider, ICalendarProvider> = new Map();

  constructor(config: CalendarServiceConfig) {
    if (config.google?.clientId && config.google?.clientSecret) {
      this.providers.set(
        "google",
        new GoogleCalendarProvider(config.google.clientId, config.google.clientSecret),
      );
    }

    if (config.microsoft?.clientId && config.microsoft?.clientSecret) {
      this.providers.set(
        "microsoft",
        new MicrosoftCalendarProvider(config.microsoft.clientId, config.microsoft.clientSecret),
      );
    }

    if (config.zoom?.clientId && config.zoom?.clientSecret) {
      this.providers.set(
        "zoom",
        new ZoomCalendarProvider(config.zoom.clientId, config.zoom.clientSecret),
      );
    }
  }

  availableProviders(): CalendarProvider[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(provider: CalendarProvider): boolean {
    return this.providers.has(provider);
  }

  connectedProviders(userId: number): CalendarProvider[] {
    const tokens = oauthTokens(userId);
    return this.availableProviders().filter((p) => !!tokens[p]);
  }

  async syncCalendar(
    userId: number,
    provider: CalendarProvider,
    options?: { fullSync?: boolean },
  ): Promise<{ added: number; updated: number; deleted: number }> {
    const providerImpl = this.providers.get(provider);
    if (!providerImpl) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const credentials = await this.credentialsForProvider(userId, provider);
    if (!credentials) {
      throw new Error(`No credentials for ${provider}`);
    }

    upsertCalendarSyncState(userId, provider, { status: "syncing" });

    try {
      const syncState = calendarSyncState(userId, provider);
      const syncToken = options?.fullSync ? undefined : (syncState?.sync_token ?? undefined);

      const now = new Date();
      const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const toDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const result = await providerImpl.listEvents(credentials, {
        fromDate,
        toDate,
        syncToken,
      });

      let added = 0;
      let updated = 0;

      for (const event of result.events) {
        const existing = calendarEventsByUser(userId, { provider }).find(
          (e) => e.external_event_id === event.externalId,
        );

        upsertCalendarEvent({
          userId,
          provider,
          externalEventId: event.externalId,
          title: event.title,
          description: event.description ?? undefined,
          startTime: event.startTime,
          endTime: event.endTime,
          timezone: event.timezone,
          location: event.location ?? undefined,
          meetingUrl: event.meetingUrl ?? undefined,
          attendees: event.attendees,
          organizerEmail: event.organizerEmail ?? undefined,
          isRecurring: event.isRecurring,
          recurrenceRule: event.recurrenceRule ?? undefined,
          status: event.status,
          rawData: event.rawData,
        });

        if (existing) {
          updated++;
        } else {
          added++;
        }
      }

      for (const deletedId of result.deleted) {
        const existing = calendarEventsByUser(userId, { provider }).find(
          (e) => e.external_event_id === deletedId,
        );
        if (existing) {
          deleteCalendarEvent(existing.id);
        }
      }

      const nextSyncAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      upsertCalendarSyncState(userId, provider, {
        status: "idle",
        sync_token: result.nextSyncToken,
        last_sync_at: new Date().toISOString(),
        next_sync_at: nextSyncAt,
        error_message: null,
      });

      return { added, updated, deleted: result.deleted.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      upsertCalendarSyncState(userId, provider, {
        status: "error",
        error_message: errorMessage,
      });

      throw error;
    }
  }

  async syncAllCalendars(
    userId: number,
  ): Promise<Map<CalendarProvider, { added: number; updated: number; deleted: number }>> {
    const results = new Map<
      CalendarProvider,
      { added: number; updated: number; deleted: number }
    >();

    const connected = this.connectedProviders(userId);

    for (const provider of connected) {
      try {
        const result = await this.syncCalendar(userId, provider);
        results.set(provider, result);
      } catch (error) {
        console.error(`Failed to sync ${provider} calendar:`, error);
        results.set(provider, { added: 0, updated: 0, deleted: 0 });
      }
    }

    return results;
  }

  upcomingEvents(userId: number, limit = 10): CalendarEvent[] {
    return upcomingCalendarEvents(userId, limit);
  }

  eventsByProvider(
    userId: number,
    provider: CalendarProvider,
    options?: { fromDate?: string; toDate?: string },
  ): CalendarEvent[] {
    return calendarEventsByUser(userId, {
      provider,
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    });
  }

  allEvents(userId: number, options?: { fromDate?: string; toDate?: string }): CalendarEvent[] {
    return calendarEventsByUser(userId, {
      fromDate: options?.fromDate,
      toDate: options?.toDate,
    });
  }

  syncStatus(
    userId: number,
  ): Map<CalendarProvider, { lastSync: string | null; status: string; error: string | null }> {
    const status = new Map<
      CalendarProvider,
      { lastSync: string | null; status: string; error: string | null }
    >();

    for (const provider of this.connectedProviders(userId)) {
      const state = calendarSyncState(userId, provider);
      status.set(provider, {
        lastSync: state?.last_sync_at ?? null,
        status: state?.status ?? "idle",
        error: state?.error_message ?? null,
      });
    }

    return status;
  }

  private async credentialsForProvider(
    userId: number,
    provider: CalendarProvider,
  ): Promise<CalendarCredentials | null> {
    const tokens = oauthTokens(userId);
    const accessToken = tokens[provider];

    if (!accessToken) {
      return null;
    }

    const refreshToken = tokens[`${provider}_refresh`];

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokenIfNeeded(
    userId: number,
    provider: CalendarProvider,
  ): Promise<CalendarCredentials | null> {
    const providerImpl = this.providers.get(provider);
    if (!providerImpl) {
      return null;
    }

    const tokens = oauthTokens(userId);
    const refreshToken = tokens[`${provider}_refresh`];

    if (!refreshToken) {
      return null;
    }

    try {
      const newCredentials = await providerImpl.refreshAccessToken(refreshToken);

      saveOAuthToken(userId, provider, newCredentials.accessToken);
      if (newCredentials.refreshToken) {
        saveOAuthToken(userId, `${provider}_refresh`, newCredentials.refreshToken);
      }

      return newCredentials;
    } catch (error) {
      console.error(`Failed to refresh ${provider} token:`, error);
      return null;
    }
  }
}

let calendarServiceInstance: CalendarService | null = null;

export function initCalendarService(): CalendarService {
  if (calendarServiceInstance) {
    return calendarServiceInstance;
  }

  calendarServiceInstance = new CalendarService({
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    },
    zoom: {
      clientId: process.env.ZOOM_CLIENT_ID ?? "",
      clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
    },
  });

  return calendarServiceInstance;
}

export function calendarService(): CalendarService {
  if (!calendarServiceInstance) {
    return initCalendarService();
  }
  return calendarServiceInstance;
}
