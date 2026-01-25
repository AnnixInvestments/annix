import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PipeSteelWorkTypeDto {
  PIPE_SUPPORT = 'pipe_support',
  REINFORCEMENT_PAD = 'reinforcement_pad',
  SADDLE_SUPPORT = 'saddle_support',
  SHOE_SUPPORT = 'shoe_support',
}

export enum BracketTypeDto {
  CLEVIS_HANGER = 'clevis_hanger',
  THREE_BOLT_CLAMP = 'three_bolt_clamp',
  WELDED_BRACKET = 'welded_bracket',
  PIPE_SADDLE = 'pipe_saddle',
  U_BOLT = 'u_bolt',
  BAND_HANGER = 'band_hanger',
  ROLLER_SUPPORT = 'roller_support',
  SLIDE_PLATE = 'slide_plate',
}

export class CalculateSupportSpacingDto {
  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number', example: 'Std' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether pipe is water-filled',
    example: true,
  })
  @IsOptional()
  isWaterFilled?: boolean;
}

export class CalculateReinforcementPadDto {
  @ApiProperty({ description: 'Header pipe OD in mm', example: 323.9 })
  @IsNumber()
  @Min(20)
  headerOdMm: number;

  @ApiProperty({
    description: 'Header pipe wall thickness in mm',
    example: 9.53,
  })
  @IsNumber()
  @Min(1)
  headerWallMm: number;

  @ApiProperty({ description: 'Branch pipe OD in mm', example: 168.3 })
  @IsNumber()
  @Min(20)
  branchOdMm: number;

  @ApiProperty({
    description: 'Branch pipe wall thickness in mm',
    example: 7.11,
  })
  @IsNumber()
  @Min(1)
  branchWallMm: number;

