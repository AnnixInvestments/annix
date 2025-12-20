import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength, MinLength } from 'class-validator';

export class CreateBoqDto {
  @ApiProperty({ description: 'BOQ title', example: 'Pipeline Section A - Materials List' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'BOQ description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Associated drawing ID' })
  @IsOptional()
  @IsNumber()
  drawingId?: number;

  @ApiPropertyOptional({ description: 'Associated RFQ ID' })
  @IsOptional()
  @IsNumber()
  rfqId?: number;
}
