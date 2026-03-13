import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import {
  type TeamsBotParticipant,
  TeamsBotSessionStatus,
  type TeamsBotTranscriptEntry,
} from "../entities/teams-bot-session.entity";

export class JoinTeamsMeetingDto {
  @ApiProperty({ description: "Teams meeting URL to join" })
  @IsUrl()
  @IsNotEmpty()
  meetingUrl: string;

  @ApiPropertyOptional({ description: "Optional meeting ID to link this session to" })
  @IsNumber()
  @IsOptional()
  meetingId?: number;

  @ApiPropertyOptional({ description: "Custom display name for the bot in the meeting" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  botDisplayName?: string;
}

export class LeaveTeamsMeetingDto {
  @ApiProperty({ description: "Session ID of the bot to leave the meeting" })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class TeamsBotSessionResponseDto {
  @ApiProperty({ description: "Database ID" })
  id: number;

  @ApiProperty({ description: "Unique session identifier" })
  sessionId: string;

  @ApiProperty({ description: "User ID who initiated the session" })
  userId: number;

  @ApiPropertyOptional({ description: "Linked meeting ID" })
  meetingId: number | null;

  @ApiProperty({ description: "Teams meeting URL" })
  meetingUrl: string;

  @ApiProperty({ description: "Current session status", enum: TeamsBotSessionStatus })
  status: TeamsBotSessionStatus;

  @ApiProperty({ description: "Bot display name in the meeting" })
  botDisplayName: string;

  @ApiPropertyOptional({ description: "Error message if failed" })
  errorMessage: string | null;

  @ApiPropertyOptional({ description: "Meeting participants" })
  participants: TeamsBotParticipant[] | null;

  @ApiProperty({ description: "Number of participants" })
  participantCount: number;

  @ApiProperty({ description: "Number of transcript entries" })
  transcriptEntryCount: number;

  @ApiPropertyOptional({ description: "When the meeting session started" })
  startedAt: string | null;

  @ApiPropertyOptional({ description: "When the meeting session ended" })
  endedAt: string | null;

  @ApiProperty({ description: "When the session was created" })
  createdAt: string;
}

export class TeamsBotTranscriptResponseDto {
  @ApiProperty({ description: "Session ID" })
  sessionId: string;

  @ApiProperty({ description: "Transcript entries" })
  entries: TeamsBotTranscriptEntry[];

  @ApiProperty({ description: "Total entry count" })
  totalCount: number;
}

export class TeamsBotParticipantUpdateDto {
  @ApiProperty({ description: "Type of participant change" })
  type: "joined" | "left";

  @ApiProperty({ description: "Participant details" })
  participant: TeamsBotParticipant;
}

export class TeamsBotTranscriptUpdateDto {
  @ApiProperty({ description: "New transcript entry" })
  entry: TeamsBotTranscriptEntry;
}

export class TeamsBotStatusUpdateDto {
  @ApiProperty({ description: "Session ID" })
  sessionId: string;

  @ApiProperty({ description: "New status", enum: TeamsBotSessionStatus })
  status: TeamsBotSessionStatus;

  @ApiPropertyOptional({ description: "Error message if failed" })
  errorMessage?: string;
}
