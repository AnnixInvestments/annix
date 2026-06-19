import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum PipeSteelWorkType {
  PIPE_SUPPORT = "pipe_support",
  REINFORCEMENT_PAD = "reinforcement_pad",
  SADDLE_SUPPORT = "saddle_support",
  SHOE_SUPPORT = "shoe_support",
}

export enum BracketType {
  CLEVIS_HANGER = "clevis_hanger",
  THREE_BOLT_CLAMP = "three_bolt_clamp",
  WELDED_BRACKET = "welded_bracket",
  PIPE_SADDLE = "pipe_saddle",
  U_BOLT = "u_bolt",
  BAND_HANGER = "band_hanger",
  ROLLER_SUPPORT = "roller_support",
  SLIDE_PLATE = "slide_plate",
}

export enum SupportStandard {
  MSS_SP_58 = "MSS_SP_58",
  ASME_B31_3 = "ASME_B31_3",
  SANS_10160 = "SANS_10160",
}

export class PipeSteelWorkRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({
    description: "Type of pipe steel work",
    enum: PipeSteelWorkType,
  })
  workType: PipeSteelWorkType;

  @ApiProperty({ description: "Nominal diameter of pipe in mm", example: 200 })
  nominalDiameterMm: number;

  @ApiProperty({
    description: "Outside diameter of pipe in mm",
    example: 219.1,
  })
  outsideDiameterMm?: number;

  @ApiProperty({
    description: "Wall thickness of pipe in mm",
    example: 8.18,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: "Schedule number", example: "Sch40" })
  scheduleNumber?: string;

  @ApiProperty({ description: "Type of bracket", enum: BracketType })
  bracketType?: BracketType;

  @ApiProperty({ description: "Support standard", enum: SupportStandard })
  supportStandard: SupportStandard;

  @ApiProperty({ description: "Support spacing in meters", example: 3.0 })
  supportSpacingM?: number;

  @ApiProperty({ description: "Pipeline length in meters", example: 100 })
  pipelineLengthM?: number;

  @ApiProperty({ description: "Number of supports required", example: 35 })
  numberOfSupports?: number;

  @ApiProperty({
    description: "Working pressure in bar for reinforcement pad calculation",
    example: 10,
  })
  workingPressureBar?: number;

  @ApiProperty({
    description: "Working temperature in Celsius",
    example: 50,
  })
  workingTemperatureC?: number;

  @ApiProperty({ description: "Branch diameter for reinforcement pad (mm)" })
  branchDiameterMm?: number;

  @ApiProperty({ description: "Header diameter for reinforcement pad (mm)" })
  headerDiameterMm?: number;

  @ApiProperty({ description: "Reinforcement pad outer diameter (mm)" })
  padOuterDiameterMm?: number;

  @ApiProperty({ description: "Reinforcement pad thickness (mm)" })
  padThicknessMm?: number;

  @ApiProperty({ description: "Steel specification ID" })
  steelSpecificationId?: number;

  @ApiProperty({ description: "Quantity value", example: 10 })
  quantityValue: number;

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  quantityType: string;

  @ApiProperty({ description: "Weight per unit in kg", example: 5.5 })
  weightPerUnitKg?: number;

  @ApiProperty({ description: "Total weight in kg", example: 55.0 })
  totalWeightKg?: number;

  @ApiProperty({ description: "Unit cost in Rand", example: 150.0 })
  unitCost?: number;

  @ApiProperty({ description: "Total cost in Rand", example: 1500.0 })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  calculationData?: Record<string, any>;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
