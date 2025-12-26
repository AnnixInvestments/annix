import { ApiProperty } from '@nestjs/swagger';

export class PvcFittingCostResponseDto {
  @ApiProperty()
  fittingType: string;

  @ApiProperty()
  fittingTypeCode: string;

  @ApiProperty()
  nominalDiameter: number;

  @ApiProperty()
  weightKg: number;

  @ApiProperty()
  numJoints: number;

  @ApiProperty()
  isSocket: boolean;

  @ApiProperty()
  isFlanged: boolean;

  @ApiProperty()
  isThreaded: boolean;

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
