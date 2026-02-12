import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFittingBoreDto {
  @ApiProperty({ example: 'A', description: 'Bore position (e.g. A, B, D, inlet, outlet)' })
  @IsString()
  @IsOptional()
  borePosition?: string;

  @ApiProperty({ example: 5, description: 'Nominal + OD ID from nominal_outside_diameters table' })
  @IsNumber()
  @IsNotEmpty()
  nominalId: number;

  @ApiProperty({ example: 2, description: 'FittingVariant ID from fitting_variant table' })
  @IsNumber()
  @IsNotEmpty()
  variantId: number;
}
