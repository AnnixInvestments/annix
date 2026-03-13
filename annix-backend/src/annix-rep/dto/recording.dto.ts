import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import type { SpeakerSegment } from "../entities";

export class InitiateUploadDto {
  @ApiProperty({ description: "Meeting ID to associate recording with" })
  @IsNumber()
  @IsNotEmpty()
  meetingId: number;

  @ApiProperty({ description: "Original filename", example: "meeting-recording.webm" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({ description: "MIME type", example: "audio/webm" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @ApiPropertyOptional({ description: "Sample rate in Hz", default: 16000 })
  @IsNumber()
  @IsOptional()
  sampleRate?: number;

  @ApiPropertyOptional({ description: "Number of audio channels", default: 1 })
  @IsNumber()
  @IsOptional()
  channels?: number;
}

export class InitiateUploadResponseDto {
  @ApiProperty()
  recordingId: number;

  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  uploadMethod: "PUT" | "POST";

  @ApiPropertyOptional()
  uploadHeaders: Record<string, string> | null;

  @ApiProperty({ description: "Expiry time for presigned URL" })
  expiresAt: Date;
}

export class CompleteUploadDto {
  @ApiProperty({ description: "File size in bytes" })
  @IsNumber()
  @IsNotEmpty()
  fileSizeBytes: number;

  @ApiPropertyOptional({ description: "Duration in seconds" })
  @IsNumber()
  @IsOptional()
  durationSeconds?: number;
}

export class UpdateSpeakerLabelsDto {
  @ApiProperty({ description: "Speaker label mappings", example: { "Speaker 1": "John Smith" } })
  @IsObject()
  @IsNotEmpty()
  speakerLabels: Record<string, string>;
}

export class RecordingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  meetingId: number;

  @ApiProperty()
  processingStatus: string;

  @ApiPropertyOptional()
  originalFilename: string | null;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSizeBytes: number;

  @ApiPropertyOptional()
  durationSeconds: number | null;

  @ApiProperty()
  sampleRate: number;

  @ApiProperty()
  channels: number;

  @ApiPropertyOptional()
  detectedSpeakersCount: number | null;

  @ApiPropertyOptional()
  speakerLabels: Record<string, string> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RecordingWithSegmentsDto extends RecordingResponseDto {
  @ApiPropertyOptional()
  speakerSegments: SpeakerSegment[] | null;
}

export class TranscriptResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  recordingId: number;

  @ApiProperty()
  fullText: string;

  @ApiProperty()
  wordCount: number;

  @ApiPropertyOptional()
  summary: string | null;

  @ApiPropertyOptional()
  analysis: {
    topics: string[];
    questions: string[];
    objections: string[];
    actionItems: Array<{
      task: string;
      assignee: string | null;
      dueDate: string | null;
      extracted: boolean;
    }>;
    keyPoints: string[];
    sentiment: string | null;
    sentimentScore: number | null;
  } | null;

  @ApiPropertyOptional()
  whisperModel: string | null;

  @ApiProperty()
  language: string;

  @ApiPropertyOptional()
  processingTimeMs: number | null;

  @ApiProperty()
  createdAt: Date;
}

export class TranscriptWithSegmentsDto extends TranscriptResponseDto {
  @ApiProperty()
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    speakerLabel: string;
    confidence: number | null;
  }>;
}

export class UpdateTranscriptSegmentDto {
  @ApiProperty({ description: "Index of segment to update" })
  @IsNumber()
  @IsNotEmpty()
  index: number;

  @ApiPropertyOptional({ description: "Updated speaker label" })
  @IsString()
  @IsOptional()
  speakerLabel?: string;

  @ApiPropertyOptional({ description: "Updated segment text" })
  @IsString()
  @IsOptional()
  text?: string;
}

export class UpdateTranscriptDto {
  @ApiProperty({ description: "Array of segment updates", type: [UpdateTranscriptSegmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTranscriptSegmentDto)
  segments: UpdateTranscriptSegmentDto[];
}
