import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  MeetingListing,
  MeetingProvider,
  NormalizedActionItem,
  NormalizedMeeting,
} from "./meeting-provider.interface";

// Fathom meeting-import provider.
//
// Auth: a REST API key from Fathom account settings (User Settings → API Access),
// sent as the `X-Api-Key` header. Field mapping below was confirmed against the
// live `GET /external/v1/meetings` response:
//   { items: [ { recording_id, title, meeting_title, url, share_url,
//                scheduled_start_time, recording_start_time, created_at,
//                transcript: [{ speaker: { display_name }, text, timestamp }],
//                default_summary: { markdown_formatted },
//                action_items, calendar_invitees: [{ name, email }] } ],
//     next_cursor, limit }
//
// Note: Fathom has no "get one meeting by id" endpoint — a single meeting is
// retrieved by listing (with include flags) and matching its recording_id.
// Heavy reads (include_summary / include_transcript) are rate-limited to ~30/min.
const DEFAULT_BASE_URL = "https://api.fathom.ai/external/v1";

// How many pages of /meetings to scan when resolving one meeting by id/url.
// Board meetings being imported are recent, so they land on the first page(s).
const MAX_LOOKUP_PAGES = 5;

type FathomRecord = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

const firstStr = (obj: FathomRecord, keys: string[]): string | null => {
  for (const k of keys) {
    const v = str(obj[k]);
    if (v) return v;
  }
  return null;
};

@Injectable()
export class FathomProvider implements MeetingProvider {
  readonly name = "fathom" as const;
  private readonly logger = new Logger(FathomProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("FATHOM_API_KEY") || "";
    this.baseUrl = (this.configService.get<string>("FATHOM_BASE_URL") || DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private async getMeetingsPage(params: Record<string, string>): Promise<{
    items: FathomRecord[];
    nextCursor: string | null;
  }> {
    if (!this.isConfigured()) {
      throw new Error("Fathom is not configured — set FATHOM_API_KEY");
    }
    const url = new URL(`${this.baseUrl}/meetings`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-Api-Key": this.apiKey, Accept: "application/json" },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Fathom API ${response.status}: ${body.slice(0, 300)}`);
    }
    const payload = (await response.json()) as FathomRecord;
    const items = Array.isArray(payload.items) ? (payload.items as FathomRecord[]) : [];
    const nextCursor = str(payload.next_cursor);
    return { items, nextCursor };
  }

  async listMeetings(_options?: { limit?: number }): Promise<MeetingListing[]> {
    // Light listing (no transcript/summary payload) for the import picker.
    const { items } = await this.getMeetingsPage({});
    return items.map((m) => ({
      externalId: this.externalId(m),
      provider: this.name,
      title: firstStr(m, ["title", "meeting_title"]) ?? "Untitled meeting",
      meetingDate: firstStr(m, ["scheduled_start_time", "recording_start_time", "created_at"]),
      recordingUrl: firstStr(m, ["share_url", "url"]),
      hasTranscript: m.recording_id != null,
    }));
  }

  async getMeeting(ref: { externalId?: string; url?: string }): Promise<NormalizedMeeting> {
    const targetId = ref.externalId ?? this.idFromUrl(ref.url);
    if (!targetId) {
      throw new Error("A Fathom meeting id or recording URL is required");
    }
    // No get-by-id endpoint: scan recent meetings (with summary + transcript)
    // for the matching recording_id.
    let cursor: string | null = null;
    for (let page = 0; page < MAX_LOOKUP_PAGES; page += 1) {
      const params: Record<string, string> = {
        include_summary: "true",
        include_transcript: "true",
      };
      if (cursor) params.cursor = cursor;
      const { items, nextCursor } = await this.getMeetingsPage(params);
      const match = items.find((m) => this.externalId(m) === targetId);
      if (match) {
        return this.normalize(match);
      }
      if (!nextCursor) break;
      cursor = nextCursor;
    }
    throw new Error(
      `Fathom meeting ${targetId} not found in recent recordings — it may be older than the lookup window`,
    );
  }

  private externalId(m: FathomRecord): string {
    return String(m.recording_id ?? firstStr(m, ["id", "external_id"]) ?? "");
  }

  private idFromUrl(url?: string): string | null {
    if (!url) return null;
    // e.g. https://fathom.video/calls/726865299 (recording id) or /share/<token>
    const calls = url.match(/\/calls\/([0-9]+)/);
    if (calls) return calls[1];
    const other = url.match(/\/(?:share|recordings)\/([^/?#]+)/i);
    return other ? other[1] : null;
  }

  private normalize(m: FathomRecord): NormalizedMeeting {
    return {
      externalId: this.externalId(m),
      provider: this.name,
      title: firstStr(m, ["title", "meeting_title"]) ?? "Untitled meeting",
      meetingDate: firstStr(m, ["scheduled_start_time", "recording_start_time", "created_at"]),
      attendees: this.parseAttendees(m),
      summary: this.parseSummary(m),
      transcript: this.parseTranscript(m),
      actionItems: this.parseActionItems(m),
      recordingUrl: firstStr(m, ["share_url", "url"]),
    };
  }

  private parseAttendees(m: FathomRecord): string[] {
    const raw = m.calendar_invitees;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((a) => firstStr(a as FathomRecord, ["name", "email"]))
      .filter((a): a is string => Boolean(a));
  }

  private parseSummary(m: FathomRecord): string | null {
    const s = m.default_summary;
    if (typeof s === "string") return str(s);
    if (s && typeof s === "object") {
      return firstStr(s as FathomRecord, ["markdown_formatted", "markdown", "text"]);
    }
    return null;
  }

  // The transcript is an array of { speaker: { display_name }, text, timestamp }.
  private parseTranscript(m: FathomRecord): string | null {
    const t = m.transcript;
    if (typeof t === "string") return str(t);
    if (!Array.isArray(t) || t.length === 0) return null;
    const lines = t
      .map((seg) => {
        const rec = seg as FathomRecord;
        const speaker =
          firstStr(rec, ["speaker_name"]) ??
          (rec.speaker && typeof rec.speaker === "object"
            ? firstStr(rec.speaker as FathomRecord, ["display_name", "name"])
            : null);
        const text = firstStr(rec, ["text", "content"]);
        if (!text) return null;
        return speaker ? `${speaker}: ${text}` : text;
      })
      .filter(Boolean);
    return lines.length > 0 ? lines.join("\n") : null;
  }

  private parseActionItems(m: FathomRecord): NormalizedActionItem[] {
    const raw = m.action_items;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((a) => {
        if (typeof a === "string") return { description: a, owner: null, dueDate: null };
        const rec = a as FathomRecord;
        const description = firstStr(rec, ["description", "text", "title"]);
        if (!description) return null;
        const assignee =
          rec.assignee && typeof rec.assignee === "object" ? (rec.assignee as FathomRecord) : null;
        return {
          description,
          owner:
            firstStr(rec, ["owner", "assigned_to"]) ??
            (assignee ? firstStr(assignee, ["name", "email"]) : null),
          dueDate: firstStr(rec, ["due_date", "deadline"]),
        };
      })
      .filter((a): a is NormalizedActionItem => Boolean(a));
  }
}
