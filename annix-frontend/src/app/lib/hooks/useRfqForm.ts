'use client';

import { useState, useCallback } from 'react';
import { CreateStraightPipeRfqDto, StraightPipeCalculationResult } from '@/app/lib/api/client';
import type { AirSaltContentResult, TimeOfWetnessResult, FloodRiskLevel } from '../services/environmentalIntelligence';
import { addDaysFromNowISODate, generateUniqueId } from '@/app/lib/datetime';
import { log } from '@/app/lib/logger';

export interface StraightPipeEntry {
  id: string;
  itemType: 'straight_pipe';
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: CreateStraightPipeRfqDto;
  calculation?: StraightPipeCalculationResult;
  calculatedPipes?: number;
  notes?: string;
  // Schedule override tracking
  isScheduleOverridden?: boolean;
  minimumSchedule?: string;
  minimumWallThickness?: number;
  availableUpgrades?: any[];
  // Flange override tracking
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
  itemType: 'bend';
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    bendType?: string; // '1.5D', '2D', '3D', '5D'
    bendDegrees?: number; // 11.25, 22.5, 30, 45, 60, 90
    centerToFaceMm?: number; // Auto-populated from bend tables
    bendRadiusMm?: number; // Auto-populated from bend tables
    numberOfTangents?: number; // 0, 1, 2
    tangentLengths?: number[]; // Array for tangent lengths
    numberOfStubs?: number; // 0, 1, 2
    stubs?: BendStub[]; // Array for stub specifications
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string; // SABS 1123 flange type code (/1 to /9)
    quantityValue: number;
    quantityType: 'number_of_items';
    workingPressureBar?: number;
    workingTemperatureC?: number;
    useGlobalFlangeSpecs?: boolean;
  };
  calculation?: any;
  notes?: string;
}

export interface FittingEntry {
  id: string;
  itemType: 'fitting';
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    fittingStandard?: 'SABS62' | 'SABS719'; // SABS62 (standard) or SABS719 (fabricated)
    fittingType?: string; // EQUAL_TEE, LATERAL, SWEEP_TEE, etc.
    nominalDiameterMm?: number;
    scheduleNumber?: string; // Required for SABS719
    angleRange?: string; // For laterals/Y-pieces: "60-90", "45-59", "30-44"
    pipeLengthAMm?: number; // Length of pipe A
    pipeLengthBMm?: number; // Length of pipe B
    stubLocation?: string; // Location of stub or lateral
    degrees?: number; // For laterals - actual angle
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    flangeTypeCode?: string; // SABS 1123 flange type code (/1 to /9)
    quantityValue: number;
    quantityType: 'number_of_items';
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: any;
  notes?: string;
}

export interface PipeSteelWorkEntry {
  id: string;
  itemType: 'pipe_steel_work';
  description: string;
  clientItemNumber?: string;
  useSequentialNumbering?: boolean;
  specs: {
    workType?: 'pipe_support' | 'reinforcement_pad' | 'saddle_support' | 'shoe_support';
    nominalDiameterMm?: number;
    bracketType?: string;
    pipelineLengthM?: number;
    branchDiameterMm?: number;
    mediaType?: 'water_filled' | 'vapor_gas';
    supportSpacingM?: number;
    numberOfSupports?: number;
    steelSpecificationId?: number;
    quantity: number;
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: any;
  notes?: string;
}

export type PipeItem = StraightPipeEntry | BendEntry | FittingEntry | PipeSteelWorkEntry;

export interface GlobalSpecs {
  // Core pipe specifications
  workingPressureBar?: number;
  workingTemperatureC?: number;
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;

  // Environmental Corrosion Protection (ECP) - Location based
  ecpMarineInfluence?: 'None' | 'Coastal' | 'Offshore';
  ecpIso12944Category?: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX';
  ecpIndustrialPollution?: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';

