import { useCallback } from "react";
import { FITTING_CLASS_WALL_THICKNESS } from "@/app/lib/config/rfq";
import { calculateFlangeWeldVolume } from "@/app/lib/utils/pipeWeldVolume";
import {
  type FittingClass,
  flangeWeightOr,
  type ResolvedFlangeConfig,
  scheduleToFittingClass,
} from "@/app/lib/utils/rfqFlangeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";

interface WeldCalculationsInput {
  allWeights: Parameters<typeof flangeWeightOr>[0];
  flangeConfig: ResolvedFlangeConfig;
}

interface WeldThicknessParams {
  nominalBoreMm: number;
  pipeWallThickness: number | undefined;
  schedule: string;
  isSABS719: boolean;
}

interface WeldThicknessResult {
  effectiveThickness: number | null;
  fittingClass: FittingClass;
  usingPipeThickness: boolean;
  description: string;
}

interface FlangeWeldVolumeParams {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  numberOfFlangeWelds: number;
}

interface FlangeWeightParams {
  nominalBoreMm: number | null | undefined;
  fallback?: number;
}

interface WeldCalculationsResult {
  resolveWeldThickness: (params: WeldThicknessParams) => WeldThicknessResult;
  flangeWeldVolume: (params: FlangeWeldVolumeParams) => {
    volumeCm3: number;
    legSizeMm: number;
    weldLengthMm: number;
  } | null;
  flangeWeight: (params: FlangeWeightParams) => number;
  roundToWeld: (thicknessMm: number) => number;
}

export function useWeldCalculations(input: WeldCalculationsInput): WeldCalculationsResult {
  const { allWeights, flangeConfig } = input;

  const resolveWeldThickness = useCallback((params: WeldThicknessParams): WeldThicknessResult => {
    const { nominalBoreMm, pipeWallThickness, schedule, isSABS719 } = params;

    if (!nominalBoreMm || !pipeWallThickness) {
      return {
        effectiveThickness: null,
        fittingClass: "",
        usingPipeThickness: true,
        description: "Select NB first",
      };
    }

    const usingPipeThickness = isSABS719 || !nominalBoreMm || nominalBoreMm > 300;

    if (isSABS719) {
      return {
        effectiveThickness: roundToWeldIncrement(pipeWallThickness),
        fittingClass: "",
        usingPipeThickness: true,
        description: `SABS 719 ERW - pipe WT (${schedule || "WT"})`,
      };
    }

    const fittingClass = scheduleToFittingClass(schedule);
    const fittingClassWt = fittingClass ? FITTING_CLASS_WALL_THICKNESS[fittingClass] : undefined;
    const classThickness = fittingClassWt?.[nominalBoreMm];
    const rawThickness = fittingClass && classThickness ? classThickness : pipeWallThickness;
    const effectiveThickness = rawThickness ? roundToWeldIncrement(rawThickness) : null;

    const description =
      !fittingClass || usingPipeThickness
        ? `Pipe WT (${schedule || "WT"})`
        : `${fittingClass} fitting class`;

    return { effectiveThickness, fittingClass, usingPipeThickness, description };
  }, []);

  const flangeWeldVolume = useCallback((params: FlangeWeldVolumeParams) => {
    const { outsideDiameterMm, wallThicknessMm, numberOfFlangeWelds } = params;
    if (!outsideDiameterMm || !wallThicknessMm || numberOfFlangeWelds <= 0) return null;
    const result = calculateFlangeWeldVolume({
      outsideDiameterMm,
      wallThicknessMm,
      numberOfFlangeWelds,
    });
    return {
      volumeCm3: result.volumeCm3,
      legSizeMm: result.legSizeMm,
      weldLengthMm: result.weldLengthMm,
    };
  }, []);

  const flangeWeight = useCallback(
    (params: FlangeWeightParams) =>
      flangeWeightOr(
        allWeights,
        params.nominalBoreMm,
        flangeConfig.pressureClassDesignation,
        flangeConfig.flangeStandardCode,
        flangeConfig.flangeTypeCode,
        params.fallback,
      ),
    [allWeights, flangeConfig],
  );

  return {
    resolveWeldThickness,
    flangeWeldVolume,
    flangeWeight,
    roundToWeld: roundToWeldIncrement,
  };
}
