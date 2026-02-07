"use client";

import { useCallback } from "react";
import { flangeWeightApi } from "@/app/lib/api/client";
import {
  ASME_B16_5_FLANGE_TYPES,
  ASME_B16_47_SERIES_A_FLANGE_TYPES,
  ASME_B16_47_SERIES_B_FLANGE_TYPES,
  BLANK_FLANGE_WEIGHT,
  BNW_SET_WEIGHT_PER_HOLE,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BS_10_FLANGE_TYPES,
  BS_4504_FLANGE_TYPES,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  GASKET_WEIGHTS,
  blankFlangeSurfaceArea as hardcodedBlankFlangeSurfaceArea,
  blankFlangeWeight as hardcodedBlankFlangeWeight,
  bnwSetInfo as hardcodedBnwSetInfo,
  boltHolesPerFlange as hardcodedBoltHolesPerFlange,
  flangeWeight as hardcodedFlangeWeight,
  gasketWeight as hardcodedGasketWeight,
  retainingRingWeight as hardcodedRetainingRingWeight,
  sansBlankFlangeWeight as hardcodedSansBlankFlangeWeight,
  NB_TO_FLANGE_WEIGHT_LOOKUP,
  NB_TO_OD_LOOKUP,
  SABS_1123_FLANGE_TYPES,
} from "@/app/lib/config/rfq/flangeWeights";
import { log } from "@/app/lib/logger";

export {
  NB_TO_OD_LOOKUP,
  SABS_1123_FLANGE_TYPES,
  BS_4504_FLANGE_TYPES,
  ASME_B16_5_FLANGE_TYPES,
  BS_10_FLANGE_TYPES,
  ASME_B16_47_SERIES_A_FLANGE_TYPES,
  ASME_B16_47_SERIES_B_FLANGE_TYPES,
  BLANK_FLANGE_WEIGHT,
  FLANGE_WEIGHT_BY_PRESSURE_CLASS,
  NB_TO_FLANGE_WEIGHT_LOOKUP,
  BOLT_HOLES_BY_NB_AND_PRESSURE,
  BNW_SET_WEIGHT_PER_HOLE,
  GASKET_WEIGHTS,
};

export const flangeWeightSync = hardcodedFlangeWeight;
export const blankFlangeWeightSync = hardcodedBlankFlangeWeight;
export const sansBlankFlangeWeightSync = hardcodedSansBlankFlangeWeight;
export const bnwSetInfoSync = hardcodedBnwSetInfo;
export const retainingRingWeightSync = hardcodedRetainingRingWeight;
export const gasketWeightSync = hardcodedGasketWeight;
export const blankFlangeSurfaceAreaSync = hardcodedBlankFlangeSurfaceArea;
export const boltHolesPerFlangeSync = hardcodedBoltHolesPerFlange;

export interface UseFlangeWeightsReturn {
  flangeWeight: (
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ) => Promise<number>;
  blankFlangeWeight: (nominalBoreMm: number, pressureClass: string) => Promise<number>;
  bnwSetInfo: (
    nominalBoreMm: number,
    pressureClass: string,
  ) => Promise<{
    boltSize: string;
    weightPerHoleKg: number;
    numHoles: number;
    totalWeightKg: number;
  }>;
  retainingRingWeight: (nominalBoreMm: number) => Promise<number>;
  nbToOd: (nominalBoreMm: number) => Promise<number>;
}

