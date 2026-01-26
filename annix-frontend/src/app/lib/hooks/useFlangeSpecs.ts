'use client';

import { useCallback } from 'react';
import { masterDataApi, FlangeDimensionLookup } from '@/app/lib/api/client';
import { log } from '@/app/lib/logger';

export interface FlangeSpecData {
  flangeOdMm: number;
  flangeBoreMm: number;
  flangeThicknessMm: number;
  flangeFaceMm: number;
  flangeNumHoles: number;
  flangePcdMm: number;
  flangeBoltHoleDiameterMm: number;
  flangeMassKg: number;
  boltDiameterMm?: number;
  boltThreadPitch?: number;
  boltLengthMm?: number;
  boltMassKg?: number;
}

export interface UseFlangeSpecsReturn {
  lookupFlangeSpecs: (
    nominalBoreMm: number,
    flangeStandardId: number,
    flangePressureClassId: number,
    flangeTypeId?: number
  ) => Promise<FlangeSpecData | null>;
}

export function useFlangeSpecs(): UseFlangeSpecsReturn {
  const lookupFlangeSpecs = useCallback(
    async (
      nominalBoreMm: number,
      flangeStandardId: number,
      flangePressureClassId: number,
      flangeTypeId?: number
    ): Promise<FlangeSpecData | null> => {
      if (!nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
        return null;
      }

      try {
        log.debug(
          `Looking up flange specs: NB=${nominalBoreMm}mm, standard=${flangeStandardId}, class=${flangePressureClassId}, type=${flangeTypeId}`
        );

        const result = await masterDataApi.lookupFlangeDimension(
          nominalBoreMm,
          flangeStandardId,
          flangePressureClassId,
          flangeTypeId
        );

        if (!result) {
          log.debug('No flange dimension found for given specs');
          return null;
        }

        const flangeData: FlangeSpecData = {
          flangeOdMm: result.D,
          flangeBoreMm: result.d4,
          flangeThicknessMm: result.b,
          flangeFaceMm: result.f,
          flangeNumHoles: result.num_holes,
          flangePcdMm: result.pcd,
          flangeBoltHoleDiameterMm: result.d1,
          flangeMassKg: result.mass_kg,
        };

        if (result.bolt) {
          flangeData.boltDiameterMm = result.bolt.diameter_mm;
          flangeData.boltThreadPitch = result.bolt.thread_pitch;
          flangeData.boltLengthMm = result.bolt.length_mm;
          flangeData.boltMassKg = result.bolt.mass_kg;
        }

        log.debug('Flange specs lookup result:', flangeData);
        return flangeData;
      } catch (error) {
        log.error('Failed to lookup flange specs:', error);
        return null;
      }
    },
    []
  );

  return { lookupFlangeSpecs };
}

export async function fetchFlangeSpecsStatic(
  nominalBoreMm: number,
  flangeStandardId: number,
  flangePressureClassId: number,
  flangeTypeId?: number
): Promise<FlangeSpecData | null> {
  if (!nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
    log.debug('fetchFlangeSpecsStatic: missing required params', { nominalBoreMm, flangeStandardId, flangePressureClassId });
    return null;
  }

  try {
    log.debug('fetchFlangeSpecsStatic: looking up', { nominalBoreMm, flangeStandardId, flangePressureClassId, flangeTypeId });
    const result = await masterDataApi.lookupFlangeDimension(
      nominalBoreMm,
      flangeStandardId,
      flangePressureClassId,
      flangeTypeId
    );

    if (!result) {
      log.debug('fetchFlangeSpecsStatic: no result from API');
      return null;
    }

    const flangeData: FlangeSpecData = {
      flangeOdMm: result.D,
      flangeBoreMm: result.d4,
      flangeThicknessMm: result.b,
      flangeFaceMm: result.f,
      flangeNumHoles: result.num_holes,
      flangePcdMm: result.pcd,
      flangeBoltHoleDiameterMm: result.d1,
      flangeMassKg: result.mass_kg,
    };

    if (result.bolt) {
      flangeData.boltDiameterMm = result.bolt.diameter_mm;
      flangeData.boltThreadPitch = result.bolt.thread_pitch;
      flangeData.boltLengthMm = result.bolt.length_mm;
      flangeData.boltMassKg = result.bolt.mass_kg;
    }

    log.debug('fetchFlangeSpecsStatic: success', flangeData);
    return flangeData;
  } catch (error) {
    log.error('fetchFlangeSpecsStatic: API error', error);
    return null;
  }
}
