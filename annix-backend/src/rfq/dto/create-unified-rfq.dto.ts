import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { NaceRequiresHardnessLimit, Psl2RequiresCvn } from "../../shared/validators";
import { CreateRfqDto } from "./create-rfq.dto";

export class UnifiedStraightPipeDto {
  @ApiProperty({ description: "Nominal bore in mm", example: 500 })
  @IsNumber()
  nominalBoreMm: number;

  @ApiProperty({ description: "Schedule type", example: "schedule" })
  @IsString()
  scheduleType: string;

  @ApiProperty({ description: "Schedule number", example: "WT6" })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: "Pipe end configuration", example: "FOE_LF" })
  @IsString()
  pipeEndConfiguration: string;

  @ApiProperty({ description: "Individual pipe length", example: 12.192 })
  @IsNumber()
  individualPipeLength: number;

  @ApiProperty({ description: "Length unit", example: "meters" })
  @IsString()
  lengthUnit: string;

  @ApiProperty({ description: "Quantity type", example: "number_of_pipes" })
  @IsString()
  quantityType: string;

  @ApiProperty({ description: "Quantity value", example: 1 })
  @IsNumber()
  quantityValue: number;

  @ApiProperty({ description: "Working pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: "Working temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({ description: "Steel specification ID", required: false })
  @IsOptional()
  @IsNumber()
  steelSpecificationId?: number;

  @ApiProperty({ description: "Flange standard ID", required: false })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ description: "Flange pressure class ID", required: false })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @IsOptional()
  @IsString()
  @Psl2RequiresCvn()
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber()
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @IsOptional()
  @IsString()
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @IsOptional()
  @IsString()
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @IsOptional()
  @IsNumber()
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @IsOptional()
  @IsBoolean()
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @IsOptional()
  @IsNumber()
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @IsOptional()
  @IsNumber()
  @NaceRequiresHardnessLimit()
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @IsOptional()
  @IsBoolean()
  sscTested?: boolean;
}

export class UnifiedBendDto {
  @ApiProperty({ description: "Nominal bore in mm", example: 500 })
  @IsNumber()
  nominalBoreMm: number;

  @ApiProperty({ description: "Schedule number", example: "WT6" })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({
    description: "Bend type (1D, 1.5D, 2D, 3D, 5D) - for pulled bends",
    example: "3D",
    required: false,
  })
  @IsOptional()
  @IsString()
  bendType?: string;

  @ApiProperty({
    description: "Bend radius type (elbow, medium, long) - for SABS 719 segmented bends",
    example: "long",
    required: false,
  })
  @IsOptional()
  @IsString()
  bendRadiusType?: string;

  @ApiProperty({ description: "Bend degrees", example: 90 })
  @IsNumber()
  bendDegrees: number;

  @ApiProperty({
    description: "Bend end configuration",
    example: "2xLF",
    required: false,
  })
  @IsOptional()
  @IsString()
  bendEndConfiguration?: string;

  @ApiProperty({ description: "Number of tangents", example: 1 })
  @IsNumber()
  numberOfTangents: number;

  @ApiProperty({ description: "Tangent lengths in mm", example: [1500] })
  @IsArray()
  tangentLengths: number[];