  // Marine & Special Conditions
  distanceToCoast?: number;
  distanceToCoastFormatted?: string;
  detailedMarineInfluence?: 'Extreme Marine' | 'Severe Marine' | 'High Marine' | 'Moderate Marine' | 'Low / Non-Marine';
  airSaltContent?: AirSaltContentResult;
  timeOfWetness?: TimeOfWetnessResult;
  floodRisk?: FloodRiskLevel;

  // Soil data
  soilType?: string;
  soilTexture?: string;
  soilMoisture?: string;
  soilMoistureClass?: 'Low' | 'Moderate' | 'High';
  soilDrainage?: string;
  soilDrainageSource?: string;

  // Temperature data
  tempMin?: number;
  tempMax?: number;
  tempMean?: number;

  // Relative Humidity data
  humidityMin?: number;
  humidityMax?: number;
  humidityMean?: number;

  // Additional Atmospheric Conditions
  annualRainfall?: string;
  windSpeed?: number;
  windDirection?: string;
  uvIndex?: number;
  uvExposure?: 'Low' | 'Moderate' | 'High' | 'Very High';
  snowExposure?: 'None' | 'Low' | 'Moderate' | 'High';
  fogFrequency?: 'Low' | 'Moderate' | 'High';

  // Fasteners & Gaskets
  boltGrade?: string;
  gasketType?: string;
  fastenersConfirmed?: boolean;

  // External Coating
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

  // Internal Lining
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

  // Steel Pipe Specs Confirmation
  steelPipesSpecsConfirmed?: boolean;

  // Environmental Coating Profile (ECP) Additional
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

  // Coating Recommendation UI State
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
  requiredProducts: string[]; // Selected product/service types
  notes: string;
  // Location fields
  latitude?: number;
  longitude?: number;
  siteAddress?: string;
  region?: string;
  country?: string;
  // Mine selection
  mineId?: number;
  mineName?: string;
  // Document upload preference
  skipDocuments?: boolean;
  // Nix AI Assistant mode
  useNix?: boolean;
  nixPopupShown?: boolean;
  // Global specs for page 2
  globalSpecs: GlobalSpecs;
  items: PipeItem[]; // Unified array for all item types
  // Keep backward compatibility
  straightPipeEntries: StraightPipeEntry[];
}

const DEFAULT_PIPE_SPECS: Partial<CreateStraightPipeRfqDto> = {
  // nominalBoreMm: not set - user must select
  scheduleType: 'schedule',
  // scheduleNumber: not set - auto-calculated when NB is selected
  pipeEndConfiguration: 'PE', // Default to plain ended
  // individualPipeLength: not set - user must select or input
  lengthUnit: 'meters',
  quantityType: 'number_of_pipes',
  quantityValue: 1,  // Default to 1 pipe
  // workingPressureBar: uses globalSpecs from page 2
  // workingTemperatureC: uses globalSpecs from page 2
  // steelSpecificationId: uses globalSpecs from page 2
};

export const useRfqForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [rfqData, setRfqData] = useState<RfqFormData>({
    projectName: '',
    projectType: undefined, // Will be set by user selection
    description: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    requiredDate: addDaysFromNowISODate(30),
    requiredProducts: [], // Selected product/service types
    notes: '',
    globalSpecs: {},
    items: [],
    straightPipeEntries: [],
    useNix: false,
    nixPopupShown: false,
  });

  const updateRfqField = useCallback(<K extends keyof Omit<RfqFormData, 'straightPipeEntries'>>(field: K, value: RfqFormData[K]) => {
    setRfqData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const addStraightPipeEntry = useCallback((description?: string) => {
    const newEntry: StraightPipeEntry = {
      id: generateUniqueId(),
      itemType: 'straight_pipe',
      description: description || 'New Straight Pipe Item - Please configure specifications',
      specs: { ...DEFAULT_PIPE_SPECS } as CreateStraightPipeRfqDto,
      notes: '',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
      straightPipeEntries: [...prev.straightPipeEntries, newEntry],
    }));

    return newEntry.id;
  }, []);

