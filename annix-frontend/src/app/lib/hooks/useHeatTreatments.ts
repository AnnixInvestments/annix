'use client';

import { useState, useEffect, useCallback } from 'react';
import { pipeSteelWorkApi } from '@/app/lib/pipe-steel-work/api';
import type { HeatTreatment, HeatTreatmentRequirementRequest, HeatTreatmentRequirementResponse } from '@/app/lib/pipe-steel-work/types';
import { log } from '@/app/lib/logger';

const FALLBACK_HEAT_TREATMENTS: HeatTreatment[] = [
  {
    code: 'PWHT-CS',
    name: 'PWHT - Carbon Steel',
    type: 'pwht',
    description: 'Post Weld Heat Treatment for carbon steel per ASME B31.3',
    tempRangeLowC: 595,
    tempRangeHighC: 650,
    holdTimeFormula: '1 hour per 25mm, minimum 1 hour',
    heatingRateMaxCPerHr: 220,
    coolingRateMaxCPerHr: 280,
    applicableMaterials: ['CS', 'A106', 'A105', 'A234'],
    codeReferences: ['ASME B31.3', 'ASME VIII Div 1'],
    baseCostPerKg: 8.5,
  },
  {
    code: 'PWHT-LACS',
    name: 'PWHT - Low Alloy Steel',
    type: 'pwht',
    description: 'Post Weld Heat Treatment for Cr-Mo alloy steels',
    tempRangeLowC: 675,
    tempRangeHighC: 705,
    holdTimeFormula: '2 hours per 25mm, minimum 2 hours',
    heatingRateMaxCPerHr: 165,
    coolingRateMaxCPerHr: 165,
    applicableMaterials: ['P11', 'P22', 'P5', 'P9', 'A335'],
    codeReferences: ['ASME B31.3', 'ASME VIII Div 1', 'API 582'],
    baseCostPerKg: 12.0,
  },
  {
    code: 'SA-SS',
    name: 'Solution Annealing - Stainless',
    type: 'solution_annealing',
    description: 'Solution annealing for austenitic stainless steels',
    tempRangeLowC: 1040,
    tempRangeHighC: 1120,
    holdTimeFormula: '3 minutes per mm, minimum 30 minutes',
    heatingRateMaxCPerHr: 400,
    coolingRateMaxCPerHr: 999,
    applicableMaterials: ['SS304', 'SS316', 'SS321', 'SS347', 'A312', 'A403'],
    codeReferences: ['ASTM A380', 'NACE MR0175'],
    baseCostPerKg: 15.0,
  },
];

export interface UseHeatTreatmentsReturn {
  treatments: HeatTreatment[];
  isLoading: boolean;
  error: string | null;
  treatmentByCode: (code: string) => HeatTreatment | null;
  treatmentsByType: (type: string) => HeatTreatment[];
  checkRequirement: (request: HeatTreatmentRequirementRequest) => Promise<HeatTreatmentRequirementResponse | null>;
  isCheckingRequirement: boolean;
  refetch: () => void;
}

export function useHeatTreatments(): UseHeatTreatmentsReturn {
  const [treatments, setTreatments] = useState<HeatTreatment[]>(FALLBACK_HEAT_TREATMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRequirement, setIsCheckingRequirement] = useState(false);

  const fetchTreatments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiTreatments = await pipeSteelWorkApi.heatTreatments();

      if (apiTreatments && apiTreatments.length > 0) {
        setTreatments(apiTreatments);
        log.debug(`Loaded ${apiTreatments.length} heat treatments from API`);
      } else {
        log.debug('No heat treatments from API, using fallback');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load heat treatments';
      log.warn('Failed to fetch heat treatments from API, using fallback:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const treatmentByCode = useCallback((code: string): HeatTreatment | null => {
    return treatments.find((t) => t.code === code) || null;
  }, [treatments]);

  const treatmentsByType = useCallback((type: string): HeatTreatment[] => {
    return treatments.filter((t) => t.type === type);
  }, [treatments]);

  const checkRequirement = useCallback(async (request: HeatTreatmentRequirementRequest): Promise<HeatTreatmentRequirementResponse | null> => {
    setIsCheckingRequirement(true);
    try {
      const response = await pipeSteelWorkApi.heatTreatmentRequirement(request);
      return response;
    } catch (err) {
      log.warn('Heat treatment requirement check failed:', err);
      return null;
    } finally {
      setIsCheckingRequirement(false);
    }
  }, []);

  return {
    treatments,
    isLoading,
    error,
    treatmentByCode,
    treatmentsByType,
    checkRequirement,
    isCheckingRequirement,
    refetch: fetchTreatments,
  };
}
