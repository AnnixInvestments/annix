import { useMemo } from "react";
import {
  BEND_END_OPTIONS,
  FITTING_END_OPTIONS,
  PIPE_END_OPTIONS,
  REDUCER_END_OPTIONS,
} from "@/app/lib/config/rfq";
import type {
  BendEndOption,
  FittingEndOption,
  PipeEndOption,
  ReducerEndOption,
} from "@/app/lib/config/rfq/pipeEndOptions";

type ProductType = "STRAIGHT_PIPE" | "BEND" | "FITTING";
type EndOption = PipeEndOption | BendEndOption | FittingEndOption | ReducerEndOption;

interface EndConfigSelectorInput {
  productType: ProductType;
  selectedConfig: string | undefined;
  fittingSubType?: string;
  isReducer?: boolean;
  isOffsetBend?: boolean;
  isSweepTee?: boolean;
}

interface EndConfigDetails {
  weldCount: number;
  flangeWeldCount: number;
  tackWeldEnds: number;
  flangeCount: number;
  hasFlanges: boolean;
  hasLooseFlange: boolean;
}

interface EndConfigSelectorResult {
  options: EndOption[];
  selectedOption: EndOption | undefined;
  details: EndConfigDetails;
  effectiveConfig: string;
}

function resolveOptions(input: EndConfigSelectorInput): EndOption[] {
  const { productType, isSweepTee, isReducer, isOffsetBend } = input;

  if (productType === "STRAIGHT_PIPE") {
    return PIPE_END_OPTIONS as unknown as EndOption[];
  }
  if (productType === "BEND") {
    return (isSweepTee ? FITTING_END_OPTIONS : BEND_END_OPTIONS) as unknown as EndOption[];
  }
  return (isReducer || isOffsetBend
    ? REDUCER_END_OPTIONS
    : FITTING_END_OPTIONS) as unknown as EndOption[];
}

function resolveDetails(option: EndOption | undefined, configValue: string): EndConfigDetails {
  const weldCount = option?.weldCount || 0;
  const flangeWeldCount = option?.flangeWeldCount || 0;
  const tackWeldEnds = option?.tackWeldEnds || 0;
  const flangeCount = option?.flangeCount || 0;
  const hasFlanges = configValue !== "PE" && flangeCount > 0;
  const hasLooseFlange =
    configValue.includes("_LF") || configValue.includes("FOE_LF") || configValue === "2xLF";

  return { weldCount, flangeWeldCount, tackWeldEnds, flangeCount, hasFlanges, hasLooseFlange };
}

export function useEndConfigurationSelector(
  input: EndConfigSelectorInput,
): EndConfigSelectorResult {
  const { selectedConfig } = input;
  const effectiveConfig = selectedConfig || "PE";

  const options = useMemo(
    () => resolveOptions(input),
    [input.productType, input.isSweepTee, input.isReducer, input.isOffsetBend],
  );

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === effectiveConfig),
    [options, effectiveConfig],
  );

  const details = useMemo(
    () => resolveDetails(selectedOption, effectiveConfig),
    [selectedOption, effectiveConfig],
  );

  return { options, selectedOption, details, effectiveConfig };
}