export function useFlangeWeights(): UseFlangeWeightsReturn {
  const flangeWeight = useCallback(
    async (
      nominalBoreMm: number,
      pressureClass: string,
      flangeStandardCode: string | null,
      flangeTypeCode: string,
    ): Promise<number> => {
      try {
        const result = await flangeWeightApi.flangeTypeWeight(
          nominalBoreMm,
          pressureClass,
          flangeStandardCode,
          flangeTypeCode,
        );

        if (result.found && result.weightKg !== null) {
          return result.weightKg;
        }

        log.debug(
          `API flange weight not found for NB${nominalBoreMm} ${pressureClass} ${flangeTypeCode}, using fallback`,
        );
        return hardcodedFlangeWeight(
          nominalBoreMm,
          pressureClass,
          flangeStandardCode || undefined,
          flangeTypeCode,
        );
      } catch (error) {
        log.debug("API flangeWeight failed, using hardcoded fallback:", error);
        return hardcodedFlangeWeight(
          nominalBoreMm,
          pressureClass,
          flangeStandardCode || undefined,
          flangeTypeCode,
        );
      }
    },
    [],
  );

  const blankFlangeWeight = useCallback(
    async (nominalBoreMm: number, pressureClass: string): Promise<number> => {
      try {
        const result = await flangeWeightApi.blankFlangeWeight(nominalBoreMm, pressureClass);

        if (result.found && result.weightKg !== null) {
          return result.weightKg;
        }

        log.debug(
          `API blank flange weight not found for NB${nominalBoreMm} ${pressureClass}, using fallback`,
        );
        return hardcodedBlankFlangeWeight(nominalBoreMm, pressureClass);
      } catch (error) {
        log.debug("API blankFlangeWeight failed, using hardcoded fallback:", error);
        return hardcodedBlankFlangeWeight(nominalBoreMm, pressureClass);
      }
    },
    [],
  );

  const bnwSetInfo = useCallback(
    async (
      nominalBoreMm: number,
      pressureClass: string,
    ): Promise<{
      boltSize: string;
      weightPerHoleKg: number;
      numHoles: number;
      totalWeightKg: number;
    }> => {
      try {
        const result = await flangeWeightApi.bnwSetInfo(nominalBoreMm, pressureClass);

        if (result.found) {
          return {
            boltSize: result.boltSize,
            weightPerHoleKg: result.weightPerHoleKg,
            numHoles: result.numHoles,
            totalWeightKg: result.totalWeightKg,
          };
        }

        log.debug(
          `API BNW set info not found for NB${nominalBoreMm} ${pressureClass}, using fallback`,
        );
        const fallback = hardcodedBnwSetInfo(nominalBoreMm, pressureClass);
        return {
          boltSize: fallback.boltSize,
          weightPerHoleKg: fallback.weightPerHole,
          numHoles: fallback.holesPerFlange,
          totalWeightKg: fallback.weightPerHole * fallback.holesPerFlange,
        };
      } catch (error) {
        log.debug("API bnwSetInfo failed, using hardcoded fallback:", error);
        const fallback = hardcodedBnwSetInfo(nominalBoreMm, pressureClass);
        return {
          boltSize: fallback.boltSize,
          weightPerHoleKg: fallback.weightPerHole,
          numHoles: fallback.holesPerFlange,
          totalWeightKg: fallback.weightPerHole * fallback.holesPerFlange,
        };
      }
    },
    [],
  );

  const retainingRingWeight = useCallback(async (nominalBoreMm: number): Promise<number> => {
    try {
      const result = await flangeWeightApi.retainingRingWeight(nominalBoreMm);

      if (result.found) {
        return result.weightKg;
      }

      log.debug(`API retaining ring weight not found for NB${nominalBoreMm}, using fallback`);
      return hardcodedRetainingRingWeight(nominalBoreMm);
    } catch (error) {
      log.debug("API retainingRingWeight failed, using hardcoded fallback:", error);
      return hardcodedRetainingRingWeight(nominalBoreMm);
    }
  }, []);

  const nbToOd = useCallback(async (nominalBoreMm: number): Promise<number> => {
    try {
      const result = await flangeWeightApi.nbToOd(nominalBoreMm);

      if (result.found) {
        return result.outsideDiameterMm;
      }

      log.debug(`API NB to OD not found for NB${nominalBoreMm}, using fallback`);
      return NB_TO_OD_LOOKUP[nominalBoreMm] || nominalBoreMm * 1.1;
    } catch (error) {
      log.debug("API nbToOd failed, using hardcoded fallback:", error);
      return NB_TO_OD_LOOKUP[nominalBoreMm] || nominalBoreMm * 1.1;
    }
  }, []);

  return {
    flangeWeight,
    blankFlangeWeight,
    bnwSetInfo,
    retainingRingWeight,
    nbToOd,
  };
}

export async function fetchFlangeWeightStatic(
  nominalBoreMm: number,
  pressureClass: string,
  flangeStandardCode: string | null,
  flangeTypeCode: string,
): Promise<number> {
  try {
    const result = await flangeWeightApi.flangeTypeWeight(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode,
      flangeTypeCode,
    );

    if (result.found && result.weightKg !== null) {
      return result.weightKg;
    }
    return hardcodedFlangeWeight(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode || undefined,
      flangeTypeCode,
    );
  } catch {
    return hardcodedFlangeWeight(
      nominalBoreMm,
      pressureClass,
      flangeStandardCode || undefined,
      flangeTypeCode,
    );
  }
}

export async function fetchBlankFlangeWeightStatic(
  nominalBoreMm: number,
  pressureClass: string,
): Promise<number> {
  try {
    const result = await flangeWeightApi.blankFlangeWeight(nominalBoreMm, pressureClass);

    if (result.found && result.weightKg !== null) {
      return result.weightKg;
    }
    return hardcodedBlankFlangeWeight(nominalBoreMm, pressureClass);
  } catch {
    return hardcodedBlankFlangeWeight(nominalBoreMm, pressureClass);
  }
}

export async function fetchBnwSetInfoStatic(
  nominalBoreMm: number,
  pressureClass: string,
): Promise<{ boltSize: string; weightPerHoleKg: number; numHoles: number; totalWeightKg: number }> {
  try {
    const result = await flangeWeightApi.bnwSetInfo(nominalBoreMm, pressureClass);

    if (result.found) {
      return {
        boltSize: result.boltSize,
        weightPerHoleKg: result.weightPerHoleKg,
        numHoles: result.numHoles,
        totalWeightKg: result.totalWeightKg,
      };
    }
    const fallback = hardcodedBnwSetInfo(nominalBoreMm, pressureClass);
    return {
      boltSize: fallback.boltSize,
      weightPerHoleKg: fallback.weightPerHole,
      numHoles: fallback.holesPerFlange,
      totalWeightKg: fallback.weightPerHole * fallback.holesPerFlange,
    };
  } catch {
    const fallback = hardcodedBnwSetInfo(nominalBoreMm, pressureClass);
    return {
      boltSize: fallback.boltSize,
      weightPerHoleKg: fallback.weightPerHole,
      numHoles: fallback.holesPerFlange,
      totalWeightKg: fallback.weightPerHole * fallback.holesPerFlange,
    };
  }
}

export async function fetchRetainingRingWeightStatic(nominalBoreMm: number): Promise<number> {
  try {
    const result = await flangeWeightApi.retainingRingWeight(nominalBoreMm);
    if (result.found) {
      return result.weightKg;
    }
    return hardcodedRetainingRingWeight(nominalBoreMm);
  } catch {
    return hardcodedRetainingRingWeight(nominalBoreMm);
  }
}

export async function fetchNbToOdStatic(nominalBoreMm: number): Promise<number> {
  try {
    const result = await flangeWeightApi.nbToOd(nominalBoreMm);
    if (result.found) {
      return result.outsideDiameterMm;
    }
    return NB_TO_OD_LOOKUP[nominalBoreMm] || nominalBoreMm * 1.1;
  } catch {
    return NB_TO_OD_LOOKUP[nominalBoreMm] || nominalBoreMm * 1.1;
  }
}
