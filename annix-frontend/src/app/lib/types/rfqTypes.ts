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

export type GussetPlacementType = "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
export type GussetMaterialGrade = "Q235" | "A36" | "A283_C";
export type GussetWeldType = "FULL_PENETRATION" | "FILLET";

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
  bendItemType?: string;
  bendStyle?: string;
  bendRadiusType?: string;
  bendDegrees?: number;
  numberOfSegments?: number;
  numberOfTangents?: number;
  tangentLengths?: number[];
  numberOfStubs?: number;
  centerToFaceMm?: number;
  bendRadiusMm?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  closureLengthMm?: number;
  blankFlangePositions?: string[];
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
  quantityValue?: number;
  sweepTeePipeALengthMm?: number;
  stubs?: StubSpec[];
  pslLevel?: string | null;
  cvnTestTemperatureC?: number | null;
  cvnAverageJoules?: number | null;
  cvnMinimumJoules?: number | null;
  heatNumber?: string | null;
  mtcReference?: string | null;
  naceCompliant?: boolean | null;
  h2sZone?: number | null;
  maxHardnessHrc?: number | null;
  sscTested?: boolean | null;
  savedCameraPosition?: [number, number, number];
  savedCameraTarget?: [number, number, number];
  duckfootBasePlateXMm?: number;
  duckfootBasePlateYMm?: number;
  duckfootInletCentreHeightMm?: number;
  duckfootRibThicknessT2Mm?: number;
  duckfootPlateThicknessT1Mm?: number;
  duckfootGussetPointDDegrees?: number;
  duckfootGussetPointCDegrees?: number;
  duckfootGussetCount?: number;
  duckfootGussetPlacement?: GussetPlacementType;
  duckfootGussetThicknessMm?: number;
  duckfootGussetMaterialGrade?: GussetMaterialGrade;
  duckfootGussetHeelOffsetMm?: number;
  duckfootGussetAngleDegrees?: number;
  duckfootGussetWeldType?: GussetWeldType;
  duckfootGussetWeldElectrode?: string;
  duckfootGussetPreheatTempC?: number;
  duckfootGussetPwhtRequired?: boolean;
}

export interface StubSpec {
  nominalBoreMm?: number;
  angleDegrees?: number;
  distanceFromCenterMm?: number;
  hasFlange?: boolean;
  hasBlankFlange?: boolean;
  steelSpecificationId?: number;
  wallThicknessMm?: number;
  wallThicknessOverride?: boolean;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  length?: number;
  lengthMm?: number;
  locationFromFlange?: number;
  tangent?: number;
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
  flangeWeightPerUnit?: number;
  duckfootBasePlateWeight?: number;
  duckfootRibWeight?: number;
  duckfootGussetWeight?: number;
  duckfootTotalSteelworkWeight?: number;
  duckfootGussetWeldLengthMm?: number;
  duckfootThrustForceKn?: number;
  duckfootBendingMomentKnm?: number;
}

export interface FittingCalculation extends BaseCalculation {
  fittingWeight?: number;
  pipeWeight?: number;
  flangeWeight?: number;
  boltWeight?: number;
  nutWeight?: number;
  weldLengthMm?: number;
  numberOfFlanges?: number;
  gussetWeight?: number;
  gussetSectionMm?: number;
  gussetWeldLength?: number;
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
  materialType?: string;
  selectedNotes?: string[];
  notes?: string;
  calculationError?: string;
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
  flangeTypeCode?: string;
  pressureClassDesignation?: string;
}

export interface MasterData {
  steelSpecs?: Array<{ id: number; steelSpecName: string; maxPressureBar?: number; maxTemperatureC?: number }>;
  flangeStandards?: Array<{ id: number; code: string; name: string }>;
  pressureClasses?: Array<{
    id: number;
    designation: string;
    flangeStandardId?: number;
    standardId?: number;
  }>;
  flangeTypes?: Array<{ id: number; code: string; name: string }>;
}
