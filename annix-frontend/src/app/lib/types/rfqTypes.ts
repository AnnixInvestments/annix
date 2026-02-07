export type QuantityType = "total_length" | "number_of_pipes";

export type PipeEndConfiguration =
  | "PE"
  | "FOE"
  | "FBE"
  | "L/F"
  | "2X_L/F"
  | "R/F"
  | "2X_RF"
  | "3F"
  | "FOE_RF"
  | "FOE_LF";

export type BendEndConfiguration = PipeEndConfiguration;

export type FittingEndConfiguration =
  | "PE"
  | "FOE"
  | "FBE"
  | "3F"
  | "L/F"
  | "2X_L/F"
  | "3X_L/F"
  | "R/F"
  | "2X_RF"
  | "3X_RF";

export type FittingType =
  | "SHORT_TEE"
  | "SHORT_REDUCING_TEE"
  | "GUSSET_TEE"
  | "GUSSET_REDUCING_TEE"
  | "LATERAL"
  | "REDUCING_LATERAL"
  | "CONCENTRIC_REDUCER"
  | "ECCENTRIC_REDUCER";

export type FittingStandard = "SABS62" | "SABS719";

export interface BasePipeSpecs {
  steelSpecificationId?: number;
  nominalBoreMm?: number;
  scheduleNumber?: string;
  wallThicknessMm?: number;
  workingPressureBar?: number;
  workingTemperatureC?: number;
}

export interface StraightPipeSpecs extends BasePipeSpecs {
  pipeEndConfiguration?: PipeEndConfiguration;
  quantityType?: QuantityType;
  quantityValue?: number;
  individualPipeLength?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  closureLengthMm?: number;
  blankFlangePositions?: string[];
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
}

export interface BendSpecs extends BasePipeSpecs {
  bendEndConfiguration?: BendEndConfiguration;
  bendType?: string;
  bendRadiusType?: string;
  bendDegrees?: number;
  numberOfSegments?: number;
  centerToFaceMm?: number;
  bendRadiusMm?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  closureLengthMm?: number;
  blankFlangePositions?: string[];
  addBlankFlange?: boolean;
  stubs?: StubSpec[];
}

export interface StubSpec {
  nominalBoreMm?: number;
  angleDegrees?: number;
  distanceFromCenterMm?: number;
  hasFlange?: boolean;
  hasBlankFlange?: boolean;
}

export interface FittingSpecs extends BasePipeSpecs {
  fittingType?: FittingType;
  fittingStandard?: FittingStandard;
  nominalDiameterMm?: number;
  branchNominalDiameterMm?: number;
  pipeEndConfiguration?: FittingEndConfiguration;
  pipeALengthMm?: number;
  pipeBLengthMm?: number;
  teeHeightMm?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  closureLengthMm?: number;
  blankFlangePositions?: string[];
  addBlankFlange?: boolean;
}

export interface BaseCalculation {
  outsideDiameterMm?: number;
  wallThicknessMm?: number;
  insideDiameterMm?: number;
}

export interface StraightPipeCalculation extends BaseCalculation {
  calculatedPipeCount?: number;
  calculatedTotalLength?: number;
  totalPipeWeight?: number;
  numberOfFlangeWelds?: number;
  totalFlangeWeldLength?: number;
  flangeWeight?: number;
  tackWeldWeight?: number;
  closureWeight?: number;
}

export interface BendCalculation extends BaseCalculation {
  bendLengthMm?: number;
  totalBendLengthMm?: number;
  bendWeight?: number;
  totalWeldLengthMm?: number;
  flangeWeight?: number;
}

export interface FittingCalculation extends BaseCalculation {
  fittingWeight?: number;
  flangeWeight?: number;
  weldLengthMm?: number;
}

export interface RfqEntry<TSpecs, TCalculation> {
  id: string;
  itemType: "STRAIGHT_PIPE" | "BEND" | "FITTING";
  description?: string;
  specs: TSpecs;
  calculation?: TCalculation;
  minimumSchedule?: string;
  minimumWallThickness?: number;
  isScheduleOverridden?: boolean;
  hasFlangeOverride?: boolean;
}

export type StraightPipeEntry = RfqEntry<StraightPipeSpecs, StraightPipeCalculation>;
export type BendEntry = RfqEntry<BendSpecs, BendCalculation>;
export type FittingEntry = RfqEntry<FittingSpecs, FittingCalculation>;

export interface GlobalSpecs {
  steelSpecificationId?: number;
  workingPressureBar?: number;
  workingTemperatureC?: number;
  workingTemperatureCelsius?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
}

export interface MasterData {
  steelSpecs?: Array<{ id: number; steelSpecName: string }>;
  flangeStandards?: Array<{ id: number; code: string; name: string }>;
  pressureClasses?: Array<{
    id: number;
    designation: string;
    flangeStandardId?: number;
    standardId?: number;
  }>;
  flangeTypes?: Array<{ id: number; code: string; name: string }>;
}
