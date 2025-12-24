import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CalculatePipeThicknessDto {
  @IsNumber()
  pressureBar: number; // Design pressure in bar

  @IsNumber()
  temperatureC: number; // Operating temperature in Celsius

  @IsString()
  nps: string; // Nominal pipe size

  @IsString()
  materialCode: string; // Steel grade code

  @IsOptional()
  @IsString()
  selectedSchedule?: string; // Optional user-selected schedule

  @IsOptional()
  @IsNumber()
  jointEfficiency?: number; // E value (default 1.0 for seamless)

  @IsOptional()
  @IsNumber()
  weldStrengthReduction?: number; // W value (default 1.0)

  @IsOptional()
  @IsNumber()
  yCoefficient?: number; // Y value (default 0.4 for ferritic <900°F)

  @IsOptional()
  @IsNumber()
  corrosionAllowanceMm?: number; // Corrosion allowance in mm
}

export class PipeThicknessResultDto {
  designThicknessInch: number;
  minThicknessInch: number;
  minThicknessMm: number;
  allowableStressKsi: number;
  selectedSchedule?: string;
  scheduleWallInch?: number;
  scheduleWallMm?: number;
  isAdequate?: boolean;
  adequacyMessage?: string;
  recommendedSchedule?: string;
  recommendedWallInch?: number;
  recommendedWallMm?: number;
  scheduleWarning?: string;
  notes: string;
}
