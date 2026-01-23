'use client';

import { useState, useEffect, useCallback } from 'react';
import { pipeSteelWorkApi } from './api';
import type {
  SupportSpacingResponse,
  BracketTypeResponse,
  BracketDimensionResponse,
  CalculationResponse,
} from './types';

interface UsePipeSteelWorkCalculationsProps {
  workType: string;
  nominalDiameterMm: number | null;
  bracketType: string;
  pipelineLengthM: number | null;
  branchDiameterMm: number | null;
  quantity: number;
}

interface UsePipeSteelWorkCalculationsResult {
  supportSpacing: SupportSpacingResponse | null;
  bracketTypes: BracketTypeResponse[];
  bracketDimensions: BracketDimensionResponse | null;
  calculationResults: CalculationResponse | null;
  isLoading: boolean;
  error: string | null;
}

const NB_TO_OD_MAP: Record<number, number> = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3,
  50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3,
  150: 168.3, 200: 219.1, 250: 273.1, 300: 323.9,
  350: 355.6, 400: 406.4, 450: 457.0, 500: 508.0,
  600: 610.0, 750: 762.0, 900: 914.0,
};

const estimateWallThickness = (nbMm: number): number => {
  const stdWalls: Record<number, number> = {
    50: 3.91, 80: 5.49, 100: 6.02, 150: 7.11, 200: 8.18,
    250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 500: 9.53, 600: 9.53,
  };
  return stdWalls[nbMm] || 6.0;
};

export function usePipeSteelWorkCalculations({
  workType,
  nominalDiameterMm,
  bracketType,
  pipelineLengthM,
  branchDiameterMm,
  quantity,
}: UsePipeSteelWorkCalculationsProps): UsePipeSteelWorkCalculationsResult {
  const [supportSpacing, setSupportSpacing] = useState<SupportSpacingResponse | null>(null);
  const [bracketTypes, setBracketTypes] = useState<BracketTypeResponse[]>([]);
  const [bracketDimensions, setBracketDimensions] = useState<BracketDimensionResponse | null>(null);
  const [calculationResults, setCalculationResults] = useState<CalculationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBracketTypes = useCallback(async () => {
    try {
      const types = await pipeSteelWorkApi.bracketTypes(nominalDiameterMm || undefined);
      setBracketTypes(types);
    } catch (err) {
      console.error('Failed to fetch bracket types:', err);
      setBracketTypes([
        { typeCode: 'clevis_hanger', displayName: 'Clevis Hanger', isSuitable: true, allowsExpansion: true, isAnchorType: false, baseCostPerUnit: 150 },
        { typeCode: 'three_bolt_clamp', displayName: 'Three-Bolt Clamp', isSuitable: true, allowsExpansion: false, isAnchorType: false, baseCostPerUnit: 250 },
        { typeCode: 'welded_bracket', displayName: 'Welded Bracket', isSuitable: true, allowsExpansion: false, isAnchorType: true, baseCostPerUnit: 180 },
        { typeCode: 'pipe_saddle', displayName: 'Pipe Saddle', isSuitable: true, allowsExpansion: true, isAnchorType: false, baseCostPerUnit: 280 },
        { typeCode: 'u_bolt', displayName: 'U-Bolt Clamp', isSuitable: true, allowsExpansion: false, isAnchorType: false, baseCostPerUnit: 80 },
        { typeCode: 'roller_support', displayName: 'Roller Support', isSuitable: true, allowsExpansion: true, isAnchorType: false, baseCostPerUnit: 450 },
        { typeCode: 'slide_plate', displayName: 'Slide Plate', isSuitable: true, allowsExpansion: true, isAnchorType: false, baseCostPerUnit: 350 },
        { typeCode: 'spring_hanger', displayName: 'Spring Hanger', isSuitable: true, allowsExpansion: true, isAnchorType: false, baseCostPerUnit: 650 },
        { typeCode: 'riser_clamp', displayName: 'Riser Clamp', isSuitable: true, allowsExpansion: false, isAnchorType: false, baseCostPerUnit: 200 },
      ]);
    }
  }, [nominalDiameterMm]);

  const fetchSupportSpacing = useCallback(async () => {
    if (!nominalDiameterMm) {
      setSupportSpacing(null);
      return;
    }

    try {
      const spacing = await pipeSteelWorkApi.supportSpacing({
        nominalDiameterMm,
        isWaterFilled: true,
      });
      setSupportSpacing(spacing);
    } catch (err) {
      console.error('Failed to fetch support spacing:', err);
      setSupportSpacing(null);
    }
  }, [nominalDiameterMm]);

  const fetchBracketDimensions = useCallback(async () => {
    if (!bracketType || !nominalDiameterMm) {
      setBracketDimensions(null);
      return;
    }

    try {
      const dimensions = await pipeSteelWorkApi.bracketDimensions(
        bracketType.toUpperCase(),
        nominalDiameterMm
      );
      if (Array.isArray(dimensions)) {
        setBracketDimensions(dimensions[0] || null);
      } else {
        setBracketDimensions(dimensions);
      }
    } catch (err) {
      console.error('Failed to fetch bracket dimensions:', err);
      setBracketDimensions(null);
    }
  }, [bracketType, nominalDiameterMm]);

  const performCalculation = useCallback(async () => {
    if (!nominalDiameterMm) {
      setCalculationResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (workType === 'pipe_support' && pipelineLengthM) {
        const result = await pipeSteelWorkApi.calculate({
          workType: 'pipe_support',
          nominalDiameterMm,
          bracketType,
          pipelineLengthM,
          quantity,
        });
        setCalculationResults(result);
      } else if (workType === 'reinforcement_pad' && branchDiameterMm) {
        const headerOd = NB_TO_OD_MAP[nominalDiameterMm] || nominalDiameterMm * 1.05;
        const branchOd = NB_TO_OD_MAP[branchDiameterMm] || branchDiameterMm * 1.05;

        const padResult = await pipeSteelWorkApi.reinforcementPad({
          headerOdMm: headerOd,
          headerWallMm: estimateWallThickness(nominalDiameterMm),
          branchOdMm: branchOd,
          branchWallMm: estimateWallThickness(branchDiameterMm),
        });

        setCalculationResults({
          workType: 'reinforcement_pad',
          reinforcementPad: padResult,
          weightPerUnitKg: padResult.padWeightKg,
          totalWeightKg: padResult.padWeightKg * quantity,
          unitCost: Math.round(padResult.padWeightKg * 25 * 2.5),
          totalCost: Math.round(padResult.padWeightKg * 25 * 2.5 * quantity),
          notes: padResult.notes,
        });
      }
    } catch (err) {
      console.error('Failed to perform calculation:', err);
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setIsLoading(false);
    }
  }, [workType, nominalDiameterMm, bracketType, pipelineLengthM, branchDiameterMm, quantity]);

  useEffect(() => {
    fetchBracketTypes();
  }, [fetchBracketTypes]);

  useEffect(() => {
    if (workType === 'pipe_support') {
      fetchSupportSpacing();
      fetchBracketDimensions();
    }
  }, [workType, fetchSupportSpacing, fetchBracketDimensions]);

  useEffect(() => {
    performCalculation();
  }, [performCalculation]);

  return {
    supportSpacing,
    bracketTypes,
    bracketDimensions,
    calculationResults,
    isLoading,
    error,
  };
}
