import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendPipeSpecsDto {
  @ApiProperty({
    description: 'Nominal bore in mm',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  nominalBore: number;

  @ApiProperty({
    description: 'Working pressure in MPa',
    example: 1.6,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  workingPressure: number;

  @ApiPropertyOptional({
    description: 'Working temperature in Celsius',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Steel specification ID (optional)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  steelSpecId?: number;
}
