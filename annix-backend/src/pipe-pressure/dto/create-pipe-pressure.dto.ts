import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreatePipePressureDto {
  @ApiProperty({ description: "Pipe dimension ID this pressure belongs to", example: 1 })
  @IsNumber()
  @IsNotEmpty()
  pipeDimensionId: number;

  @ApiProperty({
    description: "Temperature in °C (nullable)",
    example: 371,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  temperature_c?: number;

  @ApiProperty({
    description: "Maximum working pressure in MPa (nullable)",
    example: 7.27,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max_working_pressure_mpa?: number;

  @ApiProperty({ description: "Allowable stress in MPa", example: 99 })
  @IsNumber()
  @IsNotEmpty()
  allowable_stress_mpa: number;
}
