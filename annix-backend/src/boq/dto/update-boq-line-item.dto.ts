import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, MinLength, IsObject } from 'class-validator';
import { BoqItemType } from '../entities/boq-line-item.entity';

export class UpdateBoqLineItemDto {
  @ApiPropertyOptional({ description: 'Item code/reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemCode?: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Item type', enum: BoqItemType })
  @IsOptional()
  @IsEnum(BoqItemType)
  itemType?: BoqItemType;

  @ApiPropertyOptional({ description: 'Unit of measure' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

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
