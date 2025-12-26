import { ApiProperty } from '@nestjs/swagger';

export class PvcTransportItemWeightDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  nominalDiameter: number;

  @ApiProperty({ required: false })
  pressureRating?: number;

  @ApiProperty({ required: false })
  length?: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  weightKg: number;
}

export class PvcTransportWeightResponseDto {
  @ApiProperty({ type: [PvcTransportItemWeightDto] })
  items: PvcTransportItemWeightDto[];

  @ApiProperty()
  totalWeight: number;

  @ApiProperty()
  itemCount: number;
}
