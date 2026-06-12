import type {
  BendCalculationResult,
  CreateStraightPipeRfqDto,
  PipeDimension,
  PumpCalculationResult,
  StraightPipeCalculationResult,
} from "@/app/lib/api/client";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";
import type {
  HdpeFlangeDrillingStandard,
  HdpeFlangeType,
  HdpeGrade,
  HdpeJoiningMethod,
  HdpeSdr,
} from "../config/rfq/hdpe";
import type { WeldingStandardCode } from "../config/rfq/hdpeWeldingStandards";
import type { PvcJoiningMethod, PvcPressureClass, PvcType } from "../config/rfq/pvc";
import type {
  AirSaltContentResult,
  FloodRiskLevel,
  TimeOfWetnessResult,
} from "../services/environmentalIntelligence";

export type PipeMaterialType = "steel" | "hdpe" | "pvc";

// Traceability hook: when an item is extracted by Nix from a Excel /
// PDF / Word BOQ, we capture the original sheet + row so the admin
// BOQ view can render a "Source" column. Plain manually-entered rows
// leave this undefined.
export interface PipeItemSourceLocation {
  rowNumber: number;
  sheetName?: string;
}

export interface StraightPipeEntry {
  id: string;
  itemType: "straight_pipe";
  materialType?: PipeMaterialType;
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: CreateStraightPipeRfqDto;
  calculation?: StraightPipeCalculationResult;
  calculationError?: string | null;
  calculatedPipes?: number;
  notes?: string;
  sourceLocation?: PipeItemSourceLocation;
  isScheduleOverridden?: boolean;
  minimumSchedule?: string;
  minimumWallThickness?: number;
  availableUpgrades?: PipeDimension[];
  hasFlangeOverride?: boolean;
  flangeOverrideConfirmed?: boolean;
  userEdited?: boolean;
}

export interface BendStub {
  nominalBoreMm: number;
  length: number;
  flangeSpec: string;
}

export interface BendEntry {
  id: string;
  itemType: "bend";
  materialType?: PipeMaterialType;
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    bendType?: string;
    bendDegrees?: number;
    centerToFaceMm?: number;
    bendRadiusMm?: number;
    numberOfTangents?: number;
    tangentLengths?: number[];
    numberOfStubs?: number;
    stubs?: BendStub[];
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
    quantityValue: number;
    quantityType: "number_of_items";
    workingPressureBar?: number;
    workingTemperatureC?: number;
    useGlobalFlangeSpecs?: boolean;
  };
  calculation?: BendCalculationResult;
  calculationError?: string | null;
  notes?: string;
  sourceLocation?: PipeItemSourceLocation;
}

export interface FittingEntry {
  id: string;
  itemType: "fitting";
  materialType?: PipeMaterialType;
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    fittingStandard?: "SABS62" | "SABS719";
    fittingType?: string;
    nominalDiameterMm?: number;
    branchNominalDiameterMm?: number;
    teeNominalDiameterMm?: number;
    scheduleNumber?: string;
    angleRange?: string;
    pipeLengthAMm?: number;
    pipeLengthBMm?: number;
    reducerLengthMm?: number;
    lateralHeightMm?: number;
    stubLocation?: string;
    degrees?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string;
    quantityValue: number;
    quantityType: "number_of_items";
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
  sourceLocation?: PipeItemSourceLocation;
}

export interface PipeSteelWorkEntry {
  id: string;
  itemType: "pipe_steel_work";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    workType?: "pipe_support" | "reinforcement_pad" | "saddle_support" | "shoe_support";
    nominalDiameterMm?: number;
    bracketType?: string;
    pipelineLengthM?: number;
    branchDiameterMm?: number;
    mediaType?: "water_filled" | "vapor_gas";
    supportSpacingM?: number;
    numberOfSupports?: number;
    steelSpecificationId?: number;
    quantity: number;
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
}

export interface ExpansionJointEntry {
  id: string;
  itemType: "expansion_joint";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    expansionJointType?: "bought_in_bellows" | "fabricated_loop";
    nominalDiameterMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    outsideDiameterMm?: number;
    quantityValue: number;
    bellowsJointType?: string;
    bellowsMaterial?: string;
    axialMovementMm?: number;
    lateralMovementMm?: number;
    angularMovementDeg?: number;
    supplierReference?: string;
    catalogNumber?: string;
    unitCostFromSupplier?: number;
    markupPercentage?: number;
    loopType?: string;
    loopHeightMm?: number;
    loopWidthMm?: number;
    pipeLengthTotalMm?: number;
    numberOfElbows?: number;
    endConfiguration?: string;
    steelSpecificationId?: number;
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  totalWeightKg?: number;
  notes?: string;
}

