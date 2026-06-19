import { Meeting } from "./meeting.entity";
import { PlatformRecordingStatus } from "./meeting-platform.enums";
import { MeetingPlatformConnection } from "./meeting-platform-connection.entity";

export { PlatformRecordingStatus };

export interface PlatformMeetingRawData {
  uuid?: string;
  id?: string | number;
  type?: number;
  timezone?: string;
  created_at?: string;
  share_url?: string;
  [key: string]: unknown;
}

export interface PlatformRecordingRawData {
  id?: string;
  file_id?: string;
  file_type?: string;
  file_extension?: string;
  file_size?: number;
  play_url?: string;
  download_url?: string;
  recording_start?: string;
  recording_end?: string;
  [key: string]: unknown;
}

export class PlatformMeetingRecord {
  id: number;

  connection: MeetingPlatformConnection;

  connectionId: number;

  meeting: Meeting | null;

  meetingId: number | null;

  platformMeetingId: string;

  platformRecordingId: string | null;

  title: string;

  topic: string | null;

  hostEmail: string | null;

  startTime: Date;

  endTime: Date | null;

  durationSeconds: number | null;

  recordingUrl: string | null;

  recordingPassword: string | null;

  recordingFileType: string | null;

  recordingFileSizeBytes: number | null;

  s3StoragePath: string | null;

  s3StorageBucket: string | null;

  recordingStatus: PlatformRecordingStatus;

  recordingError: string | null;

  participants: string[] | null;

  participantCount: number | null;

  joinUrl: string | null;

  rawMeetingData: PlatformMeetingRawData | null;

  rawRecordingData: PlatformRecordingRawData | null;

  fetchedAt: Date | null;

  downloadedAt: Date | null;

  processedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
