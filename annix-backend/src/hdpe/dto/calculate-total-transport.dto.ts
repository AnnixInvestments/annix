import { IsArray, ValidateNested, IsString, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class HdpeItemDto {
  @IsString()
  type: string; // 'straight_pipe' or fitting type code

  @IsInt()
  nominalBore: number;

  @IsNumber()
  @IsOptional()
  sdr?: number; // Required for pipes

  @IsNumber()
  @IsOptional()
  length?: number; // Required for pipes (in meters)
}

export class CalculateTotalTransportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HdpeItemDto)
  items: HdpeItemDto[];
}
