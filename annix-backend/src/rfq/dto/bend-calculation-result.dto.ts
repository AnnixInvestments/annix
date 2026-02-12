import { ApiProperty } from '@nestjs/swagger';

export class BendCalculationResultDto {
  @ApiProperty({ 
    description: 'Total weight of the bend assembly in kg', 
    example: 125.5 
  })
  totalWeight: number;

  @ApiProperty({ 
    description: 'Center-to-face dimension in mm', 
    example: 525.0 
  })
  centerToFaceDimension: number;

  @ApiProperty({ 
    description: 'Weight of the bend itself (without tangents) in kg', 
    example: 85.2 
  })
  bendWeight: number;

  @ApiProperty({ 
    description: 'Total weight of tangent sections in kg', 
    example: 25.8 
  })
  tangentWeight: number;

  @ApiProperty({ 
    description: 'Total weight of flanges in kg', 
    example: 14.5 
  })
  flangeWeight: number;

  @ApiProperty({ 
    description: 'Number of flanges required', 
    example: 3 
  })
  numberOfFlanges: number;

  @ApiProperty({ 
    description: 'Number of flange welds', 
    example: 2 
  })
  numberOfFlangeWelds: number;

  @ApiProperty({ 
    description: 'Total length of flange welds in linear meters', 
    example: 2.199 
  })
  totalFlangeWeldLength: number;

  @ApiProperty({ 
    description: 'Number of butt welds', 
    example: 1 
  })
  numberOfButtWelds: number;

  @ApiProperty({ 
    description: 'Total length of butt welds in linear meters', 
    example: 1.099 
  })
  totalButtWeldLength: number;

  @ApiProperty({ 
    description: 'Outside diameter in mm', 
    example: 355.6 
  })
  outsideDiameterMm: number;

  @ApiProperty({ 
    description: 'Wall thickness in mm', 
    example: 6.35 
  })
  wallThicknessMm: number;
}