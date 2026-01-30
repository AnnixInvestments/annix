'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { StraightPipeEntry, BendEntry, FittingEntry, PipeItem, useRfqForm, RfqFormData, GlobalSpecs } from '@/app/lib/hooks/useRfqForm';
import { useRfqDraftStorage, formatLastSaved } from '@/app/lib/hooks/useRfqDraftStorage';
import { useOptionalCustomerAuth } from '@/app/context/CustomerAuthContext';
import { masterDataApi, rfqApi, rfqDocumentApi, minesApi, pipeScheduleApi, draftsApi, boqApi, RfqDraftResponse, SessionExpiredError } from '@/app/lib/api/client';
import { adminApiClient } from '@/app/lib/api/adminApi';
import { nixApi, NixAiPopup, NixFloatingAvatar, NixClarificationPopup, NixProcessingPopup, type NixExtractedItem, type NixClarificationDto } from '@/app/lib/nix';
import { consolidateBoqData } from '@/app/lib/utils/boqConsolidation';
import { useToast } from '@/app/components/Toast';
import { log } from '@/app/lib/logger';
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
  flangeWeldCountPerPipe as getFlangeWeldCountPerPipe,
  flangesPerPipe as getFlangesPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  normalizePressureClass,
  MATERIAL_LIMITS,
  type MaterialLimits,
  materialLimits as getMaterialLimits,
  getScheduleListForSpec,
  STEEL_DENSITY_KG_M3,
  DEFAULT_PIPE_LENGTH_M,
} from '@/app/lib/config/rfq';
import {
  NB_TO_OD_LOOKUP,
  BLANK_FLANGE_WEIGHT,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  NB_TO_FLANGE_WEIGHT_LOOKUP,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BNW_SET_WEIGHT_PER_HOLE,
  GASKET_WEIGHTS,
  blankFlangeWeightSync as getBlankFlangeWeight,
  blankFlangeSurfaceAreaSync as getBlankFlangeSurfaceArea,
  boltHolesPerFlangeSync as getBoltHolesPerFlange,
  bnwSetInfoSync as getBnwSetInfo,
  gasketWeightSync as getGasketWeight,
  flangeWeightSync as getFlangeWeight,
} from '@/app/lib/hooks/useFlangeWeights';
import { generateUniqueId, nowISO } from '@/app/lib/datetime';
import { fetchFlangeSpecsStatic, FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';
import ProjectDetailsStep, { PendingDocument } from './steps/ProjectDetailsStep';
import SpecificationsStep from './steps/SpecificationsStep';
import ItemUploadStep from './steps/ItemUploadStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import BOQStep from './steps/BOQStep';

const normalizeFittingTypeForApi = (type?: string | null) => {
  if (!type) return type;
  const map: Record<string, string> = {
    SHORT_REDUCING_TEE: 'UNEQUAL_SHORT_TEE',
    GUSSET_REDUCING_TEE: 'UNEQUAL_GUSSET_TEE',
  };
  return map[type] || type;
};

/**
 * Combine pressure class designation with selected flange type for SABS 1123 / BS 4504
 * For example: "1000/3" with flangeTypeCode "/1" becomes "1000/1"
 * Or: "1000" with flangeTypeCode "/3" becomes "1000/3"
 * This is needed because the flange type dropdown is now separate from the pressure class dropdown
 */
const getPressureClassWithFlangeType = (
  pressureClassDesignation: string,
  flangeTypeCode?: string,
  flangeStandard?: string
): string => {
  // Only modify for SABS 1123 and BS 4504 standards
  const isSabsOrBs4504 = flangeStandard?.includes('SABS 1123') || flangeStandard?.includes('BS 4504');
  if (!isSabsOrBs4504) return pressureClassDesignation;

  // If no flange type code is selected, return the designation as-is
  if (!flangeTypeCode) return pressureClassDesignation;

  // Check if the designation has a /X suffix (e.g., "1000/3" or "10/3")
  const matchWithSuffix = pressureClassDesignation.match(/^(\d+)\/\d+$/);
  if (matchWithSuffix) {
    // Replace the suffix with the selected flange type (e.g., "1000" + "/1" = "1000/1")
    return `${matchWithSuffix[1]}${flangeTypeCode}`;
  }

  // Check if the designation is just a number (e.g., "1000" or "16")
  // This happens when the pressure class dropdown was split and no longer includes the /X suffix
  const matchNumeric = pressureClassDesignation.match(/^(\d+)$/);
  if (matchNumeric) {
    // Append the flange type code (e.g., "1000" + "/3" = "1000/3")
    return `${matchNumeric[1]}${flangeTypeCode}`;
  }

  return pressureClassDesignation;
};

interface Props {
  onSuccess: (rfqId: string) => void;
  onCancel: () => void;
  editRfqId?: number;
}

// Master data structure for API integration
interface MasterData {
  steelSpecs: Array<{ id: number; steelSpecName: string }>;
  flangeStandards: Array<{ id: number; code: string }>;
  pressureClasses: Array<{ id: number; designation: string }>;
  nominalBores?: Array<{ id: number; nominal_diameter_mm?: number; outside_diameter_mm?: number; nominalDiameterMm?: number; outsideDiameterMm?: number }>;
  flangeTypes?: Array<{ id: number; code: string; name: string }>;
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
 * @param flangeStandard - Optional flange standard (e.g., 'BS 4504', 'SABS 1123')
 * @param flangeTypeCode - Optional flange type code (e.g., '/3', '/5') for SABS 1123 / BS 4504
 */
const calculateLocalPipeResult = (
  nominalBoreMm: number,
  wallThicknessMm: number,
  individualPipeLength: number,
  quantityValue: number,
  quantityType: string,
  pipeEndConfiguration: string,
  pressureClassDesignation?: string,
  flangeStandard?: string,
  flangeTypeCode?: string
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

  const flangeWeldsPerPipe = getFlangeWeldCountPerPipe(pipeEndConfiguration);
  const numberOfFlangeWelds = flangeWeldsPerPipe * calculatedPipeCount;

  // Weld length calculations (circumference-based)
  // Each flange requires 2 full welds: 1 inside and 1 outside
  const circumference = Math.PI * outsideDiameterMm / 1000; // in meters
  const totalFlangeWeldLength = numberOfFlangeWelds * circumference * 2; // x2 for inside + outside welds per flange

  // Get flange weight based on pressure class (includes flange + bolts + gasket)
  const flangeWeightPerUnit = getFlangeWeight(nominalBoreMm, pressureClassDesignation, flangeStandard, flangeTypeCode);
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

export default function StraightPipeRfqOrchestrator({ onSuccess, onCancel, editRfqId }: Props) {
  const isEditing = editRfqId !== undefined;
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const {
    currentStep,
    setCurrentStep,
    rfqData,
    updateRfqField,
    updateGlobalSpecs,
    addStraightPipeEntry,
    addBendEntry,
    addFittingEntry,
    addPipeSteelWorkEntry,
    addExpansionJointEntry,
    updateStraightPipeEntry,
    updateItem,
    removeStraightPipeEntry,
    duplicateItem,
    updateEntryCalculation,
    getTotalWeight,
    getTotalValue,
    nextStep: originalNextStep,
    prevStep,
    restoreFromDraft,
  } = useRfqForm();

  // Ref to track current rfqData for memoized callbacks
  const rfqDataRef = useRef(rfqData);
  rfqDataRef.current = rfqData;

  // Draft management state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftNumber, setDraftNumber] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const initialDraftDataRef = useRef<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Authentication status for draft storage
  const { isAuthenticated } = useOptionalCustomerAuth();

  // LocalStorage draft storage for unregistered users
  const {
    loadDraft: loadLocalDraft,
    saveDraft: saveLocalDraft,
    clearDraft: clearLocalDraft,
    hasDraft: hasLocalDraft,
    lastSaved: localDraftLastSaved,
    draftEmail: localDraftEmail,
  } = useRfqDraftStorage();

  // State for showing draft restoration prompt
  const [showDraftRestorePrompt, setShowDraftRestorePrompt] = useState(false);
  const [pendingLocalDraft, setPendingLocalDraft] = useState<any>(null);
  const hasCheckedLocalDraft = useRef(false);
  const hasProcessedRecoveryToken = useRef(false);

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
  // Store pending tender specification documents
  const [pendingTenderDocuments, setPendingTenderDocuments] = useState<PendingDocument[]>([]);
  // Nix AI Assistant popup visibility
  const [showNixPopup, setShowNixPopup] = useState(false);
  // Nix processing state
  const [isNixProcessing, setIsNixProcessing] = useState(false);
  const [nixProcessingProgress, setNixProcessingProgress] = useState(0);
  const [nixProcessingStatus, setNixProcessingStatus] = useState('Initializing...');
  const [nixProcessingTimeRemaining, setNixProcessingTimeRemaining] = useState<number | undefined>(undefined);
  const [nixExtractionId, setNixExtractionId] = useState<number | null>(null);
  const [nixExtractedItems, setNixExtractedItems] = useState<NixExtractedItem[]>([]);
  const [nixClarifications, setNixClarifications] = useState<NixClarificationDto[]>([]);
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState(0);
  const [showNixClarification, setShowNixClarification] = useState(false);
  // Ref for scrollable content container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Document upload handlers
  const handleAddDocument = (file: File) => {
    const newDoc: PendingDocument = {
      file,
      id: `doc-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPendingDocuments(prev => [...prev, newDoc]);
  };

  const handleRemoveDocument = (id: string) => {
    setPendingDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Tender specification document handlers
  const handleAddTenderDocument = (file: File) => {
    const newDoc: PendingDocument = {
      file,
      id: `tender-${generateUniqueId()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setPendingTenderDocuments(prev => [...prev, newDoc]);
  };

  const handleRemoveTenderDocument = (id: string) => {
    setPendingTenderDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleSetValidationError = (field: string, message: string | null) => {
    setValidationErrors(prev => {
      if (message === null) {
        const { [field]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [field]: message };
      }
    });
  };

  // Nix AI Assistant handlers
  const handleShowNixPopup = () => {
    log.debug('🤖 handleShowNixPopup called, nixPopupShown:', rfqData.nixPopupShown);
    if (!rfqData.nixPopupShown) {
      log.debug('🤖 Setting showNixPopup to true');
      setShowNixPopup(true);
    }
  };

  const handleNixYes = () => {
    updateRfqField('useNix', true);
    updateRfqField('nixPopupShown', true);
    updateRfqField('requiredProducts', ['fabricated_steel']);
    setShowNixPopup(false);
  };

  const handleNixNo = () => {
    updateRfqField('useNix', false);
    updateRfqField('nixPopupShown', true);
    setShowNixPopup(false);
  };

  const handleStopUsingNix = () => {
    updateRfqField('useNix', false);
    updateRfqField('nixPopupShown', false);
  };

  const handleItemsPageReady = useCallback(() => {
    if (isNixProcessing) {
      setNixProcessingProgress(100);
      setNixProcessingStatus('Complete!');
      setTimeout(() => {
        setIsNixProcessing(false);
        showToast(`Nix processed ${pendingDocuments.length} document(s) successfully!`, 'success');
      }, 300);
    }
  }, [isNixProcessing, pendingDocuments.length]);

  const handleProcessDocumentsWithNix = async () => {
    if (!pendingDocuments || pendingDocuments.length === 0) {
      log.warn('🤖 No documents to process with Nix');
      return;
    }

    setIsNixProcessing(true);
    setNixProcessingProgress(0);
    setNixProcessingStatus('Uploading document...');
    setNixProcessingTimeRemaining(15);
    log.debug(`🤖 Processing ${pendingDocuments.length} document(s) with Nix...`);

    const startTime = Date.now();
    const allClarifications: NixClarificationDto[] = [];

    try {
      for (let i = 0; i < pendingDocuments.length; i++) {
        const doc = pendingDocuments[i];
        const docProgress = (i / pendingDocuments.length) * 100;

        setNixProcessingProgress(docProgress + 5);
        setNixProcessingStatus(`Uploading ${doc.file.name}...`);
        setNixProcessingTimeRemaining(12);

        log.debug(`🤖 Processing document: ${doc.file.name}, size: ${doc.file.size} bytes, type: ${doc.file.type}`);

        setNixProcessingProgress(docProgress + 15);
        setNixProcessingStatus('Reading document structure...');
        setNixProcessingTimeRemaining(10);

        const result = await nixApi.uploadAndProcess(doc.file);

        setNixProcessingProgress(docProgress + 40);
        setNixProcessingStatus('Extracting pipe specifications...');
        setNixProcessingTimeRemaining(7);

        log.debug('🤖 Nix extraction result:', result);
        setNixExtractionId(result.extractionId);

        setNixProcessingProgress(docProgress + 60);
        setNixProcessingStatus('Analyzing line items...');
        setNixProcessingTimeRemaining(5);

        if (result.items && result.items.length > 0) {
          setNixExtractedItems(result.items);
          log.debug(`🤖 Extracted ${result.items.length} items`);

          setNixProcessingProgress(docProgress + 70);
          setNixProcessingStatus(`Found ${result.items.length} items, populating RFQ...`);
          setNixProcessingTimeRemaining(5);

          await new Promise(resolve => setTimeout(resolve, 300));

          const totalItems = result.items.length;
          for (let itemIdx = 0; itemIdx < totalItems; itemIdx++) {
            const itemProgress = docProgress + 70 + ((itemIdx / totalItems) * 20);
            setNixProcessingProgress(itemProgress);
            setNixProcessingStatus(`Adding item ${itemIdx + 1} of ${totalItems}...`);
            setNixProcessingTimeRemaining(Math.max(1, Math.ceil((totalItems - itemIdx) * 0.3)));

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          convertNixItemsToRfqItems(result.items);

          setNixProcessingProgress(docProgress + 92);
          setNixProcessingStatus('Items added to RFQ');
          setNixProcessingTimeRemaining(2);
        }

        setNixProcessingProgress(docProgress + 85);
        setNixProcessingStatus('Preparing clarification questions...');
        setNixProcessingTimeRemaining(2);

        if (result.pendingClarifications && result.pendingClarifications.length > 0) {
          allClarifications.push(...result.pendingClarifications);
          log.debug(`🤖 ${result.pendingClarifications.length} clarification(s) needed`);
        }

        if (result.metadata) {
          if (result.metadata.projectLocation && !rfqData.siteAddress) {
            updateRfqField('siteAddress', result.metadata.projectLocation);
            log.debug(`🤖 Auto-populated location: ${result.metadata.projectLocation}`);
          }
          if (result.metadata.projectName && !rfqData.projectName) {
            updateRfqField('projectName', result.metadata.projectName);
            log.debug(`🤖 Auto-populated project name: ${result.metadata.projectName}`);
          }
        }
      }

      setNixProcessingProgress(95);
      setNixProcessingStatus('Finalizing RFQ...');
      setNixProcessingTimeRemaining(1);

      await new Promise(resolve => setTimeout(resolve, 400));

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      log.debug(`🤖 Nix processing completed in ${processingTime}s`);

      if (allClarifications.length > 0) {
        setNixProcessingProgress(100);
        setNixProcessingStatus('Complete! Questions needed...');
        setNixProcessingTimeRemaining(0);
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsNixProcessing(false);
        setNixClarifications(allClarifications);
        setCurrentClarificationIndex(0);
        setShowNixClarification(true);
      } else {
        setNixProcessingProgress(98);
        setNixProcessingStatus('Loading Items page...');
        setNixProcessingTimeRemaining(0);
        setCurrentStep(2);

        // Fallback timeout to close popup if onReady callback doesn't fire
        setTimeout(() => {
          let wasProcessing = false;
          setIsNixProcessing(prev => {
            wasProcessing = prev;
            return prev ? false : prev;
          });
          if (wasProcessing) {
            setNixProcessingProgress(100);
            setNixProcessingStatus('Complete!');
            showToast(`Nix processed ${pendingDocuments.length} document(s) successfully!`, 'success');
          }
        }, 3000);
      }
    } catch (error) {
      log.error('🤖 Nix processing error:', error);
      showToast(`Nix processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsNixProcessing(false);
      setNixProcessingProgress(0);
    }
  };

  const convertNixItemsToRfqItems = (nixItems: NixExtractedItem[]) => {
    const customerName = rfqData.customerName || 'NIX';
    const allItems: PipeItem[] = [];
    let itemIndex = 0;

    const flangeMap: Record<string, 'FBE' | 'FOE' | 'PE'> = {
      'one_end': 'FOE',
      'both_ends': 'FBE',
      'none': 'PE',
      'puddle': 'FBE',
      'blind': 'FBE',
    };

    for (const item of nixItems) {
      if (!item.diameter) continue;

      itemIndex++;
      const unitLower = (item.unit || '').toLowerCase().trim();
      const isMetersUnit = unitLower === 'm' || unitLower === 'meters' || unitLower === 'metre' || unitLower === 'metres' || unitLower === 'lm';

      const materialNote = item.material ? ` | Material: ${item.material}${item.materialGrade ? ` (${item.materialGrade})` : ''}` : '';
      const wallNote = item.wallThickness ? ` | Wall: ${item.wallThickness}mm` : '';
      const nixNote = `Extracted by Nix from Row ${item.rowNumber} (${Math.round(item.confidence * 100)}% confidence)${materialNote}${wallNote}`;

      log.debug(`🤖 Converting Nix item ${item.rowNumber}: material=${item.material}, wallThickness=${item.wallThickness}, unit=${item.unit}, isMeters=${isMetersUnit}`);

      if (item.itemType === 'pipe' || item.itemType === 'flange') {
        const pipeEntry: StraightPipeEntry = {
          id: generateUniqueId(),
          itemType: 'straight_pipe' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            nominalBoreMm: item.diameter,
            scheduleType: item.schedule ? 'schedule' : (item.wallThickness ? 'wall_thickness' : 'schedule'),
            scheduleNumber: item.schedule || undefined,
            wallThicknessMm: item.wallThickness || undefined,
            pipeEndConfiguration: flangeMap[item.flangeConfig || 'none'] || 'PE',
            individualPipeLength: isMetersUnit ? 6000 : (item.length || 6000),
            lengthUnit: 'meters' as const,
            quantityType: isMetersUnit ? 'total_length' as const : 'number_of_pipes' as const,
            quantityValue: item.quantity || 1,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(pipeEntry);
      } else if (item.itemType === 'bend') {
        const bendEntry: BendEntry = {
          id: generateUniqueId(),
          itemType: 'bend' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            nominalBoreMm: item.diameter,
            scheduleNumber: item.schedule || undefined,
            wallThicknessMm: item.wallThickness || undefined,
            bendType: '1.5D',
            bendDegrees: item.angle || 90,
            numberOfTangents: 0,
            numberOfStubs: 0,
            quantityValue: item.quantity || 1,
            quantityType: 'number_of_items' as const,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(bendEntry);
      } else if (item.itemType === 'tee' || item.itemType === 'reducer' || item.itemType === 'expansion_joint') {
        const fittingType = item.itemType === 'tee' ? 'EQUAL_TEE'
          : item.itemType === 'reducer' ? 'CONCENTRIC_REDUCER'
          : 'EXPANSION_LOOP';

        const fittingEntry: FittingEntry = {
          id: generateUniqueId(),
          itemType: 'fitting' as const,
          clientItemNumber: item.itemNumber || generateClientItemNumber(customerName, itemIndex),
          description: item.description,
          specs: {
            fittingStandard: 'SABS719',
            fittingType: fittingType,
            nominalDiameterMm: item.diameter,
            scheduleNumber: item.schedule || undefined,
            quantityValue: item.quantity || 1,
            quantityType: 'number_of_items' as const,
            workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
            workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
            steelSpecificationId: rfqData.globalSpecs?.steelSpecificationId,
          },
          notes: nixNote,
        };
        allItems.push(fittingEntry);
      }
    }

    if (allItems.length > 0) {
      log.debug(`🤖 Converting ${allItems.length} Nix items to RFQ items (${nixItems.filter(i => i.itemType === 'pipe' || i.itemType === 'flange').length} pipes, ${nixItems.filter(i => i.itemType === 'bend').length} bends, ${nixItems.filter(i => ['tee', 'reducer', 'expansion_joint'].includes(i.itemType)).length} fittings)`);
      updateRfqField('items', [...(rfqData.items || []), ...allItems]);
    }
  };

  const handleClarificationSubmit = async (clarificationId: number, response: string) => {
    const isLastQuestion = currentClarificationIndex >= nixClarifications.length - 1;
    log.debug(`🤖 Submitting clarification ${clarificationId}, index ${currentClarificationIndex} of ${nixClarifications.length}, isLast: ${isLastQuestion}`);

    try {
      const result = await nixApi.submitClarification(clarificationId, response, true);
      log.debug('🤖 Clarification submitted:', result);
    } catch (error) {
      log.error('🤖 Failed to submit clarification:', error);
      console.error('Clarification submit error:', error);
    }

    if (!isLastQuestion) {
      setCurrentClarificationIndex(prev => prev + 1);
    } else {
      log.debug('🤖 Closing clarification popup and returning to step 1');
      setShowNixClarification(false);
      setCurrentStep(1);
      showToast('All clarifications completed! Please confirm the project location before continuing.', 'success');
    }
  };

  const handleClarificationSkip = async (clarificationId: number) => {
    try {
      await nixApi.skipClarification(clarificationId);
      log.debug('🤖 Clarification skipped');

      if (currentClarificationIndex < nixClarifications.length - 1) {
        setCurrentClarificationIndex(prev => prev + 1);
      } else {
        setShowNixClarification(false);
        setCurrentStep(1);
        showToast('Clarifications skipped. Please confirm the project location before continuing.', 'info');
      }
    } catch (error) {
      log.error('🤖 Failed to skip clarification:', error);
    }
  };

  const handleCloseClarification = () => {
    setShowNixClarification(false);
  };

  // Get filtered pressure classes for a specific standard (with caching)
  const getFilteredPressureClasses = useCallback(async (standardId: number): Promise<any[]> => {
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
  }, [pressureClassesByStandard]);

  // Load master data from API
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        setIsLoadingMasterData(true);
        const { masterDataApi } = await import('@/app/lib/api/client');
        
        const [steelSpecs, flangeStandards, pressureClasses, nominalBores, flangeTypes] = await Promise.all([
          masterDataApi.getSteelSpecifications(),
          masterDataApi.getFlangeStandards(),
          masterDataApi.getFlangePressureClasses(),
          masterDataApi.getNominalBores(),
          masterDataApi.getFlangeTypes()
        ]);

        setMasterData({
          steelSpecs,
          flangeStandards,
          pressureClasses,
          nominalBores,
          flangeTypes
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

    log.debug('📥 Draft parameter detected:', draftId);

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await draftsApi.getById(parseInt(draftId, 10));
        log.debug('📦 Loading draft:', draft);
        log.debug('📦 Draft formData:', draft.formData);
        log.debug('📦 Draft requiredProducts:', draft.requiredProducts);
        log.debug('📦 Draft globalSpecs:', draft.globalSpecs);

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

        log.debug(`✅ Loaded draft ${draft.draftNumber}`);
      } catch (error) {
        console.error('Failed to load draft:', error);
        showToast('Failed to load the saved draft. Starting with a new form.', 'error');
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadDraft();
  }, [searchParams, restoreFromDraft]);

  // Load RFQ data when editing (editRfqId prop provided)
  useEffect(() => {
    if (!editRfqId) return;

    log.debug('📝 Edit mode detected, loading RFQ via admin API:', editRfqId);

    const loadRfqForEdit = async () => {
      setIsLoadingDraft(true);
      try {
        const draft = await adminApiClient.getRfqFullDraft(editRfqId);
        log.debug('📦 Loading RFQ for edit:', draft);
        log.debug('📦 RFQ formData:', draft.formData);
        log.debug('📦 RFQ requiredProducts:', draft.requiredProducts);
        log.debug('📦 RFQ globalSpecs:', draft.globalSpecs);

        restoreFromDraft({
          formData: draft.formData,
          globalSpecs: draft.globalSpecs,
          requiredProducts: draft.requiredProducts,
          straightPipeEntries: draft.straightPipeEntries,
          currentStep: draft.currentStep,
        });

        setCurrentDraftId(draft.id);
        setDraftNumber(draft.draftNumber);

        log.debug(`✅ Loaded RFQ ${draft.draftNumber} for editing`);
      } catch (error) {
        console.error('Failed to load RFQ for editing:', error);
        showToast('Failed to load the RFQ. Please try again.', 'error');
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadRfqForEdit();
  }, [editRfqId, restoreFromDraft, showToast]);

  // Capture initial draft state after loading completes for dirty checking
  useEffect(() => {
    if (!isLoadingDraft && currentDraftId && !initialDraftDataRef.current) {
      // Wait a bit for React state to settle after restoreFromDraft
      const timer = setTimeout(() => {
        initialDraftDataRef.current = JSON.stringify({
          items: rfqData.items || [],
          straightPipeEntries: rfqData.straightPipeEntries || [],
          globalSpecs: rfqData.globalSpecs || {},
          projectType: rfqData.projectType,
          description: rfqData.description,
          notes: rfqData.notes,
          requiredProducts: rfqData.requiredProducts || [],
        });
        log.info('📸 Captured initial draft state for dirty checking');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingDraft, currentDraftId, rfqData]);

  // Load anonymous draft from recovery token URL parameter
  // Also compare with localStorage draft and use the newer one
  useEffect(() => {
    const recoveryToken = searchParams?.get('recover');
    if (!recoveryToken) return;
    if (hasProcessedRecoveryToken.current) return;

    hasProcessedRecoveryToken.current = true;

    const loadRecoveryDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const { anonymousDraftsApi } = await import('@/app/lib/api/client');
        const serverDraft = await anonymousDraftsApi.getByToken(recoveryToken);
        log.debug('Loaded anonymous draft from recovery token:', serverDraft);

        const localDraft = loadLocalDraft();
        let useServerDraft = true;
        let draftSource = 'recovery link';

        if (localDraft && localDraft.lastSaved && serverDraft.updatedAt) {
          const localDate = new Date(localDraft.lastSaved);
          const serverDate = new Date(serverDraft.updatedAt);

          log.debug('Comparing draft timestamps:', {
            local: localDraft.lastSaved,
            server: serverDraft.updatedAt,
            localNewer: localDate > serverDate
          });

          if (localDate > serverDate) {
            useServerDraft = false;
            draftSource = 'local browser storage (more recent)';
            log.debug('Using localStorage draft (newer than server)');
          }
        }

        if (useServerDraft) {
          restoreFromDraft({
            formData: serverDraft.formData,
            globalSpecs: serverDraft.globalSpecs,
            requiredProducts: serverDraft.requiredProducts,
            straightPipeEntries: serverDraft.entries,
            currentStep: serverDraft.currentStep,
          });
          clearLocalDraft();
        } else if (localDraft) {
          restoreFromDraft({
            formData: localDraft.rfqData,
            globalSpecs: localDraft.globalSpecs,
            requiredProducts: localDraft.rfqData?.requiredProducts,
            straightPipeEntries: localDraft.entries,
            currentStep: localDraft.currentStep,
          });
        }

        hasCheckedLocalDraft.current = true;
        showToast(`Draft restored from ${draftSource}`, 'success');
      } catch (error) {
        console.error('Failed to load draft from recovery token:', error);
        const localDraft = loadLocalDraft();
        if (localDraft && localDraft.rfqData) {
          log.debug('Server draft failed, falling back to localStorage');
          restoreFromDraft({
            formData: localDraft.rfqData,
            globalSpecs: localDraft.globalSpecs,
            requiredProducts: localDraft.rfqData?.requiredProducts,
            straightPipeEntries: localDraft.entries,
            currentStep: localDraft.currentStep,
          });
          hasCheckedLocalDraft.current = true;
          showToast('Draft restored from local storage (recovery link expired)', 'warning');
        } else {
          showToast('Failed to load draft. The link may have expired.', 'error');
        }
      } finally {
        setIsLoadingDraft(false);
      }
    };

    loadRecoveryDraft();
  }, [searchParams, restoreFromDraft, clearLocalDraft, loadLocalDraft, showToast]);

  // Check for existing localStorage draft on mount (for unregistered users)
  useEffect(() => {
    if (hasCheckedLocalDraft.current) return;
    if (isAuthenticated) return;
    if (isLoadingDraft) return;
    if (editRfqId) return;

    const draftIdFromUrl = searchParams?.get('draft') || searchParams?.get('draftId');
    if (draftIdFromUrl) return;

    const recoveryToken = searchParams?.get('recover');
    if (recoveryToken) return;

    hasCheckedLocalDraft.current = true;

    const draft = loadLocalDraft();
    if (draft && draft.rfqData) {
      log.debug('Found localStorage draft:', draft);
      setPendingLocalDraft(draft);
      setShowDraftRestorePrompt(true);
    }
  }, [isAuthenticated, isLoadingDraft, editRfqId, searchParams, loadLocalDraft]);

  // Auto-save to localStorage for unregistered users
  useEffect(() => {
    if (isAuthenticated) return;
    if (isLoadingDraft) return;
    if (!hasCheckedLocalDraft.current) return;

    const hasContent = rfqData.customerEmail ||
      rfqData.projectName ||
      rfqData.items.length > 0 ||
      Object.keys(rfqData.globalSpecs).length > 0;

    if (!hasContent) return;

    saveLocalDraft({
      rfqData: {
        projectName: rfqData.projectName,
        projectType: rfqData.projectType,
        description: rfqData.description,
        customerName: rfqData.customerName,
        customerEmail: rfqData.customerEmail,
        customerPhone: rfqData.customerPhone,
        requiredDate: rfqData.requiredDate,
        requiredProducts: rfqData.requiredProducts,
        notes: rfqData.notes,
        latitude: rfqData.latitude,
        longitude: rfqData.longitude,
        siteAddress: rfqData.siteAddress,
        region: rfqData.region,
        country: rfqData.country,
        mineId: rfqData.mineId,
        mineName: rfqData.mineName,
        skipDocuments: rfqData.skipDocuments,
        useNix: rfqData.useNix,
        nixPopupShown: rfqData.nixPopupShown,
      },
      globalSpecs: rfqData.globalSpecs,
      currentStep,
      entries: rfqData.items,
      customerEmail: rfqData.customerEmail,
    });
  }, [
    isAuthenticated,
    isLoadingDraft,
    rfqData.projectName,
    rfqData.projectType,
    rfqData.description,
    rfqData.customerName,
    rfqData.customerEmail,
    rfqData.customerPhone,
    rfqData.requiredDate,
    rfqData.requiredProducts,
    rfqData.notes,
    rfqData.latitude,
    rfqData.longitude,
    rfqData.siteAddress,
    rfqData.region,
    rfqData.country,
    rfqData.mineId,
    rfqData.mineName,
    rfqData.skipDocuments,
    rfqData.useNix,
    rfqData.nixPopupShown,
    rfqData.globalSpecs,
    rfqData.items,
    currentStep,
    saveLocalDraft
  ]);

  // Handler to restore localStorage draft
  const handleRestoreLocalDraft = useCallback(() => {
    if (!pendingLocalDraft) return;

    log.debug('Restoring localStorage draft:', pendingLocalDraft);

    restoreFromDraft({
      formData: pendingLocalDraft.rfqData,
      globalSpecs: pendingLocalDraft.globalSpecs,
      requiredProducts: pendingLocalDraft.rfqData?.requiredProducts,
      straightPipeEntries: pendingLocalDraft.entries,
      currentStep: pendingLocalDraft.currentStep,
    });

    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast('Draft restored successfully', 'success');
  }, [pendingLocalDraft, restoreFromDraft, showToast]);

  // Handler to discard localStorage draft
  const handleDiscardLocalDraft = useCallback(() => {
    clearLocalDraft();
    setShowDraftRestorePrompt(false);
    setPendingLocalDraft(null);
    showToast('Starting fresh', 'info');
  }, [clearLocalDraft, showToast]);

  // State for save progress dialog
  const [showSaveProgressDialog, setShowSaveProgressDialog] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressStep, setSaveProgressStep] = useState<'confirm' | 'success'>('confirm');

  // Handler to save progress and request recovery email
  const handleSaveProgressToServer = useCallback(async () => {
    if (!rfqData.customerEmail) {
      showToast('Please enter your email address to save progress', 'error');
      return;
    }

    setIsSavingProgress(true);
    try {
      const { anonymousDraftsApi } = await import('@/app/lib/api/client');

      await anonymousDraftsApi.save({
        customerEmail: rfqData.customerEmail,
        projectName: rfqData.projectName,
        currentStep,
        formData: {
          projectName: rfqData.projectName,
          projectType: rfqData.projectType,
          description: rfqData.description,
          customerName: rfqData.customerName,
          customerEmail: rfqData.customerEmail,
          customerPhone: rfqData.customerPhone,
          requiredDate: rfqData.requiredDate,
          requiredProducts: rfqData.requiredProducts,
          notes: rfqData.notes,
          latitude: rfqData.latitude,
          longitude: rfqData.longitude,
          siteAddress: rfqData.siteAddress,
          region: rfqData.region,
          country: rfqData.country,
          mineId: rfqData.mineId,
          mineName: rfqData.mineName,
          skipDocuments: rfqData.skipDocuments,
          useNix: rfqData.useNix,
          nixPopupShown: rfqData.nixPopupShown,
        },
        globalSpecs: rfqData.globalSpecs,
        requiredProducts: rfqData.requiredProducts,
        entries: rfqData.items,
      });

      await anonymousDraftsApi.requestRecoveryEmail(rfqData.customerEmail);

      setSaveProgressStep('success');
      log.debug('Progress saved and recovery email sent to:', rfqData.customerEmail);
    } catch (error) {
      console.error('Failed to save progress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Backend unavailable') {
        showToast('Server unavailable. Your progress is saved locally on this browser.', 'warning');
      } else {
        showToast('Failed to save progress. Your data is still saved locally.', 'error');
      }
      setShowSaveProgressDialog(false);
    } finally {
      setIsSavingProgress(false);
    }
  }, [rfqData, currentStep, showToast]);

  // Handler to open save progress dialog
  const handleOpenSaveProgressDialog = useCallback(() => {
    setSaveProgressStep('confirm');
    setShowSaveProgressDialog(true);
  }, []);

  // Handler to close save progress dialog
  const handleCloseSaveProgressDialog = useCallback(() => {
    setShowSaveProgressDialog(false);
    setSaveProgressStep('confirm');
  }, []);

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
    log.debug(`Available pressure classes for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C (derating: ${deratingFactor.toFixed(2)}):`,
      classesWithRating.map(pc => `${pc.designation}=${pc.barRating.toFixed(1)}bar`).join(', '));

    // Find the lowest rating that meets or exceeds the working pressure at operating temperature
    // Using small tolerance for floating point comparison
    const recommended = classesWithRating.find(pc => pc.barRating >= workingPressureBar - 0.01);

    if (recommended) {
      log.debug(`Selected: ${recommended.designation} (${recommended.barRating.toFixed(1)} bar capacity) for ${workingPressureBar} bar working pressure`);
    } else {
      log.debug(`No suitable class found for ${workingPressureBar} bar, using highest available`);
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
      log.debug(`Fetched ${classes.length} pressure classes for ${standardName}:`, classes.map((c: any) => `${c.designation}(id=${c.id})`).join(', '));

      setAvailablePressureClasses(classes);
      setPressureClassesByStandard(prev => ({ ...prev, [standardId]: classes }));

      // Auto-select recommended pressure class if working pressure is available
      if (workingPressureBar && classes.length > 0) {
        const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
        const standardCode = standard?.code || String(standardId);

        // Try P/T rating API for temperature-based selection - works for all standards with P-T data
        // The API will return null if no P-T data exists for this standard, triggering fallback
        if (temperatureCelsius !== undefined) {
          try {
            const ptMaterialGroup = materialGroup || 'Carbon Steel A105 (Group 1.1)';
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/flange-pt-ratings/recommended-class?standardId=${standardId}&workingPressureBar=${workingPressureBar}&temperatureCelsius=${temperatureCelsius}&materialGroup=${encodeURIComponent(ptMaterialGroup)}`
            );
            if (response.ok) {
              const text = await response.text();
              if (text && text.trim()) {
                try {
                  const recommendedClassId = JSON.parse(text);
                  // Validate the returned class ID is in our fetched classes for this standard
                  const matchingClass = classes.find((c: any) => c.id === recommendedClassId);
                  if (recommendedClassId && matchingClass) {
                    log.debug(`P/T rating: Selected ${matchingClass.designation} (ID ${recommendedClassId}) for ${standardCode} at ${workingPressureBar} bar, ${temperatureCelsius}°C`);
                    return recommendedClassId;
                  } else if (recommendedClassId) {
                    log.debug(`P/T rating returned ID ${recommendedClassId} but it's not in the classes for ${standardCode}, falling back to calculation`);
                  }
                } catch {
                  // Invalid JSON, fall through to fallback
                }
              }
            }
          } catch (ptError) {
            // Silently fall back to pressure-based calculation if P/T API fails
            log.debug(`P/T rating API failed for ${standardCode}, using pressure-based calculation`);
          }
        }

        // Use pressure-based calculation for all standards (with temperature derating if applicable)
        const recommended = getRecommendedPressureClass(workingPressureBar, classes, temperatureCelsius);
        if (recommended) {
          log.debug(`Pressure calculation: Selected ${recommended.designation} (ID ${recommended.id}) for ${standardCode} at ${workingPressureBar} bar - capacity: ${recommended.barRating?.toFixed(1) || recommended.ambientRating} bar`);
          return recommended.id;
        }
      }

      return null;
    } catch (error) {
      // Use fallback pressure classes when backend is unavailable
      const fallbackClasses = getFallbackPressureClasses(standardId);
      setAvailablePressureClasses(fallbackClasses);
      setPressureClassesByStandard(prev => ({ ...prev, [standardId]: fallbackClasses }));

      if (error instanceof Error && error.message !== 'Backend unavailable') {
        console.error('Error fetching pressure classes:', error);
      }

      // Auto-select recommended from fallback classes with temperature derating
      if (workingPressureBar && fallbackClasses.length > 0) {
        const standard = masterData.flangeStandards?.find((s: any) => s.id === standardId);
        const standardCode = standard?.code || String(standardId);
        const recommended = getRecommendedPressureClass(workingPressureBar, fallbackClasses, temperatureCelsius);
        if (recommended) {
          log.debug(`Fallback calculation: Selected ${recommended.designation} (ID ${recommended.id}) for ${standardCode} at ${workingPressureBar} bar - capacity: ${recommended.barRating?.toFixed(1) || recommended.ambientRating} bar`);
          return recommended.id;
        }
      }

      return null;
    }
  };

  // Fetch available schedules for a specific entry
  // IMPORTANT: This function should NOT replace working fallback data with API data
  // because API schedule names may differ from fallback names, breaking the selected value
  const fetchAvailableSchedules = useCallback(async (entryId: string, steelSpecId: number, nominalBoreMm: number) => {
    // Check for fallback data first to provide immediate response - use correct schedule list based on steel spec
    const fallbackSchedules = getScheduleListForSpec(nominalBoreMm, steelSpecId);

    // If we already have schedules for this entry, don't fetch from API
    // This prevents API data with different schedule names from breaking the selection
    const existingSchedules = availableSchedulesMap[entryId];
    if (existingSchedules && existingSchedules.length > 0) {
      log.debug(`[fetchAvailableSchedules] Entry ${entryId} already has ${existingSchedules.length} schedules, skipping API fetch`);
      return existingSchedules;
    }

    // Use fallback data - it's reliable and consistent
    if (fallbackSchedules.length > 0) {
      log.debug(`[fetchAvailableSchedules] Using ${fallbackSchedules.length} fallback schedules for ${nominalBoreMm}mm`);
      setAvailableSchedulesMap(prev => ({
        ...prev,
        [entryId]: fallbackSchedules
      }));
      return fallbackSchedules;
    }

    // Only try API if we have no fallback data
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');

      log.debug(`[fetchAvailableSchedules] Entry: ${entryId}, Steel: ${steelSpecId}, NB: ${nominalBoreMm}mm`);

      // Find the nominal outside diameter ID from nominalBoreMm
      const nominalBore = masterData.nominalBores?.find((nb: any) => {
        const nbValue = nb.nominal_diameter_mm ?? nb.nominalDiameterMm;
        return nbValue === nominalBoreMm || nbValue === Number(nominalBoreMm);
      });

      if (!nominalBore) {
        console.warn(`[fetchAvailableSchedules] No nominal bore found for ${nominalBoreMm}mm in masterData`);
        return [];
      }

      log.debug(`[fetchAvailableSchedules] Found nominalBore ID: ${nominalBore.id}`);

      const dimensions = await masterDataApi.getPipeDimensionsAll(steelSpecId, nominalBore.id);

      log.debug(`[fetchAvailableSchedules] Got ${dimensions?.length || 0} dimensions from API`);

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
  }, [availableSchedulesMap, masterData.nominalBores]);

  // Fetch bend options (nominal bores and degrees) for a bend type
  const fetchBendOptions = useCallback(async (bendType: string) => {
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
  }, [bendOptionsCache]);

  // Fetch center-to-face dimension from API based on bend type, NB, and angle
  const fetchCenterToFace = useCallback(async (entryId: string, bendType: string, nominalBoreMm: number, degrees: number) => {
    if (!bendType || !nominalBoreMm || !degrees) {
      log.debug('[CenterToFace] Missing required parameters:', { bendType, nominalBoreMm, degrees });
      return null;
    }

    try {
      const { masterDataApi } = await import('@/app/lib/api/client');
      const result = await masterDataApi.getBendCenterToFace(bendType, nominalBoreMm, degrees);

      if (result && result.centerToFaceMm) {
        log.debug(`[CenterToFace] Found: ${result.centerToFaceMm}mm for ${bendType} ${nominalBoreMm}NB @ ${degrees}°`);

        // Find the current entry to merge specs using ref for stable reference
        const currentEntry = rfqDataRef.current.items.find((item: any) => item.id === entryId);
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
  }, [updateItem]);

  // Auto-select flange specifications based on item-level operating conditions
  const autoSelectFlangeSpecs = useCallback(async (
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
                    log.debug(`Auto-selected pressure class ${recommendedClass?.designation || recommendedId} for ${workingPressureBar} bar at ${temperatureCelsius}°C (${ptMaterialGroup})`);
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
          log.debug(`Auto-selected pressure class ${recommended.designation} for ${workingPressureBar} bar at ${temperatureCelsius ?? 'ambient'}°C`);
        }
      }
    } catch (error) {
      console.error('Error auto-selecting flange specs:', error);
    }
  }, []);

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
      log.debug('📊 Auto-calculate check:', {
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
        log.debug('❌ Missing required fields, skipping calculation');
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
        log.debug('🔄 Calling API with:', calculationData);
        const result = await rfqApi.calculate(calculationData);
        log.debug('✅ Calculation result:', result);

        // Recalculate flange weight based on actual pressure class used (may be overridden)
        // Default to PN16 if no pressure class is set
        const basePressureClassDesignation = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
        )?.designation || 'PN16';
        const flangeStandardCode = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code;
        const flangeTypeCode = entry.specs.flangeTypeCode || rfqData.globalSpecs?.flangeTypeCode;
        const pressureClassDesignation = getPressureClassWithFlangeType(basePressureClassDesignation, flangeTypeCode, flangeStandardCode);

        // Calculate number of flanges from pipe configuration if not in result
        const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';
        const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfig);
        const calculatedPipeCount = result?.calculatedPipeCount || Math.ceil((entry.specs.quantityValue || 1) / (entry.specs.individualPipeLength || DEFAULT_PIPE_LENGTH_M));
        const numberOfFlanges = result?.numberOfFlanges || (physicalFlangesPerPipe * calculatedPipeCount);

        if (result && numberOfFlanges > 0) {
          // Try to fetch dynamic flange specs from database
          let flangeWeightPerUnit = getFlangeWeight(entry.specs.nominalBoreMm!, pressureClassDesignation, flangeStandardCode, flangeTypeCode);
          let flangeSpecData: FlangeSpecData | null = null;

          if (flangeStandardId && flangePressureClassId && entry.specs.nominalBoreMm) {
            const flangeTypeId = flangeTypeCode
              ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
              : undefined;
            flangeSpecData = await fetchFlangeSpecsStatic(
              entry.specs.nominalBoreMm,
              flangeStandardId,
              flangePressureClassId,
              flangeTypeId
            );
            if (flangeSpecData) {
              flangeWeightPerUnit = flangeSpecData.flangeMassKg;
              log.debug(`🔧 Using dynamic flange specs: ${flangeWeightPerUnit}kg/flange`);
            }
          }

          const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;
          const totalSystemWeight = (result.totalPipeWeight || 0) + totalFlangeWeight;

          log.debug(`🔧 Recalculating flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${numberOfFlanges} = ${totalFlangeWeight}kg`);

          updateEntryCalculation(entry.id, {
            ...result,
            numberOfFlanges,
            flangeWeightPerUnit,
            totalFlangeWeight,
            totalSystemWeight,
            pressureClassUsed: pressureClassDesignation,
            flangeSpecs: flangeSpecData
          } as any);
        } else {
          // No flanges - totalSystemWeight is just pipe weight
          updateEntryCalculation(entry.id, {
            ...result,
            totalSystemWeight: result.totalPipeWeight || 0,
            numberOfFlanges: 0,
            totalFlangeWeight: 0,
            flangeWeightPerUnit: 0,
          } as any);
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If API returns 404 (NB/schedule combination not in database), use local calculation silently
        if (errorMessage.includes('API Error (404)') || errorMessage.includes('not available in the database')) {
          log.debug('⚠️ API 404 - Using local calculation fallback for', entry.specs.nominalBoreMm, 'NB');
          const wallThickness = entry.specs.wallThicknessMm || 6.35; // Default wall thickness

          // Get pressure class designation for accurate flange weights, default to PN16
          // Combine with flange type code for SABS 1123 / BS 4504 standards
          const basePressureClassDesignation = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
          )?.designation || 'PN16';
          const flangeStandardCode = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code;
          const flangeTypeCode = entry.specs.flangeTypeCode || rfqData.globalSpecs?.flangeTypeCode;
          const pressureClassDesignation = getPressureClassWithFlangeType(basePressureClassDesignation, flangeTypeCode, flangeStandardCode);

          const localResult = calculateLocalPipeResult(
            entry.specs.nominalBoreMm!,
            wallThickness,
            entry.specs.individualPipeLength!,
            entry.specs.quantityValue!,
            entry.specs.quantityType || 'number_of_pipes',
            entry.specs.pipeEndConfiguration || 'PE',
            pressureClassDesignation,
            flangeStandardCode,
            flangeTypeCode
          );
          log.debug('✅ Local calculation result:', localResult);
          updateEntryCalculation(entry.id, localResult);
          return;
        }

        // For any other error, also use local calculation fallback
        log.debug('⚠️ API error - Using local calculation fallback:', errorMessage);
        const wallThickness = entry.specs.wallThicknessMm || 6.35;

        const basePressureClassDesignation = masterData.pressureClasses?.find(
          (pc: { id: number; designation: string }) => pc.id === flangePressureClassId
        )?.designation || 'PN16';
        const flangeStandardCode = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code;
        const flangeTypeCode = entry.specs.flangeTypeCode || rfqData.globalSpecs?.flangeTypeCode;
        const pressureClassDesignation = getPressureClassWithFlangeType(basePressureClassDesignation, flangeTypeCode, flangeStandardCode);

        const localResult = calculateLocalPipeResult(
          entry.specs.nominalBoreMm!,
          wallThickness,
          entry.specs.individualPipeLength!,
          entry.specs.quantityValue!,
          entry.specs.quantityType || 'number_of_pipes',
          entry.specs.pipeEndConfiguration || 'PE',
          pressureClassDesignation,
          flangeStandardCode,
          flangeTypeCode
        );
        log.debug('✅ Local calculation fallback result:', localResult);
        updateEntryCalculation(entry.id, localResult);
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
      flangeTypeCode: e.specs.flangeTypeCode,
      hasFlangeOverride: e.hasFlangeOverride,
      flangeOverrideConfirmed: e.flangeOverrideConfirmed
    }))),
    // Also watch global specs for calculation
    rfqData.globalSpecs?.workingPressureBar,
    rfqData.globalSpecs?.workingTemperatureC,
    rfqData.globalSpecs?.steelSpecificationId,
    rfqData.globalSpecs?.flangeStandardId,
    rfqData.globalSpecs?.flangePressureClassId,
    rfqData.globalSpecs?.flangeTypeCode
  ]);

  // Initialize pressure classes when flange standard is set (e.g., from saved state or initial load)
  useEffect(() => {
    const initializePressureClasses = async () => {
      const standardId = rfqData.globalSpecs?.flangeStandardId;
      if (standardId && availablePressureClasses.length === 0) {
        log.debug(`Initializing pressure classes for standard ${standardId}`);
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
        errors = validatePage2Specifications(rfqData.globalSpecs, masterData);
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
  // Track which items we've already auto-numbered to avoid infinite loops
  const autoNumberedItemsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (rfqData.customerName && rfqData.items) {
      const itemsNeedingNumbers = rfqData.items.filter((entry: any) =>
        (!entry.clientItemNumber || entry.clientItemNumber.trim() === '') &&
        !autoNumberedItemsRef.current.has(entry.id)
      );
      if (itemsNeedingNumbers.length > 0) {
        itemsNeedingNumbers.forEach((entry: any) => {
          const index = rfqData.items.findIndex((e: any) => e.id === entry.id);
          const autoGenNumber = generateClientItemNumber(rfqData.customerName, index + 1);
          autoNumberedItemsRef.current.add(entry.id);
          updateItem(entry.id, { clientItemNumber: autoGenNumber });
        });
      }
    }
  }, [rfqData.items, rfqData.customerName, updateItem]);

  const handleCalculateAll = useCallback(async () => {
    const currentRfqData = rfqDataRef.current;
    try {
      for (const entry of currentRfqData.straightPipeEntries) {
        try {
          // Merge entry specs with global specs (same as auto-calculate)
          const workingPressureBar = entry.specs.workingPressureBar || currentRfqData.globalSpecs?.workingPressureBar || 10;
          const workingTemperatureC = entry.specs.workingTemperatureC || currentRfqData.globalSpecs?.workingTemperatureC || 20;
          const steelSpecificationId = entry.specs.steelSpecificationId || currentRfqData.globalSpecs?.steelSpecificationId || 2;
          const flangeStandardId = entry.specs.flangeStandardId || currentRfqData.globalSpecs?.flangeStandardId || 1;
          const flangePressureClassId = entry.specs.flangePressureClassId || currentRfqData.globalSpecs?.flangePressureClassId;

          const calculationData = {
            ...entry.specs,
            workingPressureBar,
            workingTemperatureC,
            steelSpecificationId,
            flangeStandardId,
            flangePressureClassId,
          };

          log.debug('🔄 Manual calculate for entry:', entry.id, calculationData);
          const result = await rfqApi.calculate(calculationData);
          log.debug('✅ Manual calculation result:', result);

          // Recalculate flange weight for accurate values, default to PN16
          // Combine with flange type code for SABS 1123 / BS 4504 standards
          const entryPressureClassId = entry.specs.flangePressureClassId || currentRfqData.globalSpecs?.flangePressureClassId;
          const basePressureClassDesignation = masterData.pressureClasses?.find(
            (pc: { id: number; designation: string }) => pc.id === entryPressureClassId
          )?.designation || 'PN16';
          const flangeStandardCode = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId)?.code;
          const flangeTypeCode = entry.specs.flangeTypeCode || currentRfqData.globalSpecs?.flangeTypeCode;
          const pressureClassDesignation = getPressureClassWithFlangeType(basePressureClassDesignation, flangeTypeCode, flangeStandardCode);

          // Calculate number of flanges from pipe configuration if not in result
          const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';
          const physicalFlangesPerPipe = getPhysicalFlangeCount(pipeEndConfig);
          const calculatedPipeCount = result?.calculatedPipeCount || Math.ceil((entry.specs.quantityValue || 1) / (entry.specs.individualPipeLength || DEFAULT_PIPE_LENGTH_M));
          const numberOfFlanges = result?.numberOfFlanges || (physicalFlangesPerPipe * calculatedPipeCount);

          if (result && numberOfFlanges > 0) {
            // Try to fetch dynamic flange specs from database
            let flangeWeightPerUnit = getFlangeWeight(entry.specs.nominalBoreMm!, pressureClassDesignation, flangeStandardCode, flangeTypeCode);
            let flangeSpecData: FlangeSpecData | null = null;

            if (flangeStandardId && flangePressureClassId && entry.specs.nominalBoreMm) {
              const flangeTypeId = flangeTypeCode
                ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
                : undefined;
              flangeSpecData = await fetchFlangeSpecsStatic(
                entry.specs.nominalBoreMm,
                flangeStandardId,
                flangePressureClassId,
                flangeTypeId
              );
              if (flangeSpecData) {
                flangeWeightPerUnit = flangeSpecData.flangeMassKg;
                log.debug(`🔧 Manual calc using dynamic flange specs: ${flangeWeightPerUnit}kg/flange`);
              }
            }

            const totalFlangeWeight = numberOfFlanges * flangeWeightPerUnit;
            const totalSystemWeight = (result.totalPipeWeight || 0) + totalFlangeWeight;

            log.debug(`🔧 Manual calc flange weight for ${pressureClassDesignation}: ${flangeWeightPerUnit}kg/flange × ${numberOfFlanges} = ${totalFlangeWeight}kg`);

            updateEntryCalculation(entry.id, {
              ...result,
              numberOfFlanges,
              flangeWeightPerUnit,
              totalFlangeWeight,
              totalSystemWeight,
              pressureClassUsed: pressureClassDesignation,
              flangeSpecs: flangeSpecData
            } as any);
          } else {
            // No flanges - totalSystemWeight is just pipe weight
            updateEntryCalculation(entry.id, {
              ...result,
              totalSystemWeight: result.totalPipeWeight || 0,
              numberOfFlanges: 0,
              totalFlangeWeight: 0,
              flangeWeightPerUnit: 0,
            } as any);
          }
        } catch (error: any) {
          console.error(`Calculation error for entry ${entry.id}:`, error);
          const errorMessage = error.message || String(error);

          // If API returns 404, use local calculation fallback
          if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('not available')) {
            log.debug('⚠️ API 404 - Using local calculation fallback for entry:', entry.id);
            const wallThickness = entry.specs.wallThicknessMm || 6.35;

            // Get pressure class designation for accurate flange weights, default to PN16
            // Combine with flange type code for SABS 1123 / BS 4504 standards
            const entryPressureClassId = entry.specs.flangePressureClassId || currentRfqData.globalSpecs?.flangePressureClassId;
            const entryFlangeStandardId = entry.specs.flangeStandardId || currentRfqData.globalSpecs?.flangeStandardId;
            const basePressureClassDesignation = masterData.pressureClasses?.find(
              (pc: { id: number; designation: string }) => pc.id === entryPressureClassId
            )?.designation || 'PN16';
            const flangeStandardCode = masterData.flangeStandards?.find((s: any) => s.id === entryFlangeStandardId)?.code;
            const flangeTypeCode = entry.specs.flangeTypeCode || currentRfqData.globalSpecs?.flangeTypeCode;
            const pressureClassDesignation = getPressureClassWithFlangeType(basePressureClassDesignation, flangeTypeCode, flangeStandardCode);

            const localResult = calculateLocalPipeResult(
              entry.specs.nominalBoreMm!,
              wallThickness,
              entry.specs.individualPipeLength!,
              entry.specs.quantityValue!,
              entry.specs.quantityType || 'number_of_pipes',
              entry.specs.pipeEndConfiguration || 'PE',
              pressureClassDesignation,
              flangeStandardCode,
              flangeTypeCode
            );
            log.debug('✅ Local calculation result:', localResult);
            updateEntryCalculation(entry.id, localResult);
          } else {
            const nb = entry.specs.nominalBoreMm;
            const schedule = entry.specs.scheduleNumber;
            const details = [nb ? `${nb}mm bore` : null, schedule ? `${schedule} schedule` : null].filter(Boolean).join(' with ');
            const capitalizedDetails = details ? details.charAt(0).toUpperCase() + details.slice(1) : null;
            const friendlyError = capitalizedDetails
              ? `**Pipe:** ${capitalizedDetails} is not available. Please try a different size or schedule.`
              : '**Pipe:** This combination is not available. Please try different specifications.';
            updateStraightPipeEntry(entry.id, { calculationError: friendlyError });
          }
        }
      }
    } catch (error: any) {
      const isNotFoundError = error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found');
      if (!isNotFoundError) {
        console.error('Calculation error:', error);
      }
    }
  }, [masterData.pressureClasses, masterData.flangeStandards, masterData.flangeTypes, updateEntryCalculation, updateStraightPipeEntry]);

  const handleCalculateBend = useCallback(async (entryId: string) => {
    try {
      const entry = rfqDataRef.current.items.find(e => e.id === entryId && e.itemType === 'bend');
      if (!entry || entry.itemType !== 'bend') return;

      const bendEntry = entry;
      const bendDegrees = bendEntry.specs?.bendDegrees || 90;

      // API requires minimum 15° - for smaller angles, use local calculation
      if (bendDegrees < 15) {
        log.debug(`Bend angle ${bendDegrees}° is below API minimum (15°), using local calculation`);

        // Local calculation for small angle bends
        const nominalBoreMm = bendEntry.specs?.nominalBoreMm || 40;
        const scheduleNumber = bendEntry.specs?.scheduleNumber || '40';
        const quantity = bendEntry.specs?.quantityValue || 1;
        const centerToFace = bendEntry.specs?.centerToFaceMm || 100;

        // Get wall thickness from fallback schedules - use correct schedule list based on steel spec
        const bendEffectiveSpecId = bendEntry.specs?.steelSpecificationId ?? rfqDataRef.current.globalSpecs?.steelSpecificationId;
        const schedules = getScheduleListForSpec(nominalBoreMm, bendEffectiveSpecId);
        const scheduleData = schedules.find((s: any) => s.scheduleDesignation === scheduleNumber);
        const wallThickness = scheduleData?.wallThicknessMm || 6.35;

        // Calculate OD from NB
        const od = NB_TO_OD_LOOKUP[nominalBoreMm] || (nominalBoreMm * 1.05);
        const id = od - (2 * wallThickness);

        // Estimate bend arc length based on angle and C/F
        const arcLength = (bendDegrees / 90) * (centerToFace * 2);

        // Weight calculation: π/4 × (OD² - ID²) × length × density (kg/m³ for steel)
        const crossSectionArea = (Math.PI / 4) * ((od * od) - (id * id)); // mm²
        const bendWeight = (crossSectionArea / 1000000) * (arcLength / 1000) * STEEL_DENSITY_KG_M3; // kg

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

      // Use item-level flange specs if set, otherwise use global
      const useGlobal = bendEntry.specs?.useGlobalFlangeSpecs !== false;
      const flangeStandardId = useGlobal
        ? (bendEntry.specs?.flangeStandardId || rfqDataRef.current.globalSpecs?.flangeStandardId)
        : bendEntry.specs?.flangeStandardId;
      const flangePressureClassId = useGlobal
        ? (bendEntry.specs?.flangePressureClassId || rfqDataRef.current.globalSpecs?.flangePressureClassId)
        : bendEntry.specs?.flangePressureClassId;

      const calculationData = {
        nominalBoreMm: bendEntry.specs?.nominalBoreMm || 40,
        scheduleNumber: bendEntry.specs?.scheduleNumber || '40',
        bendDegrees: bendDegrees,
        bendType: bendEntry.specs?.bendType || '1.5D',
        quantityValue: bendEntry.specs?.quantityValue || 1,
        quantityType: 'number_of_items' as const,
        numberOfTangents: bendEntry.specs?.numberOfTangents || 0,
        tangentLengths: bendEntry.specs?.tangentLengths || [],
        workingPressureBar: bendEntry.specs?.workingPressureBar || rfqDataRef.current.globalSpecs.workingPressureBar || 10,
        workingTemperatureC: bendEntry.specs?.workingTemperatureC || rfqDataRef.current.globalSpecs.workingTemperatureC || 20,
        steelSpecificationId: bendEntry.specs?.steelSpecificationId || rfqDataRef.current.globalSpecs.steelSpecificationId || 2,
        useGlobalFlangeSpecs: useGlobal,
        flangeStandardId,
        flangePressureClassId,
      };

      const result = await bendRfqApi.calculate(calculationData);

      // Fetch dynamic flange specs if available
      let flangeSpecData: FlangeSpecData | null = null;
      const nominalBoreMm = bendEntry.specs?.nominalBoreMm;
      if (flangeStandardId && flangePressureClassId && nominalBoreMm) {
        const flangeTypeCode = useGlobal
          ? (bendEntry.specs?.flangeTypeCode || rfqDataRef.current.globalSpecs?.flangeTypeCode)
          : bendEntry.specs?.flangeTypeCode;
        const flangeTypeId = flangeTypeCode
          ? masterData.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode)?.id
          : undefined;
        flangeSpecData = await fetchFlangeSpecsStatic(
          nominalBoreMm,
          flangeStandardId,
          flangePressureClassId,
          flangeTypeId
        );
        if (flangeSpecData) {
          log.debug(`🔧 Bend using dynamic flange specs: ${flangeSpecData.flangeMassKg}kg/flange`);
        }
      }

      updateItem(entryId, {
        calculation: {
          ...result,
          flangeSpecs: flangeSpecData,
        },
        calculationError: null,
      });

    } catch (error: any) {
      const isNotFoundError = error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found');
      if (isNotFoundError) {
        log.debug('Bend not found (expected):', error?.message);
      } else {
        console.error('Bend calculation failed:', error);
      }
      const bendEntry = rfqDataRef.current.items.find(e => e.id === entryId && e.itemType === 'bend') as BendEntry | undefined;
      const nb = bendEntry?.specs?.nominalBoreMm;
      const schedule = bendEntry?.specs?.scheduleNumber;
      const angle = bendEntry?.specs?.bendDegrees;
      const parts = [nb ? `${nb}mm bore` : null, schedule ? `${schedule} schedule` : null, angle ? `${angle}° angle` : null].filter(Boolean);
      const details = parts.length > 0 ? parts.join(', ') : null;
      const capitalizedDetails = details ? details.charAt(0).toUpperCase() + details.slice(1) : null;
      const friendlyError = capitalizedDetails
        ? `**Bend:** ${capitalizedDetails} is not available. Please try a different combination.`
        : '**Bend:** This combination is not available. Please try different specifications.';
      updateItem(entryId, { calculationError: friendlyError });
    }
  }, [updateItem, masterData.flangeTypes]);

  const handleCalculateFitting = useCallback(async (entryId: string) => {
    log.debug('handleCalculateFitting called with entryId:', entryId);
    try {
      const { masterDataApi } = await import('@/app/lib/api/client');

      const entry = rfqDataRef.current.items.find(e => e.id === entryId && e.itemType === 'fitting');
      if (!entry || entry.itemType !== 'fitting') return;

      const fittingEntry = entry;
      
      // Get effective fitting standard (use item-level override first, then global spec)
      // Item-level steelSpecificationId takes precedence over global
      const effectiveSteelSpecId = fittingEntry.specs?.steelSpecificationId ?? rfqDataRef.current.globalSpecs?.steelSpecificationId;
      const isSABS719 = effectiveSteelSpecId === 8;
      const effectiveFittingStandard = fittingEntry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

      // Valid fitting types for each standard (must match dropdown options)
      const SABS62_FITTING_TYPES = ['EQUAL_TEE', 'UNEQUAL_TEE', 'LATERAL', 'SWEEP_TEE', 'Y_PIECE', 'GUSSETTED_TEE', 'EQUAL_CROSS', 'UNEQUAL_CROSS', 'CON_REDUCER', 'ECCENTRIC_REDUCER'];
      const SABS719_FITTING_TYPES = ['SHORT_TEE', 'UNEQUAL_SHORT_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE', 'LATERAL', 'DUCKFOOT_SHORT', 'DUCKFOOT_GUSSETTED', 'SWEEP_LONG_RADIUS', 'SWEEP_MEDIUM_RADIUS', 'SWEEP_ELBOW', 'CON_REDUCER', 'ECCENTRIC_REDUCER'];

      // Validation for required fields
      if (!fittingEntry.specs?.fittingType) {
        log.debug('Fitting calculation skipped: No fitting type selected');
        return;
      }

      // Validate fitting type is compatible with the effective standard
      const validTypes = effectiveFittingStandard === 'SABS719' ? SABS719_FITTING_TYPES : SABS62_FITTING_TYPES;
      if (!validTypes.includes(fittingEntry.specs.fittingType)) {
        log.debug(`Fitting type "${fittingEntry.specs.fittingType}" not valid for ${effectiveFittingStandard}, clearing`);
        // Clear the invalid fitting type
        updateItem(entryId, { specs: { ...fittingEntry.specs, fittingType: undefined } });
        return;
      }

      if (!fittingEntry.specs?.nominalDiameterMm) {
        log.debug('Fitting calculation skipped: No nominal diameter selected');
        return;
      }

      // Additional validation for SABS719
      if (effectiveFittingStandard === 'SABS719') {
        if (!fittingEntry.specs.scheduleNumber) {
          log.debug('Fitting calculation skipped: No schedule number for SABS719');
          return;
        }
        if (fittingEntry.specs.pipeLengthAMm === undefined || fittingEntry.specs.pipeLengthBMm === undefined) {
          log.debug('Fitting calculation skipped: Missing pipe lengths for SABS719');
          return;
        }
      }

      const apiFittingType = normalizeFittingTypeForApi(fittingEntry.specs.fittingType);
      if (!apiFittingType) {
        log.debug('Fitting calculation skipped: Unable to map fitting type for API');
        return;
      }

      const calculationData = {
        fittingStandard: effectiveFittingStandard,
        fittingType: apiFittingType,
        nominalDiameterMm: fittingEntry.specs.nominalDiameterMm,
        angleRange: fittingEntry.specs.angleRange,
        pipeLengthAMm: fittingEntry.specs.pipeLengthAMm,
        pipeLengthBMm: fittingEntry.specs.pipeLengthBMm,
        quantityValue: fittingEntry.specs.quantityValue || 1,
        scheduleNumber: fittingEntry.specs.scheduleNumber,
        workingPressureBar: fittingEntry.specs.workingPressureBar || rfqDataRef.current.globalSpecs.workingPressureBar,
        workingTemperatureC: fittingEntry.specs.workingTemperatureC || rfqDataRef.current.globalSpecs.workingTemperatureC,
        steelSpecificationId: fittingEntry.specs.steelSpecificationId || rfqDataRef.current.globalSpecs.steelSpecificationId,
        flangeStandardId: fittingEntry.specs.flangeStandardId || rfqDataRef.current.globalSpecs.flangeStandardId,
        flangePressureClassId: fittingEntry.specs.flangePressureClassId || rfqDataRef.current.globalSpecs.flangePressureClassId,
      };

      log.debug('Calling API with:', calculationData);
      const result = await masterDataApi.calculateFitting(calculationData);
      log.debug('API result:', result);

      // Fetch dynamic flange specs if available
      const effectiveFlangeStandardId = fittingEntry.specs?.flangeStandardId || rfqDataRef.current.globalSpecs?.flangeStandardId;
      const effectiveFlangePressureClassId = fittingEntry.specs?.flangePressureClassId || rfqDataRef.current.globalSpecs?.flangePressureClassId;
      const effectiveFlangeTypeCode = fittingEntry.specs?.flangeTypeCode || rfqDataRef.current.globalSpecs?.flangeTypeCode;
      let flangeSpecData: FlangeSpecData | null = null;

      if (effectiveFlangeStandardId && effectiveFlangePressureClassId && fittingEntry.specs?.nominalDiameterMm) {
        const flangeTypeId = effectiveFlangeTypeCode
          ? masterData.flangeTypes?.find((ft: any) => ft.code === effectiveFlangeTypeCode)?.id
          : undefined;
        flangeSpecData = await fetchFlangeSpecsStatic(
          fittingEntry.specs.nominalDiameterMm,
          effectiveFlangeStandardId,
          effectiveFlangePressureClassId,
          flangeTypeId
        );
        if (flangeSpecData) {
          log.debug(`🔧 Fitting using dynamic flange specs: ${flangeSpecData.flangeMassKg}kg/flange`);
        }
      }

      updateItem(entryId, {
        calculation: {
          ...result,
          flangeSpecs: flangeSpecData,
        },
        calculationError: null,
      });
      log.debug('Updated entry with calculation');

    } catch (error: any) {
      const isNotFoundError = error?.message?.includes('404') || error?.message?.toLowerCase().includes('not found');
      if (isNotFoundError) {
        log.debug('Fitting not found (expected):', error?.message);
      } else {
        console.error('Fitting calculation failed:', error);
      }
      const fittingEntry = rfqDataRef.current.items.find(e => e.id === entryId && e.itemType === 'fitting') as FittingEntry | undefined;
      const nb = fittingEntry?.specs?.nominalDiameterMm;
      const schedule = fittingEntry?.specs?.scheduleNumber;
      const fittingType = fittingEntry?.specs?.fittingType?.replace(/_/g, ' ').toLowerCase();
      const parts = [fittingType, nb ? `${nb}mm` : null, schedule ? `${schedule} schedule` : null].filter(Boolean);
      const details = parts.length > 0 ? parts.join(', ') : null;
      const capitalizedDetails = details ? details.charAt(0).toUpperCase() + details.slice(1) : null;
      const friendlyError = capitalizedDetails
        ? `**Fitting:** ${capitalizedDetails} is not available. Please try a different combination.`
        : '**Fitting:** This combination is not available. Please try different specifications.';
      updateItem(entryId, { calculationError: friendlyError });
    }
  }, [updateItem, masterData.flangeTypes]);

  const isNixExtractedItem = (item: PipeItem | undefined): boolean => {
    return item?.notes?.includes('Extracted by Nix') || false;
  };

  const trackNixCorrection = async (item: PipeItem, fieldName: string, originalValue: any, newValue: any) => {
    if (originalValue === newValue) return;
    if (!isNixExtractedItem(item)) return;

    try {
      await nixApi.submitCorrection({
        extractionId: nixExtractionId || undefined,
        itemDescription: item.description || `${item.itemType} item`,
        fieldName,
        originalValue,
        correctedValue: newValue,
      });
      log.debug(`🤖 Nix learned: ${fieldName} changed from "${originalValue}" to "${newValue}"`);
    } catch (error) {
      log.warn('🤖 Failed to record Nix correction:', error);
    }
  };

  const handleUpdateEntry = useCallback((id: string, updates: any) => {
    log.info(`📝 handleUpdateEntry CALLED - id: ${id}, updates keys: ${Object.keys(updates).join(', ')}`);
    const entry = rfqDataRef.current.items.find(e => e.id === id);

    if (entry && isNixExtractedItem(entry) && updates.specs) {
      const fieldsToTrack = ['nominalBoreMm', 'nominalDiameterMm', 'scheduleNumber', 'wallThicknessMm', 'pipeEndConfiguration', 'bendType', 'bendDegrees', 'fittingType'];
      const currentSpecs = entry.specs || {};

      fieldsToTrack.forEach(field => {
        if (updates.specs[field] !== undefined && updates.specs[field] !== (currentSpecs as any)[field]) {
          trackNixCorrection(entry, field, (currentSpecs as any)[field], updates.specs[field]);
        }
      });
    }

    if (entry?.itemType === 'bend' || entry?.itemType === 'fitting') {
      updateItem(id, updates);
    } else {
      updateStraightPipeEntry(id, updates);
    }
  }, [updateItem, updateStraightPipeEntry]);

  // State for save progress feedback
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Save progress handler - saves current RFQ data to server
  const handleSaveProgress = async () => {
    log.debug('💾 handleSaveProgress called');
    log.debug('💾 rfqData.projectType:', rfqData.projectType);
    log.debug('💾 rfqData.requiredProducts:', rfqData.requiredProducts);
    log.debug('💾 rfqData.skipDocuments:', rfqData.skipDocuments);
    log.debug('💾 rfqData.latitude:', rfqData.latitude);
    log.debug('💾 rfqData.longitude:', rfqData.longitude);
    log.debug('💾 rfqData.globalSpecs:', rfqData.globalSpecs);

    const saveData = {
      draftId: currentDraftId || undefined,
      projectName: rfqData.projectName,
      currentStep,
      formData: {
        projectName: rfqData.projectName,
        projectType: rfqData.projectType,
        description: rfqData.description,
        customerName: rfqData.customerName,
        customerEmail: rfqData.customerEmail,
        customerPhone: rfqData.customerPhone,
        requiredDate: rfqData.requiredDate,
        notes: rfqData.notes,
        latitude: rfqData.latitude,
        longitude: rfqData.longitude,
        siteAddress: rfqData.siteAddress,
        region: rfqData.region,
        country: rfqData.country,
        mineId: rfqData.mineId,
        mineName: rfqData.mineName,
        skipDocuments: rfqData.skipDocuments,
        useNix: rfqData.useNix,
        nixPopupShown: rfqData.nixPopupShown,
      },
      globalSpecs: rfqData.globalSpecs,
      requiredProducts: rfqData.requiredProducts || ['fabricated_steel'],
      straightPipeEntries: rfqData.items?.length > 0 ? rfqData.items : rfqData.straightPipeEntries,
      pendingDocuments: pendingDocuments.map((doc: any) => ({
        name: doc.name || doc.file?.name,
        size: doc.size || doc.file?.size,
        type: doc.type || doc.file?.type,
      })),
    };

    setIsSavingDraft(true);
    try {
      log.debug('💾 Complete saveData being sent to API:', saveData);
      log.debug('💾 saveData.formData:', saveData.formData);
      log.debug('💾 saveData.requiredProducts:', saveData.requiredProducts);

      const result = isEditing
        ? await adminApiClient.saveDraft(saveData)
        : await draftsApi.save(saveData);

      // Update draft info
      setCurrentDraftId(result.id);
      setDraftNumber(result.draftNumber);

      // Also save to localStorage as backup
      localStorage.setItem('annix_rfq_draft', JSON.stringify({
        ...saveData,
        draftNumber: result.draftNumber,
        savedAt: nowISO(),
      }));

      // Show confirmation
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 5000);

      log.debug(`✅ RFQ progress saved as ${result.draftNumber}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('converted to an RFQ')) {
        log.info('Draft has been converted to RFQ - clearing draft state');
        setCurrentDraftId(null);
        setDraftNumber(null);
        localStorage.removeItem('annix_rfq_draft');
        return;
      }

      console.error('Failed to save progress:', error);

      if (error instanceof SessionExpiredError) {
        try {
          localStorage.setItem('annix_rfq_draft', JSON.stringify({
            rfqData,
            currentStep,
            savedAt: nowISO(),
          }));
          log.debug('✅ RFQ progress saved to localStorage (session expired, will sync after login)');
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        return;
      }

      try {
        localStorage.setItem('annix_rfq_draft', JSON.stringify({
          ...saveData,
          savedAt: nowISO(),
        }));
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
        log.debug('✅ RFQ progress saved to localStorage (server unavailable)');
        showToast('Progress saved locally. Will sync when connection restored.', 'info');
      } catch (e) {
        showToast('Failed to save progress. Please try again.', 'error');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationErrors({});

    try {
      const allItems = rfqData.items || rfqData.straightPipeEntries || [];

      if (allItems.length === 0) {
        setValidationErrors({ submit: 'Please add at least one item before submitting.' });
        setIsSubmitting(false);
        return;
      }

      const straightPipeItems = allItems.filter((item: any) => item.itemType !== 'bend' && item.itemType !== 'fitting');
      const bendItems = allItems.filter((item: any) => item.itemType === 'bend');
      const fittingItems = allItems.filter((item: any) => item.itemType === 'fitting');

      log.debug(`📊 Submitting unified RFQ: ${straightPipeItems.length} pipe(s), ${bendItems.length} bend(s), ${fittingItems.length} fitting(s)`);

      for (let i = 0; i < allItems.length; i++) {
        const entry = allItems[i];
        if (!entry.calculation) {
          const itemType = entry.itemType === 'bend' ? 'Bend' : entry.itemType === 'fitting' ? 'Fitting' : 'Pipe';
          setValidationErrors({
            submit: `${itemType} #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before submitting.`
          });
          setIsSubmitting(false);
          return;
        }
      }

      const { unifiedRfqApi } = await import('@/app/lib/api/client');

      const unifiedItems = allItems.map((entry: any) => {
        const specs = entry.specs || {};
        const calculation = entry.calculation || {};

        if (entry.itemType === 'bend') {
          const stubLengths = (specs.stubs || []).map((stub: any) => stub?.length || 0).filter((l: number) => l > 0);
          return {
            itemType: 'bend' as const,
            description: entry.description || 'Bend Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalWeight || calculation.bendWeight,
            bend: {
              nominalBoreMm: specs.nominalBoreMm,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              bendType: specs.bendType,
              bendRadiusType: specs.bendRadiusType,
              bendDegrees: specs.bendDegrees,
              bendEndConfiguration: specs.bendEndConfiguration,
              numberOfTangents: specs.numberOfTangents || 0,
              tangentLengths: specs.tangentLengths || [],
              numberOfSegments: specs.numberOfSegments,
              centerToFaceMm: specs.centerToFaceMm,
              calculationData: {
                ...(calculation || {}),
                bendRadiusType: specs.bendRadiusType,
                stubs: specs.stubs || [],
                stubLengths,
                numberOfSegments: specs.numberOfSegments,
                tangentLengths: specs.tangentLengths || [],
              },
              quantityType: specs.quantityType || 'number_of_items',
              quantityValue: specs.quantityValue || 1,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20,
              steelSpecificationId: specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2,
              useGlobalFlangeSpecs: specs.useGlobalFlangeSpecs ?? true,
              flangeStandardId: specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId,
            },
          };
        } else if (entry.itemType === 'fitting') {
          return {
            itemType: 'fitting' as const,
            description: entry.description || 'Fitting Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalWeight || calculation.pipeWeight,
            fitting: {
              nominalDiameterMm: specs.nominalDiameterMm,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              fittingType: specs.fittingType,
              fittingStandard: specs.fittingStandard,
              pipeLengthAMm: specs.pipeLengthAMm,
              pipeLengthBMm: specs.pipeLengthBMm,
              pipeEndConfiguration: specs.pipeEndConfiguration,
              addBlankFlange: specs.addBlankFlange || false,
              blankFlangeCount: specs.blankFlangeCount,
              blankFlangePositions: specs.blankFlangePositions,
              quantityType: specs.quantityType || 'number_of_items',
              quantityValue: specs.quantityValue || 1,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC,
              calculationData: calculation,
            },
          };
        } else {
          return {
            itemType: 'straight_pipe' as const,
            description: entry.description || 'Pipe Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalSystemWeight || calculation.totalPipeWeight,
            straightPipe: {
              nominalBoreMm: specs.nominalBoreMm,
              scheduleType: specs.scheduleType,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              pipeEndConfiguration: specs.pipeEndConfiguration,
              individualPipeLength: specs.individualPipeLength,
              lengthUnit: specs.lengthUnit,
              quantityType: specs.quantityType,
              quantityValue: specs.quantityValue,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC,
              steelSpecificationId: specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId,
              flangeStandardId: specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId,
            },
          };
        }
      });

      const unifiedPayload = {
        rfq: {
          projectName: rfqData.projectName,
          description: rfqData.description,
          customerName: rfqData.customerName,
          customerEmail: rfqData.customerEmail,
          customerPhone: rfqData.customerPhone,
          requiredDate: rfqData.requiredDate,
          status: 'submitted' as const,
          notes: rfqData.notes,
        },
        items: unifiedItems,
      };

      log.debug('📦 Submitting unified RFQ payload:', unifiedPayload);

      const result = await unifiedRfqApi.create(unifiedPayload);
      log.debug(`✅ Unified RFQ created successfully:`, result);

      if ((pendingDocuments.length > 0 || pendingTenderDocuments.length > 0) && result.rfq?.id) {
        const rfqId = result.rfq.id;
        const allDocuments = [...pendingDocuments, ...pendingTenderDocuments];
        log.debug(`📎 Uploading ${allDocuments.length} document(s) to RFQ #${rfqId}...`);

        let uploadedCount = 0;
        let failedCount = 0;

        for (const doc of allDocuments) {
          try {
            await rfqDocumentApi.upload(rfqId, doc.file);
            uploadedCount++;
            log.debug(`✅ Uploaded: ${doc.file.name}`);
          } catch (uploadError) {
            failedCount++;
            console.error(`❌ Failed to upload ${doc.file.name}:`, uploadError);
          }
        }

        if (failedCount > 0) {
          console.warn(`⚠️ ${failedCount} document(s) failed to upload`);
        }

        setPendingDocuments([]);
        setPendingTenderDocuments([]);
      }

      if (result.rfq?.id) {
        try {
          log.debug(`📦 Creating BOQ for RFQ ${result.rfq.id}...`);
          const boq = await boqApi.create({
            title: `BOQ for ${rfqData.projectName || 'Untitled Project'}`,
            description: rfqData.description,
            rfqId: result.rfq.id,
          });
          log.debug(`✅ BOQ ${boq.boqNumber} created with ID ${boq.id}`);

          const consolidatedData = consolidateBoqData({
            entries: allItems,
            globalSpecs: {
              gasketType: rfqData.globalSpecs?.gasketType,
              pressureClassDesignation: masterData?.pressureClasses?.find(
                (p: any) => p.id === rfqData.globalSpecs?.flangePressureClassId
              )?.designation,
              flangeStandardId: rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: rfqData.globalSpecs?.flangePressureClassId,
            },
            masterData: {
              flangeStandards: masterData?.flangeStandards,
              pressureClasses: masterData?.pressureClasses,
              steelSpecs: masterData?.steelSpecs,
            },
          });

          log.debug(`📊 Consolidated data:`, consolidatedData);

          const submitResult = await boqApi.submitForQuotation(boq.id, {
            boqData: consolidatedData,
            customerInfo: {
              name: rfqData.customerName || 'Unknown',
              email: rfqData.customerEmail || '',
              phone: rfqData.customerPhone,
            },
            projectInfo: {
              name: rfqData.projectName || 'Untitled Project',
              description: rfqData.description,
              requiredDate: rfqData.requiredDate,
            },
          });

          log.debug(`✅ BOQ submitted for quotation: ${submitResult.sectionsCreated} sections created, ${submitResult.suppliersNotified} suppliers notified`);
        } catch (boqError) {
          console.error('Failed to create/submit BOQ:', boqError);
        }
      }

      if (currentDraftId && result.rfq?.id) {
        try {
          await draftsApi.markAsConverted(currentDraftId, result.rfq.id);
          log.debug(`✅ Draft ${currentDraftId} marked as converted to RFQ ${result.rfq.id}`);
        } catch (convertError) {
          console.error('Failed to mark draft as converted:', convertError);
        }
      }

      showToast(`Success! RFQ ${result.rfq?.rfqNumber} created with ${result.itemsCreated} item(s).`, 'success');
      onSuccess(result.rfq?.id || 'success');

    } catch (error: any) {
      console.error('Submission error:', error);

      let errorMessage = 'Failed to submit RFQ. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setValidationErrors({ submit: errorMessage });
      showToast(`Submission failed: ${errorMessage}. Please check the console for more details.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!editRfqId) {
      showToast('Cannot re-submit: No RFQ ID found', 'error');
      return;
    }

    setIsSubmitting(true);
    setValidationErrors({});

    try {
      const allItems = rfqData.items || rfqData.straightPipeEntries || [];

      if (allItems.length === 0) {
        setValidationErrors({ submit: 'Please add at least one item before re-submitting.' });
        setIsSubmitting(false);
        return;
      }

      for (let i = 0; i < allItems.length; i++) {
        const entry = allItems[i];
        if (!entry.calculation) {
          const itemType = entry.itemType === 'bend' ? 'Bend' : entry.itemType === 'fitting' ? 'Fitting' : 'Pipe';
          setValidationErrors({
            submit: `${itemType} #${i + 1} (${entry.description}) has not been calculated. Please calculate all items before re-submitting.`
          });
          setIsSubmitting(false);
          return;
        }
      }

      const { unifiedRfqApi } = await import('@/app/lib/api/client');

      const unifiedItems = allItems.map((entry: any) => {
        const specs = entry.specs || {};
        const calculation = entry.calculation || {};

        if (entry.itemType === 'bend') {
          const stubLengths = (specs.stubs || []).map((stub: any) => stub?.length || 0).filter((l: number) => l > 0);
          return {
            itemType: 'bend' as const,
            description: entry.description || 'Bend Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalWeight || calculation.bendWeight,
            bend: {
              nominalBoreMm: specs.nominalBoreMm,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              bendType: specs.bendType,
              bendRadiusType: specs.bendRadiusType,
              bendDegrees: specs.bendDegrees,
              bendEndConfiguration: specs.bendEndConfiguration,
              numberOfTangents: specs.numberOfTangents || 0,
              tangentLengths: specs.tangentLengths || [],
              numberOfSegments: specs.numberOfSegments,
              centerToFaceMm: specs.centerToFaceMm,
              calculationData: {
                ...(calculation || {}),
                bendRadiusType: specs.bendRadiusType,
                stubs: specs.stubs || [],
                stubLengths,
                numberOfSegments: specs.numberOfSegments,
                tangentLengths: specs.tangentLengths || [],
              },
              quantityType: specs.quantityType || 'number_of_items',
              quantityValue: specs.quantityValue || 1,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC || 20,
              steelSpecificationId: specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId || 2,
              useGlobalFlangeSpecs: specs.useGlobalFlangeSpecs ?? true,
              flangeStandardId: specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId,
            },
          };
        } else if (entry.itemType === 'fitting') {
          return {
            itemType: 'fitting' as const,
            description: entry.description || 'Fitting Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalWeight || calculation.pipeWeight,
            fitting: {
              nominalDiameterMm: specs.nominalDiameterMm,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              fittingType: specs.fittingType,
              fittingStandard: specs.fittingStandard,
              pipeLengthAMm: specs.pipeLengthAMm,
              pipeLengthBMm: specs.pipeLengthBMm,
              pipeEndConfiguration: specs.pipeEndConfiguration,
              addBlankFlange: specs.addBlankFlange || false,
              blankFlangeCount: specs.blankFlangeCount,
              blankFlangePositions: specs.blankFlangePositions,
              quantityType: specs.quantityType || 'number_of_items',
              quantityValue: specs.quantityValue || 1,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC,
              calculationData: calculation,
            },
          };
        } else {
          return {
            itemType: 'straight_pipe' as const,
            description: entry.description || 'Pipe Item',
            notes: entry.notes,
            totalWeightKg: calculation.totalSystemWeight || calculation.totalPipeWeight,
            straightPipe: {
              nominalBoreMm: specs.nominalBoreMm,
              scheduleType: specs.scheduleType,
              scheduleNumber: specs.scheduleNumber,
              wallThicknessMm: specs.wallThicknessMm,
              pipeEndConfiguration: specs.pipeEndConfiguration,
              individualPipeLength: specs.individualPipeLength,
              lengthUnit: specs.lengthUnit,
              quantityType: specs.quantityType,
              quantityValue: specs.quantityValue,
              workingPressureBar: specs.workingPressureBar || rfqData.globalSpecs?.workingPressureBar || 10,
              workingTemperatureC: specs.workingTemperatureC || rfqData.globalSpecs?.workingTemperatureC,
              steelSpecificationId: specs.steelSpecificationId || rfqData.globalSpecs?.steelSpecificationId,
              flangeStandardId: specs.flangeStandardId || rfqData.globalSpecs?.flangeStandardId,
              flangePressureClassId: specs.flangePressureClassId || rfqData.globalSpecs?.flangePressureClassId,
            },
          };
        }
      });

      const unifiedPayload = {
        rfq: {
          projectName: rfqData.projectName,
          description: rfqData.description,
          customerName: rfqData.customerName,
          customerEmail: rfqData.customerEmail,
          customerPhone: rfqData.customerPhone,
          requiredDate: rfqData.requiredDate,
          status: 'submitted' as const,
          notes: rfqData.notes,
        },
        items: unifiedItems,
      };

      log.debug('📦 Re-submitting unified RFQ payload via admin API:', unifiedPayload);

      const result = await adminApiClient.updateRfq(editRfqId, unifiedPayload);
      log.debug(`✅ Unified RFQ updated successfully via admin API:`, result);

      const existingBoq = await boqApi.getByRfqId(editRfqId);
      if (existingBoq) {
        log.debug(`📦 Updating BOQ ${existingBoq.boqNumber} for RFQ ${editRfqId}...`);

        const consolidatedData = consolidateBoqData({
          entries: allItems,
          globalSpecs: {
            gasketType: rfqData.globalSpecs?.gasketType,
            pressureClassDesignation: masterData?.pressureClasses?.find(
              (p: any) => p.id === rfqData.globalSpecs?.flangePressureClassId
            )?.designation,
            flangeStandardId: rfqData.globalSpecs?.flangeStandardId,
            flangePressureClassId: rfqData.globalSpecs?.flangePressureClassId,
          },
          masterData: {
            flangeStandards: masterData?.flangeStandards,
            pressureClasses: masterData?.pressureClasses,
            steelSpecs: masterData?.steelSpecs,
          },
        });

        log.debug(`📊 Consolidated data for update:`, consolidatedData);

        const updateResult = await boqApi.updateSubmittedBoq(existingBoq.id, {
          boqData: consolidatedData,
          customerInfo: {
            name: rfqData.customerName || 'Unknown',
            email: rfqData.customerEmail || '',
            phone: rfqData.customerPhone,
          },
          projectInfo: {
            name: rfqData.projectName || 'Untitled Project',
            description: rfqData.description,
            requiredDate: rfqData.requiredDate,
          },
        });

        log.debug(`✅ BOQ updated and suppliers re-notified: ${updateResult.sectionsCreated} sections updated, ${updateResult.suppliersNotified} suppliers notified`);
      } else {
        log.debug(`📦 No existing BOQ found, creating new BOQ for RFQ ${editRfqId}...`);
        const boq = await boqApi.create({
          title: `BOQ for ${rfqData.projectName || 'Untitled Project'}`,
          description: rfqData.description,
          rfqId: editRfqId,
        });
        log.debug(`✅ BOQ ${boq.boqNumber} created with ID ${boq.id}`);

        const consolidatedData = consolidateBoqData({
          entries: allItems,
          globalSpecs: {
            gasketType: rfqData.globalSpecs?.gasketType,
            pressureClassDesignation: masterData?.pressureClasses?.find(
              (p: any) => p.id === rfqData.globalSpecs?.flangePressureClassId
            )?.designation,
            flangeStandardId: rfqData.globalSpecs?.flangeStandardId,
            flangePressureClassId: rfqData.globalSpecs?.flangePressureClassId,
          },
          masterData: {
            flangeStandards: masterData?.flangeStandards,
            pressureClasses: masterData?.pressureClasses,
            steelSpecs: masterData?.steelSpecs,
          },
        });

        const submitResult = await boqApi.submitForQuotation(boq.id, {
          boqData: consolidatedData,
          customerInfo: {
            name: rfqData.customerName || 'Unknown',
            email: rfqData.customerEmail || '',
            phone: rfqData.customerPhone,
          },
          projectInfo: {
            name: rfqData.projectName || 'Untitled Project',
            description: rfqData.description,
            requiredDate: rfqData.requiredDate,
          },
        });

        log.debug(`✅ BOQ submitted for quotation: ${submitResult.sectionsCreated} sections created, ${submitResult.suppliersNotified} suppliers notified`);
      }

      showToast(`Success! RFQ ${result.rfq?.rfqNumber} updated with ${result.itemsUpdated} item(s). Suppliers have been notified.`, 'success');
      onSuccess(result.rfq?.id?.toString() || 'success');

    } catch (error: any) {
      console.error('Re-submission error:', error);

      let errorMessage = 'Failed to re-submit RFQ. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setValidationErrors({ submit: errorMessage });
      showToast(`Re-submission failed: ${errorMessage}. Please check the console for more details.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = rfqData.useNix
    ? [
        { number: 1, title: 'Project/RFQ Details', description: 'Basic project and customer information' },
        { number: 2, title: 'Items', description: 'Add pipes, bends, and fittings' },
        { number: 3, title: 'Review & Submit', description: 'Final review and submission' },
        { number: 4, title: 'BOQ', description: 'Bill of Quantities summary' }
      ]
    : [
        { number: 1, title: 'Project/RFQ Details', description: 'Basic project and customer information' },
        { number: 2, title: 'Specifications', description: 'Working conditions and material specs' },
        { number: 3, title: 'Items', description: 'Add pipes, bends, and fittings' },
        { number: 4, title: 'Review & Submit', description: 'Final review and submission' },
        { number: 5, title: 'BOQ', description: 'Bill of Quantities summary' }
      ];

  const renderCurrentStep = () => {
    if (rfqData.useNix) {
      switch (currentStep) {
        case 1:
          return (
            <ProjectDetailsStep
              rfqData={rfqData}
              onUpdate={updateRfqField as (field: string, value: any) => void}
              errors={validationErrors}
              onSetValidationError={handleSetValidationError}
              globalSpecs={rfqData.globalSpecs}
              onUpdateGlobalSpecs={updateGlobalSpecs}
              pendingDocuments={pendingDocuments}
              onAddDocument={handleAddDocument}
              onRemoveDocument={handleRemoveDocument}
              pendingTenderDocuments={pendingTenderDocuments}
              onAddTenderDocument={handleAddTenderDocument}
              onRemoveTenderDocument={handleRemoveTenderDocument}
              useNix={rfqData.useNix}
              onShowNixPopup={handleShowNixPopup}
              onStopUsingNix={handleStopUsingNix}
              onProcessWithNix={handleProcessDocumentsWithNix}
              isNixProcessing={isNixProcessing}
            />
          );
        case 2:
          return (
            <ItemUploadStep
              entries={rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries}
              globalSpecs={rfqData.globalSpecs}
              masterData={masterData}
              onAddEntry={addStraightPipeEntry}
              onAddBendEntry={addBendEntry}
              onAddFittingEntry={addFittingEntry}
              onAddPipeSteelWorkEntry={addPipeSteelWorkEntry}
              onAddExpansionJointEntry={addExpansionJointEntry}
              onUpdateEntry={handleUpdateEntry}
              onRemoveEntry={removeStraightPipeEntry}
              onDuplicateEntry={duplicateItem}
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
              hideDrawings={rfqData.useNix}
              onReady={rfqData.useNix ? handleItemsPageReady : undefined}
            />
          );
        case 3:
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
        case 4:
          return (
            <BOQStep
              rfqData={rfqData}
              entries={rfqData.items.length > 0 ? rfqData.items : rfqData.straightPipeEntries}
              globalSpecs={rfqData.globalSpecs}
              requiredProducts={rfqData.requiredProducts || []}
              masterData={masterData}
              onPrevStep={handlePrevStep}
              onSubmit={handleSubmit}
              onResubmit={handleResubmit}
              isEditing={isEditing}
              loading={isSubmitting}
            />
          );
        default:
          return null;
      }
    } else {
      switch (currentStep) {
        case 1:
          return (
            <ProjectDetailsStep
              rfqData={rfqData}
              onUpdate={updateRfqField as (field: string, value: any) => void}
              errors={validationErrors}
              onSetValidationError={handleSetValidationError}
              globalSpecs={rfqData.globalSpecs}
              onUpdateGlobalSpecs={updateGlobalSpecs}
              pendingDocuments={pendingDocuments}
              onAddDocument={handleAddDocument}
              onRemoveDocument={handleRemoveDocument}
              pendingTenderDocuments={pendingTenderDocuments}
              onAddTenderDocument={handleAddTenderDocument}
              onRemoveTenderDocument={handleRemoveTenderDocument}
              useNix={rfqData.useNix}
              onShowNixPopup={handleShowNixPopup}
              onStopUsingNix={handleStopUsingNix}
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
              onAddPipeSteelWorkEntry={addPipeSteelWorkEntry}
              onAddExpansionJointEntry={addExpansionJointEntry}
              onUpdateEntry={handleUpdateEntry}
              onRemoveEntry={removeStraightPipeEntry}
              onDuplicateEntry={duplicateItem}
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
              hideDrawings={rfqData.useNix}
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
              masterData={masterData}
              onPrevStep={handlePrevStep}
              onSubmit={handleSubmit}
              onResubmit={handleResubmit}
              isEditing={isEditing}
              loading={isSubmitting}
            />
          );
        default:
          return null;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Nix AI Assistant Popup */}
      <NixAiPopup
        isVisible={showNixPopup}
        onYes={handleNixYes}
        onNo={handleNixNo}
      />

      {/* Nix Processing Popup - shows while extracting data */}
      <NixProcessingPopup
        isVisible={isNixProcessing}
        progress={nixProcessingProgress}
        statusMessage={nixProcessingStatus}
        estimatedTimeRemaining={nixProcessingTimeRemaining}
      />

      {/* Nix Floating Avatar - shows when Nix is active */}
      <NixFloatingAvatar
        isVisible={rfqData.useNix === true}
        onStopUsingNix={handleStopUsingNix}
      />

      {/* Nix Clarification Popup - shows when Nix needs user input */}
      {showNixClarification && (
        <NixClarificationPopup
          clarification={nixClarifications[currentClarificationIndex] || null}
          totalClarifications={nixClarifications.length}
          currentIndex={currentClarificationIndex}
          onSubmit={handleClarificationSubmit}
          onSkip={handleClarificationSkip}
          onClose={handleCloseClarification}
        />
      )}

      {/* LocalStorage Draft Restoration Prompt */}
      {showDraftRestorePrompt && pendingLocalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Resume Your Draft?</h3>
                  <p className="mt-2 text-sm text-gray-300">
                    We found a saved draft from your previous session.
                  </p>
                  {pendingLocalDraft.lastSaved && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last saved: {formatLastSaved(new Date(pendingLocalDraft.lastSaved))}
                    </p>
                  )}
                  {pendingLocalDraft.rfqData?.projectName && (
                    <p className="mt-2 text-sm text-blue-300">
                      Project: {pendingLocalDraft.rfqData.projectName}
                    </p>
                  )}
                  {pendingLocalDraft.rfqData?.customerEmail && (
                    <p className="text-sm text-gray-400">
                      Email: {pendingLocalDraft.rfqData.customerEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-slate-900/50 border-t border-slate-700">
              <button
                onClick={handleDiscardLocalDraft}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={handleRestoreLocalDraft}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
              >
                Resume Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Progress Dialog for Unregistered Users */}
      {showSaveProgressDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 overflow-hidden">
            {saveProgressStep === 'confirm' ? (
              <>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">Save Your Progress</h3>
                      <p className="mt-2 text-sm text-gray-300">
                        {rfqData.customerEmail
                          ? `We'll save your progress and send a recovery link to ${rfqData.customerEmail}`
                          : 'Please enter your email address on the form to save your progress.'}
                      </p>
                      {rfqData.projectName && (
                        <p className="mt-2 text-sm text-blue-300">
                          Project: {rfqData.projectName}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        Your draft will be saved for 7 days. You can use the recovery link to continue from any device.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 p-4 bg-slate-900/50 border-t border-slate-700">
                  <button
                    onClick={handleCloseSaveProgressDialog}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    disabled={isSavingProgress}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProgressToServer}
                    disabled={!rfqData.customerEmail || isSavingProgress}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingProgress ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Save & Send Link'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Progress Saved!</h3>
                    <p className="mt-2 text-sm text-gray-300">
                      A recovery link has been sent to:
                    </p>
                    <p className="mt-1 text-sm font-medium text-blue-300">
                      {rfqData.customerEmail}
                    </p>
                    <p className="mt-4 text-xs text-gray-400">
                      Check your inbox (and spam folder) for an email from Annix.
                      Use the link to continue your RFQ from any device within 7 days.
                    </p>
                  </div>
                </div>
                <div className="flex p-4 bg-slate-900/50 border-t border-slate-700">
                  <button
                    onClick={handleCloseSaveProgressDialog}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Scrollable Content - grows to fill space, with padding for fixed bottom bar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-20">
        {/* Sticky Top Header Bar */}
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
              {!isAuthenticated && hasLocalDraft && localDraftLastSaved && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-green-100 text-green-700 border border-green-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-saved {formatLastSaved(localDraftLastSaved)}
                </span>
              )}
              {!isAuthenticated && (
                <button
                  onClick={handleOpenSaveProgressDialog}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
                  title="Save progress and get a recovery link via email"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Progress
                </button>
              )}
              <div className="text-sm text-gray-500">
                {rfqData?.projectName || 'New RFQ'}
              </div>
              <button
                onClick={() => {
                  const isDraft = searchParams?.get('draft') || searchParams?.get('draftId');
                  log.debug('Close button clicked - isDraft:', isDraft);
                  log.debug('searchParams:', searchParams);

                  if (isDraft && initialDraftDataRef.current) {
                    // For drafts, check if data has changed since loading
                    const currentData = JSON.stringify({
                      items: rfqData.items || [],
                      straightPipeEntries: rfqData.straightPipeEntries || [],
                      globalSpecs: rfqData.globalSpecs || {},
                      projectType: rfqData.projectType,
                      description: rfqData.description,
                      notes: rfqData.notes,
                      requiredProducts: rfqData.requiredProducts || [],
                    });
                    const hasChanges = currentData !== initialDraftDataRef.current;

                    log.info('🔍 Draft dirty check:', {
                      hasChanges,
                      itemsCount: rfqData.items?.length,
                      straightPipesCount: rfqData.straightPipeEntries?.length,
                      globalSpecsKeys: Object.keys(rfqData.globalSpecs || {}).length,
                    });

                    if (hasChanges) {
                      setShowCloseConfirmation(true);
                    } else {
                      onCancel();
                    }
                  } else if (!isDraft) {
                    // For a new RFQ (not a draft), check if user has made any meaningful changes
                    // Skip auto-filled fields (customer name/email from profile, auto-generated project name)
                    const hasChanges =
                      // Items/entries added
                      (rfqData.items?.length ?? 0) > 0 ||
                      (rfqData.straightPipeEntries?.length ?? 0) > 0 ||
                      // User-selected fields on step 1
                      (rfqData.projectType && rfqData.projectType !== 'standard') ||
                      (rfqData.description?.trim().length ?? 0) > 0 ||
                      (rfqData.notes?.trim().length ?? 0) > 0 ||
                      (rfqData.siteAddress?.trim().length ?? 0) > 0 ||
                      (rfqData.mineId !== undefined && rfqData.mineId !== null) ||
                      (rfqData.skipDocuments === true) ||
                      // User progressed to step 2+ (selected products, location, specs)
                      (currentStep > 1 && (
                        (rfqData.requiredProducts && rfqData.requiredProducts.length > 0) ||
                        (rfqData.latitude !== undefined && rfqData.latitude !== null) ||
                        (rfqData.longitude !== undefined && rfqData.longitude !== null)
                      )) ||
                      // User progressed to step 3+ (entered specs)
                      (currentStep > 2 && rfqData.globalSpecs && Object.keys(rfqData.globalSpecs).length > 0);

                    log.info('Dirty check - hasChanges:', hasChanges, 'rfqData:', {
                      items: rfqData.items?.length,
                      straightPipes: rfqData.straightPipeEntries?.length,
                      projectType: rfqData.projectType,
                      description: rfqData.description,
                      notes: rfqData.notes,
                      currentStep,
                    });
                    if (hasChanges) {
                      log.debug('Has changes, showing confirmation modal');
                      setShowCloseConfirmation(true);
                    } else {
                      log.debug('No changes, calling onCancel');
                      onCancel();
                    }
                  } else {
                    // Draft but initial state not yet captured, just close
                    onCancel();
                  }
                }}
                className="text-gray-400 hover:text-gray-600 text-xl px-2"
                title="Close RFQ"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

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
        style={{ backgroundColor: '#323288' }}
      >
        <div className="flex items-center justify-between max-w-full">
          {/* Left side - Previous button */}
          <div className="w-32">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentStep === 1 ? 'transparent' : '#4a4da3',
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
                      ? '#4a4da3'
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
                        ? '#323288'
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
                        ? '#323288'
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
                backgroundColor: '#4a4da3',
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
                style={{ backgroundColor: '#FFA500', color: '#323288' }}
              >
                Next →
              </button>
            ) : currentStep === 4 ? (
              <button
                onClick={handleNextStep}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#4CAF50', color: '#FFFFFF' }}
              >
                Submit RFQ →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showCloseConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCloseConfirmation(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-8 py-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Unsaved Changes
              </h2>

              <p className="text-gray-600 mb-6 text-center">
                You have unsaved changes. Are you sure you want to close this RFQ?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirmation(false)}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => {
                    log.debug('Close Anyway clicked, calling onCancel()');
                    setShowCloseConfirmation(false);
                    onCancel();
                  }}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  Close Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
