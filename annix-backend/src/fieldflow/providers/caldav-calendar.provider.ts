import { Injectable, Logger } from "@nestjs/common";
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

interface ParsedVEvent {
  uid: string;
  summary: string;
  description: string | null;
  dtstart: string;
  dtend: string;
  location: string | null;
  status: string | null;
  attendees: string[];
  organizer: string | null;
  rrule: string | null;
  etag: string | null;
}

@Injectable()
export class CaldavCalendarProvider implements ICalendarProvider {
  private readonly logger = new Logger(CaldavCalendarProvider.name);
  readonly provider = CalendarProvider.CALDAV;

  async exchangeAuthCode(_authCode: string, _redirectUri: string): Promise<OAuthTokenResponse> {
    throw new Error("CalDAV does not use OAuth - use app-specific password instead");
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokenResponse> {
    throw new Error("CalDAV does not use OAuth - credentials do not expire");
  }

  async userInfo(config: CalendarProviderConfig): Promise<UserInfo> {
    const email = this.extractEmailFromCredentials(config);
    return {
      email,
      name: null,
    };
  }

  async listCalendars(config: CalendarProviderConfig): Promise<CalendarListItem[]> {
    const { caldavUrl, username, password } = this.parseCredentials(config);

    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <D:displayname/>
    <C:calendar-description/>
    <CS:calendar-color/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`;

    const response = await fetch(caldavUrl, {
      method: "PROPFIND",
      headers: {
        "Content-Type": "application/xml",
        Authorization: this.basicAuth(username, password),
        Depth: "1",
      },
      body: propfindBody,
    });

    if (!response.ok) {
      this.logger.error(`CalDAV PROPFIND failed: ${response.status}`);
      throw new Error("Failed to list calendars");
    }

    const xml = await response.text();
    return this.parseCalendarListResponse(xml, caldavUrl);
  }

  async syncEvents(
    config: CalendarProviderConfig,
    calendarIds: string[],
    syncToken: string | null,
    fullSync: boolean,
  ): Promise<SyncEventsResult> {
    const { username, password } = this.parseCredentials(config);

    const allEvents: CalendarEventData[] = [];
    const allDeletedIds: string[] = [];
    const ctags: Record<string, string> = syncToken && !fullSync ? JSON.parse(syncToken) : {};
    const newCtags: Record<string, string> = {};

    for (const calendarUrl of calendarIds) {
      const currentCtag = await this.fetchCtag(calendarUrl, username, password);

      if (!fullSync && ctags[calendarUrl] === currentCtag) {
        newCtags[calendarUrl] = currentCtag;
        continue;
      }

      const result = await this.fetchCalendarEvents(calendarUrl, username, password);
      allEvents.push(...result.events);

      if (ctags[calendarUrl]) {
        const oldEventIds = new Set<string>();
        const newEventIds = new Set(result.events.map((e) => e.externalId));

        for (const id of oldEventIds) {
          if (!newEventIds.has(id)) {
            allDeletedIds.push(id);
          }
        }
      }

      newCtags[calendarUrl] = currentCtag;
    }

    return {
      events: allEvents,
      deletedEventIds: allDeletedIds,
      nextSyncToken: JSON.stringify(newCtags),
      requiresFullSync: false,
    };
  }

  private async fetchCtag(
    calendarUrl: string,
    username: string,
    password: string,
  ): Promise<string> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <CS:getctag/>
  </D:prop>
</D:propfind>`;

    const response = await fetch(calendarUrl, {
      method: "PROPFIND",
      headers: {
        "Content-Type": "application/xml",
        Authorization: this.basicAuth(username, password),
        Depth: "0",
      },
      body: propfindBody,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch calendar ctag");
    }

    const xml = await response.text();
    const ctagMatch = xml.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/i);
    return ctagMatch?.[1] ?? Date.now().toString();
  }

  private async fetchCalendarEvents(
    calendarUrl: string,
    username: string,
    password: string,
  ): Promise<{ events: CalendarEventData[] }> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);

