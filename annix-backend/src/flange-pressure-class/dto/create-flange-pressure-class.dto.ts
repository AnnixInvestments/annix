import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlangePressureClassDto {
  @ApiProperty({
    description: 'Designation of the pressure class',
    example: 'PN16', // could also be "6/3", "10/3", "T/D"
  })
  @IsString()
  designation: string; // "6/3", "10/3", "T/D"

  @ApiProperty({
    description: 'Reference to the flange standard (FK)',
    example: 1, // e.g. SANS 719, ASTM A105, etc.
  })
  @IsInt()
  standardId: number; // FK -> FlangeStandard
}
