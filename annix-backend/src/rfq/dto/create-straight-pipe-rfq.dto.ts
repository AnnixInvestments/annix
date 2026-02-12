import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsPositive, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LengthUnit, QuantityType, ScheduleType } from '../entities/straight-pipe-rfq.entity';

export class CreateStraightPipeRfqDto {
  @ApiProperty({ description: 'Nominal bore in mm', example: 500 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  nominalBoreMm: number;

  @ApiProperty({ description: 'Schedule type - using schedule number or wall thickness', enum: ScheduleType })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiProperty({ description: 'Schedule number (e.g., Sch20, Sch40)', required: false })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiProperty({ description: 'Wall thickness in mm (if not using schedule)', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Pipe end configuration', example: 'FBE', required: false })
  @IsOptional()
  @IsString()
  pipeEndConfiguration?: string;

  @ApiProperty({ description: 'Individual pipe length', example: 12.192 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  individualPipeLength: number;

  @ApiProperty({ description: 'Length unit', enum: LengthUnit })
  @IsEnum(LengthUnit)
  lengthUnit: LengthUnit;

  @ApiProperty({ description: 'Quantity type - total length or number of pipes', enum: QuantityType })
  @IsEnum(QuantityType)
  quantityType: QuantityType;

  @ApiProperty({ description: 'Quantity value - total meters or number of pipes', example: 8000 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Type(() => Number)
  quantityValue: number;

  @ApiProperty({ description: 'Working pressure in bar', example: 10 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  workingPressureBar: number;

  @ApiProperty({ description: 'Working temperature in celsius', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-273)
  @Max(2000)
  @Type(() => Number)
  workingTemperatureC?: number;

  @ApiProperty({ description: 'Steel specification ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  steelSpecificationId?: number;

  @ApiProperty({ description: 'Flange standard ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  flangeStandardId?: number;

  @ApiProperty({ description: 'Flange pressure class ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  flangePressureClassId?: number;
}
