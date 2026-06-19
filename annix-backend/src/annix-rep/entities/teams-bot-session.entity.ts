import { User } from "../../user/entities/user.entity";
import { Meeting } from "./meeting.entity";

export enum TeamsBotSessionStatus {
  JOINING = "joining",
  ACTIVE = "active",
  LEAVING = "leaving",
  ENDED = "ended",
  FAILED = "failed",
}

export interface TeamsBotParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface TeamsBotTranscriptEntry {
  timestamp: string;
  speakerId: string | null;
  speakerName: string;
  text: string;
  confidence: number;
}

export class TeamsBotSession {
  id: number;

  user: User;

  userId: number;

  meeting: Meeting | null;

  meetingId: number | null;

  sessionId: string;

  callId: string | null;

  meetingUrl: string;

  meetingThreadId: string | null;

  meetingOrganizerId: string | null;

  status: TeamsBotSessionStatus;

  botDisplayName: string;

  errorMessage: string | null;

  participants: TeamsBotParticipant[] | null;

  participantCount: number;

  transcriptEntries: TeamsBotTranscriptEntry[];

  transcriptEntryCount: number;

  startedAt: Date | null;

  endedAt: Date | null;

  lastActivityAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
