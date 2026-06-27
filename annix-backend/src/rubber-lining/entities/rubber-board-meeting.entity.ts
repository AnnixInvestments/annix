import type { MeetingProviderName } from "../meetings/meeting-provider.interface";

export enum BoardMeetingMinutesStatus {
  NONE = "NONE",
  GENERATED = "GENERATED",
  FAILED = "FAILED",
}

export interface BoardMeetingActionItem {
  description: string;
  owner: string | null;
  dueDate: string | null;
}

// Structured board minutes produced by Nix from the meeting transcript/summary.
export interface BoardMeetingMinutes {
  attendees: string[];
  apologies: string[];
  agendaItems: string[];
  decisions: string[];
  actionItems: BoardMeetingActionItem[];
  mattersArising: string[];
  risksAndCompliance: string[];
  financialHighlights: string[];
  nextSteps: string[];
  generatedAt: string;
}

export class RubberBoardMeeting {
  id: number;

  title: string;

  meetingDate: Date | null;

  // Which platform this meeting was imported from (fathom, zoom, teams…).
  provider: MeetingProviderName;

  // The meeting's id within that provider — used to prevent re-importing the
  // same meeting twice.
  externalId: string | null;

  recordingUrl: string | null;

  attendees: string[];

  // The provider's own AI summary, kept as-is for reference.
  providerSummary: string | null;

  // Transcripts can be large, so the raw text is stored in object storage and
  // only the key is kept here.
  transcriptPath: string | null;

  // Nix-generated structured board minutes (null until generated).
  minutes: BoardMeetingMinutes | null;

  minutesStatus: BoardMeetingMinutesStatus;

  createdBy: string | null;

  createdAt: Date;

  updatedAt: Date;
}
