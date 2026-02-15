import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CalendarProvider } from "../entities";

export class ConnectCalendarDto {
  @ApiProperty({
    description: "Calendar provider",
    enum: CalendarProvider,
  })
  @IsEnum(CalendarProvider)
  @IsNotEmpty()
  provider: CalendarProvider;

  @ApiProperty({ description: "OAuth authorization code" })
  @IsString()
  @IsNotEmpty()
  authCode: string;

  @ApiPropertyOptional({ description: "OAuth redirect URI used during auth" })
  @IsString()
  @IsOptional()
  redirectUri?: string;

  @ApiPropertyOptional({ description: "CalDAV URL (for Apple/CalDAV)" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caldavUrl?: string;
}

export class UpdateCalendarConnectionDto {
  @ApiPropertyOptional({ description: "List of calendar IDs to sync" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedCalendars?: string[];

  @ApiPropertyOptional({ description: "Set as primary calendar" })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CalendarConnectionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ enum: CalendarProvider })
  provider: CalendarProvider;

  @ApiProperty()
  accountEmail: string;

  @ApiPropertyOptional()
  accountName: string | null;

  @ApiProperty()
  syncStatus: string;

  @ApiPropertyOptional()
  lastSyncAt: Date | null;

  @ApiPropertyOptional()
  selectedCalendars: string[] | null;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class CalendarEventResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  connectionId: number;

  @ApiProperty()
  externalId: string;

  @ApiProperty({ enum: CalendarProvider })
  provider: CalendarProvider;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  isAllDay: boolean;

  @ApiPropertyOptional()
  location: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  attendees: string[] | null;

  @ApiPropertyOptional()
  meetingUrl: string | null;

  @ApiProperty()
  isRecurring: boolean;
}

export class CalendarListResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiPropertyOptional()
  color: string | null;
}

export class SyncCalendarDto {
  @ApiPropertyOptional({ description: "Force full sync instead of incremental" })
  @IsBoolean()
  @IsOptional()
  fullSync?: boolean;
}
