import { IsNumber, IsOptional, IsPositive, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFlangeDimensionDto {
  @ApiProperty({
    description: 'Reference to the nominal bore/outside diameter (FK)',
    example: 1,
  })
  @IsInt()
  nominalOutsideDiameterId: number; // FK -> NominalOutsideDiameterMm

  @ApiProperty({
    description: 'Reference to the flange standard (FK)',
    example: 2, // e.g. SANS 719
  })
  @IsInt()
  standardId: number; // FK -> FlangeStandard

  @ApiProperty({
    description: 'Reference to the pressure class (FK)',
    example: 3, // e.g. PN16
  })
  @IsInt()
  pressureClassId: number; // FK -> PressureClass

  @ApiPropertyOptional({
    description: 'Reference to the bolt type/size (FK)',
    example: 5, // e.g. M16
  })
  @IsOptional()
  @IsInt()
  boltId?: number; // FK -> Bolt (e.g. "M16")

  @ApiProperty({
    description: 'Outside diameter of the flange (mm)',
    example: 610,
  })
  @IsNumber()
  @IsPositive()
  D: number; // flange outside diameter

  @ApiProperty({
    description: 'Flange thickness (mm)',
    example: 22,
  })
  @IsNumber()
  @IsPositive()
  b: number; // flange thickness

  @ApiProperty({
    description: 'Bolt hole diameter (mm)',
    example: 18,
  })
  @IsNumber()
  d4: number; // bolt hole diameter

  @ApiProperty({
    description: 'Recess / tolerance (mm)',
    example: 3,
  })
  @IsNumber()
  f: number; // recess / tolerance

  @ApiProperty({
    description: 'Number of bolt holes',
    example: 16,
  })
  @IsInt()
  num_holes: number;

  @ApiProperty({
    description: 'Inner bolt circle diameter (mm)',
    example: 550,
  })
  @IsNumber()
  d1: number; // bolt hole pitch circle diameter?

  @ApiProperty({
    description: 'Pitch circle diameter (mm)',
    example: 565,
  })
  @IsNumber()
  pcd: number; // pitch circle diameter

  @ApiProperty({
    description: 'Mass of flange (kg)',
    example: 12.5,
  })
  @IsNumber()
  @IsPositive()
  mass_kg: number;
}