export interface ValveEntry {
  id: string;
  itemType: "valve";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    valveType?: string;
    valveCategory?: string;
    size?: number;
    pressureClass?: string;
    bodyMaterial?: string;
    trimMaterial?: string;
    seatMaterial?: string;
    packingMaterial?: string;
    actuatorType?: string;
    actuatorFailPosition?: string;
    endConnection?: string;
    operatingMedia?: string;
    operatingPressureBar?: number;
    operatingTemperatureC?: number;
    hazardousAreaClass?: string;
    fireSafe?: boolean;
    cryogenicService?: boolean;
    fugitiveEmissions?: boolean;
    quantityValue: number;
    supplierReference?: string;
    unitCostFromSupplier?: number;
    markupPercentage?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
}

export interface InstrumentEntry {
  id: string;
  itemType: "instrument";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    instrumentType?: string;
    category?: string;
    size?: number;
    rangeMin?: number;
    rangeMax?: number;
    rangeUnit?: string;
    accuracy?: string;
    outputSignal?: string;
    communicationProtocol?: string;
    powerSupply?: string;
    processConnection?: string;
    wettedPartsMaterial?: string;
    displayType?: string;
    enclosureRating?: string;
    hazardousAreaClass?: string;
    calibrationRequired?: boolean;
    quantityValue: number;
    supplierReference?: string;
    unitCostFromSupplier?: number;
    markupPercentage?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
}

export interface PumpEntry {
  id: string;
  itemType: "pump";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    pumpType?: string;
    pumpCategory?: string;
    flowRate?: number;
    totalHead?: number;
    suctionHead?: number;
    npshAvailable?: number;
    fluidType?: string;
    specificGravity?: number;
    viscosity?: number;
    solidsContent?: number;
    isAbrasive?: boolean;
    isCorrosive?: boolean;
    casingMaterial?: string;
    impellerMaterial?: string;
    shaftMaterial?: string;
    sealType?: string;
    motorType?: string;
    motorPower?: number;
    voltage?: string;
    frequency?: string;
    hazardousAreaClass?: string;
    quantityValue: number;
    supplierReference?: string;
    unitCostFromSupplier?: number;
    markupPercentage?: number;
  };
  calculation?: PumpCalculationResult;
  calculationError?: string | null;
  notes?: string;
}

export interface PlateBomItem {
  mark: string;
  description: string;
  thicknessMm: number;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  weightKg: number;
  areaM2: number;
  liningThicknessMm: number;
}

export interface TankChuteEntry {
  id: string;
  itemType: "tank_chute";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    assemblyType?: "tank" | "chute" | "hopper" | "underpan" | "custom";
    drawingReference?: string;
    materialGrade?: string;
    overallLengthMm?: number;
    overallWidthMm?: number;
    overallHeightMm?: number;
    totalSteelWeightKg?: number;
    weightSource?: "manual" | "calculated";
    quantityValue: number;
    liningRequired?: boolean;
    liningType?: "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake" | "none";
    liningThicknessMm?: number;
    liningAreaM2?: number;
    liningWastagePercent?: number;
    rubberGrade?: string;
    rubberHardnessShore?: number;
    coatingRequired?: boolean;
    coatingSystem?: string;
    coatingAreaM2?: number;
    coatingWastagePercent?: number;
    surfacePrepStandard?: string;
    weldSizeMm?: number;
    plateBom?: PlateBomItem[];
    bomTotalWeightKg?: number;
    bomTotalAreaM2?: number;
    steelPricePerKg?: number;
    liningPricePerM2?: number;
    coatingPricePerM2?: number;
    fabricationCost?: number;
    totalCost?: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
}

export interface FastenerEntry {
  id: string;
  itemType: "fastener";
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    fastenerCategory:
      | "bolt"
      | "nut"
      | "washer"
      | "gasket"
      | "set_screw"
      | "machine_screw"
      | "insert";
    specificType?: string;
    size?: string;
    grade?: string;
    material?: string;
    finish?: string;
    threadType?: "coarse" | "fine";
    standard?: string;
    lengthMm?: number;
    quantityValue: number;
  };
  calculation?: Record<string, unknown>;
  calculationError?: string | null;
  notes?: string;
}