  @ApiPropertyOptional({
    description: 'Working pressure in bar',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiPropertyOptional({
    description: 'Material allowable stress in MPa',
    example: 138,
  })
  @IsOptional()
  @IsNumber()
  allowableStressMpa?: number;
}

export class CalculateNumberOfSupportsDto {
  @ApiProperty({ description: 'Pipeline length in meters', example: 100 })
  @IsNumber()
  @Min(0)
  pipelineLengthM: number;

  @ApiProperty({ description: 'Support spacing in meters', example: 3.0 })
  @IsNumber()
  @Min(0.1)
  supportSpacingM: number;
}

export class SupportSpacingResponseDto {
  @ApiProperty({ description: 'Nominal diameter in mm' })
  nominalDiameterMm: number;

  @ApiProperty({
    description: 'Recommended support spacing for water-filled pipe (m)',
  })
  waterFilledSpacingM: number;

  @ApiProperty({
    description: 'Recommended support spacing for vapor/gas pipe (m)',
  })
  vaporGasSpacingM: number;

  @ApiProperty({ description: 'Recommended rod size in mm' })
  rodSizeMm?: number;

  @ApiProperty({ description: 'Data source standard' })
  standard: string;
}

export class ReinforcementPadResponseDto {
  @ApiProperty({ description: 'Required reinforcement area (mm2)' })
  requiredAreaMm2: number;

  @ApiProperty({ description: 'Recommended pad outer diameter (mm)' })
  padOuterDiameterMm: number;

  @ApiProperty({ description: 'Recommended pad thickness (mm)' })
  padThicknessMm: number;

  @ApiProperty({ description: 'Pad weight (kg)' })
  padWeightKg: number;

  @ApiProperty({ description: 'Whether reinforcement is required' })
  reinforcementRequired: boolean;

  @ApiProperty({ description: 'Calculation notes' })
  notes: string;
}

export class BracketTypeResponseDto {
  @ApiProperty({ description: 'Bracket type code' })
  typeCode: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiProperty({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Suitable for the given pipe size' })
  isSuitable: boolean;

  @ApiProperty({ description: 'Base cost per unit (Rand)' })
  baseCostPerUnit?: number;

  @ApiProperty({ description: 'Allows thermal expansion' })
  allowsExpansion: boolean;

  @ApiProperty({ description: 'Is anchor type' })
  isAnchorType: boolean;
}

export class PipeSteelWorkCalculationDto {
  @ApiProperty({
    description: 'Type of calculation',
    enum: PipeSteelWorkTypeDto,
  })
  @IsEnum(PipeSteelWorkTypeDto)
  workType: PipeSteelWorkTypeDto;

  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({ description: 'Bracket type', enum: BracketTypeDto })
  @IsOptional()
  @IsEnum(BracketTypeDto)
  bracketType?: BracketTypeDto;

  @ApiPropertyOptional({ description: 'Pipeline length in meters' })
  @IsOptional()
  @IsNumber()
  pipelineLengthM?: number;

  @ApiPropertyOptional({ description: 'Working pressure in bar' })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiPropertyOptional({
    description: 'Branch diameter for reinforcement pad (mm)',
  })
  @IsOptional()
  @IsNumber()
  branchDiameterMm?: number;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class PipeSteelWorkCalculationResponseDto {
  @ApiProperty({ description: 'Type of work' })
  workType: string;

  @ApiProperty({ description: 'Recommended support spacing (m)' })
  supportSpacingM?: number;

  @ApiProperty({ description: 'Number of supports required' })
  numberOfSupports?: number;

  @ApiProperty({ description: 'Weight per unit (kg)' })
  weightPerUnitKg?: number;

  @ApiProperty({ description: 'Total weight (kg)' })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Unit cost (Rand)' })
  unitCost?: number;

  @ApiProperty({ description: 'Total cost (Rand)' })
  totalCost?: number;

  @ApiProperty({ description: 'Reinforcement pad details' })
  reinforcementPad?: ReinforcementPadResponseDto;

  @ApiProperty({ description: 'Calculation notes' })
  notes?: string;
}

export enum PipeMaterialDto {
  CARBON_STEEL = 'CARBON_STEEL',
  STAINLESS_304 = 'STAINLESS_304',
  STAINLESS_316 = 'STAINLESS_316',
  COPPER = 'COPPER',
  ALUMINUM = 'ALUMINUM',
  CHROME_MOLY = 'CHROME_MOLY',
  CAST_IRON = 'CAST_IRON',
  PVC = 'PVC',
  HDPE = 'HDPE',
}

export class CalculateThermalExpansionDto {
  @ApiProperty({ description: 'Pipe length in meters', example: 100 })
  @IsNumber()
  @Min(0.1)
  pipeLengthM: number;

  @ApiProperty({
    description: 'Installation/ambient temperature (°C)',
    example: 20,
  })
  @IsNumber()
  installationTempC: number;

  @ApiProperty({ description: 'Operating temperature (°C)', example: 150 })
  @IsNumber()
  operatingTempC: number;

  @ApiPropertyOptional({
    description: 'Pipe material',
    enum: PipeMaterialDto,
    default: PipeMaterialDto.CARBON_STEEL,
  })
  @IsOptional()
  @IsEnum(PipeMaterialDto)
  material?: PipeMaterialDto;

  @ApiPropertyOptional({
    description: 'Custom coefficient of thermal expansion (mm/m/°C)',
    example: 0.012,
  })
  @IsOptional()
  @IsNumber()
  customCoefficientMmPerMPerC?: number;
}

export class ThermalExpansionResponseDto {
  @ApiProperty({ description: 'Pipe length (m)' })
  pipeLengthM: number;

  @ApiProperty({ description: 'Temperature change (°C)' })
  temperatureChangeC: number;

  @ApiProperty({ description: 'Material used' })
  material: string;

  @ApiProperty({ description: 'Coefficient of thermal expansion (mm/m/°C)' })
  coefficientMmPerMPerC: number;

  @ApiProperty({ description: 'Total expansion/contraction (mm)' })
  expansionMm: number;

  @ApiProperty({ description: 'Expansion per meter (mm/m)' })
  expansionPerMeterMm: number;

  @ApiProperty({
    description: 'Is expansion (positive) or contraction (negative)',
  })
  isExpansion: boolean;

  @ApiProperty({ description: 'Recommended expansion joint capacity (mm)' })
  recommendedJointCapacityMm: number;

  @ApiProperty({ description: 'Number of expansion loops/joints recommended' })
  recommendedJointsCount: number;

  @ApiProperty({ description: 'Calculation notes' })
  notes: string;
}

export class ValidateBracketCompatibilityDto {
  @ApiProperty({ description: 'Bracket type code', example: 'CLEVIS_HANGER' })
  @IsString()
  bracketTypeCode: string;

  @ApiProperty({ description: 'Pipe nominal bore (mm)', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Pipeline length (m)', example: 100 })
  @IsOptional()
  @IsNumber()
  pipelineLengthM?: number;

  @ApiPropertyOptional({ description: 'Pipe schedule', example: 'Std' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({
    description: 'Whether pipe is water-filled',
    default: true,
  })
  @IsOptional()
  isWaterFilled?: boolean;

  @ApiPropertyOptional({
    description: 'Expected thermal expansion (mm)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  expectedExpansionMm?: number;
}

export class ValidationIssue {
  @ApiProperty({
    description: 'Issue severity',
    enum: ['error', 'warning', 'info'],
  })
  severity: 'error' | 'warning' | 'info';

  @ApiProperty({ description: 'Issue code' })
  code: string;

  @ApiProperty({ description: 'Issue message' })
  message: string;
}

export class BracketCompatibilityResponseDto {
  @ApiProperty({ description: 'Is the bracket compatible' })
  isCompatible: boolean;

  @ApiProperty({ description: 'Bracket type code' })
  bracketTypeCode: string;

  @ApiProperty({ description: 'Pipe nominal bore (mm)' })
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Validation issues', type: [ValidationIssue] })
  issues: ValidationIssue[];

  @ApiPropertyOptional({ description: 'Estimated pipe load per support (kg)' })
  estimatedLoadKg?: number;

  @ApiPropertyOptional({ description: 'Bracket max load capacity (kg)' })
  bracketMaxLoadKg?: number;

  @ApiPropertyOptional({ description: 'Load utilization percentage' })
  loadUtilizationPercent?: number;

  @ApiProperty({ description: 'Overall recommendation' })
  recommendation: string;
}

export class BatchCalculationItemDto {
  @ApiProperty({ description: 'Item identifier for correlation' })
  @IsString()
  itemId: string;

  @ApiProperty({ description: 'Calculation type', enum: PipeSteelWorkTypeDto })
  @IsEnum(PipeSteelWorkTypeDto)
  workType: PipeSteelWorkTypeDto;

  @ApiProperty({ description: 'Nominal diameter (mm)' })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({ description: 'Bracket type', enum: BracketTypeDto })
  @IsOptional()
  @IsEnum(BracketTypeDto)
  bracketType?: BracketTypeDto;

  @ApiPropertyOptional({ description: 'Pipeline length (m)' })
  @IsOptional()
  @IsNumber()
  pipelineLengthM?: number;

  @ApiPropertyOptional({ description: 'Working pressure (bar)' })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiPropertyOptional({ description: 'Branch diameter for pad (mm)' })
  @IsOptional()
  @IsNumber()
  branchDiameterMm?: number;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class BatchCalculationDto {
  @ApiProperty({
    description: 'Array of calculations to perform',
    type: [BatchCalculationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCalculationItemDto)
  items: BatchCalculationItemDto[];
}

export class BatchCalculationResultDto {
  @ApiProperty({ description: 'Item identifier' })
  itemId: string;

  @ApiProperty({ description: 'Whether calculation succeeded' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Calculation result' })
  result?: PipeSteelWorkCalculationResponseDto;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

export class BatchCalculationResponseDto {
  @ApiProperty({ description: 'Total items processed' })
  totalItems: number;

  @ApiProperty({ description: 'Successful calculations' })
  successCount: number;

  @ApiProperty({ description: 'Failed calculations' })
  failureCount: number;

  @ApiProperty({
    description: 'Individual results',
    type: [BatchCalculationResultDto],
  })
  results: BatchCalculationResultDto[];

  @ApiProperty({ description: 'Summary totals' })
  summary: {
    totalWeightKg: number;
    totalCost: number;
    totalSupports: number;
  };
}

export enum SupportStandardDto {
  MSS_SP_58 = 'MSS_SP_58',
  DIN_2509 = 'DIN_2509',
  EN_13480 = 'EN_13480',
  ASME_B31_1 = 'ASME_B31_1',
  ASME_B31_3 = 'ASME_B31_3',
}

export class CalculateSupportSpacingMultiStandardDto {
  @ApiProperty({ description: 'Nominal diameter (mm)', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number', example: 'Std' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether pipe is water-filled',
    example: true,
  })
  @IsOptional()
  isWaterFilled?: boolean;

  @ApiPropertyOptional({
    description: 'Support standards to compare',
    enum: SupportStandardDto,
    isArray: true,
    default: [SupportStandardDto.MSS_SP_58],
  })
  @IsOptional()
  @IsEnum(SupportStandardDto, { each: true })
  standards?: SupportStandardDto[];
}

export class StandardComparisonDto {
  @ApiProperty({ description: 'Standard name' })
  standard: string;

  @ApiProperty({ description: 'Standard full name' })
  standardFullName: string;

  @ApiProperty({ description: 'Water-filled spacing (m)' })
  waterFilledSpacingM: number;

  @ApiProperty({ description: 'Vapor/gas spacing (m)' })
  vaporGasSpacingM: number;

  @ApiPropertyOptional({ description: 'Rod size (mm)' })
  rodSizeMm?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}

export class MultiStandardSpacingResponseDto {
  @ApiProperty({ description: 'Nominal diameter (mm)' })
  nominalDiameterMm: number;

  @ApiProperty({
    description: 'Comparison by standard',
    type: [StandardComparisonDto],
  })
  comparisons: StandardComparisonDto[];

  @ApiProperty({ description: 'Most conservative recommendation' })
  conservativeRecommendation: StandardComparisonDto;
}

export class CalculateReinforcementPadWithDeratingDto extends CalculateReinforcementPadDto {
  @ApiPropertyOptional({
    description: 'Operating temperature (°C)',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  operatingTempC?: number;

  @ApiPropertyOptional({
    description: 'Material P-number per ASME',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  materialPNumber?: number;

  @ApiPropertyOptional({
    description: 'Joint type',
    enum: ['fillet', 'full_penetration'],
    default: 'full_penetration',
  })
  @IsOptional()
  @IsString()
  jointType?: 'fillet' | 'full_penetration';

  @ApiPropertyOptional({
    description: 'Include thermal stress analysis',
    default: false,
  })
  @IsOptional()
  includeStressAnalysis?: boolean;
}

export class ReinforcementPadWithDeratingResponseDto extends ReinforcementPadResponseDto {
  @ApiPropertyOptional({ description: 'Pressure derating factor applied' })
  pressureDeratingFactor?: number;

  @ApiPropertyOptional({ description: 'Temperature derating factor applied' })
  temperatureDeratingFactor?: number;

  @ApiPropertyOptional({ description: 'Weld strength reduction factor' })
  weldStrengthFactor?: number;

  @ApiPropertyOptional({ description: 'Effective allowable stress (MPa)' })
  effectiveAllowableStressMpa?: number;

  @ApiPropertyOptional({ description: 'Thermal stress at junction (MPa)' })
  thermalStressMpa?: number;

  @ApiPropertyOptional({ description: 'Combined stress ratio' })
  combinedStressRatio?: number;
}

export class CalculateVibrationAnalysisDto {
  @ApiProperty({ description: 'Pipe nominal bore (mm)', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiProperty({
    description: 'Span length between supports (m)',
    example: 5.0,
  })
  @IsNumber()
  @Min(0.1)
  spanLengthM: number;

  @ApiPropertyOptional({ description: 'Schedule number', example: 'Std' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether pipe is water-filled',
    default: true,
  })
  @IsOptional()
  isWaterFilled?: boolean;

  @ApiPropertyOptional({ description: 'Insulation thickness (mm)', default: 0 })
  @IsOptional()
  @IsNumber()
  insulationThicknessMm?: number;

  @ApiPropertyOptional({
    description: 'Equipment excitation frequency (Hz)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  excitationFrequencyHz?: number;

  @ApiPropertyOptional({
    description: 'Support configuration',
    enum: ['simply_supported', 'fixed_fixed', 'cantilever'],
    default: 'simply_supported',
  })
  @IsOptional()
  @IsString()
  supportConfig?: 'simply_supported' | 'fixed_fixed' | 'cantilever';
}

export class VibrationAnalysisResponseDto {
  @ApiProperty({ description: 'Natural frequency (Hz)' })
  naturalFrequencyHz: number;

  @ApiProperty({ description: 'Second mode frequency (Hz)' })
  secondModeFrequencyHz: number;

  @ApiProperty({ description: 'Third mode frequency (Hz)' })
  thirdModeFrequencyHz: number;

  @ApiPropertyOptional({ description: 'Excitation frequency (Hz)' })
  excitationFrequencyHz?: number;

  @ApiPropertyOptional({ description: 'Frequency ratio (excitation/natural)' })
  frequencyRatio?: number;

  @ApiProperty({ description: 'Is resonance likely' })
  resonanceRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical';

  @ApiProperty({ description: 'Recommended maximum span (m)' })
  recommendedMaxSpanM: number;

  @ApiProperty({ description: 'Recommended minimum support frequency (Hz)' })
  minimumSupportFrequencyHz: number;

  @ApiProperty({ description: 'Analysis notes' })
  notes: string;
}

export class CalculateStressAnalysisDto {
  @ApiProperty({ description: 'Bracket type code', example: 'CLEVIS_HANGER' })
  @IsString()
  bracketTypeCode: string;

  @ApiProperty({ description: 'Pipe nominal bore (mm)', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Applied load (kg)', example: 150 })
  @IsNumber()
  @Min(0)
  appliedLoadKg: number;

  @ApiPropertyOptional({ description: 'Hanger rod length (mm)', example: 500 })
  @IsOptional()
  @IsNumber()
  rodLengthMm?: number;

  @ApiPropertyOptional({
    description: 'Operating temperature (°C)',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  operatingTempC?: number;

  @ApiPropertyOptional({ description: 'Dynamic load factor', default: 1.0 })
  @IsOptional()
  @IsNumber()
  dynamicLoadFactor?: number;

  @ApiPropertyOptional({
    description: 'Material yield strength (MPa)',
    default: 250,
  })
  @IsOptional()
  @IsNumber()
  yieldStrengthMpa?: number;
}

export class StressAnalysisResponseDto {
  @ApiProperty({ description: 'Hanger rod tensile stress (MPa)' })
  rodTensileStressMpa: number;

  @ApiProperty({ description: 'Rod stress utilization (%)' })
  rodStressUtilizationPercent: number;

  @ApiPropertyOptional({ description: 'Clamp bending stress (MPa)' })
  clampBendingStressMpa?: number;

  @ApiPropertyOptional({ description: 'Bearing stress (MPa)' })
  bearingStressMpa?: number;

  @ApiProperty({ description: 'Factor of safety' })
  factorOfSafety: number;

  @ApiProperty({ description: 'Is design adequate' })
  isAdequate: boolean;

  @ApiProperty({ description: 'Design status' })
  status: 'adequate' | 'marginal' | 'inadequate';

  @ApiProperty({ description: 'Analysis notes' })
  notes: string;
}

export enum MaterialCategoryDto {
  CARBON_STEEL = 'CARBON_STEEL',
  STAINLESS = 'STAINLESS',
  ALLOY = 'ALLOY',
  COPPER = 'COPPER',
  ALUMINUM = 'ALUMINUM',
  PLASTIC = 'PLASTIC',
  CAST_IRON = 'CAST_IRON',
}

export class MaterialCompatibilityCheckDto {
  @ApiProperty({ description: 'Pipe material', enum: PipeMaterialDto })
  @IsEnum(PipeMaterialDto)
  pipeMaterial: PipeMaterialDto;

  @ApiProperty({
    description: 'Bracket material category',
    enum: MaterialCategoryDto,
  })
  @IsEnum(MaterialCategoryDto)
  bracketMaterial: MaterialCategoryDto;

  @ApiPropertyOptional({
    description: 'Operating temperature (°C)',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  operatingTempC?: number;

  @ApiPropertyOptional({
    description: 'Is corrosive environment',
    default: false,
  })
  @IsOptional()
  isCorrosiveEnvironment?: boolean;

  @ApiPropertyOptional({
    description: 'Is outdoor installation',
    default: false,
  })
  @IsOptional()
  isOutdoor?: boolean;
}

export class MaterialCompatibilityResponseDto {
  @ApiProperty({ description: 'Is compatible' })
  isCompatible: boolean;

  @ApiProperty({ description: 'Compatibility rating' })
  rating: 'excellent' | 'good' | 'acceptable' | 'caution' | 'not_recommended';

  @ApiProperty({ description: 'Risk of galvanic corrosion' })
  galvanicCorrosionRisk: 'none' | 'low' | 'moderate' | 'high';

  @ApiPropertyOptional({ description: 'Required isolation method' })
  isolationRequired?: string;

  @ApiProperty({ description: 'Temperature compatibility' })
  temperatureCompatible: boolean;

  @ApiProperty({ description: 'Maximum recommended temperature (°C)' })
  maxRecommendedTempC: number;

  @ApiProperty({ description: 'Recommendations' })
  recommendations: string[];

  @ApiProperty({ description: 'Notes' })
  notes: string;
}

export enum ExportFormatDto {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export class ExportReportDto {
  @ApiProperty({ description: 'Export format', enum: ExportFormatDto })
  @IsEnum(ExportFormatDto)
  format: ExportFormatDto;

  @ApiProperty({
    description: 'Calculation data to export',
    type: [BatchCalculationResultDto],
  })
  calculations: BatchCalculationResultDto[];

  @ApiPropertyOptional({ description: 'Project name' })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Project number' })
  @IsOptional()
  @IsString()
  projectNumber?: string;

  @ApiPropertyOptional({ description: 'Client name' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Include cost breakdown', default: true })
  @IsOptional()
  includeCostBreakdown?: boolean;

  @ApiPropertyOptional({ description: 'Include weight summary', default: true })
  @IsOptional()
  includeWeightSummary?: boolean;
}

export class ExportReportResponseDto {
  @ApiProperty({ description: 'Export format used' })
  format: string;

  @ApiProperty({ description: 'Base64 encoded file content' })
  content: string;

  @ApiProperty({ description: 'Suggested filename' })
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSizeBytes: number;
}

export enum PlateSizeCategory {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export class StandardPlateSizeDto {
  @ApiProperty({ description: 'Unique plate size ID' })
  id: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Length in mm' })
  lengthMm: number;

  @ApiProperty({ description: 'Width in mm' })
  widthMm: number;

  @ApiProperty({ description: 'Thickness in mm' })
  thicknessMm: number;

  @ApiProperty({ description: 'Size category', enum: PlateSizeCategory })
  category: PlateSizeCategory;

  @ApiPropertyOptional({ description: 'Weight in kg' })
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Common uses' })
  commonUses?: string;
}

export enum GasketMaterialType {
  SPIRAL_WOUND = 'spiral_wound',
  RING_JOINT = 'ring_joint',
  SOFT_CUT = 'soft_cut',
  PTFE = 'ptfe',
  GRAPHITE = 'graphite',
  RUBBER = 'rubber',
  CAF = 'compressed_asbestos_free',
}

export class GasketMaterialDto {
  @ApiProperty({ description: 'Material code' })
  code: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Material type', enum: GasketMaterialType })
  type: GasketMaterialType;

  @ApiProperty({ description: 'Minimum temperature rating (°C)' })
  minTempC: number;

  @ApiProperty({ description: 'Maximum temperature rating (°C)' })
  maxTempC: number;

  @ApiProperty({ description: 'Maximum pressure rating (bar)' })
  maxPressureBar: number;

  @ApiProperty({ description: 'Compatible flange faces' })
  compatibleFlanges: string[];

  @ApiProperty({ description: 'Compatible fluid services' })
  compatibleServices: string[];

  @ApiPropertyOptional({ description: 'Incompatible services (warnings)' })
  incompatibleServices?: string[];

  @ApiPropertyOptional({ description: 'Cost factor (1.0 = baseline)' })
  costFactor?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}

export class GasketCompatibilityCheckDto {
  @ApiProperty({ description: 'Gasket material code' })
  @IsString()
  gasketCode: string;

  @ApiProperty({ description: 'Flange material (e.g., A105, 316SS)' })
  @IsString()
  flangeMaterial: string;

  @ApiProperty({ description: 'Service fluid' })
  @IsString()
  serviceFluid: string;

  @ApiProperty({ description: 'Design temperature (°C)' })
  @IsNumber()
  designTempC: number;

  @ApiProperty({ description: 'Design pressure (bar)' })
  @IsNumber()
  designPressureBar: number;

  @ApiPropertyOptional({ description: 'Flange face type (RF, FF, RTJ)' })
  @IsOptional()
  @IsString()
  flangeFace?: string;
}

export class GasketCompatibilityResponseDto {
  @ApiProperty({ description: 'Is compatible' })
  isCompatible: boolean;

  @ApiProperty({ description: 'Compatibility score (0-100)' })
  score: number;

  @ApiProperty({ description: 'Warnings' })
  warnings: string[];

  @ApiProperty({ description: 'Recommendations' })
  recommendations: string[];

  @ApiPropertyOptional({ description: 'Alternative gasket suggestions' })
  alternatives?: string[];
}

export enum HeatTreatmentType {
  PWHT = 'pwht',
  STRESS_RELIEF = 'stress_relief',
  NORMALIZING = 'normalizing',
  ANNEALING = 'annealing',
  SOLUTION_ANNEALING = 'solution_annealing',
  QUENCH_TEMPER = 'quench_temper',
}

export class HeatTreatmentDto {
  @ApiProperty({ description: 'Treatment code' })
  code: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Treatment type', enum: HeatTreatmentType })
  type: HeatTreatmentType;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Temperature range low (°C)' })
  tempRangeLowC: number;

  @ApiProperty({ description: 'Temperature range high (°C)' })
  tempRangeHighC: number;

  @ApiProperty({ description: 'Hold time formula (e.g., "1hr per 25mm")' })
  holdTimeFormula: string;

  @ApiProperty({ description: 'Heating rate (°C/hr max)' })
  heatingRateMaxCPerHr: number;

  @ApiProperty({ description: 'Cooling rate (°C/hr max)' })
  coolingRateMaxCPerHr: number;

  @ApiProperty({ description: 'Applicable materials' })
  applicableMaterials: string[];

  @ApiProperty({ description: 'Required by code references' })
  codeReferences: string[];

  @ApiPropertyOptional({ description: 'Base cost per kg' })
  baseCostPerKg?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}

export class HeatTreatmentRequirementDto {
  @ApiProperty({ description: 'Material specification' })
  @IsString()
  material: string;

  @ApiProperty({ description: 'Wall thickness (mm)' })
  @IsNumber()
  wallThicknessMm: number;

  @ApiPropertyOptional({ description: 'Weld type' })
  @IsOptional()
  @IsString()
  weldType?: string;

  @ApiPropertyOptional({ description: 'P-number' })
  @IsOptional()
  @IsNumber()
  pNumber?: number;

  @ApiPropertyOptional({ description: 'Design code (ASME B31.3, etc.)' })
  @IsOptional()
  @IsString()
  designCode?: string;
}

export class HeatTreatmentRequirementResponseDto {
  @ApiProperty({ description: 'Is heat treatment required' })
  isRequired: boolean;

  @ApiProperty({ description: 'Required treatment type' })
  requiredTreatment: HeatTreatmentType | null;

  @ApiProperty({ description: 'Treatment details' })
  treatment: HeatTreatmentDto | null;

  @ApiProperty({ description: 'Reason for requirement or exemption' })
  reason: string;

  @ApiProperty({ description: 'Estimated cost impact (ZAR)' })
  estimatedCostImpact: number;

  @ApiProperty({ description: 'Code references' })
  codeReferences: string[];

  @ApiPropertyOptional({ description: 'Exemption conditions' })
  exemptionConditions?: string[];
}
