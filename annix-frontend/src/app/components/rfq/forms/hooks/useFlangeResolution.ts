import { useMemo } from "react";
import { recommendedFlangeTypeCode } from "@/app/lib/config/rfq/pipeEndOptions";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import {
  type ResolvedFlangeConfig,
  resolveFlangeConfig,
} from "@/app/lib/utils/rfqFlangeCalculations";

interface FlangeResolutionInput {
  flangeStandardId: number | undefined;
  flangePressureClassId: number | undefined;
  flangeTypeCode: string | undefined;
  globalSpecs: GlobalSpecs;
  masterData: MasterData;
  endConfiguration: string | undefined;
}

interface FlangeResolutionResult extends ResolvedFlangeConfig {
  recommendedTypeCode: string;
  effectiveFlangeTypeCode: string;
  isFlangeStandardOverride: boolean;
  isFlangeStandardFromGlobal: boolean;
  isPressureClassOverride: boolean;
  isPressureClassFromGlobal: boolean;
}

export function useFlangeResolution(input: FlangeResolutionInput): FlangeResolutionResult {
  const {
    flangeStandardId,
    flangePressureClassId,
    flangeTypeCode,
    globalSpecs,
    masterData,
    endConfiguration,
  } = input;

  const resolved = useMemo(
    () =>
      resolveFlangeConfig(
        { flangeStandardId, flangePressureClassId, flangeTypeCode },
        globalSpecs,
        masterData,
      ),
    [flangeStandardId, flangePressureClassId, flangeTypeCode, globalSpecs, masterData],
  );

  const recommendedTypeCode = useMemo(
    () => recommendedFlangeTypeCode(endConfiguration || "PE"),
    [endConfiguration],
  );

  const effectiveFlangeTypeCode =
    flangeTypeCode || globalSpecs?.flangeTypeCode || recommendedTypeCode;

  const isFlangeStandardFromGlobal = !flangeStandardId && !!globalSpecs?.flangeStandardId;
  const isFlangeStandardOverride =
    !!flangeStandardId &&
    !!globalSpecs?.flangeStandardId &&
    flangeStandardId !== globalSpecs.flangeStandardId;

  const isPressureClassFromGlobal = !flangePressureClassId && !!globalSpecs?.flangePressureClassId;
  const isPressureClassOverride =
    !!flangePressureClassId &&
    !!globalSpecs?.flangePressureClassId &&
    flangePressureClassId !== globalSpecs.flangePressureClassId;

  return {
    ...resolved,
    recommendedTypeCode,
    effectiveFlangeTypeCode,
    isFlangeStandardOverride,
    isFlangeStandardFromGlobal,
    isPressureClassOverride,
    isPressureClassFromGlobal,
  };
}
