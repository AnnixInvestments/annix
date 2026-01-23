'use client';

import { useState, useEffect, useCallback } from 'react';
import { pipeSteelWorkApi } from '@/app/lib/pipe-steel-work/api';
import type { GasketMaterial, GasketCompatibilityRequest, GasketCompatibilityResponse } from '@/app/lib/pipe-steel-work/types';
import { log } from '@/app/lib/logger';

const FALLBACK_GASKET_MATERIALS: GasketMaterial[] = [
  {
    code: 'SW-CGF',
    name: 'Spiral Wound - CGF',
    type: 'spiral_wound',
    minTempC: -196,
    maxTempC: 450,
    maxPressureBar: 150,
    compatibleFlanges: ['RF', 'RTJ'],
    compatibleServices: ['steam', 'hydrocarbons', 'chemicals', 'general'],
  },
  {
    code: 'SW-PTFE',
    name: 'Spiral Wound - PTFE',
    type: 'spiral_wound',
    minTempC: -200,
    maxTempC: 260,
    maxPressureBar: 150,
    compatibleFlanges: ['RF'],
    compatibleServices: ['chemicals', 'corrosive', 'food_grade'],
  },
  {
    code: 'RTJ-R',
    name: 'Ring Type Joint',
    type: 'ring_joint',
    minTempC: -200,
    maxTempC: 650,
    maxPressureBar: 700,
    compatibleFlanges: ['RTJ'],
    compatibleServices: ['high_pressure', 'steam', 'hydrocarbons'],
  },
  {
    code: 'PTFE-VIRGIN',
    name: 'Virgin PTFE Sheet',
    type: 'ptfe',
    minTempC: -200,
    maxTempC: 260,
    maxPressureBar: 40,
    compatibleFlanges: ['FF', 'RF'],
    compatibleServices: ['chemicals', 'corrosive', 'food_grade', 'water'],
  },
  {
    code: 'GRAPHITE-FLEX',
    name: 'Flexible Graphite',
    type: 'graphite',
    minTempC: -200,
    maxTempC: 550,
    maxPressureBar: 100,
    compatibleFlanges: ['RF', 'FF'],
    compatibleServices: ['steam', 'high_temp', 'chemicals'],
  },
];

export interface UseGasketMaterialsReturn {
  materials: GasketMaterial[];
  isLoading: boolean;
  error: string | null;
  materialByCode: (code: string) => GasketMaterial | null;
  materialsByType: (type: string) => GasketMaterial[];
  checkCompatibility: (request: GasketCompatibilityRequest) => Promise<GasketCompatibilityResponse | null>;
  isCheckingCompatibility: boolean;
  refetch: () => void;
}

export function useGasketMaterials(): UseGasketMaterialsReturn {
  const [materials, setMaterials] = useState<GasketMaterial[]>(FALLBACK_GASKET_MATERIALS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingCompatibility, setIsCheckingCompatibility] = useState(false);

  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiMaterials = await pipeSteelWorkApi.gasketMaterials();

      if (apiMaterials && apiMaterials.length > 0) {
        setMaterials(apiMaterials);
        log.debug(`Loaded ${apiMaterials.length} gasket materials from API`);
      } else {
        log.debug('No gasket materials from API, using fallback');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gasket materials';
      log.warn('Failed to fetch gasket materials from API, using fallback:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const materialByCode = useCallback((code: string): GasketMaterial | null => {
    return materials.find((m) => m.code === code) || null;
  }, [materials]);

  const materialsByType = useCallback((type: string): GasketMaterial[] => {
    return materials.filter((m) => m.type === type);
  }, [materials]);

  const checkCompatibility = useCallback(async (request: GasketCompatibilityRequest): Promise<GasketCompatibilityResponse | null> => {
    setIsCheckingCompatibility(true);
    try {
      const response = await pipeSteelWorkApi.gasketCompatibility(request);
      return response;
    } catch (err) {
      log.warn('Gasket compatibility check failed:', err);
      return null;
    } finally {
      setIsCheckingCompatibility(false);
    }
  }, []);

  return {
    materials,
    isLoading,
    error,
    materialByCode,
    materialsByType,
    checkCompatibility,
    isCheckingCompatibility,
    refetch: fetchMaterials,
  };
}
