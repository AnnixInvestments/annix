import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { MeetingStatus, MeetingType } from "../entities";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurrenceEndType = "never" | "count" | "until";

export class RecurrenceOptionsDto {
  @ApiProperty({
    description: "Recurrence frequency",
    enum: ["daily", "weekly", "monthly", "yearly"],
  })
  @IsIn(["daily", "weekly", "monthly", "yearly"])
  frequency: RecurrenceFrequency;

  @ApiProperty({ description: "Interval between occurrences", example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({
    description: "Days of week for weekly recurrence (0=Sun, 1=Mon, ..., 6=Sat)",
    example: [1, 3, 5],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  byWeekDay?: number[];

  @ApiPropertyOptional({ description: "Day of month for monthly recurrence", example: 15 })
  @IsNumber()
  @IsOptional()
  byMonthDay?: number;

  @ApiProperty({ description: "How the recurrence ends", enum: ["never", "count", "until"] })
  @IsIn(["never", "count", "until"])
  endType: RecurrenceEndType;

  @ApiPropertyOptional({ description: "Number of occurrences (if endType is count)", example: 10 })
  @IsNumber()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: "End date (if endType is until)", example: "2025-12-31" })
  @IsDateString()
  @IsOptional()
  until?: string;
}

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
  isRecurring: boolean;

  @ApiPropertyOptional()
  recurrenceRule: string | null;

  @ApiPropertyOptional()
  recurringParentId: number | null;

  @ApiPropertyOptional()
  recurrenceExceptionDates: string | null;

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

export class RescheduleMeetingDto {
  @ApiProperty({ description: "New scheduled start time" })
  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string;

  @ApiProperty({ description: "New scheduled end time" })
  @IsDateString()
  @IsNotEmpty()
  scheduledEnd: string;

  @ApiPropertyOptional({ description: "Reason for rescheduling" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  rescheduleReason?: string;
}

export class CreateRecurringMeetingDto extends CreateMeetingDto {
  @ApiProperty({ description: "Recurrence options" })
  @ValidateNested()
  @Type(() => RecurrenceOptionsDto)
  recurrence: RecurrenceOptionsDto;
}

export type RecurrenceUpdateScope = "this" | "future" | "all";

export class UpdateRecurringMeetingDto extends UpdateMeetingDto {
  @ApiProperty({
    description: "Scope of update: this instance only, this and future, or all instances",
    enum: ["this", "future", "all"],
  })
  @IsIn(["this", "future", "all"])
  scope: RecurrenceUpdateScope;
}

export class DeleteRecurringMeetingDto {
  @ApiProperty({
    description: "Scope of deletion: this instance only, this and future, or all instances",
    enum: ["this", "future", "all"],
  })
  @IsIn(["this", "future", "all"])
  scope: RecurrenceUpdateScope;
}

export class RecurringMeetingInstanceDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  scheduledStart: Date;

  @ApiProperty()
  scheduledEnd: Date;

  @ApiProperty()
  isException: boolean;

  @ApiPropertyOptional()
  originalDate?: string;
}

export class CreateMeetingFromCalendarDto {
  @ApiPropertyOptional({
    description: "Override the calendar event title",
    example: "Discovery Call with John",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  overrideTitle?: string;

  @ApiPropertyOptional({
    description: "Additional attendees to add beyond calendar attendees",
    example: ["extra@example.com"],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalAttendees?: string[];

  @ApiPropertyOptional({ description: "Prospect ID to link to this meeting" })
  @IsNumber()
  @IsOptional()
  prospectId?: number;

  @ApiPropertyOptional({
    description: "Meeting type override",
    enum: MeetingType,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;
}

export class MeetingFromCalendarResponseDto extends MeetingResponseDto {
  @ApiProperty({ description: "Calendar provider (google, outlook, etc.)" })
  calendarProvider: string;

  @ApiPropertyOptional({ description: "Meeting URL from calendar event" })
  meetingUrl: string | null;
}
