import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFittingTypeDto {
  @ApiProperty({ description: 'Name of the fitting type', example: 'Elbow' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
