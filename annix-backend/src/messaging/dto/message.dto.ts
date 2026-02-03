import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Thank you for your response...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    description: 'Parent message ID for replies',
    example: 45,
  })
  @IsNumber()
  @IsOptional()
  parentMessageId?: number;
}

export class EditMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Updated: Thank you for your response...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}

export class MessagePaginationDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50,
    default: 50,
  })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Load messages before this ID',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  beforeId?: number;

  @ApiPropertyOptional({
    description: 'Load messages after this ID',
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  afterId?: number;
}

export class UploadAttachmentDto {
  @ApiProperty({ description: 'Message ID to attach to' })
  @IsNumber()
  messageId: number;
}