    const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${this.formatCalDavDate(startDate)}" end="${this.formatCalDavDate(endDate)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    const response = await fetch(calendarUrl, {
      method: "REPORT",
      headers: {
        "Content-Type": "application/xml",
        Authorization: this.basicAuth(username, password),
        Depth: "1",
      },
      body: reportBody,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`CalDAV REPORT failed: ${error}`);
      throw new Error("Failed to fetch calendar events");
    }

    const xml = await response.text();
    const events = this.parseCalendarEventsResponse(xml, calendarUrl);

    return { events };
  }

  private parseCalendarListResponse(xml: string, baseUrl: string): CalendarListItem[] {
    const calendars: CalendarListItem[] = [];

    const responseRegex = /<D:response[^>]*>([\s\S]*?)<\/D:response>/gi;
    let match;

    while ((match = responseRegex.exec(xml)) !== null) {
      const responseContent = match[1];

      const resourceTypeMatch = responseContent.match(
        /<D:resourcetype[^>]*>([\s\S]*?)<\/D:resourcetype>/i,
      );
      const isCalendar = resourceTypeMatch?.[1].includes("calendar");

      if (!isCalendar) continue;

      const hrefMatch = responseContent.match(/<D:href[^>]*>([^<]+)<\/D:href>/i);
      const displayNameMatch = responseContent.match(
        /<D:displayname[^>]*>([^<]*)<\/D:displayname>/i,
      );
      const colorMatch = responseContent.match(
        /<(?:CS:)?calendar-color[^>]*>([^<]*)<\/(?:CS:)?calendar-color>/i,
      );

      if (hrefMatch) {
        const href = hrefMatch[1];
        const calendarUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();

        calendars.push({
          id: calendarUrl,
          name: displayNameMatch?.[1] ?? "Calendar",
          isPrimary: calendars.length === 0,
          color: colorMatch?.[1] ?? null,
          accessRole: "writer",
        });
      }
    }

    return calendars;
  }

  private parseCalendarEventsResponse(xml: string, calendarId: string): CalendarEventData[] {
    const events: CalendarEventData[] = [];

    const responseRegex = /<D:response[^>]*>([\s\S]*?)<\/D:response>/gi;
    let match;

    while ((match = responseRegex.exec(xml)) !== null) {
      const responseContent = match[1];

      const calendarDataMatch = responseContent.match(
        /<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/i,
      );
      const etagMatch = responseContent.match(/<D:getetag[^>]*>"?([^"<]+)"?<\/D:getetag>/i);

      if (!calendarDataMatch) continue;

      const icalData = this.decodeXmlEntities(calendarDataMatch[1]);
      const vevent = this.parseICalVEvent(icalData);

      if (vevent) {
        vevent.etag = etagMatch?.[1] ?? null;
        events.push(this.mapVEventToCalendarEvent(vevent, calendarId));
      }
    }

