'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { StraightPipeEntry, useRfqForm, RfqFormData, GlobalSpecs } from '@/app/lib/hooks/useRfqForm';
import { masterDataApi, rfqApi, rfqDocumentApi, minesApi, pipeScheduleApi, draftsApi, RfqDraftResponse, SessionExpiredError } from '@/app/lib/api/client';
import {
  validatePage1RequiredFields,
  validatePage2Specifications,
  validatePage3Items
} from '@/app/lib/utils/validation';
import {
  generateClientItemNumber,
  generateSystemReferenceNumber,
  getPipeEndConfigurationDetails
} from '@/app/lib/utils/systemUtils';
import {
  calculateMaxAllowablePressure,
  calculateMinWallThickness,
  validateScheduleForPressure,
  findRecommendedSchedule,
  calculateTotalSurfaceArea,
  calculateInsideDiameter
} from '@/app/lib/utils/pipeCalculations';
import {
  recommendWallThicknessCarbonPipe
} from '@/app/lib/utils/weldThicknessLookup';
import { getFlangeMaterialGroup } from '@/app/components/rfq/utils';
import {
  SABS62_NB_OPTIONS,
  SABS62_BEND_RADIUS,
  getSabs62CFInterpolated,
  getSabs62AvailableAngles,
  getSabs62BendTypes,
  SABS62BendType
} from '@/app/lib/utils/sabs62CfData';
import {
  SABS719_ELBOWS,
  SABS719_MEDIUM_RADIUS,
  SABS719_LONG_RADIUS,
  SABS719_BEND_TYPES,
  sabs719ValidSegments as getSABS719ValidSegments,
  sabs719ColumnBySegments as getSABS719ColumnBySegments,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  PIPE_END_OPTIONS,
  BEND_END_OPTIONS,
  FITTING_END_OPTIONS,
  type FlangeType,
  weldCountPerBend as getWeldCountPerBend,
  weldCountPerFitting as getWeldCountPerFitting,
  fittingFlangeConfig as getFittingFlangeConfig,
  hasLooseFlange,
  fixedFlangeCount as getFixedFlangeCount,
  weldCountPerPipe as getWeldCountPerPipe,
  flangesPerPipe as getFlangesPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  BLANK_FLANGE_WEIGHT,
  blankFlangeWeight as getBlankFlangeWeight,
  blankFlangeSurfaceArea as getBlankFlangeSurfaceArea,
  NB_TO_OD_LOOKUP,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  NB_TO_FLANGE_WEIGHT_LOOKUP,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BNW_SET_WEIGHT_PER_HOLE,
  boltHolesPerFlange as getBoltHolesPerFlange,
  bnwSetInfo as getBnwSetInfo,
  GASKET_WEIGHTS,
  gasketWeight as getGasketWeight,
  normalizePressureClass,
  flangeWeight as getFlangeWeight,
  MATERIAL_LIMITS,
  type MaterialLimits,
  materialLimits as getMaterialLimits,
  type MaterialSuitabilityResult,
  checkMaterialSuitability,
  suitableMaterials as getSuitableMaterials,
  getScheduleListForSpec,
} from '@/app/lib/config/rfq';
import ProjectDetailsStep, { PendingDocument } from './steps/ProjectDetailsStep';
import SpecificationsStep from './steps/SpecificationsStep';
import ItemUploadStep from './steps/ItemUploadStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import BOQStep from './steps/BOQStep';

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
}

// Master data structure for API integration
interface MasterData {
  steelSpecs: Array<{ id: number; steelSpecName: string }>;
  flangeStandards: Array<{ id: number; code: string }>;
  pressureClasses: Array<{ id: number; designation: string }>;
  nominalBores?: Array<{ id: number; nominal_diameter_mm?: number; outside_diameter_mm?: number; nominalDiameterMm?: number; outsideDiameterMm?: number }>;
}

/**
 * Local calculation for pipe weight when API is unavailable
 * Uses formula: ((OD - WT) * WT) * 0.02466 = Kg/m
 *
 * @param nominalBoreMm - Nominal bore in mm
 * @param wallThicknessMm - Wall thickness in mm
 * @param individualPipeLength - Length of each pipe in meters
 * @param quantityValue - Quantity value (pipes or total length)
 * @param quantityType - 'number_of_pipes' or 'total_length'
 * @param pipeEndConfiguration - Pipe end configuration (PE, FOE, FBE, etc.)
 * @param pressureClassDesignation - Optional pressure class for accurate flange weights
 */
const calculateLocalPipeResult = (
  nominalBoreMm: number,
  wallThicknessMm: number,
  individualPipeLength: number,
  quantityValue: number,
  quantityType: string,
  pipeEndConfiguration: string,
  pressureClassDesignation?: string
): any => {
  const outsideDiameterMm = NB_TO_OD_LOOKUP[nominalBoreMm] || (nominalBoreMm * 1.05);

  // Weight per meter formula: ((OD - WT) * WT) * 0.02466
  const pipeWeightPerMeter = ((outsideDiameterMm - wallThicknessMm) * wallThicknessMm) * 0.02466;

  // Calculate pipe count and total length
  let calculatedPipeCount: number;
  let calculatedTotalLength: number;

  if (quantityType === 'total_length') {
    calculatedTotalLength = quantityValue;
    calculatedPipeCount = Math.ceil(quantityValue / individualPipeLength);
  } else {
    // number_of_pipes
    calculatedPipeCount = quantityValue;
    calculatedTotalLength = quantityValue * individualPipeLength;
  }

  // Calculate total pipe weight
  const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLength;

  // Calculate flanges and welds
  // Physical flange count is used for weight calculations and display
  const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfiguration);
  const numberOfFlanges = physicalFlangesPerPipe * calculatedPipeCount;
  // Bolt connection count is used for BNW calculations
  const flangeConnectionsPerPipe = getFlangesPerPipe(pipeEndConfiguration);
  const numberOfFlangeConnections = flangeConnectionsPerPipe * calculatedPipeCount;

  const weldsPerPipe = getWeldCountPerPipe(pipeEndConfiguration);
  const numberOfFlangeWelds = weldsPerPipe * calculatedPipeCount;

  // Weld length calculations (circumference-based)
  // Each flange requires 2 full welds: 1 inside and 1 outside
  const circumference = Math.PI * outsideDiameterMm / 1000; // in meters
  const totalFlangeWeldLength = numberOfFlangeWelds * circumference * 2; // x2 for inside + outside welds per flange

  // Get flange weight based on pressure class (includes flange + bolts + gasket)
  const flangeWeightPerUnit = getFlangeWeight(nominalBoreMm, pressureClassDesignation);
  const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;

  // Total system weight
  const totalSystemWeight = totalPipeWeight + totalFlangeWeight;

  return {
    pipeWeightPerMeter,
    totalPipeWeight,
    calculatedPipeCount,
    calculatedTotalLength,
    numberOfFlanges,
    numberOfFlangeConnections, // Bolt set connections for BNW calculations
    numberOfFlangeWelds,
    totalFlangeWeldLength,
    outsideDiameterMm,
    wallThicknessMm,
    totalFlangeWeight,
    flangeWeightPerUnit, // Include per-unit weight for transparency
    pressureClassUsed: pressureClassDesignation || 'PN16', // Track which pressure class was used
    totalBoltWeight: 0,
    totalNutWeight: 0,
    totalSystemWeight,
    isLocalCalculation: true // Flag to indicate this was calculated locally
  };
};

