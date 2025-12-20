import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, MinLength } from 'class-validator';
import { CommentType } from '../entities/drawing-comment.entity';

export class CreateDrawingCommentDto {
  @ApiProperty({ description: 'Comment text' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  commentText: string;

  @ApiPropertyOptional({ description: 'Type of comment', enum: CommentType })
  @IsOptional()
  @IsEnum(CommentType)
  commentType?: CommentType;

  @ApiPropertyOptional({ description: 'X position for annotation' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y position for annotation' })
  @IsOptional()
  @IsNumber()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Page number for multi-page documents' })
  @IsOptional()
  @IsNumber()
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsNumber()
  parentCommentId?: number;
}
