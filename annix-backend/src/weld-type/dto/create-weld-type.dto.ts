import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWeldTypeDto {
  @ApiProperty({ example: 'FW_STR', description: 'Weld type code (short identifier)' })
  @IsString()
  @IsNotEmpty()
  weld_code: string;

  @ApiProperty({ example: 'Flange Weld - Straight', description: 'Full name of the weld type' })
  @IsString()
  @IsNotEmpty()
  weld_name: string;

  @ApiProperty({ example: 'FLANGE', description: 'Weld category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'Flange weld for straight pipe connections', description: 'Detailed description of the weld type', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
