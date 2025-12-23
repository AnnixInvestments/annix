import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateFlangePtRatingDto {
  @IsNumber()
  pressureClassId: number;

  @IsString()
  materialGroup: string;

  @IsNumber()
  temperatureCelsius: number;

  @IsNumber()
  maxPressureBar: number;

  @IsOptional()
  @IsNumber()
  maxPressurePsi?: number;
}

export class BulkCreateFlangePtRatingDto {
  @IsNumber()
  pressureClassId: number;

  @IsString()
  materialGroup: string;

  ratings: Array<{
    temperatureCelsius: number;
    maxPressureBar: number;
    maxPressurePsi?: number;
  }>;
}
