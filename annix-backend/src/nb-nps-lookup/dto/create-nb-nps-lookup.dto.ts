import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class CreateNbNpsLookupDto {
  @ApiProperty({
    description: 'Nominal Bore (DN) in millimeters',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  nb_mm: number;

  @ApiProperty({
    description: 'Nominal Pipe Size (NPS) in inches',
    example: 4,
  })
  @IsNumber()
  @IsNotEmpty()
  nps_inch: number;

  @ApiProperty({
    description: 'Outside Diameter (OD) in millimeters',
    example: 114.3,
  })
  @IsNumber()
  @IsNotEmpty()
  outside_diameter_mm: number;
}
