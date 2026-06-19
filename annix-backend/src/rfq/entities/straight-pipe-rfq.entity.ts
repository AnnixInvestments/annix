import { ApiProperty } from "@nestjs/swagger";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";
import { RfqItem } from "./rfq-item.entity";

export enum LengthUnit {
  METERS = "meters",
  FEET = "feet",
}

export enum QuantityType {
  TOTAL_LENGTH = "total_length",
  NUMBER_OF_PIPES = "number_of_pipes",
}

export enum ScheduleType {
  SCHEDULE = "schedule",
  WALL_THICKNESS = "wall_thickness",
}

export class StraightPipeRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Nominal bore in mm", example: 500 })
  nominalBoreMm: number;

  @ApiProperty({
    description: "Schedule type - using schedule number or wall thickness",
    enum: ScheduleType,
  })
  scheduleType: ScheduleType;

  @ApiProperty({
    description: "Schedule number (e.g., Sch20, Sch40)",
    required: false,
  })
  scheduleNumber?: string;

  @ApiProperty({
    description: "Wall thickness in mm (if not using schedule)",
    required: false,
  })
  wallThicknessMm?: number;

  @ApiProperty({
    description: "Pipe end configuration",
    example: "FBE",
    required: false,
  })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Individual pipe length", example: 12.192 })
  individualPipeLength: number;

  @ApiProperty({ description: "Length unit", enum: LengthUnit })
  lengthUnit: LengthUnit;

  @ApiProperty({
    description: "Quantity type - total length or number of pipes",
    enum: QuantityType,
  })
  quantityType: QuantityType;

  @ApiProperty({
    description: "Quantity value - total meters or number of pipes",
    example: 8000,
  })
  quantityValue: number;

  @ApiProperty({ description: "Working pressure in bar", example: 10 })
  workingPressureBar: number;

  @ApiProperty({
    description: "Working temperature in celsius",
    required: false,
  })
  workingTemperatureC?: number;

  // Calculated fields
  @ApiProperty({
    description: "Calculated outside diameter in mm",
    required: false,
  })
  calculatedOdMm?: number;

  @ApiProperty({
    description: "Calculated wall thickness in mm",
    required: false,
  })
  calculatedWtMm?: number;

  @ApiProperty({
    description: "Calculated pipe weight per meter in kg",
    required: false,
  })
  pipeWeightPerMeterKg?: number;

  @ApiProperty({
    description: "Calculated total pipe weight in kg",
    required: false,
  })
  totalPipeWeightKg?: number;

  @ApiProperty({ description: "Calculated number of pipes", required: false })
  calculatedPipeCount?: number;

  @ApiProperty({
    description: "Calculated total length in meters",
    required: false,
  })
  calculatedTotalLengthM?: number;

  @ApiProperty({ description: "Number of flanges required", required: false })
  numberOfFlanges?: number;

  @ApiProperty({
    description: "Number of butt welds required",
    required: false,
  })
  numberOfButtWelds?: number;

  @ApiProperty({
    description: "Total butt weld length in meters",
    required: false,
  })
  totalButtWeldLengthM?: number;

  @ApiProperty({
    description: "Number of flange welds required",
    required: false,
  })
  numberOfFlangeWelds?: number;

  @ApiProperty({
    description: "Total flange weld length in meters",
    required: false,
  })
  totalFlangeWeldLengthM?: number;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  sscTested?: boolean;

  @ApiProperty({ description: "Manufacturing process (Seamless, ERW, SAW, LSAW)", required: false })
  manufacturingProcess?: string;

  @ApiProperty({ description: "Delivery condition (As-Rolled, Normalized, Q&T)", required: false })
  deliveryCondition?: string;

  @ApiProperty({ description: "Bevel angle in degrees (default 37.5°)", required: false })
  bevelAngleDeg?: number;

  @ApiProperty({ description: "Root face dimension in mm (default 1.6mm)", required: false })
  rootFaceMm?: number;

  @ApiProperty({ description: "Root gap dimension in mm (1.6-3.2mm range)", required: false })
  rootGapMm?: number;

  @ApiProperty({ description: "UNS number (e.g., K03006 for A106 Gr.B)", required: false })
  unsNumber?: string;

  @ApiProperty({ description: "Specified Minimum Yield Strength in MPa", required: false })
  smysMpa?: number;

  @ApiProperty({ description: "Carbon equivalent for weldability (Ceq ≤0.43)", required: false })
  carbonEquivalent?: number;

  @ApiProperty({ description: "Hydrotest pressure multiplier (default 1.5)", required: false })
  hydrotestPressureMultiplier?: number;

  @ApiProperty({ description: "Hydrotest hold time in minutes (default 10)", required: false })
  hydrotestHoldMin?: number;

  @ApiProperty({
    description: "NDT methods required (RT, UT, MT, PT, VT)",
    required: false,
    example: ["RT", "UT"],
  })
  ndtMethods?: string[];

  @ApiProperty({ description: "Length type (SRL, DRL, Custom)", required: false })
  lengthType?: string;

  // HDPE-specific fields
  @ApiProperty({ description: "HDPE PE grade (PE100, PE4710, etc.)", required: false })
  hdpePeGrade?: string;

  @ApiProperty({ description: "HDPE SDR (Standard Dimension Ratio)", required: false })
  hdpeSdr?: number;

  @ApiProperty({
    description: "HDPE PN rating in bar (calculated from SDR/grade)",
    required: false,
  })
  hdpePnRating?: number;

  @ApiProperty({ description: "HDPE color code (black, blue, yellow)", required: false })
  hdpeColorCode?: string;

  @ApiProperty({
    description: "HDPE operating temperature in Celsius for derating",
    required: false,
  })
  hdpeOperatingTempC?: number;

  @ApiProperty({ description: "HDPE derated PN after temperature adjustment", required: false })
  hdpeDeratedPn?: number;

  @ApiProperty({
    description: "HDPE welding method (butt_fusion, electrofusion)",
    required: false,
  })
  hdpeWeldingMethod?: string;

  @ApiProperty({
    description: "HDPE welding standard (ASTM_F2620, ISO_21307, DVS_2207_1)",
    required: false,
  })
  hdpeWeldingStandard?: string;

  @ApiProperty({ description: "Number of HDPE fusion joints", required: false })
  hdpeJointCount?: number;

  // PVC-specific fields
  @ApiProperty({ description: "PVC type (uPVC, mPVC, PVC-O, cPVC)", required: false })
  pvcType?: string;

  @ApiProperty({ description: "PVC SDR (Standard Dimension Ratio)", required: false })
  pvcSdr?: number;

  @ApiProperty({ description: "PVC pressure class shorthand (e.g. 'Class 16')", required: false })
  pvcPressureClass?: string;

  @ApiProperty({
    description: "PVC PN rating in bar (resolved from SDR / class)",
    required: false,
  })
  pvcPnRating?: number;

  @ApiProperty({ description: "PVC derated PN after temperature adjustment", required: false })
  pvcDeratedPn?: number;

  @ApiProperty({
    description: "PVC operating temperature in Celsius for derating",
    required: false,
  })
  pvcOperatingTempC?: number;

  @ApiProperty({
    description: "PVC joining method (solvent_weld, threaded, push_fit, flanged)",
    required: false,
  })
  pvcJoiningMethod?: string;

  @ApiProperty({ description: "PVC color (grey, white, black, blue)", required: false })
  pvcColor?: string;

  // Relationships
  @ApiProperty({ description: "Parent RFQ item", type: () => RfqItem })
  rfqItem: RfqItem;

  @ApiProperty({ description: "Steel specification", required: false })
  steelSpecification?: SteelSpecification;
}
