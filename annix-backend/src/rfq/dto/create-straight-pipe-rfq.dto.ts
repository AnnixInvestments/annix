import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from "class-validator";
import { NaceRequiresHardnessLimit, Psl2RequiresCvn } from "../../shared/validators";
import { LengthUnit, QuantityType, ScheduleType } from "../entities/straight-pipe-rfq.entity";

export class CreateStraightPipeRfqDto {
  @ApiProperty({ description: "Nominal bore in mm", example: 500 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  nominalBoreMm: number;

  @ApiProperty({
    description: "Schedule type - using schedule number or wall thickness",
    enum: ScheduleType,
  })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiProperty({
    description: "Schedule number (e.g., Sch20, Sch40)",
    required: false,
  })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiProperty({
    description: "Wall thickness in mm (if not using schedule)",
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  wallThicknessMm?: number;

  @ApiProperty({
    description: "Pipe end configuration",
    example: "FBE",
    required: false,
  })
  @IsOptional()
  @IsString()
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Individual pipe length", example: 12.192 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  individualPipeLength: number;

  @ApiProperty({ description: "Length unit", enum: LengthUnit })
  @IsEnum(LengthUnit)
  lengthUnit: LengthUnit;

  @ApiProperty({
    description: "Quantity type - total length or number of pipes",
    enum: QuantityType,
  })
  @IsEnum(QuantityType)
  quantityType: QuantityType;

  @ApiProperty({
    description: "Quantity value - total meters or number of pipes",
    example: 8000,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  quantityValue: number;

  @ApiProperty({ description: "Working pressure in bar", example: 10 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  workingPressureBar: number;

  @ApiProperty({
    description: "Working temperature in celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-273)
  @Max(2000)
  @Type(() => Number)
  workingTemperatureC?: number;

  @ApiProperty({ description: "Steel specification ID", required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  steelSpecificationId?: number;

  @ApiProperty({ description: "Flange standard ID", required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  flangeStandardId?: number;

  @ApiProperty({ description: "Flange pressure class ID", required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  flangePressureClassId?: number;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @IsOptional()
  @IsString()
  @Psl2RequiresCvn()
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Type(() => Number)
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Type(() => Number)
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Type(() => Number)
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @IsOptional()
  @IsString()
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @IsOptional()
  @IsString()
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @IsOptional()
  @IsBoolean()
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(70)
  @Type(() => Number)
  @NaceRequiresHardnessLimit()
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @IsOptional()
  @IsBoolean()
  sscTested?: boolean;
}
