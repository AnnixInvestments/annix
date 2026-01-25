import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum ValidationCategory {
  DIMENSIONAL = 'dimensional',
  PRESSURE_RATING = 'pressure_rating',
  BOLTING = 'bolting',
  PHYSICAL = 'physical',
  DOCUMENTATION = 'documentation',
}

export class RunValidationDto {
  @ApiPropertyOptional({ description: 'Specific rule codes to run' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleCodes?: string[];

  @ApiPropertyOptional({
    enum: ValidationCategory,
    description: 'Filter by category',
  })
  @IsOptional()
  @IsEnum(ValidationCategory)
  category?: ValidationCategory;

  @ApiPropertyOptional({
    enum: ValidationSeverity,
    description: 'Minimum severity',
  })
  @IsOptional()
  @IsEnum(ValidationSeverity)
  minSeverity?: ValidationSeverity;
}

export class ValidationRuleDto {
  @ApiProperty()
  ruleCode: string;

  @ApiProperty()
  ruleName: string;

  @ApiProperty()
  ruleDescription: string;

  @ApiProperty({ enum: ValidationSeverity })
  severity: ValidationSeverity;

  @ApiProperty({ enum: ValidationCategory })
  category: ValidationCategory;

  @ApiProperty()
  isActive: boolean;
}

export class ValidationIssueDto {
  @ApiProperty()
  ruleCode: string;

  @ApiProperty()
  ruleName: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: number;

  @ApiProperty()
  issueDescription: string;

  @ApiPropertyOptional()
  expectedValue?: string;

  @ApiPropertyOptional()
  actualValue?: string;

  @ApiProperty({ enum: ValidationSeverity })
  severity: ValidationSeverity;
}

export class ValidationResultDto {
  @ApiProperty()
  runId: string;

  @ApiProperty()
  runDate: Date;

  @ApiProperty()
  totalRulesRun: number;

  @ApiProperty()
  totalIssues: number;

  @ApiProperty()
  errorCount: number;

  @ApiProperty()
  warningCount: number;

  @ApiProperty()
  infoCount: number;

  @ApiProperty({ type: [ValidationIssueDto] })
  issues: ValidationIssueDto[];
}

export class PtCurveVerificationDto {
  @ApiProperty()
  standardCode: string;

  @ApiProperty()
  materialGroup: string;

  @ApiProperty()
  pressureClass: string;

  @ApiProperty()
  temperatureC: number;

  @ApiProperty()
  expectedPressureBar: number;

  @ApiPropertyOptional()
  actualPressureBar?: number;

  @ApiPropertyOptional()
  variancePercent?: number;

  @ApiProperty()
  verificationStatus: string;

  @ApiPropertyOptional()
  sourceReference?: string;
}

export class CoverageReportDto {
  @ApiProperty()
  entityType: string;

  @ApiProperty()
  category: string;

  @ApiPropertyOptional()
  subcategory?: string;

  @ApiProperty()
  totalExpected: number;

  @ApiProperty()
  totalPresent: number;

  @ApiProperty()
  coveragePercent: number;

  @ApiPropertyOptional()
  missingItems?: string[];
}

export class CoverageSummaryDto {
  @ApiProperty()
  reportDate: Date;

  @ApiProperty()
  overallCoveragePercent: number;

  @ApiProperty({ type: [CoverageReportDto] })
  byCategory: CoverageReportDto[];

  @ApiProperty()
  totalStandards: number;

  @ApiProperty()
  totalFlangeDimensions: number;

  @ApiProperty()
  totalPtRatings: number;

  @ApiProperty()
  verifiedRecords: number;

  @ApiProperty()
  documentedRecords: number;
}

export class SpecificationNormalizationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  normalizedName: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  unsNumber?: string;

  @ApiPropertyOptional()
  astmEquivalent?: string;

  @ApiPropertyOptional()
  materialCategory?: string;

  @ApiProperty()
  isDeprecated: boolean;
}
