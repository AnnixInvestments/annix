import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { MeetingStatus, MeetingType } from "../entities";

export class CreateMeetingDto {
  @ApiPropertyOptional({ description: "Prospect ID" })
  @IsNumber()
  @IsOptional()
  prospectId?: number;

  @ApiProperty({ description: "Meeting title", example: "Initial Discovery Call" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: "Meeting description" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Meeting type",
    enum: MeetingType,
    default: MeetingType.IN_PERSON,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiProperty({ description: "Scheduled start time" })
  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string;

  @ApiProperty({ description: "Scheduled end time" })
  @IsDateString()
  @IsNotEmpty()
  scheduledEnd: string;

  @ApiPropertyOptional({ description: "Meeting location" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: "Location latitude" })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: "Location longitude" })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: "List of attendee emails", example: ["john@acme.com"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendees?: string[];

  @ApiPropertyOptional({ description: "Meeting agenda" })
  @IsString()
  @IsOptional()
  agenda?: string;
}

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {
  @ApiPropertyOptional({
    description: "Meeting status",
    enum: MeetingStatus,
  })
  @IsEnum(MeetingStatus)
  @IsOptional()
  status?: MeetingStatus;

  @ApiPropertyOptional({ description: "Meeting notes" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Meeting outcomes" })
  @IsString()
  @IsOptional()
  outcomes?: string;

  @ApiPropertyOptional({ description: "Action items from meeting" })
  @IsArray()
  @IsOptional()
  actionItems?: Array<{ task: string; assignee: string | null; dueDate: string | null }>;
}

export class StartMeetingDto {
  @ApiPropertyOptional({ description: "Actual start time (defaults to now)" })
  @IsDateString()
  @IsOptional()
  actualStart?: string;
}

export class EndMeetingDto {
  @ApiPropertyOptional({ description: "Actual end time (defaults to now)" })
  @IsDateString()
  @IsOptional()
  actualEnd?: string;

  @ApiPropertyOptional({ description: "Meeting notes" })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: "Meeting outcomes" })
  @IsString()
  @IsOptional()
  outcomes?: string;

  @ApiPropertyOptional({ description: "Action items" })
  @IsArray()
  @IsOptional()
  actionItems?: Array<{ task: string; assignee: string | null; dueDate: string | null }>;
}

export class MeetingResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional()
  prospectId: number | null;

  @ApiProperty()
  salesRepId: number;

  @ApiPropertyOptional()
  calendarEventId: number | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: MeetingType })
  meetingType: MeetingType;

  @ApiProperty({ enum: MeetingStatus })
  status: MeetingStatus;

  @ApiProperty()
  scheduledStart: Date;

  @ApiProperty()
  scheduledEnd: Date;

  @ApiPropertyOptional()
  actualStart: Date | null;

  @ApiPropertyOptional()
  actualEnd: Date | null;

  @ApiPropertyOptional()
  location: string | null;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiPropertyOptional()
  attendees: string[] | null;

  @ApiPropertyOptional()
  agenda: string | null;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  outcomes: string | null;

  @ApiPropertyOptional()
  actionItems: Array<{ task: string; assignee: string | null; dueDate: string | null }> | null;

  @ApiProperty()
  summarySent: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MeetingWithDetailsDto extends MeetingResponseDto {
  @ApiPropertyOptional({ description: "Associated prospect" })
  prospect?: {
    id: number;
    companyName: string;
    contactName: string | null;
  } | null;

  @ApiPropertyOptional({ description: "Recording status" })
  recording?: {
    id: number;
    processingStatus: string;
    durationSeconds: number | null;
  } | null;

  @ApiPropertyOptional({ description: "Transcript summary" })
  transcript?: {
    id: number;
    summary: string | null;
    wordCount: number;
  } | null;
}

export class SendSummaryDto {
  @ApiProperty({
    description: "List of recipient email addresses",
    example: ["client@example.com"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  recipientEmails: string[];

  @ApiPropertyOptional({
    description: "Map of email to recipient name",
    example: { "client@example.com": "John Smith" },
  })
  @IsObject()
  @IsOptional()
  recipientNames?: Record<string, string>;

  @ApiPropertyOptional({ description: "Include link to transcript in email", default: true })
  @IsOptional()
  includeTranscriptLink?: boolean;

  @ApiPropertyOptional({ description: "Custom message to include in email" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  customMessage?: string;
}

export class MeetingSummaryDto {
  @ApiProperty()
  overview: string;

  @ApiProperty()
  keyPoints: string[];

  @ApiProperty()
  actionItems: Array<{
    task: string;
    assignee: string | null;
    dueDate: string | null;
  }>;

  @ApiProperty()
  nextSteps: string[];

  @ApiProperty()
  topics: string[];

  @ApiPropertyOptional()
  sentiment?: string;
}

export class SummaryPreviewDto {
  @ApiProperty()
  summary: MeetingSummaryDto;

  @ApiProperty()
  meeting: {
    title: string;
    date: string;
    duration: string;
    attendees: string[];
    companyName: string | null;
  };
}

export class SendSummaryResultDto {
  @ApiProperty()
  sent: string[];

  @ApiProperty()
  failed: string[];
}
