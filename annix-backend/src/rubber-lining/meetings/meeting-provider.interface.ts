// Provider-agnostic meeting-import layer.
//
// Board Meetings can be imported from any meeting platform (Fathom today; Zoom,
// Microsoft Teams, Google Meet, Otter, Fireflies… later) behind this one
// interface. Each provider normalises its own API into NormalizedMeeting so the
// rest of the system — storage, AI minutes, agenda generation, the UI — never
// has to know which platform a meeting came from.
//
// To add a provider: implement MeetingProvider, give it a unique `name`, and
// register it in MeetingProviderRegistry. Nothing downstream changes.

export type MeetingProviderName =
  | "fathom"
  | "zoom"
  | "teams"
  | "google-meet"
  | "otter"
  | "fireflies";

export interface NormalizedActionItem {
  description: string;
  owner: string | null;
  dueDate: string | null;
}

export interface NormalizedMeeting {
  // Stable id of the meeting WITHIN the provider (used to dedupe re-imports).
  externalId: string;
  provider: MeetingProviderName;
  title: string;
  // ISO date-time the meeting took place.
  meetingDate: string | null;
  attendees: string[];
  // The provider's own AI summary, if any (plain text or markdown).
  summary: string | null;
  // Full transcript text, if available — the raw material for AI minutes.
  transcript: string | null;
  actionItems: NormalizedActionItem[];
  // Link back to the recording/share page on the provider.
  recordingUrl: string | null;
}

// A lightweight listing entry (no heavy transcript payload) for the
// "pick a meeting to import" screen.
export interface MeetingListing {
  externalId: string;
  provider: MeetingProviderName;
  title: string;
  meetingDate: string | null;
  recordingUrl: string | null;
  hasTranscript: boolean;
}

export interface MeetingProvider {
  readonly name: MeetingProviderName;

  // Whether this provider is configured (has credentials) and usable.
  isConfigured(): boolean;

  // List recent meetings available to import (no transcript payload).
  listMeetings(options?: { limit?: number }): Promise<MeetingListing[]>;

  // Fetch one meeting in full (summary + transcript + action items), either by
  // the provider's externalId or by a pasted recording/share URL.
  getMeeting(ref: { externalId?: string; url?: string }): Promise<NormalizedMeeting>;
}
