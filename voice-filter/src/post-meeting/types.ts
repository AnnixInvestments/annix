import type { CalendarProvider } from "../calendar/types.js";

export type PostMeetingStatus =
  | "pending"
  | "detecting_end"
  | "fetching_recording"
  | "transcribing"
  | "generating_summary"
  | "sending_email"
  | "completed"
  | "failed"
  | "skipped";

export type RecordingPlatform = "zoom" | "teams" | "meet";

export interface PostMeetingJob {
  id: number;
  userId: number;
  calendarEventId: number;
  meetingSessionId: string | null;
  provider: CalendarProvider;
  status: PostMeetingStatus;
  scheduledEndTime: string;
  actualEndTime: string | null;
  recordingUrl: string | null;
  recordingPath: string | null;
  transcriptPath: string | null;
  summaryPath: string | null;
  emailSentAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordingMetadata {
  platform: RecordingPlatform;
  meetingId: string;
  recordingId: string;
  downloadUrl: string;
  duration: number;
  fileSize: number;
  recordedAt: string;
  participants: string[];
}

export interface MeetingSummary {
  title: string;
  date: string;
  duration: string;
  attendees: MeetingSummaryAttendee[];
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextSteps: string[];
  fullTranscript: string;
}

export interface MeetingSummaryAttendee {
  name: string;
  email: string | null;
  speakingTime: number;
  contributions: number;
}

export interface ActionItem {
  description: string;
  assignee: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
}

export interface EmailOptions {
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface PostMeetingConfig {
  enableAutoDetection: boolean;
  enableRecordingFetch: boolean;
  enableTranscription: boolean;
  enableSummary: boolean;
  enableEmailSummary: boolean;
  detectionIntervalMs: number;
  endDetectionGraceMinutes: number;
  maxRetries: number;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromAddress: string | null;
  openaiApiKey: string | null;
}

export const DEFAULT_POST_MEETING_CONFIG: PostMeetingConfig = {
  enableAutoDetection: true,
  enableRecordingFetch: true,
  enableTranscription: true,
  enableSummary: true,
  enableEmailSummary: true,
  detectionIntervalMs: 60000,
  endDetectionGraceMinutes: 5,
  maxRetries: 3,
  smtpHost: null,
  smtpPort: 587,
  smtpUser: null,
  smtpPassword: null,
  smtpFromAddress: null,
  openaiApiKey: null,
};

export interface IRecordingProvider {
  platform: RecordingPlatform;

  checkMeetingEnded(
    credentials: { accessToken: string; refreshToken?: string },
    meetingId: string,
  ): Promise<{ ended: boolean; endTime: string | null }>;

  listRecordings(
    credentials: { accessToken: string; refreshToken?: string },
    meetingId: string,
  ): Promise<RecordingMetadata[]>;

  downloadRecording(
    credentials: { accessToken: string; refreshToken?: string },
    recording: RecordingMetadata,
    outputPath: string,
  ): Promise<string>;
}
