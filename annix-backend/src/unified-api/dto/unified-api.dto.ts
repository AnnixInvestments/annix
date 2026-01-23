import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FlangeBoltingInfoDto {
  @ApiProperty({ description: 'Bolt designation (e.g., M16)' })
  boltDesignation: string;

  @ApiProperty({ description: 'Bolt diameter in mm' })
  boltDiameterMm: number;

  @ApiProperty({ description: 'Thread pitch in mm' })
  threadPitchMm: number;

  @ApiProperty({ description: 'Default bolt length in mm' })
  defaultLengthMm: number | null;

  @ApiProperty({ description: 'Bolt length for SO/SW/TH flanges in mm' })
  lengthSoSwThMm: number | null;

  @ApiProperty({ description: 'Bolt length for LJ flanges in mm' })
  lengthLjMm: number | null;

  @ApiProperty({ description: 'Stud specification' })
  studSpec: string | null;

  @ApiProperty({ description: 'Nut specification' })
  nutSpec: string | null;

  @ApiPropertyOptional({ description: 'Individual bolt mass in kg' })
  boltMassKg?: number;

  @ApiPropertyOptional({ description: 'Total bolt set mass in kg' })
  totalBoltSetMassKg?: number;
}

export class PtRatingInfoDto {
  @ApiProperty({ description: 'Temperature in Celsius' })
  temperatureC: number;

  @ApiProperty({ description: 'Maximum pressure in bar' })
  maxPressureBar: number;

  @ApiPropertyOptional({ description: 'Maximum pressure in psi' })
  maxPressurePsi?: number;

  @ApiProperty({ description: 'Material group' })
  materialGroup: string;
}

export class GasketInfoDto {
  @ApiProperty({ description: 'Gasket type (e.g., Spiral Wound)' })
  gasketType: string;

  @ApiProperty({ description: 'Gasket weight in kg' })
  weightKg: number;

  @ApiProperty({ description: 'Inner diameter in mm' })
  innerDiameterMm: number | null;

  @ApiProperty({ description: 'Outer diameter in mm' })
  outerDiameterMm: number | null;
}

export class CompleteFlangeSpecificationDto {
  @ApiProperty({ description: 'Flange dimension ID' })
  id: number;

  @ApiProperty({ description: 'Flange standard code' })
  standardCode: string;

  @ApiProperty({ description: 'Flange standard name' })
  standardName: string;

  @ApiProperty({ description: 'Pressure class designation' })
  pressureClass: string;

  @ApiProperty({ description: 'Flange type (WN, SO, SW, etc.)' })
  flangeType: string | null;

  @ApiProperty({ description: 'Nominal bore in mm' })
  nominalBoreMm: number;

  @ApiProperty({ description: 'NPS designation' })
  nps: string | null;

  @ApiProperty({ description: 'Flange outer diameter (D) in mm' })
  outerDiameterMm: number;

  @ApiProperty({ description: 'Flange thickness (b) in mm' })
  thicknessMm: number;

  @ApiProperty({ description: 'Bore diameter (d4) in mm' })
  boreDiameterMm: number;

  @ApiProperty({ description: 'Raised face diameter (f) in mm' })
  raisedFaceDiameterMm: number | null;

  @ApiProperty({ description: 'Hub diameter (d1) in mm' })
  hubDiameterMm: number | null;

  @ApiProperty({ description: 'Pitch circle diameter (PCD) in mm' })
  pcdMm: number;

  @ApiProperty({ description: 'Number of bolt holes' })
  numHoles: number;

  @ApiProperty({ description: 'Bolt hole diameter in mm' })
  holeDiameterMm: number | null;

  @ApiProperty({ description: 'Flange mass in kg' })
  massKg: number | null;

  @ApiPropertyOptional({ description: 'Bolting information' })
  bolting?: FlangeBoltingInfoDto;

  @ApiPropertyOptional({ description: 'P-T ratings at various temperatures' })
  ptRatings?: PtRatingInfoDto[];

  @ApiPropertyOptional({ description: 'Gasket information' })
  gasket?: GasketInfoDto;
}

