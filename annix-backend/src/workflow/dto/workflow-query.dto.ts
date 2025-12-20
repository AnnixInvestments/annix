import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReviewStatus, ReviewEntityType, WorkflowType } from '../entities/review-workflow.entity';

export class WorkflowQueryDto {
  @ApiPropertyOptional({ description: 'Filter by workflow type', enum: WorkflowType })
  @IsOptional()
  @IsEnum(WorkflowType)
  workflowType?: WorkflowType;

  @ApiPropertyOptional({ description: 'Filter by entity type', enum: ReviewEntityType })
  @IsOptional()
  @IsEnum(ReviewEntityType)
  entityType?: ReviewEntityType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned reviewer ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedReviewerId?: number;

  @ApiPropertyOptional({ description: 'Filter by submitted by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  submittedByUserId?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