// userEdited is stamped by the orchestrator's handleUpdateEntry choke
// point (user-driven edits only — automatic recalculations bypass it).
// The Nix re-extraction dedup in rfqWizardStore keeps a userEdited row
// over a freshly re-extracted copy of the same source sheet+row, so
// manual corrections survive a re-run of extraction (issue #293).
export type PipeItem = (
  | StraightPipeEntry
  | BendEntry
  | FittingEntry
  | PipeSteelWorkEntry
  | ExpansionJointEntry
  | ValveEntry
  | InstrumentEntry
  | PumpEntry
  | TankChuteEntry
  | FastenerEntry
) & { userEdited?: boolean };

export interface GlobalSpecs {
  workingPressureBar?: number;
  workingTemperatureC?: number;
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  flangeFace?: "RF" | "FF" | "RTJ";

  // Spec-PDF auto-extracted fields (issue #288 Phase 8). Lifted out
  // of deep clauses in tender PDFs by PdfExtractorService so the
  // Specifications step pre-fills with scope the customer would
  // otherwise have to read 300 pages to find. All optional — empty
  // when the PDF didn't mention them.
  valveTypes?: string[];
  valveStandards?: string[];
  flangeStandardName?: string;
  flangeTableDesignation?: string;
  ndtMethods?: string[];
  hydrotestMultiplier?: number;
  hydrotestHoldMinutes?: number;
  naceCompliance?: string;
  sourService?: boolean;
  specPdfGasketType?: string;
  valveClauseExcerpt?: string;
  // Raw material-grade text from a tender spec PDF (e.g. "ASTM A106",
  // "SABS 719"). Stored alongside the resolved steelSpecificationId
  // so the banner can show the source string even when no master-list
  // match was found.
  specPdfMaterialGrade?: string;

  ecpMarineInfluence?: "None" | "Coastal" | "Offshore";
  ecpIso12944Category?: "C1" | "C2" | "C3" | "C4" | "C5" | "CX";
  ecpIndustrialPollution?: "None" | "Low" | "Moderate" | "High" | "Very High";

  distanceToCoast?: number;
  distanceToCoastFormatted?: string;
  detailedMarineInfluence?:
    | "Extreme Marine"
    | "Severe Marine"
    | "High Marine"
    | "Moderate Marine"
    | "Low / Non-Marine";
  airSaltContent?: AirSaltContentResult;
  timeOfWetness?: TimeOfWetnessResult;
  floodRisk?: FloodRiskLevel;

  soilType?: string;
  soilTexture?: string;
  soilMoisture?: string;
  soilMoistureClass?: "Low" | "Moderate" | "High";
  soilDrainage?: string;
  soilDrainageSource?: string;

  tempMin?: number;
  tempMax?: number;
  tempMean?: number;

  humidityMin?: number;
  humidityMax?: number;
  humidityMean?: number;

  annualRainfall?: string;
  windSpeed?: number;
  windDirection?: string;
  uvIndex?: number;
  uvExposure?: "Low" | "Moderate" | "High" | "Very High";
  snowExposure?: "None" | "Low" | "Moderate" | "High";
  fogFrequency?: "Low" | "Moderate" | "High";

  boltGrade?: string;
  gasketType?: string;
  fastenersConfirmed?: boolean;

  externalCoatingType?: string;
  externalCoatingConfirmed?: boolean;
  externalCoatingRecommendation?: string;
  externalCoatingRecommendationRejected?: boolean;
  showExternalCoatingProfile?: boolean;
  externalCoatingActionLog?: Array<{ action: string; timestamp: string; details?: string }>;
  externalBlastingGrade?: string;
  externalPrimerType?: string;
  externalPrimerMicrons?: number;
  externalIntermediateType?: string;
  externalIntermediateMicrons?: number;
  externalTopcoatType?: string;
  externalTopcoatMicrons?: number;
  externalTopcoatColour?: string;
  externalBand1Colour?: string;
  externalBand2Colour?: string;
  externalRubberType?: string;
  externalRubberThickness?: string;
  externalRubberColour?: string;
  externalRubberHardness?: string;
  externalRubberSansType?: number;
  externalRubberGrade?: string;
  externalRubberSpecialProperties?: number[];
  externalRubberVulcanizationMethod?: string;
  externalRubberChemicalExposure?: string[];
  externalRubberLineCallout?: string;