  const addBendEntry = useCallback((description?: string) => {
    // Steel spec will be inherited from globalSpecs - user can override in the item UI
    const newEntry: BendEntry = {
      id: generateUniqueId(),
      itemType: 'bend',
      description: description || 'New Bend Item',
      specs: {
        nominalBoreMm: undefined, // Default to "Select NB"
        scheduleNumber: undefined, // Default to "Select Schedule"
        bendType: undefined, // Default to "Select Bend Type"
        bendDegrees: 90,
        numberOfTangents: 0,
        tangentLengths: [],
        numberOfStubs: 0,
        stubs: [],
        quantityValue: 1,
        quantityType: 'number_of_items',
        workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
        workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 120,
        steelSpecificationId: undefined, // Inherit from globalSpecs, can be overridden
        useGlobalFlangeSpecs: true,
      },
      notes: 'Custom bend fabrication required',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
    }));

    return newEntry.id;
  }, []);

  const addFittingEntry = useCallback((description?: string) => {
    // Inherit steel specification from global specs if available
    const steelSpecId = rfqData.globalSpecs?.steelSpecificationId || 2;
    // Derive fitting standard from steel spec: ID 8 = SABS 719 ERW
    const fittingStandard = steelSpecId === 8 ? 'SABS719' : 'SABS62';
    const newEntry: FittingEntry = {
      id: generateUniqueId(),
      itemType: 'fitting',
      description: description || 'New Fitting Item',
      specs: {
        fittingStandard: fittingStandard as 'SABS62' | 'SABS719',
        fittingType: undefined, // Default to "Select Fitting Type"
        nominalDiameterMm: undefined, // Default to "Select NB"
        pipeLengthAMm: undefined, // Will be auto-filled from API
        pipeLengthBMm: undefined, // Will be auto-filled from API
        quantityValue: 1,
        quantityType: 'number_of_items',
        workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 16,
        workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
        steelSpecificationId: undefined, // Inherit from globalSpecs, can be overridden
      },
      notes: 'Fitting with pipe sections',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
    }));

    return newEntry.id;
  }, [rfqData.globalSpecs?.steelSpecificationId, rfqData.globalSpecs?.workingPressureBar, rfqData.globalSpecs?.workingTemperatureC]);

  const addPipeSteelWorkEntry = useCallback((description?: string) => {
    const newEntry: PipeSteelWorkEntry = {
      id: generateUniqueId(),
      itemType: 'pipe_steel_work',
      description: description || 'New Pipe Steel Work Item',
      specs: {
        workType: 'pipe_support',
        nominalDiameterMm: undefined,
        bracketType: 'clevis_hanger',
        quantity: 1,
        workingPressureBar: rfqData.globalSpecs?.workingPressureBar || 10,
        workingTemperatureC: rfqData.globalSpecs?.workingTemperatureC || 20,
      },
      notes: '',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
    }));

    return newEntry.id;
  }, [rfqData.globalSpecs?.workingPressureBar, rfqData.globalSpecs?.workingTemperatureC]);

  const addItem = useCallback((itemType: 'straight_pipe' | 'bend' | 'fitting' | 'pipe_steel_work', description?: string) => {
    if (itemType === 'straight_pipe') {
      return addStraightPipeEntry(description);
    } else if (itemType === 'bend') {
      return addBendEntry(description);
    } else if (itemType === 'fitting') {
      return addFittingEntry(description);
    } else {
      return addPipeSteelWorkEntry(description);
    }
  }, [addStraightPipeEntry, addBendEntry, addFittingEntry, addPipeSteelWorkEntry]);

  const updateStraightPipeEntry = useCallback((
    id: string,
    updates: Partial<Omit<StraightPipeEntry, 'id'>>
  ) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== id || item.itemType !== 'straight_pipe') return item;
        // Deep merge specs to avoid losing existing spec fields
        const mergedSpecs = updates.specs
          ? { ...item.specs, ...updates.specs }
          : item.specs;
        return { ...item, ...updates, specs: mergedSpecs };
      }),
      straightPipeEntries: prev.straightPipeEntries.map(entry => {
        if (entry.id !== id) return entry;
        // Deep merge specs to avoid losing existing spec fields
        const mergedSpecs = updates.specs
          ? { ...entry.specs, ...updates.specs }
          : entry.specs;
        return { ...entry, ...updates, specs: mergedSpecs };
      }),
    }));
  }, []);

  const updateItem = useCallback((
    id: string,
    updates: Partial<Omit<PipeItem, 'id' | 'itemType'>>
  ) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== id) return item;
        // Deep merge specs to avoid losing existing spec fields
        const mergedSpecs = updates.specs
          ? { ...item.specs, ...updates.specs }
          : item.specs;
        return { ...item, ...updates, specs: mergedSpecs } as PipeItem;
      }),
    }));
  }, []);

  const removeStraightPipeEntry = useCallback((id: string) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      straightPipeEntries: prev.straightPipeEntries.filter(entry => entry.id !== id),
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      straightPipeEntries: prev.straightPipeEntries.filter(entry => entry.id !== id),
    }));
  }, []);

  const updateEntryCalculation = useCallback((id: string, calculation: StraightPipeCalculationResult) => {
    updateStraightPipeEntry(id, { calculation });
  }, [updateStraightPipeEntry]);

  const getTotalWeight = useCallback(() => {
    return rfqData.straightPipeEntries.reduce((total, entry) => {
      return total + (entry.calculation?.totalPipeWeight || 0);
    }, 0);
  }, [rfqData.straightPipeEntries]);

  const getTotalValue = useCallback(() => {
    return rfqData.straightPipeEntries.reduce((total, entry) => {
      return total + (entry.calculation?.calculatedTotalLength || 0);
    }, 0);
  }, [rfqData.straightPipeEntries]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const updateGlobalSpecs = useCallback((specs: GlobalSpecs) => {
    setRfqData(prev => ({
      ...prev,
      globalSpecs: specs,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setRfqData({
      projectName: '',
      description: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      requiredDate: '',
      requiredProducts: [],
      notes: '',
      globalSpecs: {},
      items: [],
      straightPipeEntries: [],
    });
  }, []);

  // Bulk restore from draft - sets all fields at once to avoid React batching issues
  const restoreFromDraft = useCallback((draft: {
    formData?: Record<string, any>;
    globalSpecs?: GlobalSpecs;
    requiredProducts?: string[];
    straightPipeEntries?: any[];
    currentStep?: number;
  }) => {
    log.debug('🔄 restoreFromDraft called');
    log.debug('🔄 Draft input:', JSON.stringify(draft, null, 2));
    log.debug('🔄 formData:', JSON.stringify(draft.formData, null, 2));
    log.debug('🔄 requiredProducts:', draft.requiredProducts);
    log.debug('🔄 globalSpecs keys:', draft.globalSpecs ? Object.keys(draft.globalSpecs) : 'none');

    const formData = draft.formData || {};

    // Build the restored state directly (not in setRfqData callback for better logging)
    const restored: RfqFormData = {
      // Start with defaults
      projectName: formData.projectName ?? '',
      projectType: formData.projectType,
      description: formData.description ?? '',
      customerName: formData.customerName ?? '',
      customerEmail: formData.customerEmail ?? '',
      customerPhone: formData.customerPhone ?? '',
      requiredDate: formData.requiredDate ?? addDaysFromNowISODate(30),
      requiredProducts: draft.requiredProducts ?? [],
      notes: formData.notes ?? '',

      // Location fields - convert string numbers to numbers if needed
      latitude: formData.latitude !== undefined ? Number(formData.latitude) : undefined,
      longitude: formData.longitude !== undefined ? Number(formData.longitude) : undefined,
      siteAddress: formData.siteAddress,
      region: formData.region,
      country: formData.country,

      // Mine selection
      mineId: formData.mineId,
      mineName: formData.mineName,

      // Document upload preference
      skipDocuments: formData.skipDocuments,

      // Nix AI Assistant mode
      useNix: formData.useNix ?? false,
      nixPopupShown: formData.nixPopupShown ?? false,

      // Restore globalSpecs
      globalSpecs: draft.globalSpecs ?? {},

      // Restore items/entries
      items: draft.straightPipeEntries ?? [],
      straightPipeEntries: (draft.straightPipeEntries ?? []).filter((e: any) => e.itemType === 'straight_pipe' || !e.itemType),
    };

    log.debug('📦 Restored RfqFormData:', JSON.stringify(restored, null, 2));
    log.debug('📦 Restored projectType:', restored.projectType);
    log.debug('📦 Restored requiredProducts:', restored.requiredProducts);
    log.debug('📦 Restored globalSpecs.soilTexture:', restored.globalSpecs?.soilTexture);

    // Set the state
    setRfqData(restored);

    // Set the step after form data is restored
    if (draft.currentStep) {
      log.debug('📦 Setting currentStep to:', draft.currentStep);
      setCurrentStep(draft.currentStep);
    }

    log.debug('✅ restoreFromDraft complete');
  }, []);

  const duplicateItem = useCallback((entryToDuplicate: PipeItem, insertAfterIndex?: number) => {
    const newId = generateUniqueId();
    const baseItemNumber = entryToDuplicate.clientItemNumber || '';
    const existingNumbers = rfqData.items.map(e => e.clientItemNumber || '');

    let newItemNumber = '';
    if (baseItemNumber) {
      const numericMatch = baseItemNumber.match(/^(.+?)(\d+)$/);
      if (numericMatch) {
        const prefix = numericMatch[1];
        const currentNum = parseInt(numericMatch[2], 10);
        const numLength = numericMatch[2].length;
        let nextNum = currentNum + 1;
        newItemNumber = `${prefix}${String(nextNum).padStart(numLength, '0')}`;
        while (existingNumbers.includes(newItemNumber)) {
          nextNum++;
          newItemNumber = `${prefix}${String(nextNum).padStart(numLength, '0')}`;
        }
      } else {
        newItemNumber = `${baseItemNumber}-copy`;
        let copyIndex = 1;
        while (existingNumbers.includes(newItemNumber)) {
          copyIndex++;
          newItemNumber = `${baseItemNumber}-copy${copyIndex}`;
        }
      }
    }

    const duplicatedEntry = {
      ...entryToDuplicate,
      id: newId,
      clientItemNumber: newItemNumber || undefined,
      useSequentialNumbering: false,
    };

    setRfqData(prev => {
      const newItems = [...prev.items];
      const insertIndex = insertAfterIndex !== undefined ? insertAfterIndex + 1 : newItems.length;
      newItems.splice(insertIndex, 0, duplicatedEntry);

      if (entryToDuplicate.itemType === 'straight_pipe') {
        const newStraightPipeEntries = [...prev.straightPipeEntries];
        const straightPipeIndex = prev.straightPipeEntries.findIndex(e => e.id === entryToDuplicate.id);
        const insertStraightPipeIndex = straightPipeIndex !== -1 ? straightPipeIndex + 1 : newStraightPipeEntries.length;
        newStraightPipeEntries.splice(insertStraightPipeIndex, 0, duplicatedEntry as StraightPipeEntry);
        return { ...prev, items: newItems, straightPipeEntries: newStraightPipeEntries };
      }

      return { ...prev, items: newItems };
    });

    return newId;
  }, [rfqData.items]);

  return {
    currentStep,
    setCurrentStep,
    rfqData,
    updateRfqField,
    updateGlobalSpecs,
    // Legacy methods for backward compatibility
    addStraightPipeEntry,
    updateStraightPipeEntry,
    removeStraightPipeEntry,
    updateEntryCalculation,
    // New unified methods
    addItem,
    addBendEntry,
    addFittingEntry,
    addPipeSteelWorkEntry,
    updateItem,
    removeItem,
    duplicateItem,
    getTotalWeight,
    getTotalValue,
    nextStep,
    prevStep,
    resetForm,
    restoreFromDraft,
  };
};
