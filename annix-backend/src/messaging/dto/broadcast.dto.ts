import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { BroadcastPriority, BroadcastTarget } from "../entities";

export class CreateBroadcastDto {
  @ApiProperty({
    description: "Broadcast title",
    example: "System Maintenance Notice",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: "Broadcast content",
    example: "We will be performing scheduled maintenance on Saturday from 2:00 AM to 4:00 AM.",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: "Target audience",
    enum: BroadcastTarget,
    default: BroadcastTarget.ALL,
  })
  @IsEnum(BroadcastTarget)
  @IsOptional()
  targetAudience?: BroadcastTarget;

  @ApiPropertyOptional({
    description: "Specific user IDs (when targetAudience is SPECIFIC)",
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  specificUserIds?: number[];

  @ApiPropertyOptional({
    description: "Priority level",
    enum: BroadcastPriority,
    default: BroadcastPriority.NORMAL,
  })
  @IsEnum(BroadcastPriority)
  @IsOptional()
  priority?: BroadcastPriority;

  @ApiPropertyOptional({
    description: "Expiration date (ISO string)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Whether to send email notifications",
    example: true,
  })
  @IsOptional()
  sendEmail?: boolean;
}

export class BroadcastFilterDto {
  @ApiPropertyOptional({
    description: "Include expired broadcasts",
    example: false,
  })
  @IsOptional()
  includeExpired?: boolean;

  @ApiPropertyOptional({
    description: "Filter by priority",
    enum: BroadcastPriority,
  })
  @IsEnum(BroadcastPriority)
  @IsOptional()
  priority?: BroadcastPriority;

  @ApiPropertyOptional({
    description: "Only show unread",
    example: true,
  })
  @IsOptional()
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class BroadcastSummaryDto {
  @ApiProperty({ description: "Broadcast ID" })
  id: number;

  @ApiProperty({ description: "Title" })
  title: string;

  @ApiProperty({ description: "Content preview (first 200 chars)" })
  contentPreview: string;

  @ApiProperty({ description: "Target audience" })
  targetAudience: BroadcastTarget;

  @ApiProperty({ description: "Priority" })
  priority: BroadcastPriority;

  @ApiPropertyOptional({ description: "Expiration date" })
  expiresAt: Date | null;

  @ApiProperty({ description: "Is read by current user" })
  isRead: boolean;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;

  @ApiProperty({ description: "Sent by name" })
  sentByName: string;
}

export class BroadcastDetailDto extends BroadcastSummaryDto {
  @ApiProperty({ description: "Full content" })
  content: string;

  @ApiProperty({ description: "Total recipients count" })
  totalRecipients: number;

  @ApiProperty({ description: "Read count" })
  readCount: number;

  @ApiProperty({ description: "Email sent count" })
  emailSentCount: number;
}