  internalLiningType?: string;
  internalLiningConfirmed?: boolean;
  internalLiningRecommendation?: string;
  internalLiningRecommendationRejected?: boolean;
  showInternalLiningProfile?: boolean;
  internalLiningActionLog?: Array<{ action: string; timestamp: string; details?: string }>;
  internalBlastingGrade?: string;
  internalPrimerType?: string;
  internalPrimerMicrons?: number;
  internalIntermediateType?: string;
  internalIntermediateMicrons?: number;
  internalTopcoatType?: string;
  internalTopcoatMicrons?: number;
  internalRubberType?: string;
  internalRubberThickness?: string;
  internalRubberColour?: string;
  internalRubberHardness?: string;
  internalRubberSansType?: number;
  internalRubberGrade?: string;
  internalRubberSpecialProperties?: number[];
  internalRubberVulcanizationMethod?: string;
  internalRubberChemicalExposure?: string[];
  internalRubberLineCallout?: string;

  steelPipesSpecsConfirmed?: boolean;

  hdpeGrade?: HdpeGrade;
  hdpeSdr?: HdpeSdr;
  hdpePressureRating?: string;
  hdpeJoiningMethod?: HdpeJoiningMethod;
  hdpeOperatingTempC?: number;
  hdpeWeldingStandard?: WeldingStandardCode;
  hdpeColorCode?: "black" | "blue" | "yellow" | "orange" | "green";
  hdpeFlangeType?: HdpeFlangeType;
  hdpeFlangeDrillingStandard?: HdpeFlangeDrillingStandard;
  hdpeSteelFlangeStandardId?: number;
  hdpeSteelFlangePressureClassId?: number;
  hdpeSteelFlangeTypeCode?: string;
  hdpeSpecsConfirmed?: boolean;

  pvcType?: PvcType;
  pvcPressureClass?: PvcPressureClass;
  pvcSdr?: number;
  pvcPressureRating?: string;
  pvcOperatingTempC?: number;
  pvcJoiningMethod?: PvcJoiningMethod;
  pvcSpecsConfirmed?: boolean;

  ecpTemperature?: string;
  iso12944Category?: string;
  marineInfluence?: string;
  industrialPollution?: string;
  mineSelected?: boolean;
  ecpInstallationType?: string;
  ecpUvExposure?: string;
  ecpMechanicalRisk?: string;
  ecpSoilType?: string;
  ecpSoilResistivity?: string;
  ecpSoilMoisture?: string;
  ecpServiceLife?: string;
  ecpCathodicProtection?: boolean;

  showMaterialTransferProfile?: boolean;
  surfaceProtectionConfirmed?: boolean;

  externalSubstrateType?: string;
  externalApplicationMethod?: string;
  externalApplicationLocation?: string;

  internalCeramicType?: string;
  internalHdpeMaterialGrade?: string;
  internalPuThickness?: string;

  mtpParticleSize?: string;
  mtpParticleShape?: string;
  mtpSpecificGravity?: string;
  mtpHardnessClass?: string;
  mtpSilicaContent?: string;
  mtpPhRange?: string;
  mtpChlorides?: string;
  mtpTemperatureRange?: string;
  mtpSolidsPercent?: string;
  mtpVelocity?: string;
  mtpImpactAngle?: string;
  mtpEquipmentType?: string;
  mtpImpactZones?: boolean;

  applicationAmbientTempC?: number;
  applicationHumidityPercent?: number;
  applicationSteelTempC?: number;
  calculatedSurfaceAreaM2?: number;
  inspectionRequirements?: string[];

  showRecCustomColourInput?: boolean;
  recExternalTopcoatColour?: string;
  recCustomColourInput?: string;
  showRecBand1Input?: boolean;
  recExternalBand1Colour?: string;
  recBand1Input?: string;
  showRecBand2Input?: boolean;
  recExternalBand2Colour?: string;
  recBand2Input?: string;
}

