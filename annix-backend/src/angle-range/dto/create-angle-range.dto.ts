import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAngleRangeDto {
  @ApiProperty({ description: 'Minimum angle in degrees', example: 30 })
  @IsNumber()
  @IsNotEmpty()
  angle_min: number;

  @ApiProperty({ description: 'Maximum angle in degrees', example: 90 })
  @IsNumber()
  @IsNotEmpty()
  angle_max: number;
}
