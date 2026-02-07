import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional } from "class-validator";
import { ResponseRating } from "../entities";

export class MetricsFilterDto {
  @ApiPropertyOptional({
    description: "Start date for metrics period",
    example: "2025-01-01",
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for metrics period",
    example: "2025-12-31",
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: "User ID to filter by",
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  userId?: number;
}

export class RatingBreakdownDto {
  @ApiProperty({ description: "Excellent count" })
  excellent: number;

  @ApiProperty({ description: "Good count" })
  good: number;

  @ApiProperty({ description: "Acceptable count" })
  acceptable: number;

  @ApiProperty({ description: "Poor count" })
  poor: number;

  @ApiProperty({ description: "Critical count" })
  critical: number;
}

export class UserResponseStatsDto {
  @ApiProperty({ description: "User ID" })
  userId: number;

  @ApiProperty({ description: "User name" })
  userName: string;

  @ApiProperty({ description: "Total responses" })
  totalResponses: number;

  @ApiProperty({ description: "Average response time in minutes" })
  averageResponseTimeMinutes: number;

  @ApiProperty({ description: "SLA compliance percentage" })
  slaCompliancePercent: number;

  @ApiProperty({ description: "Rating breakdown" })
  ratingBreakdown: RatingBreakdownDto;

  @ApiProperty({ description: "Overall rating" })
  overallRating: ResponseRating;
}

export class ResponseMetricsSummaryDto {
  @ApiProperty({ description: "Total messages requiring response" })
  totalMessagesRequiringResponse: number;

  @ApiProperty({ description: "Total responses" })
  totalResponses: number;

  @ApiProperty({ description: "Average response time in minutes" })
  averageResponseTimeMinutes: number;

  @ApiProperty({ description: "SLA compliance percentage" })
  slaCompliancePercent: number;

  @ApiProperty({ description: "Rating breakdown" })
  ratingBreakdown: RatingBreakdownDto;

  @ApiProperty({
    description: "Top performers",
    type: [UserResponseStatsDto],
  })
  topPerformers: UserResponseStatsDto[];

  @ApiProperty({
    description: "Users needing attention (low SLA compliance)",
    type: [UserResponseStatsDto],
  })
  usersNeedingAttention: UserResponseStatsDto[];
}

export class UpdateSlaConfigDto {
  @ApiPropertyOptional({
    description: "Response time in hours for SLA",
    example: 24,
  })
  @IsNumber()
  @IsOptional()
  responseTimeHours?: number;

  @ApiPropertyOptional({
    description: "Hours threshold for Excellent rating",
    example: 4,
  })
  @IsNumber()
  @IsOptional()
  excellentThresholdHours?: number;

  @ApiPropertyOptional({
    description: "Hours threshold for Good rating",
    example: 12,
  })
  @IsNumber()
  @IsOptional()
  goodThresholdHours?: number;

  @ApiPropertyOptional({
    description: "Hours threshold for Acceptable rating",
    example: 24,
  })
  @IsNumber()
  @IsOptional()
  acceptableThresholdHours?: number;

  @ApiPropertyOptional({
    description: "Hours threshold for Poor rating",
    example: 48,
  })
  @IsNumber()
  @IsOptional()
  poorThresholdHours?: number;
}

export class SlaConfigDto {
  @ApiProperty({ description: "Config ID" })
  id: number;

  @ApiProperty({ description: "Response time in hours" })
  responseTimeHours: number;

  @ApiProperty({ description: "Excellent threshold hours" })
  excellentThresholdHours: number;

  @ApiProperty({ description: "Good threshold hours" })
  goodThresholdHours: number;

  @ApiProperty({ description: "Acceptable threshold hours" })
  acceptableThresholdHours: number;

  @ApiProperty({ description: "Poor threshold hours" })
  poorThresholdHours: number;

  @ApiProperty({ description: "Last updated" })
  updatedAt: Date;
}