    return events;
  }

  private parseICalVEvent(icalData: string): ParsedVEvent | null {
    const veventMatch = icalData.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
    if (!veventMatch) return null;

    const veventContent = veventMatch[1];

    const extractField = (name: string): string | null => {
      const regex = new RegExp(`^${name}[;:](.+)$`, "im");
      const match = veventContent.match(regex);
      if (!match) return null;

      let value = match[1];
      const colonIndex = value.indexOf(":");
      if (colonIndex > -1 && value.includes("=")) {
        value = value.substring(colonIndex + 1);
      }
      return this.unfoldICalLine(value);
    };

    const extractAttendees = (): string[] => {
      const attendees: string[] = [];
      const regex = /^ATTENDEE[;:](.+)$/gim;
      let match;
      while ((match = regex.exec(veventContent)) !== null) {
        const emailMatch = match[1].match(/mailto:([^\s;]+)/i);
        if (emailMatch) {
          attendees.push(emailMatch[1]);
        }
      }
      return attendees;
    };

    const extractOrganizer = (): string | null => {
      const match = veventContent.match(/^ORGANIZER[;:](.+)$/im);
      if (!match) return null;
      const emailMatch = match[1].match(/mailto:([^\s;]+)/i);
      return emailMatch?.[1] ?? null;
    };

    return {
      uid: extractField("UID") ?? crypto.randomUUID(),
      summary: extractField("SUMMARY") ?? "(No title)",
      description: extractField("DESCRIPTION"),
      dtstart: extractField("DTSTART") ?? "",
      dtend: extractField("DTEND") ?? "",
      location: extractField("LOCATION"),
      status: extractField("STATUS"),
      attendees: extractAttendees(),
      organizer: extractOrganizer(),
      rrule: extractField("RRULE"),
      etag: null,
    };
  }

  private mapVEventToCalendarEvent(vevent: ParsedVEvent, calendarId: string): CalendarEventData {
    const isAllDay = !vevent.dtstart.includes("T");
    const startTime = this.parseICalDate(vevent.dtstart);
    const endTime = this.parseICalDate(vevent.dtend);

    let status: "confirmed" | "tentative" | "cancelled" = "confirmed";
    if (vevent.status === "CANCELLED") {
      status = "cancelled";
    } else if (vevent.status === "TENTATIVE") {
      status = "tentative";
    }

    return {
      externalId: vevent.uid,
      calendarId,
      title: vevent.summary,
      description: vevent.description,
      startTime,
      endTime,
      isAllDay,
      timezone: null,
      location: vevent.location,
      status,
      attendees: vevent.attendees.length > 0 ? vevent.attendees : null,
      organizerEmail: vevent.organizer,
      meetingUrl: null,
      isRecurring: Boolean(vevent.rrule),
      recurrenceRule: vevent.rrule,
      etag: vevent.etag,
      rawData: { ical: vevent },
    };
  }

  private parseICalDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    const cleanDate = dateStr.replace(/[^0-9TZ]/g, "");

    if (cleanDate.length === 8) {
      return new Date(
        parseInt(cleanDate.slice(0, 4), 10),
        parseInt(cleanDate.slice(4, 6), 10) - 1,
        parseInt(cleanDate.slice(6, 8), 10),
      );
    }

    if (cleanDate.includes("T")) {
      const [date, time] = cleanDate.split("T");
      const year = parseInt(date.slice(0, 4), 10);
      const month = parseInt(date.slice(4, 6), 10) - 1;
      const day = parseInt(date.slice(6, 8), 10);
      const hour = parseInt(time.slice(0, 2), 10);
      const minute = parseInt(time.slice(2, 4), 10);
      const second = parseInt(time.slice(4, 6) || "0", 10);

      if (cleanDate.endsWith("Z")) {
        return new Date(Date.UTC(year, month, day, hour, minute, second));
      }
      return new Date(year, month, day, hour, minute, second);
    }

    return new Date(dateStr);
  }

  private formatCalDavDate(date: Date): string {
    return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  }

  private unfoldICalLine(line: string): string {
    return line
      .replace(/\r?\n[ \t]/g, "")
      .replace(/\\n/g, "\n")
      .replace(/\\,/g, ",");
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private basicAuth(username: string, password: string): string {
    const credentials = Buffer.from(`${username}:${password}`).toString("base64");
    return `Basic ${credentials}`;
  }

  private parseCredentials(config: CalendarProviderConfig): {
    caldavUrl: string;
    username: string;
    password: string;
  } {
    const [username, password] = config.accessToken.split(":");
    const caldavUrl = config.refreshToken ?? "";

    return { caldavUrl, username, password };
  }

  private extractEmailFromCredentials(config: CalendarProviderConfig): string {
    const [username] = config.accessToken.split(":");
    return username.includes("@") ? username : `${username}@icloud.com`;
  }
}
