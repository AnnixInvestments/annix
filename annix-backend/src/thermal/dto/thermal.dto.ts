import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export enum ThermalMaterial {
  CARBON_STEEL = 'carbon_steel',
  STAINLESS_304 = 'stainless_304',
  STAINLESS_316 = 'stainless_316',
  DUPLEX_2205 = 'duplex_2205',
  INCONEL_625 = 'inconel_625',
  MONEL_400 = 'monel_400',
  HASTELLOY_C276 = 'hastelloy_c276',
  COPPER = 'copper',
  ALUMINUM_6061 = 'aluminum_6061',
  CHROME_MOLY_P22 = 'chrome_moly_p22',
}

export class ExpansionRequirementDto {
  @ApiProperty({ description: 'Pipe length in meters', example: 100 })
  @IsNumber()
  @Min(0.1)
  @Max(10000)
  lengthM: number;

  @ApiProperty({ description: 'Installation/ambient temperature in Celsius', example: 20 })
  @IsNumber()
  @Min(-200)
  @Max(1000)
  fromTempC: number;

  @ApiProperty({ description: 'Operating temperature in Celsius', example: 200 })
  @IsNumber()
  @Min(-200)
  @Max(1000)
  toTempC: number;

  @ApiProperty({ enum: ThermalMaterial, description: 'Pipe material' })
  @IsEnum(ThermalMaterial)
  material: ThermalMaterial;

  @ApiPropertyOptional({ description: 'Nominal pipe size in mm', example: 100 })
  @IsOptional()
  @IsNumber()
  nominalSizeMm?: number;

  @ApiPropertyOptional({ description: 'Pipe schedule', example: 'Std' })
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class ExpansionRequirementResponseDto {
  @ApiProperty({ description: 'Total thermal expansion/contraction in mm' })
  expansionMm: number;

  @ApiProperty({ description: 'Expansion per meter of pipe in mm' })
  expansionPerMeterMm: number;

  @ApiProperty({ description: 'Mean expansion coefficient used (per °C)' })
  meanCoefficientPerC: number;

  @ApiProperty({ description: 'Temperature change in Celsius' })
  temperatureChangeC: number;

  @ApiProperty({ description: 'Whether this is expansion (true) or contraction (false)' })
  isExpansion: boolean;

  @ApiProperty({ description: 'Material name' })
  materialName: string;

  @ApiProperty({ description: 'Recommended expansion joint capacity in mm' })
  recommendedJointCapacityMm: number;

  @ApiProperty({ description: 'Number of expansion joints recommended' })
  recommendedNumberOfJoints: number;

  @ApiPropertyOptional({ description: 'Recommended loop height if using expansion loop' })
  recommendedLoopHeightMm?: number;

  @ApiPropertyOptional({ description: 'Recommended loop type' })
  recommendedLoopType?: string;

  @ApiProperty({ description: 'Advisory notes' })
  notes: string;

  @ApiProperty({ description: 'Reference standard used' })
  referenceStandard: string;
}

export class BellowsSelectionDto {
  @ApiProperty({ description: 'Nominal pipe size in mm', example: 100 })
  @IsNumber()
  nominalSizeMm: number;

  @ApiProperty({ description: 'Required axial movement in mm', example: 30 })
  @IsNumber()
  @Min(0)
  axialMovementMm: number;

  @ApiPropertyOptional({ description: 'Required lateral movement in mm' })
  @IsOptional()
  @IsNumber()
  lateralMovementMm?: number;

  @ApiPropertyOptional({ description: 'Required angular movement in degrees' })
  @IsOptional()
  @IsNumber()
  angularMovementDeg?: number;

  @ApiProperty({ description: 'Design pressure in bar', example: 10 })
  @IsNumber()
  @Min(0)
  designPressureBar: number;

  @ApiProperty({ description: 'Design temperature in Celsius', example: 200 })
  @IsNumber()
  designTemperatureC: number;

  @ApiPropertyOptional({ description: 'Preferred bellows material' })
  @IsOptional()
  @IsString()
  preferredMaterial?: string;
}

export class BellowsSelectionResponseDto {
  @ApiProperty({ description: 'Matching bellows options' })
  options: BellowsOptionDto[];

  @ApiProperty({ description: 'Selection notes' })
  notes: string;
}

export class BellowsOptionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  jointType: string;

  @ApiProperty()
  bellowsMaterial: string;

  @ApiProperty()
  nominalSizeMm: number;

  @ApiProperty()
  axialCompressionMm: number;

  @ApiProperty()
  axialExtensionMm: number;

  @ApiPropertyOptional()
  lateralOffsetMm?: number;

  @ApiPropertyOptional()
  angularRotationDeg?: number;

  @ApiProperty()
  maxPressureBar: number;

  @ApiProperty()
  maxTemperatureC: number;

  @ApiProperty()
  minTemperatureC: number;

  @ApiProperty()
  faceToFaceLengthMm: number;

  @ApiProperty()
  weightKg: number;

  @ApiPropertyOptional()
  listPriceZar?: number;

  @ApiProperty()
  suitabilityScore: number;

  @ApiProperty()
  notes: string;
}

export class LoopSizingDto {
  @ApiProperty({ description: 'Nominal pipe size in mm', example: 100 })
  @IsNumber()
  nominalSizeMm: number;

  @ApiProperty({ description: 'Required expansion to absorb in mm', example: 50 })
  @IsNumber()
  @Min(1)
  expansionMm: number;

  @ApiProperty({ enum: ThermalMaterial, description: 'Pipe material' })
  @IsEnum(ThermalMaterial)
  material: ThermalMaterial;

  @ApiPropertyOptional({ description: 'Pipe schedule', example: 'Std' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ description: 'Preferred loop type' })
  @IsOptional()
  @IsString()
  preferredLoopType?: string;
}

export class LoopSizingResponseDto {
  @ApiProperty({ description: 'Recommended loop type' })
  loopType: string;

  @ApiProperty({ description: 'Loop height in mm' })
  loopHeightMm: number;

  @ApiProperty({ description: 'Loop width in mm (0 for horseshoe)' })
  loopWidthMm: number;

  @ApiProperty({ description: 'Total pipe length required in mm' })
  totalPipeLengthMm: number;

  @ApiProperty({ description: 'Number of elbows required' })
  numberOfElbows: number;

  @ApiProperty({ description: 'Elbow radius factor (typically 1.5D)' })
  elbowRadiusFactor: number;

  @ApiProperty({ description: 'Whether this is an interpolated/calculated value' })
  isCalculated: boolean;

  @ApiProperty({ description: 'Design notes' })
  notes: string;
}

export class ExpansionCoefficientDto {
  @ApiProperty()
  materialCode: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  temperatureC: number;

  @ApiProperty()
  meanCoefficientPerC: number;

  @ApiPropertyOptional()
  instantaneousCoefficientPerC?: number;

  @ApiPropertyOptional()
  totalExpansionMmPerM?: number;

  @ApiPropertyOptional()
  modulusOfElasticityGpa?: number;

  @ApiPropertyOptional()
  thermalConductivityWmK?: number;

  @ApiProperty()
  referenceStandard: string;
}
