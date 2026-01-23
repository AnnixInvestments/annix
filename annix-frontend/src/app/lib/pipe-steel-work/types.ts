export interface SupportSpacingRequest {
  nominalDiameterMm: number;
  scheduleNumber?: string;
  isWaterFilled?: boolean;
}

export interface SupportSpacingResponse {
  nominalDiameterMm: number;
  waterFilledSpacingM: number;
  vaporGasSpacingM: number;
  rodSizeMm?: number;
  standard: string;
}

export interface ReinforcementPadRequest {
  headerOdMm: number;
  headerWallMm: number;
  branchOdMm: number;
  branchWallMm: number;
  workingPressureBar?: number;
  allowableStressMpa?: number;
}

export interface ReinforcementPadResponse {
  requiredAreaMm2: number;
  padOuterDiameterMm: number;
  padThicknessMm: number;
  padWeightKg: number;
  reinforcementRequired: boolean;
  notes: string;
}

export interface BracketTypeResponse {
  typeCode: string;
  displayName: string;
  description?: string;
  isSuitable: boolean;
  baseCostPerUnit?: number;
  allowsExpansion: boolean;
  isAnchorType: boolean;
}

export interface BracketDimensionResponse {
  id: number;
  bracketTypeCode: string;
  nps: string;
  nbMm: number;
  dimensionAMm: number | null;
  dimensionBMm: number | null;
  rodDiameterMm: number | null;
  unitWeightKg: number;
  maxLoadKg: number;
}

export interface PadStandardResponse {
  id: number;
  branchNps: string;
  branchNbMm: number;
  headerNps: string;
  headerNbMm: number;
  minPadWidthMm: number;
  minPadThicknessMm: number;
  typicalWeightKg: number;
}

export type PipeMaterial =
  | 'CARBON_STEEL'
  | 'STAINLESS_304'
  | 'STAINLESS_316'
  | 'COPPER'
  | 'ALUMINUM'
  | 'CHROME_MOLY'
  | 'CAST_IRON'
  | 'PVC'
  | 'HDPE';

export interface ThermalExpansionRequest {
  pipeLengthM: number;
  installationTempC: number;
  operatingTempC: number;
  material?: PipeMaterial;
  customCoefficientMmPerMPerC?: number;
}

export interface ThermalExpansionResponse {
  pipeLengthM: number;
  temperatureChangeC: number;
  material: string;
  coefficientMmPerMPerC: number;
  expansionMm: number;
  expansionPerMeterMm: number;
  isExpansion: boolean;
  recommendedJointCapacityMm: number;
  recommendedJointsCount: number;
  notes: string;
}

export interface CalculationRequest {
  workType: 'pipe_support' | 'reinforcement_pad' | 'saddle_support' | 'shoe_support';
  nominalDiameterMm: number;
  scheduleNumber?: string;
  bracketType?: string;
  pipelineLengthM?: number;
  workingPressureBar?: number;
  branchDiameterMm?: number;
  quantity?: number;
}

export interface CalculationResponse {
  workType: string;
  supportSpacingM?: number;
  numberOfSupports?: number;
  weightPerUnitKg?: number;
  totalWeightKg?: number;
  unitCost?: number;
  totalCost?: number;
  reinforcementPad?: ReinforcementPadResponse;
  notes?: string;
}

