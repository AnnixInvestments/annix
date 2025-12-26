import { IsArray, IsInt, IsNumber, IsPositive, IsString, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PvcTransportItemDto {
  @ApiProperty({ description: 'Item type: straight_pipe or fitting code' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Nominal diameter in mm (DN)' })
  @IsInt()
  @IsPositive()
  nominalDiameter: number;

  @ApiPropertyOptional({ description: 'Pressure rating (required for pipes)' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  pressureRating?: number;

  @ApiPropertyOptional({ description: 'Length in meters (required for straight_pipe)' })
  @IsNumber()
  @IsPositive()
  @Min(0.1)
  @IsOptional()
  length?: number;

  @ApiPropertyOptional({ description: 'Quantity of items (default: 1)' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;
}

export class CalculatePvcTotalTransportDto {
  @ApiProperty({ description: 'Array of items to calculate transport weight', type: [PvcTransportItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvcTransportItemDto)
  items: PvcTransportItemDto[];
}
