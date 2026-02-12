import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FittingStandard, FittingType } from './get-fitting-dimensions.dto';

export class CalculateFittingDto {
  @ApiProperty({ 
    description: 'Fitting standard (SABS62 or SABS719)', 
    enum: FittingStandard,
    example: FittingStandard.SABS62 
  })
  @IsEnum(FittingStandard)
  fittingStandard: FittingStandard;

  @ApiProperty({ 
    description: 'Type of fitting', 
    enum: FittingType,
    example: FittingType.EQUAL_TEE 
  })
  @IsEnum(FittingType)
  fittingType: FittingType;

  @ApiProperty({ 
    description: 'Nominal diameter in mm', 
    example: 100 
  })
  @IsNumber()
  @Min(1)
  nominalDiameterMm: number;

  @ApiProperty({ 
    description: 'Angle range (e.g., "60-90", "45-59", "30-44") - Required for Laterals and Y-Pieces', 
    example: '60-90',
    required: false 
  })
  @IsOptional()
  @IsString()
  angleRange?: string;

  @ApiProperty({ 
    description: 'Pipe length A in mm (for SABS719)', 
    example: 1000,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pipeLengthAMm?: number;

  @ApiProperty({ 
    description: 'Pipe length B in mm (for SABS719)', 
    example: 1000,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pipeLengthBMm?: number;

  @ApiProperty({ 
    description: 'Steel specification ID', 
    example: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  steelSpecificationId?: number;

  @ApiProperty({ 
    description: 'Flange standard ID', 
    example: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ 
    description: 'Flange pressure class ID', 
    example: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;

  @ApiProperty({ 
    description: 'Quantity of fittings', 
    example: 5 
  })
  @IsNumber()
  @Min(1)
  quantityValue: number;

  @ApiProperty({ 
    description: 'Schedule number (e.g., "Sch40", "80", "STD") - Required for SABS719', 
    example: 'Sch40',
    required: false 
  })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiProperty({ 
    description: 'Working pressure in bar', 
    example: 10,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workingPressureBar?: number;

  @ApiProperty({ 
    description: 'Working temperature in celsius', 
    example: 120,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;
}

export class FittingCalculationResultDto {
  @ApiProperty({ 
    description: 'Total weight of the fitting assembly in kg', 
    example: 45.5 
  })
  totalWeight: number;

  @ApiProperty({ 
    description: 'Weight of the fitting body itself in kg', 
    example: 25.0 
  })
  fittingWeight: number;

  @ApiProperty({ 
    description: 'Total weight of pipe sections (for SABS719) in kg', 
    example: 10.5 
  })
  pipeWeight: number;

  @ApiProperty({ 
    description: 'Total weight of flanges in kg', 
    example: 8.0 
  })
  flangeWeight: number;

  @ApiProperty({ 
    description: 'Total weight of bolts in kg', 
    example: 1.2 
  })
  boltWeight: number;

  @ApiProperty({ 
    description: 'Total weight of nuts in kg', 
    example: 0.8 
  })
  nutWeight: number;

  @ApiProperty({ 
    description: 'Estimated weld weight in kg', 
    example: 0.5 
  })
  weldWeight: number;

  @ApiProperty({ 
    description: 'Number of flanges required', 
    example: 3 
  })
  numberOfFlanges: number;

  @ApiProperty({ 
    description: 'Number of flange welds', 
    example: 3 
  })
  numberOfFlangeWelds: number;

  @ApiProperty({ 
    description: 'Total length of flange welds in linear meters', 
    example: 0.942 
  })
  totalFlangeWeldLength: number;

  @ApiProperty({ 
    description: 'Number of tee/lateral welds (for SABS719)', 
    example: 1 
  })
  numberOfTeeWelds: number;

  @ApiProperty({ 
    description: 'Total length of tee/lateral welds in linear meters', 
    example: 0.314 
  })
  totalTeeWeldLength: number;

  @ApiProperty({ 
    description: 'Outside diameter in mm', 
    example: 114.3 
  })
  outsideDiameterMm: number;

  @ApiProperty({ 
    description: 'Wall thickness in mm', 
    example: 6.02 
  })
  wallThicknessMm: number;
}
