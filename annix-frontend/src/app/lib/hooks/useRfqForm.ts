'use client';

import { useState, useCallback } from 'react';
import { CreateStraightPipeRfqDto, StraightPipeCalculationResult } from '@/app/lib/api/client';
import type { AirSaltContentResult, TimeOfWetnessResult, FloodRiskLevel } from '../services/environmentalIntelligence';

export interface StraightPipeEntry {
  id: string;
  itemType: 'straight_pipe';
  description: string;
  clientItemNumber?: string;
  specs: CreateStraightPipeRfqDto;
  calculation?: StraightPipeCalculationResult;
  calculatedPipes?: number;
  notes?: string;
  // Schedule override tracking
  isScheduleOverridden?: boolean;
  minimumSchedule?: string;
  minimumWallThickness?: number;
  availableUpgrades?: any[];
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
  specs: {
    nominalBoreMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    bendType?: string; // '1.5D', '2D', '3D', '5D'
    bendDegrees?: number; // 11.25, 22.5, 30, 45, 60, 90
    numberOfTangents?: number; // 0, 1, 2
    tangentLengths?: number[]; // Array for tangent lengths
    numberOfStubs?: number; // 0, 1, 2
    stubs?: BendStub[]; // Array for stub specifications
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
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
    quantityValue: number;
    quantityType: 'number_of_items';
    workingPressureBar?: number;
    workingTemperatureC?: number;
  };
  calculation?: any;
  notes?: string;
}

export type PipeItem = StraightPipeEntry | BendEntry | FittingEntry;

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
  globalSpecs: GlobalSpecs;
  items: PipeItem[]; // Unified array for all item types
  // Keep backward compatibility
  straightPipeEntries: StraightPipeEntry[];
}

const DEFAULT_PIPE_SPECS: CreateStraightPipeRfqDto = {
  nominalBoreMm: 100,  // Changed to smaller, more common size
  scheduleType: 'schedule',
  scheduleNumber: '40',  // Fixed to use database format
  pipeEndConfiguration: 'PE', // Default to plain ended
  individualPipeLength: 12.192,
  lengthUnit: 'meters',
  quantityType: 'total_length',
  quantityValue: 1000,  // Changed to smaller test value
  workingPressureBar: 10,
  workingTemperatureC: 20,  // Changed to room temperature default
  steelSpecificationId: 2,  // ASTM A106 Grade B - matches 100NB Sch40 in database
};

export const useRfqForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [rfqData, setRfqData] = useState<RfqFormData>({
    projectName: '500NB Pipeline Extension Project',
    projectType: undefined, // Will be set by user selection
    description: 'Extension of existing pipeline system with carbon steel pipe',
    customerName: 'Acme Industrial Solutions',
    customerEmail: 'procurement@acme-industrial.co.za',
    customerPhone: '+27 11 555 0123',
    requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiredProducts: [], // Selected product/service types
    notes: 'Urgent delivery required by month end',
    globalSpecs: {},
    items: [],
    straightPipeEntries: [],
  });

  const updateRfqField = useCallback((field: keyof Omit<RfqFormData, 'straightPipeEntries'>, value: string) => {
    setRfqData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const addStraightPipeEntry = useCallback((description?: string) => {
    const newEntry: StraightPipeEntry = {
      id: Date.now().toString(),
      itemType: 'straight_pipe',
      description: description || `${DEFAULT_PIPE_SPECS.nominalBoreMm}NB ${DEFAULT_PIPE_SPECS.scheduleNumber} Straight Pipe for ${DEFAULT_PIPE_SPECS.workingPressureBar} Bar Pipeline`,
      specs: { ...DEFAULT_PIPE_SPECS },
      notes: 'All pipes to be hydrostatically tested before delivery',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
      straightPipeEntries: [...prev.straightPipeEntries, newEntry],
    }));

    return newEntry.id;
  }, []);

  const addBendEntry = useCallback((description?: string) => {
    const newEntry: BendEntry = {
      id: Date.now().toString(),
      itemType: 'bend',
      description: description || '40NB 90° 1.5D Bend',
      specs: {
        nominalBoreMm: 40,
        scheduleNumber: '40',
        bendType: '1.5D',
        bendDegrees: 90,
        numberOfTangents: 0,
        tangentLengths: [],
        numberOfStubs: 0,
        stubs: [],
        quantityValue: 1,
        quantityType: 'number_of_items',
        workingPressureBar: 16,
        workingTemperatureC: 120,
        steelSpecificationId: 2,
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
    const newEntry: FittingEntry = {
      id: Date.now().toString(),
      itemType: 'fitting',
      description: description || '100NB Equal Tee Fitting',
      specs: {
        fittingStandard: 'SABS62',
        fittingType: 'EQUAL_TEE',
        nominalDiameterMm: 100,
        pipeLengthAMm: 1000,
        pipeLengthBMm: 1000,
        quantityValue: 1,
        quantityType: 'number_of_items',
        workingPressureBar: 16,
        workingTemperatureC: 20,
        steelSpecificationId: 2,
      },
      notes: 'Fitting with pipe sections',
    };

    setRfqData(prev => ({
      ...prev,
      items: [...prev.items, newEntry],
    }));

    return newEntry.id;
  }, []);

  const addItem = useCallback((itemType: 'straight_pipe' | 'bend' | 'fitting', description?: string) => {
    if (itemType === 'straight_pipe') {
      return addStraightPipeEntry(description);
    } else if (itemType === 'bend') {
      return addBendEntry(description);
    } else {
      return addFittingEntry(description);
    }
  }, [addStraightPipeEntry, addBendEntry, addFittingEntry]);

  const updateStraightPipeEntry = useCallback((
    id: string, 
    updates: Partial<Omit<StraightPipeEntry, 'id'>>
  ) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id && item.itemType === 'straight_pipe' ? { ...item, ...updates } : item
      ),
      straightPipeEntries: prev.straightPipeEntries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));
  }, []);

  const updateItem = useCallback((
    id: string,
    updates: Partial<Omit<PipeItem, 'id' | 'itemType'>>
  ) => {
    setRfqData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, ...updates } as PipeItem : item
      ),
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
    updateItem,
    removeItem,
    getTotalWeight,
    getTotalValue,
    nextStep,
    prevStep,
    resetForm,
  };
};