export interface ValidateBracketRequest {
  bracketTypeCode: string;
  nominalDiameterMm: number;
  pipelineLengthM?: number;
  schedule?: string;
  isWaterFilled?: boolean;
  expectedExpansionMm?: number;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface BracketCompatibilityResponse {
  isCompatible: boolean;
  bracketTypeCode: string;
  nominalDiameterMm: number;
  issues: ValidationIssue[];
  estimatedLoadKg?: number;
  bracketMaxLoadKg?: number;
  loadUtilizationPercent?: number;
  recommendation: string;
}

export interface BatchCalculationItem {
  itemId: string;
  workType: 'pipe_support' | 'reinforcement_pad' | 'saddle_support' | 'shoe_support';
  nominalDiameterMm: number;
  scheduleNumber?: string;
  bracketType?: string;
  pipelineLengthM?: number;
  workingPressureBar?: number;
  branchDiameterMm?: number;
  quantity?: number;
}

export interface BatchCalculationRequest {
  items: BatchCalculationItem[];
}

export interface BatchCalculationResult {
  itemId: string;
  success: boolean;
  result?: CalculationResponse;
  error?: string;
}

export interface BatchCalculationResponse {
  totalItems: number;
  successCount: number;
  failureCount: number;
  results: BatchCalculationResult[];
  summary: {
    totalWeightKg: number;
    totalCost: number;
    totalSupports: number;
  };
}

export type SupportStandard = 'MSS_SP_58' | 'DIN_2509' | 'EN_13480' | 'ASME_B31_1' | 'ASME_B31_3';

export interface MultiStandardSpacingRequest {
  nominalDiameterMm: number;
  scheduleNumber?: string;
  isWaterFilled?: boolean;
  standards?: SupportStandard[];
}

export interface StandardComparison {
  standard: string;
  standardFullName: string;
  waterFilledSpacingM: number;
  vaporGasSpacingM: number;
  rodSizeMm?: number;
  notes?: string;
}

export interface MultiStandardSpacingResponse {
  nominalDiameterMm: number;
  comparisons: StandardComparison[];
  conservativeRecommendation: StandardComparison;
}

export interface ReinforcementPadWithDeratingRequest extends ReinforcementPadRequest {
  operatingTempC?: number;
  materialPNumber?: number;
  jointType?: 'fillet' | 'full_penetration';
  includeStressAnalysis?: boolean;
}

export interface ReinforcementPadWithDeratingResponse extends ReinforcementPadResponse {
  pressureDeratingFactor?: number;
  temperatureDeratingFactor?: number;
  weldStrengthFactor?: number;
  effectiveAllowableStressMpa?: number;
  thermalStressMpa?: number;
  combinedStressRatio?: number;
}

export type SupportConfiguration = 'simply_supported' | 'fixed_fixed' | 'cantilever';

export interface VibrationAnalysisRequest {
  nominalDiameterMm: number;
  spanLengthM: number;
  scheduleNumber?: string;
  isWaterFilled?: boolean;
  insulationThicknessMm?: number;
  excitationFrequencyHz?: number;
  supportConfig?: SupportConfiguration;
}

export type ResonanceRisk = 'none' | 'low' | 'moderate' | 'high' | 'critical';

export interface VibrationAnalysisResponse {
  naturalFrequencyHz: number;
  secondModeFrequencyHz: number;
  thirdModeFrequencyHz: number;
  excitationFrequencyHz?: number;
  frequencyRatio?: number;
  resonanceRisk: ResonanceRisk;
  recommendedMaxSpanM: number;
  minimumSupportFrequencyHz: number;
  notes: string;
}

export interface StressAnalysisRequest {
  bracketTypeCode: string;
  nominalDiameterMm: number;
  appliedLoadKg: number;
  rodLengthMm?: number;
  operatingTempC?: number;
  dynamicLoadFactor?: number;
  yieldStrengthMpa?: number;
}

export type StressStatus = 'adequate' | 'marginal' | 'inadequate';

export interface StressAnalysisResponse {
  rodTensileStressMpa: number;
  rodStressUtilizationPercent: number;
  clampBendingStressMpa?: number;
  bearingStressMpa?: number;
  factorOfSafety: number;
  isAdequate: boolean;
  status: StressStatus;
  notes: string;
}

export type MaterialCategory = 'CARBON_STEEL' | 'STAINLESS' | 'ALLOY' | 'COPPER' | 'ALUMINUM' | 'PLASTIC' | 'CAST_IRON';
export type GalvanicCorrosionRisk = 'none' | 'low' | 'moderate' | 'high';
export type CompatibilityRating = 'excellent' | 'good' | 'acceptable' | 'caution' | 'not_recommended';

export interface MaterialCompatibilityRequest {
  pipeMaterial: PipeMaterial;
  bracketMaterial: MaterialCategory;
  operatingTempC?: number;
  isCorrosiveEnvironment?: boolean;
  isOutdoor?: boolean;
}

export interface MaterialCompatibilityResponse {
  isCompatible: boolean;
  rating: CompatibilityRating;
  galvanicCorrosionRisk: GalvanicCorrosionRisk;
  isolationRequired?: string;
  temperatureCompatible: boolean;
  maxRecommendedTempC: number;
  recommendations: string[];
  notes: string;
}

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

export interface ExportReportRequest {
  format: ExportFormat;
  calculations: BatchCalculationResult[];
  projectName?: string;
  projectNumber?: string;
  clientName?: string;
  includeCostBreakdown?: boolean;
  includeWeightSummary?: boolean;
}

export interface ExportReportResponse {
  format: string;
  content: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface ConfigValue {
  id: number;
  configKey: string;
  configValue: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string | null;
  unit: string | null;
}
