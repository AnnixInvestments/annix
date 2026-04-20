"use client";

import { Select } from "@/app/components/ui/Select";
import { scheduleListForSpec } from "@/app/lib/config/rfq";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import { getMinWallThicknessForNB } from "@/app/lib/utils/pipeCalculations";

type ScheduleItem = {
  id: number;
  scheduleDesignation: string;
  wallThicknessMm: number;
  scheduleNumber?: number;
};

interface SteelSpecItem {
  id: number;
  steelSpecName: string;
}

interface ScheduleWallThicknessSelectorProps {
  entry: any;
  specs: any;
  index: number;
  globalSpecs: GlobalSpecs;
  masterData: MasterData;
  onUpdateEntry: (id: string, updates: any) => void;
  generateItemDescription: (entry: any) => string;
  debouncedCalculate: () => void;
  errors: Record<string, string>;
}

export function ScheduleWallThicknessSelector(props: ScheduleWallThicknessSelectorProps) {
  const {
    entry,
    specs,
    index,
    globalSpecs,
    masterData,
    onUpdateEntry,
    generateItemDescription,
    debouncedCalculate,
    errors,
  } = props;

  const rawSteelSpecificationId = specs.steelSpecificationId;
  const effectiveSpecId = rawSteelSpecificationId || globalSpecs?.steelSpecificationId;

  const rawSteelSpecName = masterData.steelSpecs?.find(
    (s: SteelSpecItem) => s.id === effectiveSpecId,
  )?.steelSpecName;

  const steelSpecName = rawSteelSpecName || "";
  const rawNominalDiameterMm = specs.nominalDiameterMm;
  const nbValue = rawNominalDiameterMm || 0;

  const isSABS719Steel =
    steelSpecName.includes("SABS 719") ||
    steelSpecName.includes("SANS 719") ||
    effectiveSpecId === 8;
  const rawFittingStandard = specs.fittingStandard;
  const fittingStandard = rawFittingStandard || (isSABS719Steel ? "SABS719" : "SABS62");
  const isSABS62Fitting = fittingStandard === "SABS62";

  const errorKey = `fitting_${index}_schedule`;
  const errorMsg = errors[errorKey];

  if (isSABS62Fitting) {
    const selectId = `fitting-sabs62-grade-${entry.id}`;
    const rawScheduleNumber = specs.scheduleNumber;
    const currentGrade = rawScheduleNumber || "MEDIUM";
    const isHeavy = currentGrade === "HEAVY";

    const mediumSchedules = scheduleListForSpec(nbValue, 7, "SABS 62 Medium");
    const heavySchedules = scheduleListForSpec(nbValue, 7, "SABS 62 Heavy");
    const rawMediumWT = mediumSchedules[0]?.wallThicknessMm;
    const mediumWT = rawMediumWT || 0;
    const rawHeavyWT = heavySchedules[0]?.wallThicknessMm;
    const heavyWT = rawHeavyWT || 0;

    const gradeOptions = [
      { value: "MEDIUM", label: `MEDIUM (${mediumWT}mm)` },
      { value: "HEAVY", label: `HEAVY (${heavyWT}mm)` },
    ];

    return (
      <div>
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
        >
          Wall Thickness *<span className="text-xs text-gray-500 ml-1 font-normal">(SABS62)</span>
        </label>
        <Select
          id={selectId}
          value={currentGrade}
          onChange={(grade) => {
            if (!grade) return;
            const schedules = scheduleListForSpec(
              nbValue,
              7,
              grade === "HEAVY" ? "SABS 62 Heavy" : "SABS 62 Medium",
            );
            const selectedSchedule = schedules[0];
            const rawWT = selectedSchedule?.wallThicknessMm;
            onUpdateEntry(entry.id, {
              specs: {
                ...entry.specs,
                scheduleNumber: grade,
                wallThicknessMm: rawWT || null,
              },
            });
          }}
          options={gradeOptions}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
        />
        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
          WT: {isHeavy ? heavyWT : mediumWT}mm
        </p>
      </div>
    );
  }

  const selectId = `fitting-schedule-spec-${entry.id}`;
  const allSchedules = scheduleListForSpec(nbValue, effectiveSpecId, steelSpecName);

  if (globalSpecs?.workingPressureBar && specs.nominalDiameterMm) {
    const rawWorkingPressureBar = globalSpecs?.workingPressureBar;
    const minWT = getMinWallThicknessForNB(nbValue, rawWorkingPressureBar || 0);
    const eligibleSchedules = allSchedules
      .filter((dim: ScheduleItem) => {
        const rawWT = dim.wallThicknessMm;
        return (rawWT || 0) >= minWT;
      })
      .sort((a: ScheduleItem, b: ScheduleItem) => {
        const rawWT1 = a.wallThicknessMm;
        const rawWT2 = b.wallThicknessMm;
        return (rawWT1 || 0) - (rawWT2 || 0);
      });

    const autoOptions = eligibleSchedules.map((dim: ScheduleItem, idx: number) => {
      const rawDesignation = dim.scheduleDesignation;
      const scheduleValue = rawDesignation || dim.scheduleNumber?.toString() || "Unknown";
      const rawWT = dim.wallThicknessMm;
      const wt = rawWT || 0;
      const isRecommended = idx === 0;
      const label = isRecommended ? `★ ${scheduleValue} (${wt}mm)` : `${scheduleValue} (${wt}mm)`;
      return { value: scheduleValue, label };
    });

    const rawScheduleNumber = specs.scheduleNumber;

    return (
      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2">
        <label className="block text-xs font-semibold text-green-900 mb-1">
          Schedule / W/T *
          <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">
            (Auto)
          </span>
          <span
            className="ml-1 text-gray-400 font-normal cursor-help"
            title="★ = Minimum schedule meeting pressure requirements. Auto-selected based on ASME B31.3 when working pressure is set."
          >
            ?
          </span>
        </label>
        <Select
          id={selectId}
          value={rawScheduleNumber || ""}
          onChange={(schedule) => {
            if (!schedule) return;
            const selectedDim = allSchedules.find((dim: ScheduleItem) => {
              const rawDesignation = dim.scheduleDesignation;
              return (rawDesignation || dim.scheduleNumber?.toString()) === schedule;
            });
            const rawWT = selectedDim?.wallThicknessMm;
            onUpdateEntry(entry.id, {
              specs: {
                ...entry.specs,
                scheduleNumber: schedule,
                wallThicknessMm: rawWT || specs.wallThicknessMm,
              },
            });
            debouncedCalculate();
          }}
          options={autoOptions}
          placeholder="Select schedule..."
        />
        {specs.wallThicknessMm && (
          <p className="text-xs text-green-700 mt-1">WT: {entry.specs.wallThicknessMm}mm</p>
        )}
        {errorMsg && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  const manualOptions =
    allSchedules.length > 0
      ? allSchedules.map((dim: ScheduleItem) => {
          const rawDesignation = dim.scheduleDesignation;
          const rawDesignation2 = dim.scheduleDesignation;
          return {
            value: rawDesignation || dim.scheduleNumber?.toString() || "",
            label: `${rawDesignation2 || dim.scheduleNumber?.toString() || ""} (${dim.wallThicknessMm}mm)`,
          };
        })
      : [
          { value: "10", label: "Sch 10" },
          { value: "40", label: "Sch 40" },
          { value: "80", label: "Sch 80" },
          { value: "160", label: "Sch 160" },
        ];

  const rawScheduleNumber = specs.scheduleNumber;

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Schedule / W/T *
        <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">
          (Manual)
        </span>
        <span
          className="ml-1 text-gray-400 font-normal cursor-help"
          title="Manual selection when working pressure not set. Higher schedules provide thicker walls and greater pressure capacity."
        >
          ?
        </span>
      </label>
      <Select
        id={selectId}
        value={rawScheduleNumber || ""}
        onChange={(scheduleNumber) => {
          if (!scheduleNumber) return;
          const schedules = scheduleListForSpec(nbValue, effectiveSpecId, steelSpecName);
          const matchingSchedule = schedules.find((s: ScheduleItem) => {
            const rawDesignation = s.scheduleDesignation;
            return (rawDesignation || s.scheduleNumber?.toString()) === scheduleNumber;
          });
          const wallThickness = matchingSchedule?.wallThicknessMm;

          const updatedEntry = {
            ...entry,
            specs: {
              ...entry.specs,
              scheduleNumber,
              wallThicknessMm: wallThickness,
            },
          };
          updatedEntry.description = generateItemDescription(updatedEntry);
          onUpdateEntry(entry.id, updatedEntry);
          debouncedCalculate();
        }}
        options={manualOptions}
        placeholder="Select Schedule"
      />
      {specs.wallThicknessMm && (
        <p className="text-xs text-gray-600 mt-1">WT: {entry.specs.wallThicknessMm}mm</p>
      )}
      {errorMsg && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
