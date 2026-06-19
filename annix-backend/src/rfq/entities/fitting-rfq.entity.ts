import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export class FittingRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Nominal diameter in mm", example: 500 })
  nominalDiameterMm: number;

  @ApiProperty({ description: "Schedule number", example: "WT6" })
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", example: 6 })
  wallThicknessMm?: number;

  @ApiProperty({ description: "Fitting type", example: "SHORT_TEE" })
  fittingType: string;

  @ApiProperty({ description: "Fitting standard", example: "SABS719" })
  fittingStandard?: string;

  @ApiProperty({ description: "Pipe length A in mm", example: 1020 })
  pipeLengthAMm?: number;

  @ApiProperty({ description: "Pipe length B in mm", example: 510 })
  pipeLengthBMm?: number;

  @ApiProperty({ description: "Pipe end configuration", example: "F2E_RF" })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Whether to add blank flange", example: true })
  addBlankFlange: boolean;

  @ApiProperty({ description: "Blank flange count", example: 1 })
  blankFlangeCount?: number;

  @ApiProperty({
    description: "Blank flange positions as JSON array",
    example: '["inlet"]',
  })
  blankFlangePositions?: string[];

  @ApiProperty({ description: "Quantity value", example: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  quantityType: string;

  @ApiProperty({ description: "Working pressure in bar", example: 10 })
  workingPressureBar?: number;

  @ApiProperty({ description: "Working temperature in Celsius", example: 50 })
  workingTemperatureC?: number;

  @ApiProperty({ description: "Total weight in kg", example: 125.52 })
  totalWeightKg?: number;

  @ApiProperty({ description: "Number of flanges", example: 3 })
  numberOfFlanges?: number;

  @ApiProperty({ description: "Number of flange welds", example: 3 })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: "Number of tee welds", example: 1 })
  numberOfTeeWelds?: number;

  @ApiProperty({ description: "Calculation data as JSON", required: false })
  calculationData?: Record<string, any>;

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

  @ApiProperty({
    description: "HDPE fitting category (butt_fusion, electrofusion, mechanical)",
    required: false,
  })
  hdpeFittingCategory?: string;

  // PVC-specific fields
  @ApiProperty({ description: "PVC type (uPVC, mPVC, PVC-O, cPVC)", required: false })
  pvcType?: string;

  @ApiProperty({ description: "PVC SDR (Standard Dimension Ratio)", required: false })
  pvcSdr?: number;

  @ApiProperty({ description: "PVC pressure class shorthand (e.g. 'Class 16')", required: false })
  pvcPressureClass?: string;

  @ApiProperty({ description: "PVC PN rating in bar", required: false })
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

  @ApiProperty({
    description: "PVC fitting category (solvent_weld, threaded, mechanical, fabricated)",
    required: false,
  })
  pvcFittingCategory?: string;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
