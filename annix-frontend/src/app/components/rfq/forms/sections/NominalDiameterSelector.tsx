"use client";

import { keys } from "es-toolkit/compat";
import { Select } from "@/app/components/ui/Select";
import { masterDataApi } from "@/app/lib/api/client";
import {
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  scheduleListForSpec,
  standardReducerLengthForNb,
} from "@/app/lib/config/rfq";
import { log } from "@/app/lib/logger";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import { getMinWallThicknessForNB } from "@/app/lib/utils/pipeCalculations";

type ScheduleItem = {
  id: number;
  scheduleDesignation: string;
  wallThicknessMm: number;
  scheduleNumber?: number;
};

interface NominalDiameterSelectorProps {
  entry: any;
  specs: any;
  index: number;
  globalSpecs: GlobalSpecs;
  masterData: MasterData;
  ansiSizes: number[];
  forgedSizes: number[];
  malleableSizes: number[];
  onUpdateEntry: (id: string, updates: any) => void;
  generateItemDescription: (entry: any) => string;
  debouncedCalculate: () => void;
  errors: Record<string, string>;
}

export function NominalDiameterSelector(props: NominalDiameterSelectorProps) {
  const {
    entry,
    specs,
    index,
    globalSpecs,
    masterData,
    ansiSizes,
    forgedSizes,
    malleableSizes,
    onUpdateEntry,
    generateItemDescription,
    debouncedCalculate,
    errors,
  } = props;

  const rawFittingType = specs.fittingType;
  const fittingType = rawFittingType || "";
  const isTeeType = [
    "SHORT_TEE",
    "GUSSET_TEE",
    "UNEQUAL_SHORT_TEE",
    "UNEQUAL_GUSSET_TEE",
    "SHORT_REDUCING_TEE",
    "GUSSET_REDUCING_TEE",
    "EQUAL_TEE",
    "UNEQUAL_TEE",
    "SWEEP_TEE",
    "GUSSETTED_TEE",
  ].includes(fittingType);
  const isMissingForPreview = isTeeType && !specs.nominalDiameterMm;

  const rawSteelSpecificationId = specs.steelSpecificationId;
  const isSABS719 = (rawSteelSpecificationId || globalSpecs?.steelSpecificationId) === 8;
  const rawFittingStandard = specs.fittingStandard;
  const effectiveStandard = rawFittingStandard || (isSABS719 ? "SABS719" : "SABS62");

  const sizesByStandard: Record<string, number[]> = {
    SABS62: [...SABS62_FITTING_SIZES],
    SABS719: [...SABS719_FITTING_SIZES],
    ASME_B16_9: [...ansiSizes],
    ASME_B16_11: [...forgedSizes],
    BS_143: [...malleableSizes],
  };
  const rawSizes = sizesByStandard[effectiveStandard];
  const sizes = rawSizes || [...SABS62_FITTING_SIZES];
  const options = sizes.map((nb: number) => ({
    value: String(nb),
    label: `${nb}mm`,
  }));

  const selectId = `fitting-nb-${entry.id}`;
  const errorKey = `fitting_${index}_nb`;
  const errorMsg = errors[errorKey];

  return (
    <div className={isMissingForPreview ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""}>
      <label
        className={`block text-xs font-semibold mb-1 ${isMissingForPreview ? "text-red-700" : "text-gray-900 dark:text-gray-100"}`}
      >
        Nominal Diameter (mm) *{" "}
        {isMissingForPreview && (
          <span className="text-red-600 font-bold">⚠ Required for preview</span>
        )}
      </label>
      <Select
        id={selectId}
        value={specs.nominalDiameterMm ? String(entry.specs.nominalDiameterMm) : ""}
        onChange={(selectedValue) => {
          if (!selectedValue) return;

          const nominalDiameter = parseInt(selectedValue, 10);
          if (Number.isNaN(nominalDiameter)) return;

          let matchedSchedule = specs.scheduleNumber;
          let matchedWT = specs.wallThicknessMm;

          if (effectiveStandard === "SABS719" && globalSpecs?.workingPressureBar) {
            const rawSteelSpecificationId2 = specs.steelSpecificationId;
            const effectiveSpecId = rawSteelSpecificationId2 || globalSpecs?.steelSpecificationId;
            const availableSchedules = scheduleListForSpec(nominalDiameter, effectiveSpecId);
            if (availableSchedules.length > 0) {
              const minWT = getMinWallThicknessForNB(
                nominalDiameter,
                globalSpecs.workingPressureBar,
              );
              const sorted = [...availableSchedules].sort((a: ScheduleItem, b: ScheduleItem) => {
                const rawWT1 = a.wallThicknessMm;
                const rawWT2 = b.wallThicknessMm;
                return (rawWT1 || 0) - (rawWT2 || 0);
              });
              const suitable = sorted.find((s: ScheduleItem) => {
                const rawWT = s.wallThicknessMm;
                return (rawWT || 0) >= minWT;
              });
              if (suitable) {
                matchedSchedule = suitable.scheduleDesignation;
                matchedWT = suitable.wallThicknessMm;
              } else if (sorted.length > 0) {
                const thickest = sorted[sorted.length - 1];
                matchedSchedule = thickest.scheduleDesignation;
                matchedWT = thickest.wallThicknessMm;
              }
            }
          }

          const rawFittingType2 = specs.fittingType;
          const isReducingTeeType = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(
            rawFittingType2 || "",
          );
          const currentBranchNB = specs.branchNominalDiameterMm;
          const shouldClearBranch =
            isReducingTeeType && currentBranchNB && currentBranchNB >= nominalDiameter;

          const rawFittingType3 = specs.fittingType;
          const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
            rawFittingType3 || "",
          );
          const rawSteelSpecificationId3 = specs.steelSpecificationId;
          const steelSpecId = rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId;
          const steelSpecName = masterData?.steelSpecs?.find(
            (s: { id: number }) => s.id === steelSpecId,
          )?.steelSpecName;
          const reducerLength = isReducerType
            ? standardReducerLengthForNb(nominalDiameter, steelSpecId, steelSpecName)
            : undefined;

          const newSpecs = {
            ...entry.specs,
            nominalDiameterMm: nominalDiameter,
            scheduleNumber: matchedSchedule,
            wallThicknessMm: matchedWT,
            branchNominalDiameterMm: shouldClearBranch ? undefined : specs.branchNominalDiameterMm,
            ...(isReducerType && reducerLength
              ? {
                  reducerLengthMm: reducerLength,
                  reducerLengthMmAuto: reducerLength,
                  smallNominalDiameterMm: undefined,
                }
              : {}),
          };
          const immediateEntry = { ...entry, specs: newSpecs };
          immediateEntry.description = generateItemDescription(immediateEntry);
          onUpdateEntry(entry.id, immediateEntry);

          const currentFittingType = specs.fittingType;
          const angleRange = specs.angleRange;
          const pipeLengthAOverride = specs.pipeLengthAOverride;
          const pipeLengthBOverride = specs.pipeLengthBOverride;

          if (currentFittingType && nominalDiameter) {
            masterDataApi
              .getFittingDimensions(
                effectiveStandard as "SABS62" | "SABS719",
                currentFittingType,
                nominalDiameter,
                angleRange,
              )
              .then((dims) => {
                if (dims) {
                  const pipeUpdates: Record<string, unknown> = {};
                  const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(
                    currentFittingType,
                  );
                  let pipeLengthA: number | null = null;
                  let pipeLengthB: number | null = null;

                  if (effectiveStandard === "SABS62") {
                    const centreToFace = dims.centreToFaceCMm ? Number(dims.centreToFaceCMm) : null;
                    if (isEqualTee && centreToFace) {
                      pipeLengthA = centreToFace * 2;
                      pipeLengthB = centreToFace;
                    } else if (centreToFace) {
                      pipeLengthA = centreToFace;
                      pipeLengthB = centreToFace;
                    }
                  } else {
                    const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                    const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                    pipeLengthA = dimA;
                    pipeLengthB = dimB;
                  }

                  if (pipeLengthA && !pipeLengthAOverride) {
                    pipeUpdates.pipeLengthAMm = pipeLengthA;
                    pipeUpdates.pipeLengthAMmAuto = pipeLengthA;
                  }
                  if (pipeLengthB && !pipeLengthBOverride) {
                    pipeUpdates.pipeLengthBMm = pipeLengthB;
                    pipeUpdates.pipeLengthBMmAuto = pipeLengthB;
                  }
                  if (keys(pipeUpdates).length > 0) {
                    onUpdateEntry(entry.id, { specs: pipeUpdates });
                  }
                }
              })
              .catch((err) => {
                log.debug("Could not fetch fitting dimensions:", err);
              });
          }

          debouncedCalculate();
        }}
        options={options}
        placeholder="Select diameter..."
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {sizes.length} sizes available ({effectiveStandard})
      </p>
      {errorMsg && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
