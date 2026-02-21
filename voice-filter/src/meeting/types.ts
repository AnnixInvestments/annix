export interface MeetingAttendee {
  id: string;
  name: string;
  title: string;
  email: string | null;
  enrolledAt: string | null;
  profilePath: string | null;
  matchedProfileId: string | null;
}

export type MeetingStatus = "setup" | "enrolling" | "active" | "paused" | "ended";

export interface MeetingSessionData {
  id: string;
  title: string;
  attendees: MeetingAttendee[];
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  currentAttendeeIndex: number;
  calendarEventId: number | null;
  calendarProvider: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  meetingUrl: string | null;
}

export interface TranscriptEntry {
  timestamp: string;
  speakerId: string | null;
  speakerName: string;
  text: string;
  confidence: number;
}

export interface SpeakerIdentification {
  speakerId: string | null;
  speakerName: string;
  confidence: number;
  timestamp: string;
}

export interface MeetingExport {
  session: MeetingSessionData;
  transcript: TranscriptEntry[];
  duration: number;
}

export interface EnrollmentProgress {
  attendeeId: string;
  attendeeName: string;
  percentComplete: number;
  speechDurationMs: number;
  requiredMs: number;
  isSpeech: boolean;
}

export interface MeetingConfig {
  speakerIdentificationThreshold: number;
  minEnrollmentDurationMs: number;
  transcriptionEnabled: boolean;
}

export const DEFAULT_MEETING_CONFIG: MeetingConfig = {
  speakerIdentificationThreshold: 0.65,
  minEnrollmentDurationMs: 10000,
  transcriptionEnabled: true,
};
