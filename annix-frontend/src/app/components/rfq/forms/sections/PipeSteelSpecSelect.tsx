"use client";

import type { SelectOptionGroup } from "@/app/components/ui/Select";
import { Select } from "@/app/components/ui/Select";
import { scheduleListForSpec } from "@/app/lib/config/rfq";
import { calculateMinWallThickness } from "@/app/lib/utils/pipeCalculations";
import { isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";
import type { SteelSpecItem } from "../shared";

interface PipeSteelSpecSelectProps {
  entryId: string;
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  groupedSteelOptions: SelectOptionGroup[];
  nbToOdMap: Record<number, number>;
  generateItemDescription: (entry: any) => string;
  onUpdateEntry: (id: string, updates: any) => void;
  errors: Record<string, string>;
  index: number;
}

export function PipeSteelSpecSelect(props: PipeSteelSpecSelectProps) {
  const globalSpecId = props.globalSpecs?.steelSpecificationId;
  const rawSteelSpecificationId = props.specs.steelSpecificationId;
  const effectiveSpecId = rawSteelSpecificationId || globalSpecId;
  const isSteelFromGlobal = globalSpecId && effectiveSpecId === globalSpecId;
  const isSteelOverride = globalSpecId && effectiveSpecId !== globalSpecId;
  const selectId = `pipe-steel-spec-wc-${props.entryId}`;
  const globalSelectClass =
    "w-full px-2 py-1.5 border-2 border-green-500 dark:border-lime-400 rounded text-xs";
  const overrideSelectClass =
    "w-full px-2 py-1.5 border-2 border-orange-500 dark:border-orange-400 rounded text-xs";
  const defaultSelectClass = "w-full px-2 py-1.5 border border-gray-300 rounded text-xs";

  const errorKey = `pipe_${props.index}_steel_spec`;
  const rawError = props.errors[errorKey];

  return (
    <>
      <label htmlFor={selectId} className="block text-xs font-semibold text-gray-900 mb-1">
        Steel Specification *
        {isSteelFromGlobal && (
          <span className="text-green-600 text-xs ml-1 font-normal">(From Specs Page)</span>
        )}
        {isSteelOverride && (
          <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
        )}
      </label>
      <Select
        id={selectId}
        value={String(effectiveSpecId || "")}
        className={
          isSteelFromGlobal
            ? globalSelectClass
            : isSteelOverride
              ? overrideSelectClass
              : defaultSelectClass
        }
        onChange={(value) => {
          const specId = value ? Number(value) : undefined;
          const nominalBore = props.specs.nominalBoreMm;

          if (!specId || !nominalBore) {
            const rawSteelSpecName = props.masterData.steelSpecs?.find(
              (s: SteelSpecItem) => s.id === specId,
            )?.steelSpecName;

            const newSpecName = specId ? rawSteelSpecName || "" : "";
            props.onUpdateEntry(props.entryId, {
              specs: {
                ...props.entry.specs,
                steelSpecificationId: specId,
                ...(isApi5LSpec(newSpecName)
                  ? {}
                  : {
                      pslLevel: null,
                      cvnTestTemperatureC: null,
                      cvnAverageJoules: null,
                      cvnMinimumJoules: null,
                      heatNumber: null,
                      mtcReference: null,
                    }),
              },
            });
            return;
          }

          const rawSteelSpecName2 = props.masterData.steelSpecs?.find(
            (s: SteelSpecItem) => s.id === specId,
          )?.steelSpecName;

          const specName = rawSteelSpecName2 || "";
          const schedules = scheduleListForSpec(nominalBore, specId, specName);
          const rawWorkingPressureBar = props.globalSpecs?.workingPressureBar;
          const pressure = rawWorkingPressureBar || 0;
          const rawWorkingTemperatureC = props.globalSpecs?.workingTemperatureC;
          const temperature = rawWorkingTemperatureC || 20;

          let matchedSchedule: string | undefined;
          let matchedWT: number | undefined;

          if (pressure > 0 && schedules.length > 0) {
            const rawNominalBore = props.nbToOdMap[nominalBore];
            const od = rawNominalBore || nominalBore * 1.05;
            const minWT = calculateMinWallThickness(od, pressure);

            const eligibleSchedules = schedules
              .filter((s: any) => {
                const rawWt = s.wallThicknessMm;
                return (rawWt || 0) >= minWT;
              })
              .sort((a: any, b: any) => {
                const rawWtA = a.wallThicknessMm;
                const rawWtB = b.wallThicknessMm;
                return (rawWtA || 0) - (rawWtB || 0);
              });

            if (eligibleSchedules.length > 0) {
              matchedSchedule = eligibleSchedules[0].scheduleDesignation;
              matchedWT = eligibleSchedules[0].wallThicknessMm;
            } else if (schedules.length > 0) {
              const sorted = [...schedules].sort((a: any, b: any) => {
                const rawWtA = b.wallThicknessMm;
                const rawWtB = a.wallThicknessMm;
                return (rawWtA || 0) - (rawWtB || 0);
              });
              matchedSchedule = sorted[0].scheduleDesignation;
              matchedWT = sorted[0].wallThicknessMm;
            }
          } else if (schedules.length > 0) {
            const sch40 = schedules.find(
              (s: any) => s.scheduleDesignation === "40" || s.scheduleDesignation === "Sch 40",
            );
            if (sch40) {
              matchedSchedule = sch40.scheduleDesignation;
              matchedWT = sch40.wallThicknessMm;
            } else {
              matchedSchedule = schedules[0].scheduleDesignation;
              matchedWT = schedules[0].wallThicknessMm;
            }
          }

          const updatedEntry: any = {
            ...props.entry,
            specs: {
              ...props.entry.specs,
              steelSpecificationId: specId,
              scheduleNumber: matchedSchedule,
              wallThicknessMm: matchedWT,
              ...(isApi5LSpec(specName)
                ? {}
                : {
                    pslLevel: null,
                    cvnTestTemperatureC: null,
                    cvnAverageJoules: null,
                    cvnMinimumJoules: null,
                    heatNumber: null,
                    mtcReference: null,
                  }),
            },
          };
          updatedEntry.description = props.generateItemDescription(updatedEntry);
          props.onUpdateEntry(props.entryId, updatedEntry);
        }}
        options={[]}
        groupedOptions={props.groupedSteelOptions}
        placeholder="Select steel spec..."
        aria-required={true}
        aria-invalid={!!rawError}
      />
      {rawError && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {rawError}
        </p>
      )}
    </>
  );
}
