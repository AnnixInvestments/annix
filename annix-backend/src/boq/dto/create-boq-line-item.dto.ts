import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, MinLength, IsObject } from 'class-validator';
import { BoqItemType } from '../entities/boq-line-item.entity';

export class CreateBoqLineItemDto {
  @ApiPropertyOptional({ description: 'Item code/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemCode?: string;

  @ApiProperty({ description: 'Item description', example: '500NB Sch40 Carbon Steel Pipe' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Item type', enum: BoqItemType })
  @IsEnum(BoqItemType)
  itemType: BoqItemType;

  @ApiProperty({ description: 'Unit of measure', example: 'meters' })
  @IsString()
  @MaxLength(50)
  unitOfMeasure: string;

  @ApiProperty({ description: 'Quantity', example: 100.5 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit weight in kg' })
  @IsOptional()
  @IsNumber()
  unitWeightKg?: number;

  @ApiPropertyOptional({ description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Reference to drawing location' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  drawingReference?: string;

  @ApiPropertyOptional({ description: 'Additional specifications as JSON' })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
}
