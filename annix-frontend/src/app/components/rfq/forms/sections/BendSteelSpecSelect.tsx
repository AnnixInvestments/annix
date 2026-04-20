"use client";

import type { SelectOptionGroup } from "@/app/components/ui/Select";
import { Select } from "@/app/components/ui/Select";
import { isNominalBoreValidForSpec, scheduleListForSpec } from "@/app/lib/config/rfq";
import { calculateMinWallThickness } from "@/app/lib/utils/pipeCalculations";
import type { SteelSpecItem } from "../shared";

type ScheduleItem = { id: number; scheduleDesignation: string; wallThicknessMm: number };

interface BendSteelSpecSelectProps {
  entryId: string;
  entry: any;
  specs: any;
  globalSpecs: any;
  masterData: any;
  steelEffectiveSpecId: number | null;
  steelSelectClass: string;
  groupedSteelOptions: SelectOptionGroup[];
  nbToOdMap: Record<number, number>;
  generateItemDescription: (entry: any) => string;
  onUpdateEntry: (id: string, updates: any) => void;
  debouncedCalculate: () => void;
}

export function BendSteelSpecSelect(props: BendSteelSpecSelectProps) {
  const selectId = `bend-steel-spec-${props.entryId}`;
  const rawSpecId = props.steelEffectiveSpecId;
  const value = String(rawSpecId || "");

  return (
    <Select
      id={selectId}
      value={value}
      className={props.steelSelectClass}
      onChange={(selectedValue) => {
        const newSpecId = selectedValue ? Number(selectedValue) : undefined;
        const nominalBore = props.specs.nominalBoreMm;

        const newSpec = newSpecId
          ? props.masterData.steelSpecs?.find((s: SteelSpecItem) => s.id === newSpecId)
          : null;
        const rawNewSpecName = newSpec?.steelSpecName;
        const newSpecName = rawNewSpecName || "";
        const isNewSABS719 = newSpecName.includes("SABS 719") || newSpecName.includes("SANS 719");

        const rawOldSpecId = props.specs.steelSpecificationId;
        const oldSpecId = rawOldSpecId || props.globalSpecs?.steelSpecificationId;
        const oldSpec = oldSpecId
          ? props.masterData.steelSpecs?.find((s: SteelSpecItem) => s.id === oldSpecId)
          : null;
        const rawOldSpecName = oldSpec?.steelSpecName;
        const oldSpecName = rawOldSpecName || "";
        const wasOldSABS719 = oldSpecName.includes("SABS 719") || oldSpecName.includes("SANS 719");

        const specTypeChanged = isNewSABS719 !== wasOldSABS719;

        let matchedSchedule: string | undefined;
        let matchedWT: number | undefined;
        let keepNB = false;

        if (nominalBore && newSpecId) {
          const nbValidForNewSpec = isNominalBoreValidForSpec(newSpecName, nominalBore);
          if (nbValidForNewSpec) {
            keepNB = true;
            const schedules = scheduleListForSpec(nominalBore, newSpecId, newSpecName);
            const rawPressure = props.globalSpecs?.workingPressureBar;
            const pressure = rawPressure || 0;

            if (pressure > 0 && schedules.length > 0) {
              const rawOd = props.nbToOdMap[nominalBore];
              const od = rawOd || nominalBore * 1.05;
              const rawTemp = props.globalSpecs?.workingTemperatureC;
              const temperature = rawTemp || 20;
              const minWT = calculateMinWallThickness(
                od,
                pressure,
                "ASTM_A106_Grade_B",
                temperature,
                1.0,
                0,
                1.2,
              );

              const eligibleSchedules = schedules
                .filter((s: ScheduleItem) => {
                  const rawWT = s.wallThicknessMm;
                  return (rawWT || 0) >= minWT;
                })
                .sort((a: ScheduleItem, b: ScheduleItem) => {
                  const rawWTa = a.wallThicknessMm;
                  const rawWTb = b.wallThicknessMm;
                  return (rawWTa || 0) - (rawWTb || 0);
                });

              if (eligibleSchedules.length > 0) {
                matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                matchedWT = eligibleSchedules[0].wallThicknessMm;
              } else if (schedules.length > 0) {
                const sorted = [...schedules].sort((a: ScheduleItem, b: ScheduleItem) => {
                  const rawWTb = b.wallThicknessMm;
                  const rawWTa = a.wallThicknessMm;
                  return (rawWTb || 0) - (rawWTa || 0);
                });
                matchedSchedule = sorted[0].scheduleDesignation;
                matchedWT = sorted[0].wallThicknessMm;
              }
            } else if (schedules.length > 0) {
              const sch40 = schedules.find(
                (s: ScheduleItem) =>
                  s.scheduleDesignation === "40" || s.scheduleDesignation === "Sch 40",
              );
              if (sch40) {
                matchedSchedule = sch40.scheduleDesignation;
                matchedWT = sch40.wallThicknessMm;
              } else {
                matchedSchedule = schedules[0].scheduleDesignation;
                matchedWT = schedules[0].wallThicknessMm;
              }
            }
          }
        }

        const updatedEntry: any = {
          ...props.entry,
          specs: {
            ...props.entry.specs,
            steelSpecificationId: newSpecId,
            nominalBoreMm: keepNB ? nominalBore : undefined,
            scheduleNumber: keepNB ? matchedSchedule : undefined,
            wallThicknessMm: keepNB ? matchedWT : undefined,
            bendType: specTypeChanged ? undefined : props.specs.bendType,
            bendRadiusType: specTypeChanged ? undefined : props.specs.bendRadiusType,
            bendDegrees: specTypeChanged ? undefined : props.specs.bendDegrees,
            numberOfSegments: specTypeChanged ? undefined : props.specs.numberOfSegments,
            centerToFaceMm: specTypeChanged ? undefined : props.specs.centerToFaceMm,
            bendRadiusMm: specTypeChanged ? undefined : props.specs.bendRadiusMm,
          },
        };
        updatedEntry.description = props.generateItemDescription(updatedEntry);
        props.onUpdateEntry(props.entryId, updatedEntry);

        if (keepNB && matchedSchedule) {
          props.debouncedCalculate();
        }
      }}
      options={[]}
      groupedOptions={props.groupedSteelOptions}
      placeholder="Select Steel Spec"
    />
  );
}
