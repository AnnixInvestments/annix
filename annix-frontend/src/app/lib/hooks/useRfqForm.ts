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
  isScheduleOverridden?: boolean;
  minimumSchedule?: string;
  minimumWallThickness?: number;
  availableUpgrades?: PipeDimension[];
  hasFlangeOverride?: boolean;
  flangeOverrideConfirmed?: boolean;
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
    scheduleNumber?: string;
    angleRange?: string;
    pipeLengthAMm?: number;
    pipeLengthBMm?: number;
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

export type PipeItem =
  | StraightPipeEntry
  | BendEntry
  | FittingEntry
  | PipeSteelWorkEntry
  | ExpansionJointEntry
  | ValveEntry
  | InstrumentEntry
  | PumpEntry;

export interface GlobalSpecs {
  workingPressureBar?: number;
  workingTemperatureC?: number;
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;

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
  hdpeSpecsConfirmed?: boolean;

  pvcType?: PvcType;
  pvcPressureClass?: PvcPressureClass;
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
        | "pump",
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
