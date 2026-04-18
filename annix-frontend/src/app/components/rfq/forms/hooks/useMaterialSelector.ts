import { useMemo } from "react";
import type { SelectOptionGroup } from "@/app/components/ui/Select";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import { groupSteelSpecifications } from "@/app/lib/utils/steelSpecGroups";

type SteelSpecItem = NonNullable<MasterData["steelSpecs"]>[number];

interface MaterialSelectorInput {
  masterData: MasterData | null | undefined;
  steelSpecificationId: number | undefined;
  globalSpecs: GlobalSpecs;
}

interface MaterialSelectorResult {
  groupedOptions: SelectOptionGroup[];
  effectiveSpecId: number | undefined;
  selectedSpec: SteelSpecItem | undefined;
  specName: string;
  isFromGlobal: boolean;
  isOverride: boolean;
}

export function useMaterialSelector(input: MaterialSelectorInput): MaterialSelectorResult {
  const { masterData, steelSpecificationId, globalSpecs } = input;

  const groupedOptions = useMemo(
    () => (masterData?.steelSpecs ? groupSteelSpecifications(masterData.steelSpecs) : []),
    [masterData?.steelSpecs],
  );

  const effectiveSpecId = steelSpecificationId || globalSpecs?.steelSpecificationId;

  const selectedSpec = useMemo(
    () => masterData?.steelSpecs?.find((s) => s.id === effectiveSpecId),
    [masterData?.steelSpecs, effectiveSpecId],
  );

  const specName = selectedSpec?.steelSpecName || "";

  const isFromGlobal = !steelSpecificationId && !!globalSpecs?.steelSpecificationId;
  const isOverride =
    !!steelSpecificationId &&
    !!globalSpecs?.steelSpecificationId &&
    steelSpecificationId !== globalSpecs.steelSpecificationId;

  return {
    groupedOptions,
    effectiveSpecId,
    selectedSpec,
    specName,
    isFromGlobal,
    isOverride,
  };
}
