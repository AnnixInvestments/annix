// export class CreatePipeDimensionDto {}
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePipeDimensionDto {
  @ApiProperty({
    description: 'Wall thickness in millimetres',
    example: 2.77,
  })
  @IsNumber()
  @IsNotEmpty()
  wall_thickness_mm: number;

  @ApiProperty({
    description: 'Internal diameter in millimetres (nullable)',
    example: 15.76,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  internal_diameter_mm?: number;

  @ApiProperty({
    description: 'Mass per metre in kg/m',
    example: 1.27,
  })
  @IsNumber()
  @IsNotEmpty()
  mass_kgm: number;

  @ApiProperty({
    description: 'Schedule designation (e.g., STD, XS, XXS)',
    example: 'STD',
    required: false,
  })
  @IsOptional()
  @IsString()
  schedule_designation?: string;

  @ApiProperty({
    description: 'Schedule number (e.g., 40, 80, 160)',
    example: 40,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  schedule_number?: number;

  @ApiProperty({ description: 'SteelSpecification ID' })
  @IsNumber()
  @IsNotEmpty()
  steelSpecificationId: number;

  @ApiProperty({ description: 'nominalOutsideDiameter ID' })
  @IsNumber()
  @IsNotEmpty()
  nominalOutsideDiameterId: number;
}
