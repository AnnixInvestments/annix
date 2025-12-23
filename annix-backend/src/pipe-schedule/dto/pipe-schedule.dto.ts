import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CalculatePipeThicknessDto {
  @IsNumber()
  pressureBar: number;

  @IsNumber()
  temperatureCelsius: number;

  @IsString()
  nps: string; // or nbMm

  @IsOptional()
  @IsNumber()
  nbMm?: number;

  @IsString()
  materialCode: string;

  @IsOptional()
  @IsString()
  selectedSchedule?: string;

  @IsOptional()
  @IsNumber()
  corrosionAllowanceMm?: number;

  @IsOptional()
  @IsNumber()
  jointEfficiencyE?: number; // Default 1.0 for seamless

  @IsOptional()
  @IsNumber()
  weldStrengthReductionW?: number; // Default 1.0

  @IsOptional()
  @IsNumber()
  coefficientY?: number; // Default 0.4 for ferritic steels below 900°F
}

export class PipeThicknessResultDto {
  designThicknessInch: number;
  designThicknessMm: number;
  minRequiredThicknessInch: number;
  minRequiredThicknessMm: number;
  allowableStressKsi: number;
  allowableStressMpa: number;

  selectedSchedule?: string;
  selectedScheduleWallInch?: number;
  selectedScheduleWallMm?: number;
  isSelectedScheduleAdequate?: boolean;

  recommendedSchedule: string;
  recommendedWallInch: number;
  recommendedWallMm: number;

  warnings: string[];
  notes: string;
}

export class GetSchedulesDto {
  @IsString()
  nps: string;
}
