import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { MeetingType } from "../entities";

export class CustomQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({ enum: ["text", "textarea", "select"] })
  @IsString()
  type: "text" | "textarea" | "select";

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];
}

export class CreateBookingLinkDto {
  @ApiProperty({
    description: "Display name for the booking link",
    example: "30 Minute Discovery Call",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: "Meeting duration in minutes", default: 30 })
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  meetingDurationMinutes?: number;

  @ApiPropertyOptional({ description: "Buffer time before meeting in minutes", default: 0 })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional({ description: "Buffer time after meeting in minutes", default: 0 })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({
    description: "Available days (comma-separated: 0=Sun, 1=Mon, etc)",
    default: "1,2,3,4,5",
  })
  @IsString()
  @IsOptional()
  availableDays?: string;

  @ApiPropertyOptional({ description: "Start hour for availability (0-23)", default: 8 })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  availableStartHour?: number;

  @ApiPropertyOptional({ description: "End hour for availability (0-23)", default: 17 })
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  availableEndHour?: number;

  @ApiPropertyOptional({ description: "Maximum days ahead for booking", default: 30 })
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  maxDaysAhead?: number;

  @ApiPropertyOptional({ description: "Custom questions for booking form" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  @IsOptional()
  customQuestions?: CustomQuestionDto[];

  @ApiPropertyOptional({
    description: "Meeting type",
    enum: MeetingType,
    default: MeetingType.VIDEO,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ description: "Default meeting location" })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: "Description shown on booking page" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBookingLinkDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  meetingDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  bufferAfterMinutes?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  availableDays?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  availableStartHour?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  @IsOptional()
  availableEndHour?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  maxDaysAhead?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  @IsOptional()
  customQuestions?: CustomQuestionDto[];

  @ApiPropertyOptional()
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(500)
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class BookingLinkResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  meetingDurationMinutes: number;

  @ApiProperty()
  bufferBeforeMinutes: number;

  @ApiProperty()
  bufferAfterMinutes: number;

  @ApiProperty()
  availableDays: string;

  @ApiProperty()
  availableStartHour: number;

  @ApiProperty()
  availableEndHour: number;

  @ApiProperty()
  maxDaysAhead: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  customQuestions: CustomQuestionDto[] | null;

  @ApiProperty()
  meetingType: MeetingType;

  @ApiPropertyOptional()
  location: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ description: "Full booking URL" })
  bookingUrl: string;
}

export class PublicBookingLinkDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  meetingDurationMinutes: number;

  @ApiProperty()
  availableDays: string;

  @ApiProperty()
  availableStartHour: number;

  @ApiProperty()
  availableEndHour: number;

  @ApiProperty()
  maxDaysAhead: number;

  @ApiPropertyOptional()
  customQuestions: CustomQuestionDto[] | null;

  @ApiProperty()
  meetingType: MeetingType;

  @ApiPropertyOptional()
  location: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ description: "Host name" })
  hostName: string;
}

export class AvailableSlotDto {
  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;
}

export class BookSlotDto {
  @ApiProperty({ description: "Selected slot start time (ISO)" })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: "Booker's name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: "Booker's email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: "Answers to custom questions" })
  @IsObject()
  @IsOptional()
  customAnswers?: Record<string, string>;
}

export class BookingConfirmationDto {
  @ApiProperty()
  meetingId: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  meetingType: MeetingType;

  @ApiPropertyOptional()
  location: string | null;

  @ApiProperty()
  hostName: string;

  @ApiProperty()
  hostEmail: string;
}
