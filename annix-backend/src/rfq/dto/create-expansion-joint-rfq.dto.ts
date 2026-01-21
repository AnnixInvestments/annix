import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import {
  ExpansionJointType,
  BellowsJointType,
  BellowsMaterial,
  FabricatedLoopType,
} from '../entities/expansion-joint-rfq.entity';

export class CreateExpansionJointRfqDto {
  @ApiProperty({
    description: 'Type of expansion joint',
    enum: ExpansionJointType,
  })
  @IsEnum(ExpansionJointType)
  expansionJointType: ExpansionJointType;

  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Schedule number', required: false })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiProperty({ description: 'Wall thickness in mm', required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Outside diameter in mm', required: false })
  @IsOptional()
  @IsNumber()
  outsideDiameterMm?: number;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({
    description: 'Bellows joint type (for bought-in)',
    enum: BellowsJointType,
    required: false,
  })
  @IsOptional()
  @IsEnum(BellowsJointType)
  bellowsJointType?: BellowsJointType;

  @ApiProperty({
    description: 'Bellows material (for bought-in)',
    enum: BellowsMaterial,
    required: false,
  })
  @IsOptional()
  @IsEnum(BellowsMaterial)
  bellowsMaterial?: BellowsMaterial;

  @ApiProperty({ description: 'Axial movement in mm', required: false })
  @IsOptional()
  @IsNumber()
  axialMovementMm?: number;

  @ApiProperty({ description: 'Lateral movement in mm', required: false })
  @IsOptional()
  @IsNumber()
  lateralMovementMm?: number;

  @ApiProperty({ description: 'Angular movement in degrees', required: false })
  @IsOptional()
  @IsNumber()
  angularMovementDeg?: number;

  @ApiProperty({ description: 'Supplier reference', required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: 'Catalog number', required: false })
  @IsOptional()
  @IsString()
  catalogNumber?: string;

  @ApiProperty({ description: 'Unit cost from supplier', required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({
    description: 'Markup percentage',
    example: 15.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({
    description: 'Fabricated loop type',
    enum: FabricatedLoopType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FabricatedLoopType)
  loopType?: FabricatedLoopType;

  @ApiProperty({ description: 'Loop height in mm', required: false })
  @IsOptional()
  @IsNumber()
  loopHeightMm?: number;

  @ApiProperty({ description: 'Loop width in mm', required: false })
  @IsOptional()
  @IsNumber()
  loopWidthMm?: number;

  @ApiProperty({ description: 'Total pipe length in mm', required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthTotalMm?: number;

  @ApiProperty({ description: 'Number of elbows', required: false })
  @IsOptional()
  @IsNumber()
  numberOfElbows?: number;

  @ApiProperty({ description: 'End configuration', required: false })
  @IsOptional()
  @IsString()
  endConfiguration?: string;

  @ApiProperty({ description: 'Total weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  totalWeightKg?: number;

  @ApiProperty({ description: 'Pipe weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  pipeWeightKg?: number;

  @ApiProperty({ description: 'Elbow weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  elbowWeightKg?: number;

  @ApiProperty({ description: 'Flange weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  flangeWeightKg?: number;

  @ApiProperty({ description: 'Number of butt welds', required: false })
  @IsOptional()
  @IsNumber()
  numberOfButtWelds?: number;

  @ApiProperty({
    description: 'Total butt weld length in meters',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalButtWeldLengthM?: number;

  @ApiProperty({ description: 'Number of flange welds', required: false })
  @IsOptional()
  @IsNumber()
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: 'Flange weld length in meters', required: false })
  @IsOptional()
  @IsNumber()
  flangeWeldLengthM?: number;

  @ApiProperty({ description: 'Unit cost', required: false })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ description: 'Total cost', required: false })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Calculation data', required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}
