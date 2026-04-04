import { useMemo } from "react";
import type { MasterData } from "@/app/lib/types/rfqTypes";
import { groupSteelSpecifications } from "@/app/lib/utils/steelSpecGroups";

export type SteelSpecItem = NonNullable<MasterData["steelSpecs"]>[number];
export type FlangeStandardItem = NonNullable<MasterData["flangeStandards"]>[number];
export type PressureClassItem = NonNullable<MasterData["pressureClasses"]>[number];
export type FlangeTypeItem = NonNullable<MasterData["flangeTypes"]>[number];

export const useGroupedSteelOptions = (masterData: MasterData | null | undefined) =>
  useMemo(
    () => (masterData?.steelSpecs ? groupSteelSpecifications(masterData.steelSpecs) : []),
    [masterData?.steelSpecs],
  );
