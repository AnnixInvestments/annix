import { ApiProperty } from "@nestjs/swagger";
import { BendRfq } from "./bend-rfq.entity";
import { ExpansionJointRfq } from "./expansion-joint-rfq.entity";
import { FastenerRfq } from "./fastener-rfq.entity";
import { FittingRfq } from "./fitting-rfq.entity";
import { InstrumentRfq } from "./instrument-rfq.entity";
import { PipeSteelWorkRfq } from "./pipe-steel-work-rfq.entity";
import { PumpRfq } from "./pump-rfq.entity";
import { Rfq } from "./rfq.entity";
import { StraightPipeRfq } from "./straight-pipe-rfq.entity";
import { SurfaceProtectionRfq } from "./surface-protection-rfq.entity";
import { TankChuteRfq } from "./tank-chute-rfq.entity";
import { ValveRfq } from "./valve-rfq.entity";

export enum RfqItemType {
  STRAIGHT_PIPE = "straight_pipe",
  BEND = "bend",
  FITTING = "fitting",
  FLANGE = "flange",
  CUSTOM = "custom",
  PIPE_STEEL_WORK = "pipe_steel_work",
  EXPANSION_JOINT = "expansion_joint",
  VALVE = "valve",
  INSTRUMENT = "instrument",
  PUMP = "pump",
  SURFACE_PROTECTION = "surface_protection",
  TANK_CHUTE = "tank_chute",
  FASTENER = "fastener",
}

export enum MaterialType {
  STEEL = "steel",
  HDPE = "hdpe",
  PVC = "pvc",
}

export class RfqItem {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Line number in the RFQ", example: 1 })
  lineNumber: number;

  @ApiProperty({
    description: "Item description",
    example: "500NB Sch20 Straight Pipe for 10 Bar Pipeline",
  })
  description: string;

  @ApiProperty({ description: "Type of RFQ item", enum: RfqItemType })
  itemType: RfqItemType;

  @ApiProperty({
    description: "Material type (steel or hdpe)",
    enum: MaterialType,
    default: MaterialType.STEEL,
  })
  materialType: MaterialType;

  @ApiProperty({ description: "Quantity required", example: 656 })
  quantity: number;

  @ApiProperty({
    description: "Estimated weight per unit in kg",
    required: false,
  })
  weightPerUnitKg?: number;

  @ApiProperty({ description: "Total estimated weight in kg", required: false })
  totalWeightKg?: number;

  @ApiProperty({ description: "Unit price", required: false })
  unitPrice?: number;

  @ApiProperty({ description: "Total price", required: false })
  totalPrice?: number;

  @ApiProperty({ description: "Additional notes", required: false })
  notes?: string;

  @ApiProperty({ description: "Parent RFQ", type: () => Rfq })
  rfq: Rfq;

  @ApiProperty({
    description: "Straight pipe details (if item type is straight_pipe)",
    required: false,
    type: () => StraightPipeRfq,
  })
  straightPipeDetails?: StraightPipeRfq;

  @ApiProperty({
    description: "Bend details (if item type is bend)",
    required: false,
    type: () => BendRfq,
  })
  bendDetails?: BendRfq;

  @ApiProperty({
    description: "Fitting details (if item type is fitting)",
    required: false,
    type: () => FittingRfq,
  })
  fittingDetails?: FittingRfq;

  @ApiProperty({
    description: "Pipe steel work details (if item type is pipe_steel_work)",
    required: false,
    type: () => PipeSteelWorkRfq,
  })
  pipeSteelWorkDetails?: PipeSteelWorkRfq;

  @ApiProperty({
    description: "Expansion joint details (if item type is expansion_joint)",
    required: false,
    type: () => ExpansionJointRfq,
  })
  expansionJointDetails?: ExpansionJointRfq;

  @ApiProperty({
    description: "Valve details (if item type is valve)",
    required: false,
    type: () => ValveRfq,
  })
  valveDetails?: ValveRfq;

  @ApiProperty({
    description: "Instrument details (if item type is instrument)",
    required: false,
    type: () => InstrumentRfq,
  })
  instrumentDetails?: InstrumentRfq;

  @ApiProperty({
    description: "Pump details (if item type is pump)",
    required: false,
    type: () => PumpRfq,
  })
  pumpDetails?: PumpRfq;

  @ApiProperty({
    description: "Surface protection details (if item type is surface_protection)",
    required: false,
    type: () => SurfaceProtectionRfq,
  })
  surfaceProtectionDetails?: SurfaceProtectionRfq;

  @ApiProperty({
    description: "Tank/chute details (if item type is tank_chute)",
    required: false,
    type: () => TankChuteRfq,
  })
  tankChuteDetails?: TankChuteRfq;

  @ApiProperty({
    description: "Fastener details (if item type is fastener)",
    required: false,
    type: () => FastenerRfq,
  })
  fastenerDetails?: FastenerRfq;

  createdAt: Date;

  updatedAt: Date;
}