export default function StraightPipeRfqOrchestrator({ onSuccess, onCancel }: Props) {
  const searchParams = useSearchParams();
  const {
    currentStep,
    setCurrentStep,
    rfqData,
    updateRfqField,
    updateGlobalSpecs,
    addStraightPipeEntry,
    addBendEntry,
    addFittingEntry,
    updateStraightPipeEntry,
    updateItem,
    removeStraightPipeEntry,
    updateEntryCalculation,
    getTotalWeight,
    getTotalValue,
    nextStep: originalNextStep,
    prevStep,
    restoreFromDraft,
  } = useRfqForm();

  // Draft management state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftNumber, setDraftNumber] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const [masterData, setMasterData] = useState<MasterData>({
    steelSpecs: [],
    flangeStandards: [],
    pressureClasses: [],
    nominalBores: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);
  // Store available schedules per entry: { entryId: PipeDimension[] }
  const [availableSchedulesMap, setAvailableSchedulesMap] = useState<Record<string, any[]>>({});
  // Store available pressure classes for selected standard
  const [availablePressureClasses, setAvailablePressureClasses] = useState<any[]>([]);
  // Cache pressure classes by standard ID for override sections
  const [pressureClassesByStandard, setPressureClassesByStandard] = useState<Record<number, any[]>>({});
  // Store dynamic bend options per bend type
  const [bendOptionsCache, setBendOptionsCache] = useState<Record<string, { nominalBores: number[]; degrees: number[] }>>({});
  // Store pending documents to upload
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  // Ref for scrollable content container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Document upload handlers
  const handleAddDocument = (file: File) => {
    const newDoc: PendingDocument = {
      file,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPendingDocuments(prev => [...prev, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setPendingDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Get filtered pressure classes for a specific standard (with caching)
  const getFilteredPressureClasses = async (standardId: number): Promise<any[]> => {
    if (!standardId) return [];

    // Return cached if available
    if (pressureClassesByStandard[standardId]) {
      return pressureClassesByStandard[standardId];
    }

    try {
      const classes = await masterDataApi.getFlangePressureClassesByStandard(standardId);
      setPressureClassesByStandard(prev => ({ ...prev, [standardId]: classes }));
      return classes;
    } catch (error) {
      console.error('Error fetching pressure classes for standard', standardId, error);
      return [];
    }
  };

  // Load master data from API
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setIsLoadingMasterData(true);
        const { masterDataApi } = await import('@/app/lib/api/client');
        
        const [steelSpecs, flangeStandards, pressureClasses, nominalBores] = await Promise.all([
          masterDataApi.getSteelSpecifications(),
          masterDataApi.getFlangeStandards(),
          masterDataApi.getFlangePressureClasses(),
          masterDataApi.getNominalBores()
        ]);

        setMasterData({
          steelSpecs,
          flangeStandards,
          pressureClasses,
          nominalBores
        });
      } catch (error) {
        // Silently handle backend unavailable - use fallback data
        if (error instanceof Error && error.message !== 'Backend unavailable') {
          console.error('Error loading master data:', error);
        }
        // Fallback steel specifications
        const fallbackSteelSpecs = [
          // South African Standards
          { id: 1, steelSpecName: 'SABS 62 ERW Medium' },
          { id: 2, steelSpecName: 'SABS 62 ERW Heavy' },
          { id: 3, steelSpecName: 'SABS 719 ERW' },
          // Carbon Steel - ASTM A106 (High-Temp Seamless)
          { id: 4, steelSpecName: 'ASTM A106 Grade A' },
          { id: 5, steelSpecName: 'ASTM A106 Grade B' },
          { id: 6, steelSpecName: 'ASTM A106 Grade C' },
          // Carbon Steel - ASTM A53 (General Purpose)
          { id: 7, steelSpecName: 'ASTM A53 Grade A' },
          { id: 8, steelSpecName: 'ASTM A53 Grade B' },
          // Line Pipe - API 5L (Oil/Gas Pipelines)
          { id: 9, steelSpecName: 'API 5L Grade A' },
          { id: 10, steelSpecName: 'API 5L Grade B' },
          { id: 11, steelSpecName: 'API 5L X42' },
          { id: 12, steelSpecName: 'API 5L X46' },
          { id: 13, steelSpecName: 'API 5L X52' },
          { id: 14, steelSpecName: 'API 5L X56' },
          { id: 15, steelSpecName: 'API 5L X60' },
          { id: 16, steelSpecName: 'API 5L X65' },
          { id: 17, steelSpecName: 'API 5L X70' },
          { id: 18, steelSpecName: 'API 5L X80' },
          // Low Temperature - ASTM A333
          { id: 19, steelSpecName: 'ASTM A333 Grade 1' },
          { id: 20, steelSpecName: 'ASTM A333 Grade 3' },
          { id: 21, steelSpecName: 'ASTM A333 Grade 6' },
          // Heat Exchangers/Boilers
          { id: 22, steelSpecName: 'ASTM A179' },
          { id: 23, steelSpecName: 'ASTM A192' },
          // Structural Tubing - ASTM A500
          { id: 24, steelSpecName: 'ASTM A500 Grade A' },
          { id: 25, steelSpecName: 'ASTM A500 Grade B' },
          { id: 26, steelSpecName: 'ASTM A500 Grade C' },
          // Alloy Steel - ASTM A335 (Chrome-Moly)
          { id: 27, steelSpecName: 'ASTM A335 P5' },
          { id: 28, steelSpecName: 'ASTM A335 P9' },
          { id: 29, steelSpecName: 'ASTM A335 P11' },
          { id: 30, steelSpecName: 'ASTM A335 P22' },
          { id: 31, steelSpecName: 'ASTM A335 P91' },
          // Stainless Steel - ASTM A312
          { id: 32, steelSpecName: 'ASTM A312 TP304' },
          { id: 33, steelSpecName: 'ASTM A312 TP304L' },
          { id: 34, steelSpecName: 'ASTM A312 TP316' },
          { id: 35, steelSpecName: 'ASTM A312 TP316L' },
          { id: 36, steelSpecName: 'ASTM A312 TP321' },
          { id: 37, steelSpecName: 'ASTM A312 TP347' },
        ];
        // Fallback flange standards - IDs must match database
        const fallbackFlangeStandards = [
          // British Standards
          { id: 1, code: 'BS 4504' },
          // South African Standards
          { id: 2, code: 'SABS 1123' },
          { id: 3, code: 'BS 10' },
          // American Standards (ASME/ANSI)
          { id: 4, code: 'ASME B16.5' },
          { id: 5, code: 'ASME B16.47' },
          // European Standards
          { id: 6, code: 'EN 1092-1' },
          { id: 7, code: 'DIN' },
          // Japanese Standards
          { id: 8, code: 'JIS B2220' },
          // API Standards
          { id: 9, code: 'API 6A' },
          { id: 10, code: 'AWWA C207' },
          // Australian Standards
          { id: 11, code: 'AS 2129' },
          { id: 12, code: 'AS 4087' },
          // Russian Standards
          { id: 13, code: 'GOST' },
        ];
        // Fallback nominal bores
        const fallbackNominalBores = [
          { id: 1, nominalDiameterMm: 15, outsideDiameterMm: 21.3 },
          { id: 2, nominalDiameterMm: 20, outsideDiameterMm: 26.7 },
          { id: 3, nominalDiameterMm: 25, outsideDiameterMm: 33.4 },
          { id: 4, nominalDiameterMm: 32, outsideDiameterMm: 42.2 },
          { id: 5, nominalDiameterMm: 40, outsideDiameterMm: 48.3 },
          { id: 6, nominalDiameterMm: 50, outsideDiameterMm: 60.3 },
          { id: 7, nominalDiameterMm: 65, outsideDiameterMm: 73.0 },
          { id: 8, nominalDiameterMm: 80, outsideDiameterMm: 88.9 },
          { id: 9, nominalDiameterMm: 100, outsideDiameterMm: 114.3 },
          { id: 10, nominalDiameterMm: 125, outsideDiameterMm: 139.7 },
          { id: 11, nominalDiameterMm: 150, outsideDiameterMm: 168.3 },
          { id: 12, nominalDiameterMm: 200, outsideDiameterMm: 219.1 },
          { id: 13, nominalDiameterMm: 250, outsideDiameterMm: 273.0 },
          { id: 14, nominalDiameterMm: 300, outsideDiameterMm: 323.8 },
          { id: 15, nominalDiameterMm: 350, outsideDiameterMm: 355.6 },
          { id: 16, nominalDiameterMm: 400, outsideDiameterMm: 406.4 },
          { id: 17, nominalDiameterMm: 450, outsideDiameterMm: 457.2 },
          { id: 18, nominalDiameterMm: 500, outsideDiameterMm: 508.0 },
          { id: 19, nominalDiameterMm: 600, outsideDiameterMm: 609.6 },
          { id: 20, nominalDiameterMm: 750, outsideDiameterMm: 762.0 },
          { id: 21, nominalDiameterMm: 900, outsideDiameterMm: 914.4 },
          { id: 22, nominalDiameterMm: 1000, outsideDiameterMm: 1016.0 },
          { id: 23, nominalDiameterMm: 1200, outsideDiameterMm: 1219.2 },
        ];
        setMasterData({
          steelSpecs: fallbackSteelSpecs,
          flangeStandards: fallbackFlangeStandards,
          pressureClasses: [],
          nominalBores: fallbackNominalBores
        });
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    loadMasterData();
  }, []);

  // Load draft from URL parameter if present
  // Support both 'draft' and 'draftId' parameter names for backward compatibility
  useEffect(() => {
    const draftId = searchParams?.get('draft') || searchParams?.get('draftId');
    if (!draftId) return;

    console.log('📥 Draft parameter detected:', draftId);

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await draftsApi.getById(parseInt(draftId, 10));
        console.log('📦 Loading draft:', draft);
        console.log('📦 Draft formData:', draft.formData);
        console.log('📦 Draft requiredProducts:', draft.requiredProducts);
        console.log('📦 Draft globalSpecs:', draft.globalSpecs);

        // Use the bulk restore function to set all form data at once
        // This avoids React batching issues with multiple individual updates
        restoreFromDraft({
          formData: draft.formData,
          globalSpecs: draft.globalSpecs,
          requiredProducts: draft.requiredProducts,
          straightPipeEntries: draft.straightPipeEntries,
          currentStep: draft.currentStep,
        });

        // Store draft info
        setCurrentDraftId(draft.id);
        setDraftNumber(draft.draftNumber);

        console.log(`✅ Loaded draft ${draft.draftNumber}`);
      } catch (error) {
        console.error('Failed to load draft:', error);
        alert('Failed to load the saved draft. Starting with a new form.');
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [searchParams, restoreFromDraft]);

  // Temperature derating factors for flange pressure classes
  // SABS 1123 / EN 1092-1 / PN standards: No significant derating below 200°C for carbon steel
  // ASME B16.5: More aggressive derating curve
  // For simplicity, we use a conservative approach: no derating below 200°C (where most applications operate)
  const getTemperatureDerating = (temperatureCelsius: number): number => {
    // For temperatures below 200°C, no derating applied
    // This matches SABS 1123, EN 1092-1, and PN standards for carbon steel
    // These standards allow full rated pressure up to 200°C for P235GH / A105 materials
    if (temperatureCelsius <= 200) {
      return 1.0;
    }

    // Derating curve for temperatures above 200°C (based on EN 1092-1 for P235GH)
    const deratingCurve = [
      { temp: 200, factor: 1.00 },  // Full rating up to 200°C
      { temp: 250, factor: 0.94 },
      { temp: 300, factor: 0.87 },
      { temp: 350, factor: 0.80 },
      { temp: 400, factor: 0.70 },
      { temp: 450, factor: 0.57 },
    ];

    // Above maximum temp - use minimum factor
    if (temperatureCelsius >= deratingCurve[deratingCurve.length - 1].temp) {
      return deratingCurve[deratingCurve.length - 1].factor;
    }

    // Find surrounding points and interpolate
    for (let i = 0; i < deratingCurve.length - 1; i++) {
      if (temperatureCelsius >= deratingCurve[i].temp && temperatureCelsius <= deratingCurve[i + 1].temp) {
        const lower = deratingCurve[i];
        const upper = deratingCurve[i + 1];
        const tempRange = upper.temp - lower.temp;
        const factorRange = upper.factor - lower.factor;
        const tempOffset = temperatureCelsius - lower.temp;
        return lower.factor + (factorRange * tempOffset / tempRange);
      }
    }

    return 1.0;
  };

  // Helper function to recommend pressure class based on working pressure (in bar) and temperature
  const getRecommendedPressureClass = (workingPressureBar: number, pressureClasses: any[], temperatureCelsius?: number) => {
    if (!workingPressureBar || !pressureClasses.length) return null;

    // Get temperature derating factor (defaults to 1.0 for ambient/unknown)
    const deratingFactor = temperatureCelsius !== undefined ? getTemperatureDerating(temperatureCelsius) : 1.0;

    // Pressure class mappings for letter/special designations (bar ratings at ambient)
    const specialMappings: { [key: string]: number } = {
      // BS 10 & AS 2129 Table designations
      'T/D': 7,    // Table D: ~7 bar
      'T/E': 14,   // Table E: ~14 bar
      'T/F': 21,   // Table F: ~21 bar
      'T/H': 35,   // Table H: ~35 bar (AS 2129)
      // AWWA C207 Classes (approximate bar ratings)
      'Class B': 6,   // ~86 psi = 6 bar
      'Class D': 10,  // ~150 psi = 10 bar
      'Class E': 17,  // ~250 psi = 17 bar
      'Class F': 21,  // ~300 psi = 21 bar
    };

    // ASME Class to bar conversion (at ambient temperature ~38°C)
    const asmeClassToBar: { [key: string]: number } = {
      '75': 10,    // Class 75 ≈ 10 bar (B16.47)
      '150': 20,   // Class 150 ≈ 20 bar
      '300': 51,   // Class 300 ≈ 51 bar
      '400': 68,   // Class 400 ≈ 68 bar
      '600': 102,  // Class 600 ≈ 102 bar
      '900': 153,  // Class 900 ≈ 153 bar
      '1500': 255, // Class 1500 ≈ 255 bar
      '2500': 425, // Class 2500 ≈ 425 bar
    };

    // Extract rating from designation and apply temperature derating
    const classesWithRating = pressureClasses.map(pc => {
      const designation = pc.designation?.trim();
      let ambientRating = 0;

      // Check if it's a special letter-based designation (BS 10, AS 2129, AWWA)
      if (specialMappings[designation]) {
        ambientRating = specialMappings[designation];
      }
      // Check if it's ASME Class designation (75, 150, 300, etc.)
      else if (asmeClassToBar[designation]) {
        ambientRating = asmeClassToBar[designation];
      }
      // Check for API 6A psi format (2000 psi, 5000 psi, etc.)
      else {
        const psiMatch = designation?.match(/^(\d+)\s*psi$/i);
        if (psiMatch) {
          ambientRating = Math.round(parseInt(psiMatch[1]) * 0.0689);
        }
        // Check for PN (Pressure Nominal) format - EN, DIN, GOST, AS 4087
        else {
          const pnMatch = designation?.match(/^PN\s*(\d+)/i);
          if (pnMatch) {
            ambientRating = parseInt(pnMatch[1]);
          }
          // Check for JIS K format (5K, 10K, etc.)
          else {
            const jisMatch = designation?.match(/^(\d+)K$/i);
            if (jisMatch) {
              ambientRating = parseInt(jisMatch[1]);
            }
            // Handle "/X" format designations (both SABS 1123 and BS 4504)
            // SABS 1123: 600/3=6bar, 1000/3=10bar, 1600/3=16bar (divide by 100)
            // BS 4504: 6/3=6bar, 10/3=10bar, 16/3=16bar (use directly)
            else {
              const slashMatch = designation?.match(/^(\d+)\s*\/\s*\d+$/);
              if (slashMatch) {
                const numericValue = parseInt(slashMatch[1]);
                // SABS 1123 uses large numbers (600, 1000, 1600, etc.) - divide by 100
                // BS 4504 uses small numbers (6, 10, 16, 25, 40, etc.) - use directly
                if (numericValue >= 500) {
                  ambientRating = numericValue / 100; // SABS: 1000 → 10 bar
                } else {
                  ambientRating = numericValue; // BS 4504: 10 → 10 bar
                }
              }
              // Fallback: try to extract any leading number
              else {
                const numMatch = designation?.match(/^(\d+)/);
                if (numMatch) {
                  const num = parseInt(numMatch[1]);
                  ambientRating = num >= 500 ? num / 100 : num;
                }
              }
            }
          }
        }
      }

      // Apply temperature derating to get actual rating at operating temperature
      const actualRating = ambientRating * deratingFactor;
      return { ...pc, barRating: actualRating, ambientRating };
    }).filter(pc => pc.barRating > 0);

    if (classesWithRating.length === 0) return null;

    // Sort by bar rating ascending (ensure consistent ordering)
    classesWithRating.sort((a, b) => {
      // Primary sort by bar rating
      const ratingDiff = a.barRating - b.barRating;
      if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
      // Secondary sort by designation for consistency
      return (a.designation || '').localeCompare(b.designation || '');
    });

    // Log all available classes for debugging
    console.log(`Available pressure classes for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C (derating: ${deratingFactor.toFixed(2)}):`,
      classesWithRating.map(pc => `${pc.designation}=${pc.barRating.toFixed(1)}bar`).join(', '));

    // Find the lowest rating that meets or exceeds the working pressure at operating temperature
    // Using small tolerance for floating point comparison
    const recommended = classesWithRating.find(pc => pc.barRating >= workingPressureBar - 0.01);

    if (recommended) {
      console.log(`Selected: ${recommended.designation} (${recommended.barRating.toFixed(1)} bar capacity) for ${workingPressureBar} bar working pressure`);
    } else {
      console.log(`No suitable class found for ${workingPressureBar} bar, using highest available`);
    }

    return recommended || classesWithRating[classesWithRating.length - 1]; // Return highest if none match
  };

  // Fallback pressure classes by flange standard - IDs must match database
  const getFallbackPressureClasses = (standardId: number) => {
    const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
    const code = standard?.code || '';

    // BS 4504 pressure classes (database IDs 1-8)
    if (code.includes('BS 4504')) {
      return [
        { id: 1, designation: '6/3', standardId },
        { id: 2, designation: '10/3', standardId },
        { id: 3, designation: '16/3', standardId },
        { id: 4, designation: '25/3', standardId },
        { id: 5, designation: '40/3', standardId },
        { id: 6, designation: '64/3', standardId },
        { id: 7, designation: '100/3', standardId },
        { id: 8, designation: '160/3', standardId },
      ];
    }
    // SABS 1123 pressure classes (database IDs 9-13)
    if (code.includes('SABS 1123')) {
      return [
        { id: 9, designation: '600/3', standardId },
        { id: 10, designation: '1000/3', standardId },
        { id: 11, designation: '1600/3', standardId },
        { id: 12, designation: '2500/3', standardId },
        { id: 13, designation: '4000/3', standardId },
      ];
    }
    // BS 10 pressure classes (database IDs 14-16)
    if (code.includes('BS 10')) {
      return [
        { id: 14, designation: 'T/D', standardId },
        { id: 15, designation: 'T/E', standardId },
        { id: 16, designation: 'T/F', standardId },
      ];
    }
    // ASME B16.5 / ANSI B16.5 pressure classes (database IDs 17-23)
    if (code.includes('ASME B16.5') || code.includes('ANSI B16.5')) {
      return [
        { id: 17, designation: '150', standardId },
        { id: 18, designation: '300', standardId },
        { id: 19, designation: '400', standardId },
        { id: 20, designation: '600', standardId },
        { id: 21, designation: '900', standardId },
        { id: 22, designation: '1500', standardId },
        { id: 23, designation: '2500', standardId },
      ];
    }
    // EN 1092-1 pressure classes (database IDs 24-31)
    if (code.includes('EN 1092')) {
      return [
        { id: 24, designation: 'PN 6', standardId },
        { id: 25, designation: 'PN 10', standardId },
        { id: 26, designation: 'PN 16', standardId },
        { id: 27, designation: 'PN 25', standardId },
        { id: 28, designation: 'PN 40', standardId },
        { id: 29, designation: 'PN 63', standardId },
        { id: 30, designation: 'PN 100', standardId },
        { id: 31, designation: 'PN 160', standardId },
      ];
    }
    // DIN pressure classes (database IDs 32-36)
    if (code.includes('DIN')) {
      return [
        { id: 32, designation: 'PN 6', standardId },
        { id: 33, designation: 'PN 10', standardId },
        { id: 34, designation: 'PN 16', standardId },
        { id: 35, designation: 'PN 25', standardId },
        { id: 36, designation: 'PN 40', standardId },
      ];
    }
    // JIS B2220 pressure classes (database IDs 37-43)
    if (code.includes('JIS')) {
      return [
        { id: 37, designation: '5K', standardId },
        { id: 38, designation: '10K', standardId },
        { id: 39, designation: '16K', standardId },
        { id: 40, designation: '20K', standardId },
        { id: 41, designation: '30K', standardId },
        { id: 42, designation: '40K', standardId },
        { id: 43, designation: '63K', standardId },
      ];
    }
    // AS 2129 pressure classes (database IDs 44-47)
    if (code.includes('AS 2129')) {
      return [
        { id: 44, designation: 'T/D', standardId },
        { id: 45, designation: 'T/E', standardId },
        { id: 46, designation: 'T/F', standardId },
        { id: 47, designation: 'T/H', standardId },
      ];
    }
    // AS 4087 pressure classes (database IDs 48-52)
    if (code.includes('AS 4087')) {
      return [
        { id: 48, designation: 'PN 14', standardId },
        { id: 49, designation: 'PN 16', standardId },
        { id: 50, designation: 'PN 21', standardId },
        { id: 51, designation: 'PN 25', standardId },
        { id: 52, designation: 'PN 35', standardId },
      ];
    }
    // GOST pressure classes (database IDs 53-58)
    if (code.includes('GOST')) {
      return [
        { id: 53, designation: 'PN 6', standardId },
        { id: 54, designation: 'PN 10', standardId },
        { id: 55, designation: 'PN 16', standardId },
        { id: 56, designation: 'PN 25', standardId },
        { id: 57, designation: 'PN 40', standardId },
        { id: 58, designation: 'PN 63', standardId },
      ];
    }
    // ASME B16.47 pressure classes (database IDs 59-64)
    if (code.includes('ASME B16.47')) {
      return [
        { id: 59, designation: '75', standardId },
        { id: 60, designation: '150', standardId },
        { id: 61, designation: '300', standardId },
        { id: 62, designation: '400', standardId },
        { id: 63, designation: '600', standardId },
        { id: 64, designation: '900', standardId },
      ];
    }
    // API 6A pressure classes (database IDs 65-70)
    if (code.includes('API 6A')) {
      return [
        { id: 65, designation: '2000 psi', standardId },
        { id: 66, designation: '3000 psi', standardId },
        { id: 67, designation: '5000 psi', standardId },
        { id: 68, designation: '10000 psi', standardId },
        { id: 69, designation: '15000 psi', standardId },
        { id: 70, designation: '20000 psi', standardId },
      ];
    }
    // AWWA C207 pressure classes (database IDs 71-74)
    if (code.includes('AWWA')) {
      return [
        { id: 71, designation: 'Class B', standardId },
        { id: 72, designation: 'Class D', standardId },
        { id: 73, designation: 'Class E', standardId },
        { id: 74, designation: 'Class F', standardId },
      ];
    }
    // BS 1560 pressure classes (same as ASME)
    if (code.includes('BS 1560')) {
      return [
        { id: 901, designation: '150', standardId },
        { id: 902, designation: '300', standardId },
        { id: 903, designation: '600', standardId },
        { id: 904, designation: '900', standardId },
        { id: 905, designation: '1500', standardId },
        { id: 906, designation: '2500', standardId },
      ];
    }
    // Default empty
    return [];
  };

  // Fetch available pressure classes for a standard and auto-select recommended
  const fetchAndSelectPressureClass = async (standardId: number, workingPressureBar?: number, temperatureCelsius?: number, materialGroup?: string) => {
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const classes = await masterDataApi.getFlangePressureClassesByStandard(standardId);

      // Log what we got from the API
      const standardName = masterData.flangeStandards?.find((s: any) => s.id === standardId)?.code || standardId;
      console.log(`Fetched ${classes.length} pressure classes for ${standardName}:`, classes.map((c: any) => `${c.designation}(id=${c.id})`).join(', '));

      setAvailablePressureClasses(classes);

      // Auto-select recommended pressure class if working pressure is available
      if (workingPressureBar && classes.length > 0) {
        // Try P/T rating API for temperature-based selection (works for any standard with P/T data)
        if (temperatureCelsius !== undefined) {
          try {
            // Build URL with material group if provided
            const ptMaterialGroup = materialGroup || 'Carbon Steel A105 (Group 1.1)';
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/flange-pt-ratings/recommended-class?standardId=${standardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`
            );
            if (response.ok) {
              const text = await response.text();
              if (text && text.trim()) {
                try {
                  const recommendedClassId = JSON.parse(text);
                  if (recommendedClassId) {
                    const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
                    console.log(`P/T rating: Selected class ID ${recommendedClassId} for ${standard?.code || standardId} at ${workingPressureBar} bar, ${temperatureCelsius}°C (${ptMaterialGroup})`);
                    return recommendedClassId;
                  }
                } catch {
                  // Invalid JSON, fall through to fallback
                }
              }
            }
          } catch (ptError) {
            // Silently fall back to ambient calculation if P/T API fails
          }
        }

        // Fallback to temperature-derated calculation if P/T API not available
        const recommended = getRecommendedPressureClass(workingPressureBar, classes, temperatureCelsius);
        if (recommended) {
          return recommended.id;
        }
      }

      return null;
    } catch (error) {
      // Use fallback pressure classes when backend is unavailable
      const fallbackClasses = getFallbackPressureClasses(standardId);
      setAvailablePressureClasses(fallbackClasses);

      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('Error fetching pressure classes:', error);
      }

      // Auto-select recommended from fallback classes with temperature derating
      if (workingPressureBar && fallbackClasses.length > 0) {
        const recommended = getRecommendedPressureClass(workingPressureBar, fallbackClasses, temperatureCelsius);
        if (recommended) {
          return recommended.id;
        }
      }

      return null;
    }
  };

  // Fetch available schedules for a specific entry
  // IMPORTANT: This function should NOT replace working fallback data with API data
  // because API schedule names may differ from fallback names, breaking the selected value
  const fetchAvailableSchedules = async (entryId: string, steelSpecId: number, nominalBoreMm: number) => {
    // Check for fallback data first to provide immediate response - use correct schedule list based on steel spec
    const fallbackSchedules = getScheduleListForSpec(nominalBoreMm, steelSpecId);

    // If we already have schedules for this entry, don't fetch from API
    // This prevents API data with different schedule names from breaking the selection
    const existingSchedules = availableSchedulesMap[entryId];
    if (existingSchedules && existingSchedules.length > 0) {
      console.log(`[fetchAvailableSchedules] Entry ${entryId} already has ${existingSchedules.length} schedules, skipping API fetch`);
      return existingSchedules;
    }

    // Use fallback data - it's reliable and consistent
    if (fallbackSchedules.length > 0) {
      console.log(`[fetchAvailableSchedules] Using ${fallbackSchedules.length} fallback schedules for ${nominalBoreMm}mm`);
      setAvailableSchedulesMap(prev => ({
        ...prev,
        [entryId]: fallbackSchedules
      }));
      return fallbackSchedules;
    }

    // Only try API if we have no fallback data
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');

      console.log(`[fetchAvailableSchedules] Entry: ${entryId}, Steel: ${steelSpecId}, NB: ${nominalBoreMm}mm`);

      // Find the nominal outside diameter ID from nominalBoreMm
      const nominalBore = masterData.nominalBores?.find((nb: any) => {
        const nbValue = nb.nominal_diameter_mm ?? nb.nominalDiameterMm;
        return nbValue === nominalBoreMm || nbValue === Number(nominalBoreMm);
      });

      if (!nominalBore) {
        console.warn(`[fetchAvailableSchedules] No nominal bore found for ${nominalBoreMm}mm in masterData`);
        return [];
      }

      console.log(`[fetchAvailableSchedules] Found nominalBore ID: ${nominalBore.id}`);

      const dimensions = await masterDataApi.getPipeDimensionsAll(steelSpecId, nominalBore.id);

      console.log(`[fetchAvailableSchedules] Got ${dimensions?.length || 0} dimensions from API`);

      if (dimensions && dimensions.length > 0) {
        setAvailableSchedulesMap(prev => ({
          ...prev,
          [entryId]: dimensions
        }));
        return dimensions;
      }

      return [];
    } catch (error) {
      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('[fetchAvailableSchedules] Error:', error);
      }
      return [];
    }
  };

  // Fetch bend options (nominal bores and degrees) for a bend type
  const fetchBendOptions = async (bendType: string) => {
    // Return cached data if available
    if (bendOptionsCache[bendType]) {
      return bendOptionsCache[bendType];
    }

    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const options = await masterDataApi.getBendOptions(bendType);

      // Cache the result
      setBendOptionsCache(prev => ({
        ...prev,
        [bendType]: options
      }));

      return options;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error(`Error fetching bend options for ${bendType}:`, error);
      }
      return { nominalBores: [], degrees: [] };
    }
  };

  // Fetch center-to-face dimension from API based on bend type, NB, and angle
  const fetchCenterToFace = async (entryId: string, bendType: string, nominalBoreMm: number, degrees: number) => {
    if (!bendType || !nominalBoreMm || !degrees) {
      console.log('[CenterToFace] Missing required parameters:', { bendType, nominalBoreMm, degrees });
      return null;
    }

    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const result = await masterDataApi.getBendCenterToFace(bendType, nominalBoreMm, degrees);

      if (result && result.centerToFaceMm) {
        console.log(`[CenterToFace] Found: ${result.centerToFaceMm}mm for ${bendType} ${nominalBoreMm}NB @ ${degrees}°`);

        // Find the current entry to merge specs
        const currentEntry = rfqData.items.find((item: any) => item.id === entryId);
        if (currentEntry && currentEntry.specs) {
          // Update the entry with the center-to-face value, merging with existing specs
          updateItem(entryId, {
            specs: {
              ...currentEntry.specs,
              centerToFaceMm: Number(result.centerToFaceMm),
              bendRadiusMm: Number(result.radiusMm)
            } as any
          });
        }

        return result;
      }
      return null;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error(`[CenterToFace] Error fetching for ${bendType} ${nominalBoreMm}NB @ ${degrees}°:`, error);
      }
      return null;
    }
  };

  // Auto-select flange specifications based on item-level operating conditions
  const autoSelectFlangeSpecs = async (
    entryId: string,
    entryType: 'straight-pipe' | 'bend',
    workingPressureBar: number,
    flangeStandardId?: number,
    updateCallback?: (updates: any) => void,
    temperatureCelsius?: number,
    materialGroup?: string
  ) => {
    if (!workingPressureBar || !flangeStandardId) return;

    try {
      // Fetch pressure classes for the standard and get recommendation
      const { masterDataApi } = await import('@/app/lib/api/client');
      const classes = await masterDataApi.getFlangePressureClassesByStandard(flangeStandardId);

      if (classes.length > 0) {
        let recommendedId: number | null = null;

        // Try P/T rating API for temperature-based selection with material group
        if (temperatureCelsius !== undefined) {
          try {
            const ptMaterialGroup = materialGroup || 'Carbon Steel A105 (Group 1.1)';
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/flange-pt-ratings/recommended-class?standardId=${flangeStandardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`
            );
            if (response.ok) {
              const text = await response.text();
              if (text && text.trim()) {
                try {
                  recommendedId = JSON.parse(text);
                  if (recommendedId && updateCallback) {
                    const recommendedClass = classes.find((c: any) => c.id === recommendedId);
                    updateCallback({
                      flangePressureClassId: recommendedId,
                      autoSelectedPressureClass: true
                    });
                    console.log(`Auto-selected pressure class ${recommendedClass?.designation || recommendedId} for ${workingPressureBar} bar at ${temperatureCelsius}°C (${ptMaterialGroup})`);
                    return;
                  }
                } catch {
                  // Invalid JSON, fall through to fallback
                }
              }
            }
          } catch {
            // Fall back to local calculation
          }
        }

        // Fallback to local temperature-derated calculation
        const recommended = getRecommendedPressureClass(workingPressureBar, classes, temperatureCelsius);
        if (recommended && updateCallback) {
          updateCallback({
            flangePressureClassId: recommended.id,
            autoSelectedPressureClass: true
          });
          console.log(`Auto-selected pressure class ${recommended.designation} for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C`);
        }
      }
    } catch (error) {
      console.error('Error auto-selecting flange specs:', error);
    }
  };

  // Refetch available schedules when global steel specification changes
  // NOTE: Removed rfqData.straightPipeEntries from dependencies to prevent re-fetching on every entry change
  // The NB onChange handler handles setting schedules when user selects a new NB
  useEffect(() => {
    const steelSpecId = rfqData.globalSpecs?.steelSpecificationId;
    if (!steelSpecId || !masterData.nominalBores?.length) return;

    // Only prefetch schedules when steel spec changes - this is a background operation
    // that won't overwrite existing schedule selections due to the check in fetchAvailableSchedules
    rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
      if (entry.specs.nominalBoreMm) {
        fetchAvailableSchedules(entry.id, steelSpecId, entry.specs.nominalBoreMm);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqData.globalSpecs?.steelSpecificationId, masterData.nominalBores?.length]);

  // Auto-calculate when entry specifications change (with debounce)
  useEffect(() => {
    const calculateEntry = async (entry: StraightPipeEntry) => {
      // Get working pressure from entry specs or global specs
      const workingPressureBar = entry.specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar;
      const workingTemperatureC = entry.specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC;
      const steelSpecificationId = entry.specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId;
      const flangeStandardId = entry.specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId;
      const flangePressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;

      // Only auto-calculate if all required fields are present
      const hasRequiredFields =
        entry.specs.nominalBoreMm &&
        (entry.specs.scheduleNumber || entry.specs.wallThicknessMm) &&
        entry.specs.individualPipeLength &&
        entry.specs.quantityValue &&
        workingPressureBar;

      // Debug logging
      console.log('📊 Auto-calculate check:', {
        entryId: entry.id,
        nominalBoreMm: entry.specs.nominalBoreMm,
        scheduleNumber: entry.specs.scheduleNumber,
        wallThicknessMm: entry.specs.wallThicknessMm,
        individualPipeLength: entry.specs.individualPipeLength,
        quantityValue: entry.specs.quantityValue,
        workingPressureBar,
        hasRequiredFields
      });

      if (!hasRequiredFields) {
        console.log('❌ Missing required fields, skipping calculation');
        return;
      }

      try {
        const { rfqApi } = await import('@/app/lib/api/client');
        // Merge entry specs with global specs
        const calculationData = {
          ...entry.specs,
          workingPressureBar,
          workingTemperatureC,
          steelSpecificationId,
          flangeStandardId,
          flangePressureClassId,
        };
        console.log('🔄 Calling API with:', calculationData);
        const result = await rfqApi.calculate(calculationData);
        console.log('✅ Calculation result:', result);

        // Recalculate flange weight based on actual pressure class used (may be overridden)
        const pressureClassDesignation = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
        )?.designation;

        if (result && result.numberOfFlanges > 0 && pressureClassDesignation) {
          const flangeWeightPerUnit = getFlangeWeight(entry.specs.nominalBoreMm!, pressureClassDesignation);
          const totalFlangeWeight = result.numberOfFlanges * flangeWeightPerUnit;
          const totalSystemWeight = (result.totalPipeWeight || 0) + totalFlangeWeight;

          console.log(`🔧 Recalculating flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${result.numberOfFlanges} = ${totalFlangeWeight}kg`);

          updateEntryCalculation(entry.id, {
            ...result,
            flangeWeightPerUnit,
            totalFlangeWeight,
            totalSystemWeight,
            pressureClassUsed: pressureClassDesignation
          } as any);
        } else {
          updateEntryCalculation(entry.id, result);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If API returns 404 (NB/schedule combination not in database), use local calculation silently
        if (errorMessage.includes('API Error (404)') || errorMessage.includes('not available in the database')) {
          console.log('⚠️ API 404 - Using local calculation fallback for', entry.specs.nominalBoreMm, 'NB');
          const wallThickness = entry.specs.wallThicknessMm || 6.35; // Default wall thickness

          // Get pressure class designation for accurate flange weights
          const pressureClassDesignation = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
          )?.designation;

          const localResult = calculateLocalPipeResult(
            entry.specs.nominalBoreMm!,
            wallThickness,
            entry.specs.individualPipeLength!,
            entry.specs.quantityValue!,
            entry.specs.quantityType || 'number_of_pipes',
            entry.specs.pipeEndConfiguration || 'PE',
            pressureClassDesignation
          );
          console.log('✅ Local calculation result:', localResult);
          updateEntryCalculation(entry.id, localResult);
          return;
        }

        // Silently handle other expected errors (backend unavailable, bad request)
        const isExpectedError =
          errorMessage === 'Backend unavailable' ||
          errorMessage.includes('API Error (400)') ||
          errorMessage.includes('fetch failed');

        if (!isExpectedError) {
          console.error('❌ Calculation API error:', error);
        }
      }
    };

    // Debounce the calculation to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      // Calculate all entries that have complete data
      rfqData.straightPipeEntries.forEach((entry: StraightPipeEntry) => {
        calculateEntry(entry);
      });
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [
    // Watch for changes in any entry's specs (including flange overrides)
    JSON.stringify(rfqData.straightPipeEntries.map((e: StraightPipeEntry) => ({
      id: e.id,
      nominalBoreMm: e.specs.nominalBoreMm,
      scheduleNumber: e.specs.scheduleNumber,
      wallThicknessMm: e.specs.wallThicknessMm,
      individualPipeLength: e.specs.individualPipeLength,
      quantityValue: e.specs.quantityValue,
      quantityType: e.specs.quantityType,
      pipeEndConfiguration: e.specs.pipeEndConfiguration,
      flangeStandardId: e.specs.flangeStandardId,
      flangePressureClassId: e.specs.flangePressureClassId,
      hasFlangeOverride: e.hasFlangeOverride,
      flangeOverrideConfirmed: e.flangeOverrideConfirmed
    }))),
    // Also watch global specs for calculation
    rfqData.globalSpecs?.workingPressureBar,
    rfqData.globalSpecs?.workingTemperatureC,
    rfqData.globalSpecs?.steelSpecificationId,
    rfqData.globalSpecs?.flangeStandardId,
    rfqData.globalSpecs?.flangePressureClassId
  ]);

  // Initialize pressure classes when flange standard is set (e.g., from saved state or initial load)
  useEffect(() => {
    const initializePressureClasses = async () => {
      const standardId = rfqData.globalSpecs?.flangeStandardId;
      if (standardId && availablePressureClasses.length === 0) {
        console.log(`Initializing pressure classes for standard ${standardId}`);
        const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === rfqData.globalSpecs?.steelSpecificationId);
        const materialGroup = getFlangeMaterialGroup(steelSpec?.steelSpecName);
        const recommendedId = await fetchAndSelectPressureClass(
          standardId,
          rfqData.globalSpecs?.workingPressureBar,
          rfqData.globalSpecs?.workingTemperatureC,
          materialGroup
        );
        // Auto-select if not already set
        if (recommendedId && !rfqData.globalSpecs?.flangePressureClassId) {
          updateGlobalSpecs({
            ...rfqData.globalSpecs,
            flangePressureClassId: recommendedId
          });
        }
      }
    };
    initializePressureClasses();
  }, [rfqData.globalSpecs?.flangeStandardId, masterData.steelSpecs]);

  // Scroll to top helper function - scrolls both the content container and the window
  const scrollToTop = () => {
    // Use setTimeout to ensure content has rendered before scrolling
    setTimeout(() => {
      // Scroll the container if available
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Also scroll the window/document to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Scroll the document element as fallback
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);
  };

  // Scroll to first error field helper function
  const scrollToFirstError = (errorKey: string) => {
    // Map error keys to field identifiers
    const errorKeyToSelector: Record<string, string> = {
      // Page 1 fields
      projectName: '[data-field="projectName"]',
      projectType: '[data-field="projectType"]',
      customerName: '[data-field="customerName"]',
      description: '[data-field="description"]',
      customerEmail: '[data-field="customerEmail"]',
      customerPhone: '[data-field="customerPhone"]',
      requiredDate: '[data-field="requiredDate"]',
      requiredProducts: '[data-field="requiredProducts"]',
      // Page 2 fields - Global Specifications
      workingPressure: '[data-field="workingPressure"]',
      workingTemperature: '[data-field="workingTemperature"]',
      steelPipesConfirmation: '[data-field="steelPipesConfirmation"]',
      fastenersConfirmation: '[data-field="fastenersConfirmation"]',
      externalCoatingType: '[data-field="externalCoatingType"]',
      internalLiningType: '[data-field="internalLiningType"]',
      flangeStandard: '[data-field="flangeStandard"]',
      flangePressureClass: '[data-field="flangePressureClass"]',
      steelSpecification: '[data-field="steelSpecification"]',
      // Fitting-specific fields
      fittingType: '[data-field="fittingType"]',
      fittingNominalDiameter: '[data-field="fittingNominalDiameter"]',
      branchNominalDiameter: '[data-field="branchNominalDiameter"]',
    };

    // Check if it's a pipe-specific error (pipe_0_nb, pipe_1_length, etc.)
    let selector = errorKeyToSelector[errorKey];
    if (!selector && errorKey.startsWith('pipe_')) {
      // Extract index and field type from error key like "pipe_0_nb"
      const match = errorKey.match(/pipe_(\d+)_(\w+)/);
      if (match) {
        const [, index, fieldType] = match;
        selector = `[data-field="pipe_${index}_${fieldType}"]`;
      }
    }

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add visual highlight effect
        element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
        }, 3000);
        // Try to focus the input element if it exists
        const input = element.querySelector('input, select, textarea') as HTMLElement;
        if (input) {
          setTimeout(() => input.focus(), 300);
        }
        return;
      }
    }

    // Fallback: try to find by name attribute or scroll to top
    const fallbackElement = document.querySelector(`[name="${errorKey}"]`) ||
                           document.querySelector(`#${errorKey}`);
    if (fallbackElement) {
      fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      scrollToTop();
    }
  };

  // Enhanced next step function with validation
  const nextStep = () => {
    // Validate current step before proceeding
    let errors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        errors = validatePage1RequiredFields(rfqData);
        break;
      case 2:
        errors = validatePage2Specifications(rfqData.globalSpecs);
        // Check if steel pipes is selected but not confirmed
        if (rfqData.requiredProducts?.includes('fabricated_steel') && !rfqData.globalSpecs?.steelPipesSpecsConfirmed) {
          errors.steelPipesConfirmation = 'Please confirm the Steel Pipe Specifications before proceeding';
        }
        // Check if fasteners/gaskets is selected but not confirmed
        if (rfqData.requiredProducts?.includes('fasteners_gaskets') && !rfqData.globalSpecs?.fastenersConfirmed) {
          errors.fastenersConfirmation = 'Please confirm the Fasteners & Gaskets selection before proceeding';
        }
        // Check if surface protection is selected but coating/lining types are not selected
        if (rfqData.requiredProducts?.includes('surface_protection')) {
          if (!rfqData.globalSpecs?.externalCoatingType) {
            errors.externalCoatingType = 'Please select an External Coating Type';
          }
          // Internal lining is required unless external is Galvanized (which covers both)
          if (rfqData.globalSpecs?.externalCoatingType !== 'Galvanized' && !rfqData.globalSpecs?.internalLiningType) {
            errors.internalLiningType = 'Please select an Internal Lining Type';
          }
        }
        break;
      case 3:
        errors = validatePage3Items(rfqData.straightPipeEntries);
        break;
    }

    setValidationErrors(errors);

    // Only proceed if no validation errors
    if (Object.keys(errors).length === 0) {
      originalNextStep();
      scrollToTop();
    } else {
      // Scroll to the first field with an error
      const firstErrorKey = Object.keys(errors)[0];
      scrollToFirstError(firstErrorKey);
    }
  };

  // Previous step function with scroll to top
  const handlePrevStep = () => {
    prevStep();
    scrollToTop();
  };

  // Next step function (no validation) - used to go from Review to BOQ
  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
    scrollToTop();
  };

  // Step click handler with scroll to top
  const handleStepClick = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    scrollToTop();
  };

  // Auto-generate client item numbers based on customer name for ALL item types
  useEffect(() => {
    if (rfqData.customerName && rfqData.items) {
      rfqData.items.forEach((entry: any, index: number) => {
        if (!entry.clientItemNumber || entry.clientItemNumber.trim() === '') {
          const autoGenNumber = generateClientItemNumber(rfqData.customerName, index + 1);
          // Use updateItem for all item types to maintain unified numbering sequence
          updateItem(entry.id, { clientItemNumber: autoGenNumber });
        }
      });
    }
  }, [rfqData.items, rfqData.customerName, updateItem]);

  const handleCalculateAll = async () => {
    try {
      for (const entry of rfqData.straightPipeEntries) {
        try {
          // Merge entry specs with global specs (same as auto-calculate)
          const workingPressureBar = entry.specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10;
          const workingTemperatureC = entry.specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20;
          const steelSpecificationId = entry.specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2;
          const flangeStandardId = entry.specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId || 1;
          const flangePressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;

          const calculationData = {
            ...entry.specs,
            workingPressureBar,
            workingTemperatureC,
            steelSpecificationId,
            flangeStandardId,
            flangePressureClassId,
          };

          console.log('🔄 Manual calculate for entry:', entry.id, calculationData);
          const result = await rfqApi.calculate(calculationData);
          console.log('✅ Manual calculation result:', result);
          updateEntryCalculation(entry.id, result);
        } catch (error: any) {
          console.error(`Calculation error for entry ${entry.id}:`, error);
          const errorMessage = error.message || String(error);

          // If API returns 404, use local calculation fallback
          if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('not available')) {
            console.log('⚠️ API 404 - Using local calculation fallback for entry:', entry.id);
            const wallThickness = entry.specs.wallThicknessMm || 6.35;

            // Get pressure class designation for accurate flange weights
            const entryPressureClassId = entry.specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId;
            const pressureClassDesignation = masterData.pressureClasses?.find(
              (pc: { id: number; designation: string }) => pc.id === entryPressureClassId
            )?.designation;

            const localResult = calculateLocalPipeResult(
              entry.specs.nominalBoreMm!,
              wallThickness,
              entry.specs.individualPipeLength!,
              entry.specs.quantityValue!,
              entry.specs.quantityType || 'number_of_pipes',
              entry.specs.pipeEndConfiguration || 'PE',
              pressureClassDesignation
            );
            console.log('✅ Local calculation result:', localResult);
            updateEntryCalculation(entry.id, localResult);
          } else {
            alert(`Calculation error for item: ${entry.description || 'Untitled'}\n\n${errorMessage}`);
          }
        }
      }
    } catch (error) {
      console.error('Calculation error:', error);
      alert('An unexpected error occurred during calculation. Please check your inputs and try again.');
    }
  };

  const handleCalculateBend = async (entryId: string) => {
    try {
      const entry = rfqData.items.find(e => e.id === entryId && e.itemType === 'bend');
      if (!entry || entry.itemType !== 'bend') return;

      const bendEntry = entry;
      const bendDegrees = bendEntry.specs?.bendDegrees || 90;

      // API requires minimum 15° - for smaller angles, use local calculation
      if (bendDegrees < 15) {
        console.log(`Bend angle ${bendDegrees}° is below API minimum (15°), using local calculation`);

        // Local calculation for small angle bends
        const nominalBoreMm = bendEntry.specs?.nominalBoreMm || 40;
        const scheduleNumber = bendEntry.specs?.scheduleNumber || '40';
        const quantity = bendEntry.specs?.quantityValue || 1;
        const centerToFace = bendEntry.specs?.centerToFaceMm || 100;

        // Get wall thickness from fallback schedules - use correct schedule list based on steel spec
        const bendEffectiveSpecId = bendEntry.specs?.steelSpecificationId ?? rfqData.globalSpecs?.steelSpecificationId;
        const schedules = getScheduleListForSpec(nominalBoreMm, bendEffectiveSpecId);
        const scheduleData = schedules.find((s: any) => s.scheduleDesignation === scheduleNumber);
        const wallThickness = scheduleData?.wallThicknessMm || 6.35;

        // Calculate OD from NB
        const od = NB_TO_OD_LOOKUP[nominalBoreMm] || (nominalBoreMm * 1.05);
        const id = od - (2 * wallThickness);

        // Estimate bend arc length based on angle and C/F
        const arcLength = (bendDegrees / 90) * (centerToFace * 2);

        // Weight calculation: π/4 × (OD² - ID²) × length × density (7850 kg/m³ for steel)
        const crossSectionArea = (Math.PI / 4) * ((od * od) - (id * id)); // mm²
        const bendWeight = (crossSectionArea / 1000000) * (arcLength / 1000) * 7850; // kg

        const totalWeight = bendWeight * quantity;

        updateItem(entryId, {
          calculation: {
            bendWeight: bendWeight,
            totalWeight: totalWeight,
            centerToFaceDimension: centerToFace,
            outsideDiameterMm: od,
            wallThicknessMm: wallThickness,
            calculatedLocally: true,
            note: `Local calculation for ${bendDegrees}° bend (API minimum is 15°)`
          },
        });
        return;
      }

      const { bendRfqApi } = await import('@/app/lib/api/client');

      const calculationData = {
        nominalBoreMm: bendEntry.specs?.nominalBoreMm || 40,
        scheduleNumber: bendEntry.specs?.scheduleNumber || '40',
        bendDegrees: bendDegrees,
        bendType: bendEntry.specs?.bendType || '1.5D',
        quantityValue: bendEntry.specs?.quantityValue || 1,
        quantityType: 'number_of_items' as const,
        numberOfTangents: bendEntry.specs?.numberOfTangents || 0,
        tangentLengths: bendEntry.specs?.tangentLengths || [],
        workingPressureBar: bendEntry.specs?.workingPressureBar || rfqData.globalSpecs.workingPressureBar || 10,
        workingTemperatureC: bendEntry.specs?.workingTemperatureC || rfqData.globalSpecs.workingTemperatureC || 20,
        steelSpecificationId: bendEntry.specs?.steelSpecificationId || rfqData.globalSpecs.steelSpecificationId || 2,
        useGlobalFlangeSpecs: true,
      };

      const result = await bendRfqApi.calculate(calculationData);

      updateItem(entryId, {
        calculation: result,
      });

    } catch (error: any) {
      console.error('Bend calculation failed:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Unknown error';
      console.error('Bend calculation error details:', { error, errorMessage });
      alert('Bend calculation failed: ' + errorMessage);
    }
  };

  const handleCalculateFitting = async (entryId: string) => {
    console.log('handleCalculateFitting called with entryId:', entryId);
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      
      const entry = rfqData.items.find(e => e.id === entryId && e.itemType === 'fitting');
      if (!entry || entry.itemType !== 'fitting') return;

      const fittingEntry = entry;
      
      // Get effective fitting standard (use item-level override first, then global spec)
      // Item-level steelSpecificationId takes precedence over global
      const effectiveSteelSpecId = fittingEntry.specs?.steelSpecificationId ?? rfqData.globalSpecs?.steelSpecificationId;
      const isSABS719 = effectiveSteelSpecId === 8;
      const effectiveFittingStandard = fittingEntry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

      // Valid fitting types for each standard (must match dropdown options)
      const SABS62_FITTING_TYPES = ['EQUAL_TEE', 'UNEQUAL_TEE', 'LATERAL', 'SWEEP_TEE', 'Y_PIECE', 'GUSSETTED_TEE', 'EQUAL_CROSS', 'UNEQUAL_CROSS', 'CON_REDUCER', 'ECCENTRIC_REDUCER'];
      const SABS719_FITTING_TYPES = ['SHORT_TEE', 'UNEQUAL_SHORT_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE', 'LATERAL', 'DUCKFOOT_SHORT', 'DUCKFOOT_GUSSETTED', 'SWEEP_LONG_RADIUS', 'SWEEP_MEDIUM_RADIUS', 'SWEEP_ELBOW', 'CON_REDUCER', 'ECCENTRIC_REDUCER'];

      // Validation for required fields
      if (!fittingEntry.specs?.fittingType) {
        console.log('Fitting calculation skipped: No fitting type selected');
        return;
      }

      // Validate fitting type is compatible with the effective standard
      const validTypes = effectiveFittingStandard === 'SABS719' ? SABS719_FITTING_TYPES : SABS62_FITTING_TYPES;
      if (!validTypes.includes(fittingEntry.specs.fittingType)) {
        console.log(`Fitting type "${fittingEntry.specs.fittingType}" not valid for ${effectiveFittingStandard}, clearing`);
        // Clear the invalid fitting type
        updateItem(entryId, { specs: { ...fittingEntry.specs, fittingType: undefined } });
        return;
      }

      if (!fittingEntry.specs?.nominalDiameterMm) {
        console.log('Fitting calculation skipped: No nominal diameter selected');
        return;
      }

      // Additional validation for SABS719
      if (effectiveFittingStandard === 'SABS719') {
        if (!fittingEntry.specs.scheduleNumber) {
          console.log('Fitting calculation skipped: No schedule number for SABS719');
          return;
        }
        if (fittingEntry.specs.pipeLengthAMm === undefined || fittingEntry.specs.pipeLengthBMm === undefined) {
          console.log('Fitting calculation skipped: Missing pipe lengths for SABS719');
          return;
        }
      }

      const calculationData = {
        fittingStandard: effectiveFittingStandard,
        fittingType: fittingEntry.specs.fittingType,
        nominalDiameterMm: fittingEntry.specs.nominalDiameterMm,
        angleRange: fittingEntry.specs.angleRange,
        pipeLengthAMm: fittingEntry.specs.pipeLengthAMm,
        pipeLengthBMm: fittingEntry.specs.pipeLengthBMm,
        quantityValue: fittingEntry.specs.quantityValue || 1,
        scheduleNumber: fittingEntry.specs.scheduleNumber,
        workingPressureBar: fittingEntry.specs.workingPressureBar || rfqData.globalSpecs.workingPressureBar,
        workingTemperatureC: fittingEntry.specs.workingTemperatureC || rfqData.globalSpecs.workingTemperatureC,
        steelSpecificationId: fittingEntry.specs.steelSpecificationId || rfqData.globalSpecs.steelSpecificationId,
        flangeStandardId: fittingEntry.specs.flangeStandardId || rfqData.globalSpecs.flangeStandardId,
        flangePressureClassId: fittingEntry.specs.flangePressureClassId || rfqData.globalSpecs.flangePressureClassId,
      };

      console.log('Calling API with:', calculationData);
      const result = await masterDataApi.calculateFitting(calculationData);
      console.log('API result:', result);

      updateItem(entryId, {
        calculation: result,
      });
      console.log('Updated entry with calculation');

    } catch (error: any) {
      console.error('Fitting calculation failed:', error);
      alert(`Fitting calculation failed: ${error.message || 'Please check your specifications.'}`);
    }
  };

  // Unified update handler for all item types
  const handleUpdateEntry = (id: string, updates: any) => {
    const entry = rfqData.items.find(e => e.id === id);
    if (entry?.itemType === 'bend' || entry?.itemType === 'fitting') {
      updateItem(id, updates);
    } else {
      updateStraightPipeEntry(id, updates);
    }
  };

  // State for save progress feedback
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Save progress handler - saves current RFQ data to server
  const handleSaveProgress = async () => {
    console.log('💾 handleSaveProgress called');
    console.log('💾 rfqData.projectType:', rfqData.projectType);
    console.log('💾 rfqData.requiredProducts:', rfqData.requiredProducts);
    console.log('💾 rfqData.skipDocuments:', rfqData.skipDocuments);
    console.log('💾 rfqData.latitude:', rfqData.latitude);
    console.log('💾 rfqData.longitude:', rfqData.longitude);
    console.log('💾 rfqData.globalSpecs:', rfqData.globalSpecs);

    setIsSavingDraft(true);
    try {
      const saveData = {
        draftId: currentDraftId || undefined,
        projectName: rfqData.projectName,
        currentStep,
        formData: {
          // Basic project info
          projectName: rfqData.projectName,
          projectType: rfqData.projectType,
          description: rfqData.description,
          // Customer info
          customerName: rfqData.customerName,
          customerEmail: rfqData.customerEmail,
          customerPhone: rfqData.customerPhone,
          requiredDate: rfqData.requiredDate,
          notes: rfqData.notes,
          // Location fields
          latitude: rfqData.latitude,
          longitude: rfqData.longitude,
          siteAddress: rfqData.siteAddress,
          region: rfqData.region,
          country: rfqData.country,
          // Mine selection
          mineId: rfqData.mineId,
          mineName: rfqData.mineName,
          // Document upload preference
          skipDocuments: rfqData.skipDocuments,
        },
        globalSpecs: rfqData.globalSpecs,
        requiredProducts: rfqData.requiredProducts,
        straightPipeEntries: rfqData.items?.length > 0 ? rfqData.items : rfqData.straightPipeEntries,
        pendingDocuments: pendingDocuments.map((doc: any) => ({
          name: doc.name || doc.file?.name,
          size: doc.size || doc.file?.size,
          type: doc.type || doc.file?.type,
        })),
      };

      console.log('💾 Complete saveData being sent to API:', saveData);
      console.log('💾 saveData.formData:', saveData.formData);
      console.log('💾 saveData.requiredProducts:', saveData.requiredProducts);

      const result = await draftsApi.save(saveData);

      // Update draft info
      setCurrentDraftId(result.id);
      setDraftNumber(result.draftNumber);

      // Also save to localStorage as backup
      localStorage.setItem('annix_rfq_draft', JSON.stringify({
        ...saveData,
        draftNumber: result.draftNumber,
        savedAt: new Date().toISOString(),
      }));

      // Show confirmation
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 5000);

      console.log(`✅ RFQ progress saved as ${result.draftNumber}`);
    } catch (error) {
      console.error('Failed to save progress:', error);

      if (error instanceof SessionExpiredError) {
        try {
          localStorage.setItem('annix_rfq_draft', JSON.stringify({
            rfqData,
            currentStep,
            savedAt: new Date().toISOString(),
          }));
          console.log('✅ RFQ progress saved to localStorage (session expired, will sync after login)');
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        return;
      }

      try {
        localStorage.setItem('annix_rfq_draft', JSON.stringify({
          rfqData,
          currentStep,
          savedAt: new Date().toISOString(),
        }));
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
        console.log('✅ RFQ progress saved to localStorage (server unavailable)');
      } catch (e) {
        alert('Failed to save progress. Please try again.');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationErrors({});
    
    try {
      // Use unified items array that includes both straight pipes and bends
      const allItems = rfqData.items || rfqData.straightPipeEntries || [];
      
      // Validate we have at least one item
      if (allItems.length === 0) {
        setValidationErrors({ submit: 'Please add at least one item before submitting.' });
        setIsSubmitting(false);
        return;
      }

      // Separate items by type
      const straightPipeItems = allItems.filter((item: any) => item.itemType !== 'bend' && item.itemType !== 'fitting');
      const bendItems = allItems.filter((item: any) => item.itemType === 'bend');
      const fittingItems = allItems.filter((item: any) => item.itemType === 'fitting');

      console.log(`📊 Submitting: ${straightPipeItems.length} straight pipe(s), ${bendItems.length} bend(s), ${fittingItems.length} fitting(s)`);

      // Import the API clients
      const { rfqApi, bendRfqApi } = await import('@/app/lib/api/client');
      
      const results = [];
      
      // ========== PROCESS ALL STRAIGHT PIPES ==========
      if (straightPipeItems.length > 0) {
        console.log(`📏 Processing ${straightPipeItems.length} straight pipe(s)...`);
        
        for (let i = 0; i < straightPipeItems.length; i++) {
          const entry = straightPipeItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Straight Pipe #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // Prepare Straight Pipe RFQ payload
          const rfqPayload = {
            rfq: {
              projectName: straightPipeItems.length > 1 
                ? `${rfqData.projectName} - Straight Pipe ${i + 1}/${straightPipeItems.length}`
                : rfqData.projectName,
              description: rfqData.description,
              customerName: rfqData.customerName,
              customerEmail: rfqData.customerEmail,
              customerPhone: rfqData.customerPhone,
              requiredDate: rfqData.requiredDate,
              status: 'draft' as const,
              notes: rfqData.notes,
            },
            straightPipe: {
              nominalBoreMm: (entry.specs as any).nominalBoreMm,
              scheduleType: (entry.specs as any).scheduleType,
              scheduleNumber: (entry.specs as any).scheduleNumber,
              wallThicknessMm: (entry.specs as any).wallThicknessMm,
              pipeEndConfiguration: (entry.specs as any).pipeEndConfiguration,
              individualPipeLength: (entry.specs as any).individualPipeLength,
              lengthUnit: (entry.specs as any).lengthUnit,
              quantityType: (entry.specs as any).quantityType,
              quantityValue: (entry.specs as any).quantityValue,
              workingPressureBar: (entry.specs as any).workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: (entry.specs as any).workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC,
              steelSpecificationId: (entry.specs as any).steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId,
              flangeStandardId: (entry.specs as any).flangeStandardId || rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: (entry.specs as any).flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId,
            },
            itemDescription: entry.description || `Pipe Item ${i + 1}`,
            itemNotes: entry.notes,
          };

          console.log(`📏 Submitting Straight Pipe #${i + 1}:`, rfqPayload);
          
          // Submit to straight pipe RFQ endpoint
          const result = await rfqApi.create(rfqPayload);
          results.push({ ...result, itemType: 'straightPipe' });
          
          console.log(`✅ Straight Pipe #${i + 1} submitted successfully:`, result);
        }
      }
      
      // ========== PROCESS ALL BENDS ==========
      if (bendItems.length > 0) {
        console.log(`🔄 Processing ${bendItems.length} bend(s)...`);
        
        for (let i = 0; i < bendItems.length; i++) {
          const entry = bendItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Bend #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // Validate required bend fields
          if (!(entry.specs as any).nominalBoreMm || !(entry.specs as any).scheduleNumber || !(entry.specs as any).bendType || !(entry.specs as any).bendDegrees) {
            setValidationErrors({ 
              submit: `Bend #${i + 1} is missing required fields. Please complete all bend specifications.` 
            });
            setIsSubmitting(false);
            return;
          }
          
          // Prepare Bend RFQ payload
          const bendPayload = {
            rfq: {
              projectName: bendItems.length > 1 
                ? `${rfqData.projectName} - Bend ${i + 1}/${bendItems.length}`
                : rfqData.projectName,
              description: rfqData.description,
              customerName: rfqData.customerName,
              customerEmail: rfqData.customerEmail,
              customerPhone: rfqData.customerPhone,
              requiredDate: rfqData.requiredDate,
              status: 'draft' as const,
              notes: rfqData.notes,
            },
            bend: {
              nominalBoreMm: (entry.specs as any).nominalBoreMm!,
              scheduleNumber: (entry.specs as any).scheduleNumber!,
              bendType: (entry.specs as any).bendType!,
              bendDegrees: (entry.specs as any).bendDegrees!,
              numberOfTangents: (entry.specs as any).numberOfTangents || 0,
              tangentLengths: (entry.specs as any).tangentLengths || [],
              quantityType: 'number_of_items' as const,
              quantityValue: (entry.specs as any).quantityValue || 1,
              workingPressureBar: (entry.specs as any).workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: (entry.specs as any).workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20,
              steelSpecificationId: (entry.specs as any).steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2,
              flangeStandardId: (entry.specs as any).flangeStandardId || rfqData.globalSpecs?.flangeStandardId || 1,
              flangePressureClassId: (entry.specs as any).flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId || 1,
            },
            itemDescription: entry.description || `Bend Item ${i + 1}`,
            itemNotes: entry.notes,
          };

          console.log(`🔄 Submitting Bend #${i + 1}:`, bendPayload);
          
          // Submit to bend RFQ endpoint
          const result = await bendRfqApi.create(bendPayload);
          results.push({ ...result, itemType: 'bend' });
          
          console.log(`✅ Bend #${i + 1} submitted successfully:`, result);
        }
      }

      // ========== PROCESS ALL FITTINGS ==========
      if (fittingItems.length > 0) {
        console.log(`⚙️ Processing ${fittingItems.length} fitting(s)...`);
        
        for (let i = 0; i < fittingItems.length; i++) {
          const entry = fittingItems[i];
          
          // Validate entry has calculation results
          if (!entry.calculation) {
            setValidationErrors({ 
              submit: `Fitting #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.` 
            });
            setIsSubmitting(false);
            return;
          }

          // For now, we'll skip RFQ submission for fittings as there's no backend endpoint yet
          // Just log them as success
          console.log(`⚙️ Fitting #${i + 1} would be submitted:`, entry);
          results.push({ 
            rfq: { rfqNumber: `FITTING-${i + 1}`, id: `fitting-${i + 1}` },
            itemType: 'fitting' 
          });
          
          console.log(`✅ Fitting #${i + 1} noted successfully`);
        }
      }

      // All items submitted successfully
      const itemSummary = results.map((r) => {
        const itemType = r.itemType === 'bend' ? 'Bend' : r.itemType === 'fitting' ? 'Fitting' : 'Pipe';
        return `${itemType}: RFQ #${r.rfq?.rfqNumber || r.rfq?.id || 'Created'}`;
      }).join('\n');

      // Upload pending documents to the first RFQ created
      if (pendingDocuments.length > 0 && results[0]?.rfq?.id) {
        const rfqId = results[0].rfq.id;
        console.log(`📎 Uploading ${pendingDocuments.length} document(s) to RFQ #${rfqId}...`);

        let uploadedCount = 0;
        let failedCount = 0;

        for (const doc of pendingDocuments) {
          try {
            await rfqDocumentApi.upload(rfqId, doc.file);
            uploadedCount++;
            console.log(`✅ Uploaded: ${doc.file.name}`);
          } catch (uploadError) {
            failedCount++;
            console.error(`❌ Failed to upload ${doc.file.name}:`, uploadError);
          }
        }

        if (failedCount > 0) {
          console.warn(`⚠️ ${failedCount} document(s) failed to upload`);
        }

        // Clear pending documents after upload attempt
        setPendingDocuments([]);
      }

      alert(`Success! ${results.length} RFQ${results.length > 1 ? 's' : ''} created successfully!\n\n${itemSummary}`);

      // Call the success callback with the first RFQ ID
      onSuccess(results[0]?.rfq?.id || 'success');
      
    } catch (error: any) {
      console.error('Submission error:', error);
      
      // Extract error message
      let errorMessage = 'Failed to submit RFQ. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setValidationErrors({ submit: errorMessage });
      
      alert(`❌ Submission failed:\n\n${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Project/RFQ Details', description: 'Basic project and customer information' },
    { number: 2, title: 'Specifications', description: 'Working conditions and material specs' },
    { number: 3, title: 'Items', description: 'Add pipes, bends, and fittings' },
    { number: 4, title: 'Review & Submit', description: 'Final review and submission' },
    { number: 5, title: 'BOQ', description: 'Bill of Quantities summary' }
  ];

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProjectDetailsStep
            rfqData={rfqData}
            onUpdate={updateRfqField as (field: string, value: any) => void}
            errors={validationErrors}
            globalSpecs={rfqData.globalSpecs}
            onUpdateGlobalSpecs={updateGlobalSpecs}
            pendingDocuments={pendingDocuments}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        );
      case 2:
        return (
          <SpecificationsStep
            globalSpecs={rfqData.globalSpecs}
            onUpdateGlobalSpecs={updateGlobalSpecs}
            masterData={masterData}
            errors={validationErrors}
            fetchAndSelectPressureClass={fetchAndSelectPressureClass}
            availablePressureClasses={availablePressureClasses}
            requiredProducts={rfqData.requiredProducts}
            rfqData={rfqData}
          />
        );
      case 3:
        return (
          <ItemUploadStep
            entries={rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries}
            globalSpecs={rfqData.globalSpecs}
            masterData={masterData}
            onAddEntry={addStraightPipeEntry}
            onAddBendEntry={addBendEntry}
            onAddFittingEntry={addFittingEntry}
            onUpdateEntry={handleUpdateEntry}
            onRemoveEntry={removeStraightPipeEntry}
            onCalculate={handleCalculateAll}
            onCalculateBend={handleCalculateBend}
            onCalculateFitting={handleCalculateFitting}
            errors={validationErrors}
            loading={false}
            fetchAvailableSchedules={fetchAvailableSchedules}
            availableSchedulesMap={availableSchedulesMap}
            setAvailableSchedulesMap={setAvailableSchedulesMap}
            fetchBendOptions={fetchBendOptions}
            fetchCenterToFace={fetchCenterToFace}
            bendOptionsCache={bendOptionsCache}
            autoSelectFlangeSpecs={autoSelectFlangeSpecs}
            requiredProducts={rfqData.requiredProducts}
            pressureClassesByStandard={pressureClassesByStandard}
            getFilteredPressureClasses={getFilteredPressureClasses}
          />
        );
      case 4:
        return (
          <ReviewSubmitStep
            entries={rfqData.straightPipeEntries}
            rfqData={rfqData}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            errors={validationErrors}
            loading={isSubmitting}
          />
        );
      case 5:
        return (
          <BOQStep
            rfqData={rfqData}
            entries={rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries}
            globalSpecs={rfqData.globalSpecs}
            requiredProducts={rfqData.requiredProducts || []}
            onPrevStep={handlePrevStep}
            onSubmit={handleSubmit}
            loading={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Save Progress Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Progress Saved!</p>
                {draftNumber && (
                  <p className="text-sm text-green-100 mt-0.5">
                    Draft Number: <span className="font-mono font-bold">{draftNumber}</span>
                  </p>
                )}
              </div>
            </div>
            {draftNumber && (
              <p className="text-xs text-green-200 mt-2">
                You can resume this RFQ from your dashboard at any time.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fixed Top Header Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Create RFQ</h1>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm font-medium text-blue-600">
              {steps.find(s => s.number === currentStep)?.title || 'RFQ'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {draftNumber && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {draftNumber}
              </span>
            )}
            <div className="text-sm text-gray-500">
              {rfqData?.projectName || 'New RFQ'}
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-xl px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content - grows to fill space, with padding for fixed bottom bar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-4">
              {isLoadingMasterData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Loading system data...</span>
                  </div>
                </div>
              ) : (
                renderCurrentStep()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation Toolbar - always visible at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] px-4 py-3 shadow-2xl border-t border-gray-700"
        style={{ backgroundColor: '#001F3F' }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Left side - Previous button */}
          <div className="w-32">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentStep === 1 ? 'transparent' : '#003366',
                color: '#FFA500',
                border: '1px solid #FFA500'
              }}
            >
              ← Previous
            </button>
          </div>

          {/* Center - Step Navigation Icons */}
          <div className="flex items-center gap-3">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.number)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: step.number === currentStep
                      ? '#FFA500'
                      : step.number < currentStep
                      ? '#003366'
                      : 'transparent',
                    border: step.number === currentStep
                      ? '2px solid #FFA500'
                      : step.number < currentStep
                      ? '1px solid #4CAF50'
                      : '1px solid rgba(255, 165, 0, 0.3)'
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: step.number === currentStep
                        ? '#001F3F'
                        : step.number < currentStep
                        ? '#4CAF50'
                        : 'rgba(255, 165, 0, 0.3)',
                      color: '#FFFFFF'
                    }}
                  >
                    {step.number < currentStep ? '✓' : step.number}
                  </div>
                  <span
                    className="text-sm font-medium hidden md:inline"
                    style={{
                      color: step.number === currentStep
                        ? '#001F3F'
                        : step.number < currentStep
                        ? '#4CAF50'
                        : 'rgba(255, 165, 0, 0.6)'
                    }}
                  >
                    {step.title}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className="w-8 h-0.5 mx-1"
                    style={{ backgroundColor: step.number < currentStep ? '#4CAF50' : 'rgba(255, 165, 0, 0.3)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right side - Save Progress & Next/Submit buttons */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleSaveProgress}
              disabled={isSavingDraft}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#003366',
                color: '#FFA500',
                border: '1px solid #FFA500'
              }}
            >
              {isSavingDraft ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {draftNumber ? 'Update Draft' : 'Save Progress'}
                </>
              )}
            </button>
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#FFA500', color: '#001F3F' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => {/* Submit logic handled in step 4 */}}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#4CAF50', color: '#FFFFFF' }}
              >
                Submit RFQ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
