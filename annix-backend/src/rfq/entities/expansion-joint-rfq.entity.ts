import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum ExpansionJointType {
  BOUGHT_IN_BELLOWS = "bought_in_bellows",
  FABRICATED_LOOP = "fabricated_loop",
}

export enum BellowsJointType {
  AXIAL = "axial",
  UNIVERSAL = "universal",
  HINGED = "hinged",
  GIMBAL = "gimbal",
  TIED_UNIVERSAL = "tied_universal",
}

export enum BellowsMaterial {
  STAINLESS_STEEL_304 = "stainless_steel_304",
  STAINLESS_STEEL_316 = "stainless_steel_316",
  RUBBER_EPDM = "rubber_epdm",
  RUBBER_NEOPRENE = "rubber_neoprene",
  PTFE = "ptfe",
  FABRIC_REINFORCED = "fabric_reinforced",
}

export enum FabricatedLoopType {
  FULL_LOOP = "full_loop",
  HORSESHOE_LYRE = "horseshoe_lyre",
  Z_OFFSET = "z_offset",
  L_OFFSET = "l_offset",
}

export class ExpansionJointRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Type of expansion joint",
    enum: ExpansionJointType,
  })
  expansionJointType: ExpansionJointType;

  @ApiProperty({ description: "Nominal diameter in mm", example: 200 })
  nominalDiameterMm: number;

  @ApiProperty({ description: "Schedule number", example: "Sch40" })
  scheduleNumber?: string;

  @ApiProperty({ description: "Wall thickness in mm" })
  wallThicknessMm?: number;

  @ApiProperty({ description: "Outside diameter in mm" })
  outsideDiameterMm?: number;

  @ApiProperty({ description: "Quantity value", example: 1 })
  quantityValue: number;

  @ApiProperty({
    description: "Bellows joint type (for bought-in)",
    enum: BellowsJointType,
  })
  bellowsJointType?: BellowsJointType;

  @ApiProperty({
    description: "Bellows material (for bought-in)",
    enum: BellowsMaterial,
  })
  bellowsMaterial?: BellowsMaterial;

  @ApiProperty({ description: "Axial movement in mm" })
  axialMovementMm?: number;

  @ApiProperty({ description: "Lateral movement in mm" })
  lateralMovementMm?: number;

  @ApiProperty({ description: "Angular movement in degrees" })
  angularMovementDeg?: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

  @ApiProperty({ description: "Catalog number" })
  catalogNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier" })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", example: 15.0 })
  markupPercentage: number;

  @ApiProperty({
    description: "Fabricated loop type",
    enum: FabricatedLoopType,
  })
  loopType?: FabricatedLoopType;

  @ApiProperty({ description: "Loop height in mm" })
  loopHeightMm?: number;

  @ApiProperty({ description: "Loop width in mm" })
  loopWidthMm?: number;

  @ApiProperty({ description: "Total pipe length in mm" })
  pipeLengthTotalMm?: number;

  @ApiProperty({ description: "Number of elbows" })
  numberOfElbows?: number;

  @ApiProperty({ description: "End configuration" })
  endConfiguration?: string;

  @ApiProperty({ description: "Total weight in kg" })
  totalWeightKg?: number;

  @ApiProperty({ description: "Pipe weight in kg" })
  pipeWeightKg?: number;

  @ApiProperty({ description: "Elbow weight in kg" })
  elbowWeightKg?: number;

  @ApiProperty({ description: "Flange weight in kg" })
  flangeWeightKg?: number;

  @ApiProperty({ description: "Number of butt welds" })
  numberOfButtWelds?: number;

  @ApiProperty({ description: "Total butt weld length in meters" })
  totalButtWeldLengthM?: number;

  @ApiProperty({ description: "Number of flange welds" })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: "Flange weld length in meters" })
  flangeWeldLengthM?: number;

  @ApiProperty({ description: "Unit cost in Rand" })
  unitCost?: number;

  @ApiProperty({ description: "Total cost in Rand" })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  calculationData?: Record<string, any>;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
