import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateFlangeStandardDto {
  @ApiProperty({
    description: 'Code of the flange standard',
    example: 'BS 4504', // could also be "SABS 1123", "ASME B16.5", etc.
  })
  @IsString()
  code: string; // "BS 4504", "SABS 1123"
}