export class MaterialSearchQueryDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Filter by material type' })
  @IsOptional()
  @IsString()
  type?: 'steel' | 'pipe' | 'flange' | 'all';

  @ApiPropertyOptional({ description: 'Minimum temperature rating in °C' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minTempC?: number;

  @ApiPropertyOptional({ description: 'Maximum temperature rating in °C' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxTempC?: number;
}

export class MaterialSearchResultDto {
  @ApiProperty({ description: 'Result type' })
  type: 'steel_specification' | 'pipe_material' | 'flange_material';

  @ApiProperty({ description: 'Database ID' })
  id: number;

  @ApiProperty({ description: 'Material name' })
  name: string;

  @ApiPropertyOptional({ description: 'Normalized name' })
  normalizedName?: string;

  @ApiPropertyOptional({ description: 'UNS number' })
  unsNumber?: string;

  @ApiPropertyOptional({ description: 'ASTM equivalent specification' })
  astmEquivalent?: string;

  @ApiPropertyOptional({ description: 'Material category' })
  category?: string;

  @ApiPropertyOptional({ description: 'Density in kg/m³' })
  densityKgM3?: number;

  @ApiPropertyOptional({ description: 'Minimum temperature in °C' })
  minTempC?: number;

  @ApiPropertyOptional({ description: 'Maximum temperature in °C' })
  maxTempC?: number;

  @ApiPropertyOptional({ description: 'Yield strength in MPa' })
  yieldStrengthMPa?: number;

  @ApiPropertyOptional({ description: 'Tensile strength in MPa' })
  tensileStrengthMPa?: number;

  @ApiPropertyOptional({ description: 'Deprecation status' })
  isDeprecated?: boolean;

  @ApiProperty({ description: 'Match score (0-100)' })
  matchScore: number;
}

export class MaterialSearchResponseDto {
  @ApiProperty({ description: 'Total results found' })
  totalResults: number;

  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ type: [MaterialSearchResultDto] })
  results: MaterialSearchResultDto[];
}

export class AssemblyComponentDto {
  @ApiProperty({ description: 'Component type' })
  @IsString()
  componentType: 'pipe' | 'flange' | 'fitting' | 'gasket' | 'bolt';

  @ApiPropertyOptional({ description: 'Material specification' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ description: 'Steel specification ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  steelSpecId?: number;

  @ApiPropertyOptional({ description: 'Nominal bore in mm' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nominalBoreMm?: number;

  @ApiPropertyOptional({ description: 'Pressure class ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pressureClassId?: number;

  @ApiPropertyOptional({ description: 'Flange standard ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  flangeStandardId?: number;

  @ApiPropertyOptional({ description: 'Thread pitch in mm' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  threadPitchMm?: number;

  @ApiPropertyOptional({ description: 'Bolt diameter in mm' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  boltDiameterMm?: number;
}

export class AssemblyValidateDto {
  @ApiProperty({ type: [AssemblyComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssemblyComponentDto)
  components: AssemblyComponentDto[];

  @ApiProperty({ description: 'Design pressure in bar' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  designPressureBar: number;

  @ApiProperty({ description: 'Design temperature in °C' })
  @IsNumber()
  @Min(-200)
  @Max(900)
  @Type(() => Number)
  designTemperatureC: number;

  @ApiPropertyOptional({ description: 'Service fluid' })
  @IsOptional()
  @IsString()
  serviceFluid?: string;
}

export class CompatibilityIssueDto {
  @ApiProperty({ description: 'Issue severity' })
  severity: 'error' | 'warning' | 'info';

  @ApiProperty({ description: 'Issue code' })
  code: string;

  @ApiProperty({ description: 'Issue description' })
  message: string;

  @ApiPropertyOptional({ description: 'Affected components' })
  affectedComponents?: string[];

  @ApiPropertyOptional({ description: 'Recommendation' })
  recommendation?: string;
}

export class AssemblyValidationResultDto {
  @ApiProperty({ description: 'Overall validity' })
  isValid: boolean;

  @ApiProperty({ description: 'Validation score (0-100)' })
  score: number;

  @ApiProperty({ type: [CompatibilityIssueDto] })
  issues: CompatibilityIssueDto[];

  @ApiPropertyOptional({ description: 'Maximum allowable pressure at design temp' })
  maxPressureAtTempBar?: number;

  @ApiPropertyOptional({ description: 'Temperature range supported' })
  temperatureRangeC?: { min: number; max: number };

  @ApiPropertyOptional({ description: 'Material compatibility matrix' })
  materialCompatibility?: Record<string, Record<string, boolean>>;
}
