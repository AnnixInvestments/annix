import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from "class-validator";

export class ScheduleGapsQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  minGapMinutes?: number;
}

export class ColdCallSuggestionsQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSuggestions?: number;
}

export class RouteStopDto {
  @IsInt()
  id: number;

  @IsEnum(["prospect", "meeting"])
  type: "prospect" | "meeting";
}

export class OptimizeRouteDto {
  @IsNumber()
  startLat: number;

  @IsNumber()
  startLng: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops: RouteStopDto[];

  @IsOptional()
  @IsBoolean()
  returnToStart?: boolean;
}

export class PlanDayRouteQueryDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  includeColdCalls?: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}
