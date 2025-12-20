import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DrawingStatus } from '../entities/drawing.entity';

export class DrawingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: DrawingStatus })
  @IsOptional()
  @IsEnum(DrawingStatus)
  status?: DrawingStatus;

  @ApiPropertyOptional({ description: 'Filter by RFQ ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rfqId?: number;

  @ApiPropertyOptional({ description: 'Filter by uploader user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uploadedByUserId?: number;

  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  search?: string;

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
