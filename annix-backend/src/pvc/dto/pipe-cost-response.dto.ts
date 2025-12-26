import { ApiProperty } from '@nestjs/swagger';

export class PvcPipeCostResponseDto {
  @ApiProperty()
  nominalDiameter: number;

  @ApiProperty()
  pressureRating: number;

  @ApiProperty()
  pvcType: string;

  @ApiProperty()
  length: number;

  @ApiProperty()
  outerDiameter: number;

  @ApiProperty()
  wallThickness: number;

  @ApiProperty()
  innerDiameter: number;

  @ApiProperty()
  weightKgPerM: number;

  @ApiProperty()
  totalWeight: number;

  @ApiProperty()
  numJoints: number;

  @ApiProperty()
  materialCost: number;

  @ApiProperty()
  cementJointCost: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  pricePerKg: number;

  @ApiProperty()
  cementJointPrice: number;
}
