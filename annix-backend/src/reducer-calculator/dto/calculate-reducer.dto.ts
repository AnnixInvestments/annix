import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsPositive, Min } from "class-validator";

export enum ReducerType {
  CONCENTRIC = "CONCENTRIC",
  ECCENTRIC = "ECCENTRIC",
}

export class CalculateReducerMassDto {
  @ApiProperty({
    description: "Large end outside diameter in mm",
    example: 925,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  largeDiameterMm: number;

  @ApiProperty({
    description: "Small end outside diameter in mm",
    example: 614,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  smallDiameterMm: number;

  @ApiProperty({
    description: "Centreline length of the reducer in mm",
    example: 980,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  lengthMm: number;

  @ApiProperty({
    description: "Wall thickness in mm",
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  wallThicknessMm: number;

  @ApiPropertyOptional({
    description: "Steel density in kg/m³ (default: 7850 for carbon steel)",
    example: 7850,
    default: 7850,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  densityKgM3?: number;

  @ApiPropertyOptional({
    description: "Reducer type (concentric or eccentric)",
    enum: ReducerType,
    default: ReducerType.CONCENTRIC,
  })
  @IsEnum(ReducerType)
  @IsOptional()
  reducerType?: ReducerType;

  @ApiPropertyOptional({
    description: "Quantity of reducers",
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  quantity?: number;
}

export class CalculateReducerAreaDto extends CalculateReducerMassDto {
  @ApiPropertyOptional({
    description: "Extension length at large end in mm (for additional straight pipe section)",
    example: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  extensionLargeMm?: number;

  @ApiPropertyOptional({
    description: "Extension length at small end in mm (for additional straight pipe section)",
    example: 100,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  extensionSmallMm?: number;

  @ApiPropertyOptional({
    description: "Wall thickness at large end extension in mm (defaults to wallThicknessMm)",
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  extensionLargeWallThicknessMm?: number;

  @ApiPropertyOptional({
    description: "Wall thickness at small end extension in mm (defaults to wallThicknessMm)",
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  extensionSmallWallThicknessMm?: number;
}

export class ReducerMassResultDto {
  @ApiProperty({ description: "Large end outside diameter in mm" })
  largeDiameterMm: number;

  @ApiProperty({ description: "Small end outside diameter in mm" })
  smallDiameterMm: number;

  @ApiProperty({ description: "Large end inside diameter in mm" })
  largeInnerDiameterMm: number;

  @ApiProperty({ description: "Small end inside diameter in mm" })
  smallInnerDiameterMm: number;

  @ApiProperty({ description: "Centreline length in mm" })
  lengthMm: number;

  @ApiProperty({ description: "Wall thickness in mm" })
  wallThicknessMm: number;

  @ApiProperty({ description: "Steel density in kg/m³" })
  densityKgM3: number;

  @ApiProperty({ description: "Outer frustum volume in m³" })
  outerVolumeM3: number;

  @ApiProperty({ description: "Inner frustum volume in m³" })
  innerVolumeM3: number;

  @ApiProperty({ description: "Steel volume in m³" })
  steelVolumeM3: number;

  @ApiProperty({ description: "Mass of a single reducer in kg" })
  massPerUnitKg: number;

  @ApiProperty({ description: "Total mass for all reducers in kg" })
  totalMassKg: number;

  @ApiProperty({ description: "Quantity of reducers" })
  quantity: number;

  @ApiProperty({ description: "Reducer type" })
  reducerType: ReducerType;
}

export class ReducerAreaResultDto {
  @ApiProperty({ description: "Large end outside diameter in mm" })
  largeDiameterMm: number;

  @ApiProperty({ description: "Small end outside diameter in mm" })
  smallDiameterMm: number;

  @ApiProperty({ description: "Large end inside diameter in mm" })
  largeInnerDiameterMm: number;

  @ApiProperty({ description: "Small end inside diameter in mm" })
  smallInnerDiameterMm: number;

  @ApiProperty({ description: "Centreline length in mm" })
  lengthMm: number;

  @ApiProperty({ description: "Slant height of the frustum in mm" })
  slantHeightMm: number;

  @ApiProperty({ description: "Cone half-angle in degrees" })
  coneAngleDegrees: number;

  @ApiProperty({ description: "External surface area of reducer cone in m²" })
  reducerExternalAreaM2: number;

  @ApiProperty({ description: "Internal surface area of reducer cone in m²" })
  reducerInternalAreaM2: number;

  @ApiProperty({ description: "External surface area of large end extension in m²" })
  extensionLargeExternalAreaM2: number;

  @ApiProperty({ description: "Internal surface area of large end extension in m²" })
  extensionLargeInternalAreaM2: number;

  @ApiProperty({ description: "External surface area of small end extension in m²" })
  extensionSmallExternalAreaM2: number;

  @ApiProperty({ description: "Internal surface area of small end extension in m²" })
  extensionSmallInternalAreaM2: number;

  @ApiProperty({ description: "Total external surface area in m²" })
  totalExternalAreaM2: number;

  @ApiProperty({ description: "Total internal surface area in m²" })
  totalInternalAreaM2: number;

  @ApiProperty({ description: "Total combined surface area (external + internal) in m²" })
  totalCombinedAreaM2: number;

  @ApiProperty({ description: "Area per unit in m²" })
  areaPerUnitM2: number;

  @ApiProperty({ description: "Quantity of reducers" })
  quantity: number;

  @ApiProperty({ description: "Reducer type" })
  reducerType: ReducerType;
}

export class ReducerFullCalculationDto extends CalculateReducerAreaDto {
  @ApiPropertyOptional({
    description: "Coating rate in currency per m²",
    example: 220,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  coatingRatePerM2?: number;
}

export class ReducerFullResultDto {
  @ApiProperty({ description: "Mass calculation results" })
  mass: ReducerMassResultDto;

  @ApiProperty({ description: "Area calculation results" })
  area: ReducerAreaResultDto;

  @ApiPropertyOptional({ description: "External coating cost" })
  externalCoatingCost?: number;

  @ApiPropertyOptional({ description: "Internal coating cost" })
  internalCoatingCost?: number;

  @ApiPropertyOptional({ description: "Total coating cost" })
  totalCoatingCost?: number;
}
