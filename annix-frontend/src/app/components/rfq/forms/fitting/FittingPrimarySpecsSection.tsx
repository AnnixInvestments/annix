"use client";

import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import {
  FITTING_CLASS_WALL_THICKNESS,
  standardReducerLengthForNb,
  validSmallNbForLargeNb,
} from "@/app/lib/config/rfq";
import { scheduleToFittingClass } from "@/app/lib/utils/rfqFlangeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import { FittingTypeSelector } from "../sections/FittingTypeSelector";
import { NominalDiameterSelector } from "../sections/NominalDiameterSelector";
import { ScheduleWallThicknessSelector } from "../sections/ScheduleWallThicknessSelector";
import type { FittingFormLogic } from "./useFittingFormLogic";

const FittingPrimarySpecsSectionInner = (props: { logic: FittingFormLogic }) => {
  const {
    ansiFittingTypes,
    ansiSchedules,
    ansiSizes,
    debouncedCalculate,
    effectiveFittingStandard,
    entry,
    errors,
    forgedFittingTypes,
    forgedSeries,
    forgedSizes,
    generateItemDescription,
    globalSpecs,
    index,
    isAnsiStandard,
    isForgedStandard,
    isMalleableStandard,
    isReducer,
    malleableFittingTypes,
    malleableSizes,
    masterData,
    onUpdateEntry,
    rawAnsiSchedule3,
    rawForgedConnectionType3,
    rawForgedPressureClass,
    rawNominalDiameterMm4,
    rawSteelSpecificationId13,
    specs,
  } = props.logic;
  return (
    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-3">
      <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
        Fitting Specifications
      </h4>
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isReducer ? "md:grid-cols-6" : isForgedStandard ? "md:grid-cols-6" : "md:grid-cols-5"}`}
      >
        {/* Fitting Standard */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Fitting Standard
          </label>
          <Select
            id={`fitting-standard-${entry.id}`}
            value={effectiveFittingStandard}
            onChange={(standard) => {
              if (!standard) return;
              onUpdateEntry(entry.id, {
                specs: {
                  ...entry.specs,
                  fittingStandard: standard,
                  fittingType: null,
                  nominalDiameterMm: null,
                  ansiSchedule: null,
                  forgedPressureClass: null,
                  forgedConnectionType: null,
                  malleablePressureClass: null,
                  pipeLengthAMm: null,
                  pipeLengthBMm: null,
                  scheduleNumber: null,
                  wallThicknessMm: null,
                },
              });
            }}
            options={[
              { value: "SABS62", label: "SABS 62 (Cast)" },
              { value: "SABS719", label: "SABS 719 (Fabricated)" },
              { value: "ASME_B16_9", label: "ASME B16.9 (Butt-Weld)" },
              { value: "ASME_B16_11", label: "ASME B16.11 (Forged)" },
              { value: "BS_143", label: "BS 143 (Malleable Iron)" },
            ]}
          />
        </div>

        {/* Fitting Type */}
        <FittingTypeSelector
          entry={entry}
          specs={specs}
          index={index}
          globalSpecs={globalSpecs}
          ansiFittingTypes={ansiFittingTypes}
          forgedFittingTypes={forgedFittingTypes}
          malleableFittingTypes={malleableFittingTypes}
          onUpdateEntry={onUpdateEntry}
          generateItemDescription={generateItemDescription}
          debouncedCalculate={debouncedCalculate}
          errors={errors}
        />

        {/* Nominal Diameter - Linked to Steel Specification */}
        <NominalDiameterSelector
          entry={entry}
          specs={specs}
          index={index}
          globalSpecs={globalSpecs}
          masterData={masterData}
          ansiSizes={ansiSizes}
          forgedSizes={forgedSizes}
          malleableSizes={malleableSizes}
          onUpdateEntry={onUpdateEntry}
          generateItemDescription={generateItemDescription}
          debouncedCalculate={debouncedCalculate}
          errors={errors}
        />

        {/* ANSI B16.9 Schedule Selector */}
        {isAnsiStandard && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Schedule *
            </label>
            <Select
              id={`fitting-ansi-schedule-${entry.id}`}
              value={rawAnsiSchedule3 || ""}
              onChange={(schedule) => {
                if (!schedule) return;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    ansiSchedule: schedule,
                    nominalDiameterMm: null,
                  },
                });
              }}
              options={ansiSchedules.map((s) => ({ value: s, label: s }))}
              placeholder="Select schedule..."
            />
          </div>
        )}

        {/* Forged Fitting Pressure Class + Connection Type */}
        {isForgedStandard && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Pressure Class *
              </label>
              <Select
                id={`fitting-forged-class-${entry.id}`}
                value={specs.forgedPressureClass ? String(specs.forgedPressureClass) : ""}
                onChange={(pc) => {
                  if (!pc) return;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      forgedPressureClass: Number(pc),
                      nominalDiameterMm: null,
                    },
                  });
                }}
                options={[...new Set(forgedSeries.map((s) => s.pressureClass))]
                  .sort((a, b) => a - b)
                  .map((pc) => ({
                    value: String(pc),
                    label: `Class ${pc}`,
                  }))}
                placeholder="Select class..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Connection Type *
              </label>
              <Select
                id={`fitting-forged-conn-${entry.id}`}
                value={rawForgedConnectionType3 || ""}
                onChange={(ct) => {
                  if (!ct) return;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      forgedConnectionType: ct,
                      nominalDiameterMm: null,
                    },
                  });
                }}
                options={forgedSeries
                  .filter(
                    (s) => !rawForgedPressureClass || s.pressureClass === rawForgedPressureClass,
                  )
                  .map((s) => s.connectionType)
                  .filter((ct, idx, arr) => arr.indexOf(ct) === idx)
                  .map((ct) => ({
                    value: ct,
                    label: ct === "SW" ? "Socket Weld (SW)" : "Threaded (THD)",
                  }))}
                placeholder="Select type..."
              />
            </div>
          </>
        )}

        {/* Malleable Iron Pressure Class */}
        {isMalleableStandard && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Pressure Class *
            </label>
            <Select
              id={`fitting-malleable-class-${entry.id}`}
              value={specs.malleablePressureClass ? String(specs.malleablePressureClass) : ""}
              onChange={(pc) => {
                if (!pc) return;
                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    malleablePressureClass: Number(pc),
                    nominalDiameterMm: null,
                  },
                });
              }}
              options={[
                { value: "150", label: "Class 150" },
                { value: "300", label: "Class 300" },
              ]}
              placeholder="Select class..."
            />
          </div>
        )}

        {/* Small NB (Outlet) - For Reducers Only */}
        {isReducer && (
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Small NB (mm) *
              <span className="text-gray-500 text-xs ml-1 font-normal">(outlet)</span>
            </label>
            {(() => {
              const rawNominalDiameterMm3 = specs.nominalDiameterMm;
              const mainNB = rawNominalDiameterMm3 || 0;
              const rawSteelSpecificationId11 = specs.steelSpecificationId;
              const mainSteelSpecId =
                rawSteelSpecificationId11 || globalSpecs?.steelSpecificationId;
              const steelSpecName = masterData?.steelSpecs?.find(
                (s: { id: number }) => s.id === mainSteelSpecId,
              )?.steelSpecName;
              const sizes = validSmallNbForLargeNb(mainNB, mainSteelSpecId, steelSpecName);
              const options = sizes.map((nb: number) => ({
                value: String(nb),
                label: `${nb}mm`,
              }));

              return (
                <Select
                  id={`fitting-small-nb-${entry.id}`}
                  value={
                    specs.smallNominalDiameterMm ? String(entry.specs.smallNominalDiameterMm) : ""
                  }
                  onChange={(value) => {
                    if (!value) return;
                    const smallDiameter = Number(value);
                    const rawSteelSpecificationId12 = specs.steelSpecificationId;
                    const steelSpecId =
                      rawSteelSpecificationId12 || globalSpecs?.steelSpecificationId;
                    const steelSpecName = masterData?.steelSpecs?.find(
                      (s: { id: number }) => s.id === steelSpecId,
                    )?.steelSpecName;
                    const reducerLength = standardReducerLengthForNb(
                      mainNB,
                      steelSpecId,
                      steelSpecName,
                    );

                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        smallNominalDiameterMm: smallDiameter,
                        reducerLengthMm: reducerLength,
                        reducerLengthMmAuto: reducerLength,
                      },
                    });
                    debouncedCalculate();
                  }}
                  options={options}
                  placeholder="Select..."
                />
              );
            })()}
            {specs.nominalDiameterMm && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {
                  validSmallNbForLargeNb(
                    rawNominalDiameterMm4 || 0,
                    rawSteelSpecificationId13 || globalSpecs?.steelSpecificationId,
                  ).length
                }{" "}
                sizes available
              </p>
            )}
          </div>
        )}

        {/* Schedule/Wall Thickness */}
        <ScheduleWallThicknessSelector
          entry={entry}
          specs={specs}
          index={index}
          globalSpecs={globalSpecs}
          masterData={masterData}
          onUpdateEntry={onUpdateEntry}
          generateItemDescription={generateItemDescription}
          debouncedCalculate={debouncedCalculate}
          errors={errors}
        />

        {/* Weld Thickness Display */}
        <div>
          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Flange Weld WT
            <span className="ml-1 text-xs font-normal text-green-600">(Auto)</span>
          </label>
          {(() => {
            const dn = specs.nominalDiameterMm;
            const rawScheduleNumber4 = specs.scheduleNumber;
            const schedule = rawScheduleNumber4 || "";
            const rawSteelSpecificationId15 = specs.steelSpecificationId;
            const steelSpecId = rawSteelSpecificationId15 || globalSpecs?.steelSpecificationId;
            const isSABS719 = steelSpecId === 8;
            const pipeWallThickness = specs.wallThicknessMm;
            const rawNumberOfFlanges = entry.calculation?.numberOfFlanges;
            const numFlanges = rawNumberOfFlanges || 0;

            if (numFlanges === 0) {
              return (
                <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-400">
                  No welds (PE)
                </div>
              );
            }

            if (!dn || !pipeWallThickness) {
              return (
                <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-400">
                  Select NB first
                </div>
              );
            }

            let effectiveWeldThickness: number | null = null;
            let fittingClass: "STD" | "XH" | "XXH" | "" = "STD";
            const usingPipeThickness = isSABS719 || !dn || dn > 600;

            if (isSABS719) {
              effectiveWeldThickness = pipeWallThickness
                ? roundToWeldIncrement(pipeWallThickness)
                : pipeWallThickness;
            } else {
              fittingClass = scheduleToFittingClass(schedule);

              const rawThickness =
                fittingClass && FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn]
                  ? FITTING_CLASS_WALL_THICKNESS[fittingClass][dn]
                  : pipeWallThickness;
              effectiveWeldThickness = rawThickness
                ? roundToWeldIncrement(rawThickness)
                : rawThickness;
            }

            const descText = isSABS719
              ? "SABS 719 ERW - pipe WT"
              : !fittingClass || usingPipeThickness
                ? `Pipe WT (${schedule || "WT"})`
                : `${fittingClass} fitting class`;

            return (
              <div>
                <div className="px-2 py-1.5 bg-emerald-100 border border-emerald-300 rounded text-xs font-medium text-emerald-800">
                  {effectiveWeldThickness?.toFixed(2)} mm
                </div>
                <p className="text-xs text-gray-500 mt-1">{descText}</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export const FittingPrimarySpecsSection = memo(FittingPrimarySpecsSectionInner);