export interface RfqFormData {
  projectName: string;
  projectType?: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /**
   * Additional contacts (CC'd recipients on the source email, alternative
   * sender emails found in the signature). Comma-separated for now —
   * persisted to backend as a single text column. Frontend-only field
   * today; admin reviewing the RFQ sees the full list to route follow-ups.
   */
  additionalContacts?: string;
  /**
   * True once the customer has accepted a Nix BOQ extraction popup. The
   * orchestrator's Next/Previous handlers skip Step 2 (Specifications)
   * when this is set, since each extracted item already carries its own
   * specs (pressureClass / sdr / wallThickness / material / flangeConfig)
   * and the global defaults Step 2 collects don't apply. Stepper clicks
   * still let the customer visit Step 2 manually if they want.
   */
  boqExtractionAccepted?: boolean;
  requiredDate: string;
  requiredProducts: string[];
  notes: string;
  latitude?: number;
  longitude?: number;
  siteAddress?: string;
  region?: string;
  country?: string;
  mineId?: number;
  mineName?: string;
  /**
   * Location-not-available flags. When either is set the customer either
   * doesn't know the delivery site or is collecting from the fabricator /
   * surface-protection company, so the lat/long/address fields are disabled
   * and the location-data confirmation no longer requires them.
   */
  locationNotKnown?: boolean;
  collectionOnly?: boolean;
  /**
   * Per-RFQ switch that turns off the location-driven surface-protection
   * (environmental) suggestion module — set when location is unavailable, or
   * when the required coating/lining is already specified in the customer's
   * tender documents. The customer confirms the trade-off and it is logged
   * to notes.
   */
  skipEnvironmentalSuggestions?: boolean;
  skipDocuments?: boolean;
  useNix?: boolean;
  nixPopupShown?: boolean;
  globalSpecs: GlobalSpecs;
  items: PipeItem[];
  straightPipeEntries: StraightPipeEntry[];
}

/**
 * @deprecated Use `useRfqWizardStore` directly from `@/app/lib/store/rfqWizardStore`.
 * This hook is a backward-compatibility wrapper around the Zustand store.
 */
export const useRfqForm = () => {
  const store = useRfqWizardStore();

  return {
    currentStep: store.currentStep,
    setCurrentStep: store.setCurrentStep,
    rfqData: store.rfqData,
    updateRfqField: store.updateRfqField,
    updateGlobalSpecs: store.updateGlobalSpecs,
    addStraightPipeEntry: store.addStraightPipeEntry,
    updateStraightPipeEntry: store.updateStraightPipeEntry,
    removeStraightPipeEntry: store.removeStraightPipeEntry,
    updateEntryCalculation: store.updateEntryCalculation,
    addItem: (
      itemType:
        | "straight_pipe"
        | "bend"
        | "fitting"
        | "pipe_steel_work"
        | "expansion_joint"
        | "valve"
        | "instrument"
        | "pump"
        | "tank_chute"
        | "fastener",
      description?: string,
      insertAtStart?: boolean,
    ) => {
      const addFns: Record<string, (d?: string, s?: boolean) => string> = {
        straight_pipe: store.addStraightPipeEntry,
        bend: store.addBendEntry,
        fitting: store.addFittingEntry,
        pipe_steel_work: store.addPipeSteelWorkEntry,
        expansion_joint: store.addExpansionJointEntry,
        valve: store.addValveEntry,
        instrument: store.addInstrumentEntry,
        pump: store.addPumpEntry,
        tank_chute: store.addTankChuteEntry,
        fastener: store.addFastenerEntry,
      };
      return addFns[itemType](description, insertAtStart);
    },
    addBendEntry: store.addBendEntry,
    addFittingEntry: store.addFittingEntry,
    addPipeSteelWorkEntry: store.addPipeSteelWorkEntry,
    addExpansionJointEntry: store.addExpansionJointEntry,
    addValveEntry: store.addValveEntry,
    addInstrumentEntry: store.addInstrumentEntry,
    addPumpEntry: store.addPumpEntry,
    addTankChuteEntry: store.addTankChuteEntry,
    addFastenerEntry: store.addFastenerEntry,
    updateItem: store.updateItem,
    removeItem: store.removeStraightPipeEntry,
    duplicateItem: store.duplicateItem,
    getTotalWeight: store.totalWeight,
    getTotalValue: store.totalValue,
    nextStep: store.nextStep,
    prevStep: store.prevStep,
    resetForm: store.resetForm,
    restoreFromDraft: store.restoreFromDraft,
  };
};
