import { ApiProperty } from '@nestjs/swagger';

export class StraightPipeCalculationResultDto {
  @ApiProperty({ description: 'Calculated outside diameter in mm', example: 508 })
  outsideDiameterMm: number;

  @ApiProperty({ description: 'Wall thickness in mm', example: 15.09 })
  wallThicknessMm: number;

  @ApiProperty({ description: 'Pipe weight per meter in kg', example: 183.4 })
  pipeWeightPerMeter: number;

  @ApiProperty({ description: 'Total pipe weight in kg', example: 1467460 })
  totalPipeWeight: number;

  @ApiProperty({ description: 'Total flange weight in kg', example: 1050.24 })
  totalFlangeWeight: number;

  @ApiProperty({ description: 'Total bolt weight in kg', example: 156.32 })
  totalBoltWeight: number;

  @ApiProperty({ description: 'Total nut weight in kg', example: 78.16 })
  totalNutWeight: number;

  @ApiProperty({ description: 'Total weight including pipes, flanges, bolts and nuts in kg', example: 1468744.72 })
  totalSystemWeight: number;

  @ApiProperty({ description: 'Calculated number of pipes', example: 656 })
  calculatedPipeCount: number;

  @ApiProperty({ description: 'Calculated total length in meters', example: 8000 })
  calculatedTotalLength: number;

  @ApiProperty({ description: 'Number of flanges required', example: 1312 })
  numberOfFlanges: number;

  @ApiProperty({ description: 'Number of butt welds required', example: 0 })
  numberOfButtWelds: number;

  @ApiProperty({ description: 'Total butt weld length in meters', example: 0 })
  totalButtWeldLength: number;

  @ApiProperty({ description: 'Number of flange welds required', example: 1312 })
  numberOfFlangeWelds: number;

  @ApiProperty({ description: 'Total flange weld length in meters', example: 2098.4 })
  totalFlangeWeldLength: number;
}

export class RfqResponseDto {
  @ApiProperty({ description: 'RFQ ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'RFQ number', example: 'RFQ-2025-0001' })
  rfqNumber: string;

  @ApiProperty({ description: 'Project name', example: '500NB Pipeline Extension' })
  projectName: string;

  @ApiProperty({ description: 'Project description', required: false })
  description?: string;

  @ApiProperty({ description: 'Customer company name', required: false })
  customerName?: string;

  @ApiProperty({ description: 'Customer email', required: false })
  customerEmail?: string;

  @ApiProperty({ description: 'Customer phone number', required: false })
  customerPhone?: string;

  @ApiProperty({ description: 'Required delivery date', required: false })
  requiredDate?: Date;

  @ApiProperty({ description: 'RFQ status', example: 'draft' })
  status: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'Total estimated weight in kg', required: false })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Total estimated cost', required: false })
  totalCost?: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Number of items in this RFQ' })
  itemCount: number;
}