  @ApiProperty({
    description: "Center to face dimension in mm",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  centerToFaceMm?: number;

  @ApiProperty({
    description: "Number of segments (for segmented bends)",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  numberOfSegments?: number;

  @ApiProperty({ description: "Calculation data JSON", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  @IsString()
  quantityType: string;

  @ApiProperty({ description: "Quantity value", example: 1 })
  @IsNumber()
  quantityValue: number;

  @ApiProperty({ description: "Working pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: "Working temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({ description: "Steel specification ID", required: false })
  @IsOptional()
  @IsNumber()
  steelSpecificationId?: number;

  @ApiProperty({ description: "Use global flange specs", example: true })
  @IsOptional()
  @IsBoolean()
  useGlobalFlangeSpecs?: boolean;

  @ApiProperty({ description: "Flange standard ID", required: false })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ description: "Flange pressure class ID", required: false })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @IsOptional()
  @IsString()
  @Psl2RequiresCvn()
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber()
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @IsOptional()
  @IsString()
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @IsOptional()
  @IsString()
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @IsOptional()
  @IsNumber()
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @IsOptional()
  @IsBoolean()
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @IsOptional()
  @IsNumber()
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @IsOptional()
  @IsNumber()
  @NaceRequiresHardnessLimit()
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @IsOptional()
  @IsBoolean()
  sscTested?: boolean;
}

export class UnifiedExpansionJointDto {
  @ApiProperty({
    description: "Expansion joint type",
    example: "bought_in_bellows",
  })
  @IsString()
  expansionJointType: string;

  @ApiProperty({ description: "Nominal diameter in mm", example: 200 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiProperty({ description: "Schedule number", required: false })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiProperty({ description: "Wall thickness in mm", required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: "Outside diameter in mm", required: false })
  @IsOptional()
  @IsNumber()
  outsideDiameterMm?: number;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Bellows joint type", required: false })
  @IsOptional()
  @IsString()
  bellowsJointType?: string;

  @ApiProperty({ description: "Bellows material", required: false })
  @IsOptional()
  @IsString()
  bellowsMaterial?: string;

  @ApiProperty({ description: "Axial movement in mm", required: false })
  @IsOptional()
  @IsNumber()
  axialMovementMm?: number;

  @ApiProperty({ description: "Lateral movement in mm", required: false })
  @IsOptional()
  @IsNumber()
  lateralMovementMm?: number;

  @ApiProperty({ description: "Angular movement in degrees", required: false })
  @IsOptional()
  @IsNumber()
  angularMovementDeg?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: "Catalog number", required: false })
  @IsOptional()
  @IsString()
  catalogNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier", required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: "Fabricated loop type", required: false })
  @IsOptional()
  @IsString()
  loopType?: string;

  @ApiProperty({ description: "Loop height in mm", required: false })
  @IsOptional()
  @IsNumber()
  loopHeightMm?: number;

  @ApiProperty({ description: "Loop width in mm", required: false })
  @IsOptional()
  @IsNumber()
  loopWidthMm?: number;

  @ApiProperty({ description: "Total pipe length in mm", required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthTotalMm?: number;

  @ApiProperty({ description: "Number of elbows", required: false })
  @IsOptional()
  @IsNumber()
  numberOfElbows?: number;

  @ApiProperty({ description: "End configuration", required: false })
  @IsOptional()
  @IsString()
  endConfiguration?: string;

  @ApiProperty({ description: "Calculation data", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class UnifiedFittingDto {
  @ApiProperty({ description: "Nominal diameter in mm", example: 500 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiProperty({ description: "Schedule number", example: "WT6" })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: "Fitting type", example: "SHORT_TEE" })
  @IsString()
  fittingType: string;

  @ApiProperty({ description: "Fitting standard", example: "SABS719" })
  @IsOptional()
  @IsString()
  fittingStandard?: string;

  @ApiProperty({ description: "Pipe length A in mm", required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthAMm?: number;

  @ApiProperty({ description: "Pipe length B in mm", required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthBMm?: number;

  @ApiProperty({ description: "Pipe end configuration", required: false })
  @IsOptional()
  @IsString()
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Add blank flange", example: true })
  @IsOptional()
  @IsBoolean()
  addBlankFlange?: boolean;

  @ApiProperty({ description: "Blank flange count", required: false })
  @IsOptional()
  @IsNumber()
  blankFlangeCount?: number;

  @ApiProperty({ description: "Blank flange positions", required: false })
  @IsOptional()
  @IsArray()
  blankFlangePositions?: string[];

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  @IsOptional()
  @IsString()
  quantityType?: string;

  @ApiProperty({ description: "Quantity value", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Working pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: "Working temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({
    description: "Calculation data from frontend",
    required: false,
  })
  @IsOptional()
  calculationData?: Record<string, any>;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @IsOptional()
  @IsString()
  @Psl2RequiresCvn()
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber()
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @IsOptional()
  @IsNumber()
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @IsOptional()
  @IsString()
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @IsOptional()
  @IsString()
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @IsOptional()
  @IsNumber()
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @IsOptional()
  @IsBoolean()
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @IsOptional()
  @IsNumber()
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @IsOptional()
  @IsNumber()
  @NaceRequiresHardnessLimit()
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @IsOptional()
  @IsBoolean()
  sscTested?: boolean;
}

export class UnifiedPumpDto {
  @ApiProperty({ description: "Service type", example: "new_pump" })
  @IsString()
  serviceType: string;

  @ApiProperty({ description: "Pump type", example: "centrifugal_end_suction" })
  @IsString()
  pumpType: string;

  @ApiProperty({ description: "Pump category", required: false })
  @IsOptional()
  @IsString()
  pumpCategory?: string;

  @ApiProperty({ description: "Flow rate in m³/h", required: false })
  @IsOptional()
  @IsNumber()
  flowRate?: number;

  @ApiProperty({ description: "Total head in meters", required: false })
  @IsOptional()
  @IsNumber()
  totalHead?: number;

  @ApiProperty({ description: "Suction head in meters", required: false })
  @IsOptional()
  @IsNumber()
  suctionHead?: number;

  @ApiProperty({ description: "NPSHa in meters", required: false })
  @IsOptional()
  @IsNumber()
  npshAvailable?: number;

  @ApiProperty({ description: "Discharge pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  dischargePressure?: number;

  @ApiProperty({
    description: "Operating temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  operatingTemp?: number;

  @ApiProperty({ description: "Fluid type", example: "water" })
  @IsString()
  fluidType: string;

  @ApiProperty({ description: "Specific gravity", required: false })
  @IsOptional()
  @IsNumber()
  specificGravity?: number;

  @ApiProperty({ description: "Viscosity in cP", required: false })
  @IsOptional()
  @IsNumber()
  viscosity?: number;

  @ApiProperty({ description: "Solids content percentage", required: false })
  @IsOptional()
  @IsNumber()
  solidsContent?: number;

  @ApiProperty({ description: "Max solids size in mm", required: false })
  @IsOptional()
  @IsNumber()
  solidsSize?: number;

  @ApiProperty({ description: "pH level", required: false })
  @IsOptional()
  @IsNumber()
  ph?: number;

  @ApiProperty({ description: "Is fluid abrasive", required: false })
  @IsOptional()
  @IsBoolean()
  isAbrasive?: boolean;

  @ApiProperty({ description: "Is fluid corrosive", required: false })
  @IsOptional()
  @IsBoolean()
  isCorrosive?: boolean;

  @ApiProperty({ description: "Casing material", example: "cast_iron" })
  @IsString()
  casingMaterial: string;

  @ApiProperty({ description: "Impeller material", example: "bronze" })
  @IsString()
  impellerMaterial: string;

  @ApiProperty({ description: "Shaft material", required: false })
  @IsOptional()
  @IsString()
  shaftMaterial?: string;

  @ApiProperty({ description: "Seal type", required: false })
  @IsOptional()
  @IsString()
  sealType?: string;

  @ApiProperty({ description: "Seal flush plan", required: false })
  @IsOptional()
  @IsString()
  sealPlan?: string;

  @ApiProperty({ description: "Suction size DN", required: false })
  @IsOptional()
  @IsString()
  suctionSize?: string;

  @ApiProperty({ description: "Discharge size DN", required: false })
  @IsOptional()
  @IsString()
  dischargeSize?: string;

  @ApiProperty({ description: "Connection type", required: false })
  @IsOptional()
  @IsString()
  connectionType?: string;

  @ApiProperty({ description: "Motor type", required: false })
  @IsOptional()
  @IsString()
  motorType?: string;

  @ApiProperty({ description: "Motor power in kW", required: false })
  @IsOptional()
  @IsNumber()
  motorPower?: number;

  @ApiProperty({ description: "Voltage", required: false })
  @IsOptional()
  @IsString()
  voltage?: string;

  @ApiProperty({ description: "Frequency", required: false })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({ description: "Motor efficiency class", required: false })
  @IsOptional()
  @IsString()
  motorEfficiency?: string;

  @ApiProperty({ description: "Motor enclosure", required: false })
  @IsOptional()
  @IsString()
  enclosure?: string;

  @ApiProperty({
    description: "Hazardous area classification",
    required: false,
  })
  @IsOptional()
  @IsString()
  hazardousArea?: string;

  @ApiProperty({ description: "Certifications array", required: false })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiProperty({
    description: "Spare part category (for spare parts)",
    required: false,
  })
  @IsOptional()
  @IsString()
  sparePartCategory?: string;

  @ApiProperty({ description: "Spare parts list", required: false })
  @IsOptional()
  spareParts?: Record<string, any>[];

  @ApiProperty({ description: "Existing pump model", required: false })
  @IsOptional()
  @IsString()
  existingPumpModel?: string;

  @ApiProperty({ description: "Existing pump serial", required: false })
  @IsOptional()
  @IsString()
  existingPumpSerial?: string;

  @ApiProperty({ description: "Rental duration in days", required: false })
  @IsOptional()
  @IsNumber()
  rentalDurationDays?: number;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: "Unit cost from supplier", required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: "Calculation data", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class UnifiedValveDto {
  @ApiProperty({ description: "Valve type", example: "ball_valve" })
  @IsString()
  valveType: string;

  @ApiProperty({ description: "Valve category", required: false })
  @IsOptional()
  @IsString()
  valveCategory?: string;

  @ApiProperty({ description: "Valve size in DN", example: "100" })
  @IsString()
  size: string;

  @ApiProperty({ description: "Pressure class", example: "class_150" })
  @IsString()
  pressureClass: string;

  @ApiProperty({ description: "End connection type", example: "flanged_rf" })
  @IsString()
  connectionType: string;

  @ApiProperty({ description: "Body material", example: "cf8m" })
  @IsString()
  bodyMaterial: string;

  @ApiProperty({ description: "Trim material", required: false })
  @IsOptional()
  @IsString()
  trimMaterial?: string;

  @ApiProperty({ description: "Seat/seal material", example: "ptfe" })
  @IsString()
  seatMaterial: string;

  @ApiProperty({ description: "Port type", required: false })
  @IsOptional()
  @IsString()
  portType?: string;

  @ApiProperty({ description: "Actuator type", example: "pneumatic_sr" })
  @IsString()
  actuatorType: string;

  @ApiProperty({ description: "Air supply pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  airSupply?: number;

  @ApiProperty({
    description: "Voltage for electric actuators",
    required: false,
  })
  @IsOptional()
  @IsString()
  voltage?: string;

  @ApiProperty({ description: "Fail position", required: false })
  @IsOptional()
  @IsString()
  failPosition?: string;

  @ApiProperty({ description: "Positioner type", required: false })
  @IsOptional()
  @IsString()
  positioner?: string;

  @ApiProperty({ description: "Has limit switches", required: false })
  @IsOptional()
  @IsBoolean()
  limitSwitches?: boolean;

  @ApiProperty({ description: "Has solenoid valve", required: false })
  @IsOptional()
  @IsBoolean()
  solenoidValve?: boolean;

  @ApiProperty({ description: "Process media" })
  @IsString()
  media: string;

  @ApiProperty({ description: "Operating pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  operatingPressure?: number;

  @ApiProperty({
    description: "Operating temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  operatingTemp?: number;

  @ApiProperty({
    description: "Hazardous area classification",
    required: false,
  })
  @IsOptional()
  @IsString()
  hazardousArea?: string;

  @ApiProperty({ description: "Flow coefficient Cv", required: false })
  @IsOptional()
  @IsNumber()
  cv?: number;

  @ApiProperty({ description: "Flow rate in m3/h", required: false })
  @IsOptional()
  @IsNumber()
  flowRate?: number;

  @ApiProperty({ description: "Seat leakage class", required: false })
  @IsOptional()
  @IsString()
  seatLeakageClass?: string;

  @ApiProperty({ description: "Fire safe standard", required: false })
  @IsOptional()
  @IsString()
  fireSafeStandard?: string;

  @ApiProperty({ description: "Cryogenic service type", required: false })
  @IsOptional()
  @IsString()
  cryogenicService?: string;

  @ApiProperty({ description: "Fugitive emissions standard", required: false })
  @IsOptional()
  @IsString()
  fugitiveEmissions?: string;

  @ApiProperty({ description: "Extended bonnet type", required: false })
  @IsOptional()
  @IsString()
  extendedBonnet?: string;

  @ApiProperty({ description: "Certifications", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: "Unit cost from supplier", required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: "Calculation data", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class UnifiedInstrumentDto {
  @ApiProperty({ description: "Instrument type", example: "mag_flowmeter" })
  @IsString()
  instrumentType: string;

  @ApiProperty({ description: "Instrument category", example: "flow" })
  @IsString()
  instrumentCategory: string;

  @ApiProperty({ description: "Size in DN", required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ description: "Process connection type" })
  @IsString()
  processConnection: string;

  @ApiProperty({ description: "Wetted parts material" })
  @IsString()
  wettedMaterial: string;

  @ApiProperty({ description: "Measurement range minimum", required: false })
  @IsOptional()
  @IsNumber()
  rangeMin?: number;

  @ApiProperty({ description: "Measurement range maximum", required: false })
  @IsOptional()
  @IsNumber()
  rangeMax?: number;

  @ApiProperty({ description: "Range unit", required: false })
  @IsOptional()
  @IsString()
  rangeUnit?: string;

  @ApiProperty({ description: "Output signal type", required: false })
  @IsOptional()
  @IsString()
  outputSignal?: string;

  @ApiProperty({ description: "Communication protocol", required: false })
  @IsOptional()
  @IsString()
  communicationProtocol?: string;

  @ApiProperty({ description: "Display type", required: false })
  @IsOptional()
  @IsString()
  displayType?: string;

  @ApiProperty({ description: "Power supply type", required: false })
  @IsOptional()
  @IsString()
  powerSupply?: string;

  @ApiProperty({ description: "Cable entry type", required: false })
  @IsOptional()
  @IsString()
  cableEntry?: string;

  @ApiProperty({
    description: "Explosion proof classification",
    required: false,
  })
  @IsOptional()
  @IsString()
  explosionProof?: string;

  @ApiProperty({ description: "IP rating", required: false })
  @IsOptional()
  @IsString()
  ipRating?: string;

  @ApiProperty({ description: "Accuracy class", required: false })
  @IsOptional()
  @IsString()
  accuracyClass?: string;

  @ApiProperty({ description: "Calibration type", required: false })
  @IsOptional()
  @IsString()
  calibration?: string;

  @ApiProperty({ description: "Process media" })
  @IsString()
  processMedia: string;

  @ApiProperty({ description: "Operating pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  operatingPressure?: number;

  @ApiProperty({
    description: "Operating temperature in Celsius",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  operatingTemp?: number;

  @ApiProperty({ description: "Quantity", example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: "Supplier reference", required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: "Model number", required: false })
  @IsOptional()
  @IsString()
  modelNumber?: string;

  @ApiProperty({ description: "Unit cost from supplier", required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: "Calculation data", required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class UnifiedRfqItemDto {
  @ApiProperty({ description: "Item type", example: "straight_pipe" })
  @IsString()
  itemType:
    | "straight_pipe"
    | "bend"
    | "fitting"
    | "expansion_joint"
    | "pump"
    | "valve"
    | "instrument";

  @ApiProperty({ description: "Item description" })
  @IsString()
  description: string;

  @ApiProperty({ description: "Item notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: "Total weight from calculation",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalWeightKg?: number;

  @ApiProperty({
    description: "Straight pipe specs (if itemType is straight_pipe)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedStraightPipeDto)
  straightPipe?: UnifiedStraightPipeDto;

  @ApiProperty({
    description: "Bend specs (if itemType is bend)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedBendDto)
  bend?: UnifiedBendDto;

  @ApiProperty({
    description: "Fitting specs (if itemType is fitting)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedFittingDto)
  fitting?: UnifiedFittingDto;

  @ApiProperty({
    description: "Expansion joint specs (if itemType is expansion_joint)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedExpansionJointDto)
  expansionJoint?: UnifiedExpansionJointDto;

  @ApiProperty({
    description: "Pump specs (if itemType is pump)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedPumpDto)
  pump?: UnifiedPumpDto;

  @ApiProperty({
    description: "Valve specs (if itemType is valve)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedValveDto)
  valve?: UnifiedValveDto;

  @ApiProperty({
    description: "Instrument specs (if itemType is instrument)",
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedInstrumentDto)
  instrument?: UnifiedInstrumentDto;
}

export class CreateUnifiedRfqDto {
  @ApiProperty({ description: "RFQ details" })
  @ValidateNested()
  @Type(() => CreateRfqDto)
  rfq: CreateRfqDto;

  @ApiProperty({
    description: "Array of all RFQ items",
    type: [UnifiedRfqItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnifiedRfqItemDto)
  items: UnifiedRfqItemDto[];
}
