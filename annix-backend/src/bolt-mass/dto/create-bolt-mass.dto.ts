import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateBoltMassDto {
  @ApiProperty({
    description: 'Bolt ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  boltId: number; // FK -> Bolt

  @ApiProperty({
    description: 'Length of the bolt in mm',
    example: 50,
  })  
  @IsInt()
  length_mm: number;

  @ApiProperty({
    description: 'Mass of the bolt in kg',
    example: 0.137,
  })  
  @IsNumber()
  mass_kg: number;
}
