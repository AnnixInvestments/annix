import { Meeting } from "./meeting.entity";

export enum RecordingProcessingStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  PROCESSING = "processing",
  TRANSCRIBING = "transcribing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface SpeakerSegment {
  startTime: number;
  endTime: number;
  speakerLabel: string;
  confidence: number | null;
}

export class MeetingRecording {
  id: number;

  meeting: Meeting;

  meetingId: number;

  storagePath: string;

  storageBucket: string;

  originalFilename: string | null;

  mimeType: string;

  fileSizeBytes: number;

  durationSeconds: number | null;

  sampleRate: number;

  channels: number;

  processingStatus: RecordingProcessingStatus;

  processingError: string | null;

  speakerSegments: SpeakerSegment[] | null;

  detectedSpeakersCount: number | null;

  speakerLabels: Record<string, string> | null;

  createdAt: Date;

  updatedAt: Date;
}
