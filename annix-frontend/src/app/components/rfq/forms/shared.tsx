import type { ReactNode } from "react";
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

interface SurfaceAreaBreakdown {
  label: string;
  value: number;
}

interface SurfaceAreaDisplayProps {
  externalTotal: number;
  internalTotal: number;
  externalBreakdown: SurfaceAreaBreakdown[];
  internalBreakdown: SurfaceAreaBreakdown[];
}

export function SurfaceAreaDisplay(props: SurfaceAreaDisplayProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/40 p-2 rounded text-center border border-indigo-200 dark:border-indigo-700">
        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">External m²</p>
        <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
          {props.externalTotal.toFixed(2)}
        </p>
        <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 text-left">
          {props.externalBreakdown
            .filter((item) => item.value > 0)
            .map((item) => (
              <p key={item.label}>
                {item.label}: {item.value.toFixed(3)}
              </p>
            ))}
        </div>
      </div>
      <div className="flex-1 bg-cyan-50 dark:bg-cyan-900/40 p-2 rounded text-center border border-cyan-200 dark:border-cyan-700">
        <p className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">Internal m²</p>
        <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
          {props.internalTotal.toFixed(2)}
        </p>
        <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 text-left">
          {props.internalBreakdown
            .filter((item) => item.value > 0)
            .map((item) => (
              <p key={item.label}>
                {item.label}: {item.value.toFixed(3)}
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}

interface WeldSummaryCardProps {
  totalVolumeCm3?: number;
  totalLinearMm?: number;
  children: ReactNode;
}

export function WeldSummaryCard(props: WeldSummaryCardProps) {
  return (
    <div className="bg-fuchsia-100 dark:bg-fuchsia-900/40 p-2 rounded text-center">
      <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-medium">Weld Summary</p>
      {props.totalVolumeCm3 !== undefined && (
        <>
          <p className="text-lg font-bold text-fuchsia-900 dark:text-fuchsia-100">
            {props.totalVolumeCm3.toFixed(1)}
          </p>
          <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400">cm³ total</p>
        </>
      )}
      {props.totalLinearMm !== undefined && (
        <>
          <p className="text-lg font-bold text-fuchsia-900 dark:text-fuchsia-100">
            {(props.totalLinearMm / 1000).toFixed(2)}
          </p>
          <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400">l/m total</p>
        </>
      )}
      <div className="mt-1 text-xs text-fuchsia-500 dark:text-fuchsia-400">{props.children}</div>
    </div>
  );
}
