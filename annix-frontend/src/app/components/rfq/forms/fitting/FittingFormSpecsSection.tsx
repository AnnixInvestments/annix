"use client";

import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import { masterDataApi } from "@/app/lib/api/client";
import {
  ALL_FITTING_SIZES,
  FITTING_CLASS_WALL_THICKNESS,
  FITTING_END_OPTIONS,
  fittingFlangeConfig as getFittingFlangeConfig,
  reducerFlangeConfig as getReducerFlangeConfig,
  weldCountPerFitting as getWeldCountPerFitting,
  REDUCER_END_OPTIONS,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  SABS719_FITTING_SIZES,
  standardReducerLengthForNb,
  validSmallNbForLargeNb,
} from "@/app/lib/config/rfq";
import { log } from "@/app/lib/logger";
import { flangeTypesForStandardCode } from "@/app/lib/query/hooks";
import { scheduleToFittingClass } from "@/app/lib/utils/rfqFlangeCalculations";
import {
  getLateralDimensionsForAngle,
  LateralAngleRange,
} from "@/app/lib/utils/sabs719LateralData";
import { getPipeEndConfigurationDetails } from "@/app/lib/utils/systemUtils";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import { FittingTypeSelector } from "../sections/FittingTypeSelector";
import { FlangeDropdownTriplet } from "../sections/FlangeDropdownTriplet";
import { NominalDiameterSelector } from "../sections/NominalDiameterSelector";
import { ScheduleWallThicknessSelector } from "../sections/ScheduleWallThicknessSelector";
import { type FlangeStandardItem, type PressureClassItem, type SteelSpecItem } from "../shared";
import type { FittingFormLogic } from "./useFittingFormLogic";

interface FittingFormSpecsSectionProps {
  logic: FittingFormLogic;
}

const FittingFormSpecsSectionInner = (props: FittingFormSpecsSectionProps) => {
  const {
    allFlangeTypes,
    ansiDimensionData,
    ansiFittingTypes,
    ansiSchedules,
    ansiSizes,
    debouncedCalculate,
    effectiveFittingStandard,
    entry,
    errors,
    fittingQuantityDisplayValue,
    forgedDimensionData,
    forgedFittingTypes,
    forgedSeries,
    forgedSizes,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    index,
    isAnsiStandard,
    isForgedStandard,
    isLateral,
    isMalleableStandard,
    isOffsetBend,
    isReducer,
    isUnequalTee,
    malleableFittingTypes,
    malleableSizes,
    masterData,
    onUpdateEntry,
    pressureClassesByStandard,
    rawAnsiSchedule3,
    rawForgedConnectionType3,
    rawForgedPressureClass,
    rawHasReducerStub,
    rawHasStubs,
    rawNominalDiameterMm4,
    rawNumberOfStubs,
    rawOffsetAngleDegrees,
    rawOffsetLengthA,
    rawOffsetLengthB,
    rawOffsetLengthC,
    rawPipeLengthAMm2,
    rawPipeLengthBMm3,
    rawReducerLengthMm,
    rawReducerStubAngleDegrees,
    rawSteelSpecificationId13,
    rawStubLocation,
    rawStubs2,
    specs,
  } = props.logic;

  return (
    <>
      {/* ROW 1: Primary Specs Header (Green Background) */}
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

      {/* Dimension Summary Card - ANSI/Forged/Malleable */}
      {(isAnsiStandard || isForgedStandard) &&
        specs.nominalDiameterMm &&
        (() => {
          const dims = isAnsiStandard ? ansiDimensionData : forgedDimensionData;
          if (!dims) return null;

          const tolerance = isAnsiStandard ? "±2 mm" : "±1.5 mm";
          const dimensionRows: { label: string; value: string; hasTolerance: boolean }[] = [];

          if (isAnsiStandard) {
            if (dims.centerToFaceAMm)
              dimensionRows.push({
                label: "Center-to-Face A",
                value: `${Number(dims.centerToFaceAMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.centerToFaceBMm)
              dimensionRows.push({
                label: "Center-to-Face B",
                value: `${Number(dims.centerToFaceBMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.centerToEndCMm)
              dimensionRows.push({
                label: "Center-to-End C",
                value: `${Number(dims.centerToEndCMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.centerToEndMMm)
              dimensionRows.push({
                label: "Center-to-End M",
                value: `${Number(dims.centerToEndMMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.centerToCenterOMm)
              dimensionRows.push({
                label: "Center-to-Center O",
                value: `${Number(dims.centerToCenterOMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.backToFaceKMm)
              dimensionRows.push({
                label: "Back-to-Face K",
                value: `${Number(dims.backToFaceKMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.outsideDiameterMm)
              dimensionRows.push({
                label: "OD",
                value: `${Number(dims.outsideDiameterMm).toFixed(1)} mm`,
                hasTolerance: false,
              });
            if (dims.wallThicknessMm)
              dimensionRows.push({
                label: "Wall Thickness",
                value: `${Number(dims.wallThicknessMm).toFixed(2)} mm`,
                hasTolerance: false,
              });
          }

          if (isForgedStandard) {
            if (dims.dimensionAMm)
              dimensionRows.push({
                label: "Dimension A",
                value: `${Number(dims.dimensionAMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.dimensionBMm)
              dimensionRows.push({
                label: "Dimension B",
                value: `${Number(dims.dimensionBMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.dimensionCMm)
              dimensionRows.push({
                label: "Dimension C",
                value: `${Number(dims.dimensionCMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.dimensionDMm)
              dimensionRows.push({
                label: "Dimension D",
                value: `${Number(dims.dimensionDMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.dimensionEMm)
              dimensionRows.push({
                label: "Dimension E",
                value: `${Number(dims.dimensionEMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.socketDepthMm)
              dimensionRows.push({
                label: "Socket Depth (J)",
                value: `${Number(dims.socketDepthMm).toFixed(1)} mm`,
                hasTolerance: true,
              });
            if (dims.minWallThicknessMm)
              dimensionRows.push({
                label: "Min Wall (G)",
                value: `${Number(dims.minWallThicknessMm).toFixed(2)} mm`,
                hasTolerance: false,
              });
          }

          if (dimensionRows.length === 0) return null;

          const dbWeight = isAnsiStandard
            ? dims.weightKg
              ? Number(dims.weightKg)
              : null
            : dims.massKg
              ? Number(dims.massKg)
              : null;
          const rawQuantityValue2 = specs.quantityValue;
          const quantity = rawQuantityValue2 || 1;

          return (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                  {isAnsiStandard ? "ASME B16.9" : "ASME B16.11"} Dimensions
                </h4>
                <span
                  className="text-xs text-blue-500 dark:text-blue-400 cursor-help"
                  title={`Center-to-end/face dimensions: ${tolerance} per ${isAnsiStandard ? "ASME B16.9" : "ASME B16.11"}`}
                >
                  Tolerance: {tolerance}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {dimensionRows.map((row) => (
                  <div key={row.label} className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{row.label}: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {row.value}
                    </span>
                    {row.hasTolerance && (
                      <span
                        className="ml-1 text-blue-400 cursor-help"
                        title={`${tolerance} per standard`}
                      >
                        ~
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {dbWeight !== null && (
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-600 flex items-center gap-4">
                  <div className="text-xs">
                    <span className="text-blue-600 dark:text-blue-300 font-semibold">
                      Unit Weight:{" "}
                    </span>
                    <span className="font-bold text-blue-900 dark:text-blue-100">
                      {dbWeight.toFixed(2)} kg
                    </span>
                  </div>
                  {quantity > 1 && (
                    <div className="text-xs">
                      <span className="text-blue-600 dark:text-blue-300 font-semibold">
                        Total ({quantity} pcs):{" "}
                      </span>
                      <span className="font-bold text-blue-900 dark:text-blue-100">
                        {(dbWeight * quantity).toFixed(2)} kg
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-blue-400 italic">from database</span>
                </div>
              )}
            </div>
          );
        })()}

      {/* ROW 2: Flange Specifications - Horizontal Layout */}
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-3">
        <div className="mb-2">
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 border-b border-amber-400 pb-1.5">
            Flanges
          </h4>
        </div>

        {(() => {
          const rawWorkingPressureBar3 = specs.workingPressureBar;
          const rawGlobalWorkingPressureBar3 = globalSpecs?.workingPressureBar;
          const workingPressureBar = rawWorkingPressureBar3 || rawGlobalWorkingPressureBar3 || 0;
          const rawPipeEndConfiguration2 = specs.pipeEndConfiguration;
          const fittingEndConfig = rawPipeEndConfiguration2 || "PE";
          const rawFoePosition = specs.foePosition;
          const fittingFlangeConfig = getFittingFlangeConfig(fittingEndConfig, rawFoePosition);
          const reducerFlangeConfigVal = getReducerFlangeConfig(fittingEndConfig);
          const rawHasLargeEnd = reducerFlangeConfigVal.hasLargeEnd;
          const rawHasSmallEnd = reducerFlangeConfigVal.hasSmallEnd;
          const rawHasInlet = fittingFlangeConfig.hasInlet;
          const rawHasOutlet = fittingFlangeConfig.hasOutlet;
          const rawHasBranch = fittingFlangeConfig.hasBranch;
          const hasFlangesSelected = isReducer
            ? rawHasLargeEnd || rawHasSmallEnd
            : rawHasInlet || rawHasOutlet || rawHasBranch;
          const availableBlankPositions = isReducer
            ? [
                {
                  key: "large",
                  label: "Large End",
                  hasFlange: rawHasLargeEnd,
                },
                {
                  key: "small",
                  label: "Small End",
                  hasFlange: rawHasSmallEnd,
                },
              ].filter((p) => p.hasFlange)
            : [
                { key: "inlet", label: "Inlet", hasFlange: rawHasInlet },
                { key: "outlet", label: "Outlet", hasFlange: rawHasOutlet },
                { key: "branch", label: "Branch", hasFlange: rawHasBranch },
              ].filter((p) => p.hasFlange);
          const rawBlankFlangePositions = specs.blankFlangePositions;
          const currentBlankPositions = rawBlankFlangePositions || [];
          const rawPipeEndConfiguration3 = specs.pipeEndConfiguration;
          const defaultSelectClass =
            "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";

          const rawFlangeStandardId = specs.flangeStandardId;
          const rawFlangePressureClassId = specs.flangePressureClassId;
          const rawFlangeTypeCode = specs.flangeTypeCode;
          const rawGlobalFlangeStandardId = globalSpecs?.flangeStandardId;
          const rawGlobalFlangePressureClassId = globalSpecs?.flangePressureClassId;
          const rawGlobalFlangeTypeCode = globalSpecs?.flangeTypeCode;
          const rawFlangeStandards = masterData.flangeStandards;
          const flangeStandardsList = rawFlangeStandards || [];
          const rawPressureClasses = masterData.pressureClasses;
          const pressureClassesList = rawPressureClasses || [];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <FlangeDropdownTriplet
                flangeStandardId={rawFlangeStandardId}
                flangePressureClassId={rawFlangePressureClassId}
                flangeTypeCode={rawFlangeTypeCode}
                globalFlangeStandardId={rawGlobalFlangeStandardId}
                globalFlangePressureClassId={rawGlobalFlangePressureClassId}
                globalFlangeTypeCode={rawGlobalFlangeTypeCode}
                flangeStandards={flangeStandardsList}
                pressureClasses={pressureClassesList}
                pressureClassesByStandard={pressureClassesByStandard}
                allFlangeTypes={allFlangeTypes}
                workingPressureBar={workingPressureBar}
                onStandardChange={(standardId) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      flangeStandardId: standardId,
                      flangePressureClassId: undefined,
                      flangeTypeCode: undefined,
                    },
                  });
                }}
                onPressureClassChange={(classId) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      flangePressureClassId: classId,
                    },
                  });
                }}
                onFlangeTypeChange={(typeCode) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      flangeTypeCode: typeCode,
                    },
                  });
                }}
                onLoadPressureClasses={getFilteredPressureClasses}
              />
              {/* 4th Column: Flange Config & Blank Flanges */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-amber-900">Flange Config *</label>
                  {hasFlangesSelected && availableBlankPositions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700">Blanks:</span>
                      {availableBlankPositions.map((pos) => (
                        <label
                          key={pos.key}
                          className="flex items-center gap-0.5 text-xs text-amber-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={currentBlankPositions.includes(pos.key)}
                            onChange={(e) => {
                              const newPositions = e.target.checked
                                ? [...currentBlankPositions, pos.key]
                                : currentBlankPositions.filter((p: string) => p !== pos.key);
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  addBlankFlange: newPositions.length > 0,
                                  blankFlangeCount: newPositions.length,
                                  blankFlangePositions: newPositions,
                                },
                              });
                            }}
                            className="w-3 h-3 text-amber-600 rounded focus:ring-amber-500"
                          />
                          {pos.label[0]}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={rawPipeEndConfiguration3 || "PE"}
                  onChange={async (e) => {
                    const newConfig = e.target.value;
                    let weldDetails = null;
                    try {
                      weldDetails = await getPipeEndConfigurationDetails(newConfig);
                    } catch (error) {
                      log.warn("Could not get pipe end configuration details:", error);
                    }
                    const rawGlobalFlangeTypeCode2 = globalSpecs?.flangeTypeCode;
                    const effectiveFlangeTypeCode =
                      rawGlobalFlangeTypeCode2 || recommendedFlangeTypeCode(newConfig);
                    const rawSpecsFlangeStandardId = specs.flangeStandardId;
                    const rawGlobalFlangeStandardId2 = globalSpecs?.flangeStandardId;
                    const flangeStdId = rawSpecsFlangeStandardId || rawGlobalFlangeStandardId2;
                    const rawFlangeStdMatch = masterData.flangeStandards?.find(
                      (s: FlangeStandardItem) => s.id === flangeStdId,
                    );
                    const rawFlangeStdMatchCode = rawFlangeStdMatch?.code;
                    const flangeStdCode = rawFlangeStdMatchCode || "";
                    const rawSpecsWorkingPressureBar = specs.workingPressureBar;
                    const rawGlobalWorkingPressureBar2 = globalSpecs?.workingPressureBar;
                    const wp = rawSpecsWorkingPressureBar || rawGlobalWorkingPressureBar2 || 0;
                    const rawClassesByStandard = flangeStdId
                      ? pressureClassesByStandard[flangeStdId]
                      : null;
                    let availableClasses = rawClassesByStandard || [];
                    if (availableClasses.length === 0 && flangeStdId) {
                      const rawFilteredClasses = masterData.pressureClasses?.filter(
                        (pc: PressureClassItem) =>
                          pc.flangeStandardId === flangeStdId || pc.standardId === flangeStdId,
                      );
                      availableClasses = rawFilteredClasses || [];
                    }
                    const rawSpecsFlangePressureClassId = specs.flangePressureClassId;
                    const rawGlobalFlangePressureClassId2 = globalSpecs?.flangePressureClassId;
                    const newPressureClassId =
                      wp > 0 && availableClasses.length > 0
                        ? recommendedPressureClassId(
                            wp,
                            availableClasses,
                            flangeStdCode,
                            effectiveFlangeTypeCode,
                          )
                        : rawSpecsFlangePressureClassId || rawGlobalFlangePressureClassId2;
                    const updatedEntry: any = {
                      specs: {
                        ...entry.specs,
                        pipeEndConfiguration: newConfig,
                        flangeTypeCode: effectiveFlangeTypeCode,
                        ...(newPressureClassId && {
                          flangePressureClassId: newPressureClassId,
                        }),
                        foePosition: newConfig === "2X_LF_FOE" ? "inlet" : undefined,
                      },
                      ...(weldDetails && { weldInfo: weldDetails }),
                    };
                    updatedEntry.description = generateItemDescription({
                      ...entry,
                      ...updatedEntry,
                    });
                    onUpdateEntry(entry.id, updatedEntry);
                    debouncedCalculate();
                  }}
                  className={defaultSelectClass}
                  required
                >
                  {(isReducer || isOffsetBend ? REDUCER_END_OPTIONS : FITTING_END_OPTIONS).map(
                    (opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ),
                  )}
                </select>
                {(() => {
                  const storedConfig = specs.pipeEndConfiguration;
                  const validOptions =
                    isReducer || isOffsetBend ? REDUCER_END_OPTIONS : FITTING_END_OPTIONS;
                  const isValidConfig = validOptions.some((opt) => opt.value === storedConfig);
                  const effectiveConfig = isValidConfig ? storedConfig : "PE";
                  if (effectiveConfig === "PE") return null;
                  const weldCount = getWeldCountPerFitting(effectiveConfig);
                  return (
                    <p className="mt-0.5 text-xs text-amber-700">
                      {weldCount} weld{weldCount !== 1 ? "s" : ""}
                    </p>
                  );
                })()}
                {specs.pipeEndConfiguration === "2X_LF_FOE" && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs font-semibold text-amber-800 mb-1.5">
                      Select fixed flange position:
                    </p>
                    <div className="flex gap-4">
                      {(["inlet", "outlet", "branch"] as const).map((position) => (
                        <label key={position} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`foe-position-${entry.id}`}
                            checked={specs.foePosition === position}
                            onChange={() => {
                              const updatedEntry: any = {
                                specs: {
                                  ...entry.specs,
                                  foePosition: position,
                                },
                              };
                              updatedEntry.description = generateItemDescription({
                                ...entry,
                                ...updatedEntry,
                              });
                              onUpdateEntry(entry.id, updatedEntry);
                              debouncedCalculate();
                            }}
                            className="w-3.5 h-3.5 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs font-medium text-amber-900 capitalize">
                            {position}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ROW 3: Quantity & Pipe Lengths - Combined Blue Area */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between border-b border-blue-400 pb-1.5 mb-3">
          <h4 className="text-sm font-bold text-blue-900">Quantity & Dimensions</h4>
          {isLateral && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={rawHasStubs || false}
                onChange={(e) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      hasStubs: e.target.checked,
                      numberOfStubs: e.target.checked ? 1 : undefined,
                      stubs: e.target.checked
                        ? [
                            {
                              steelSpecId: specs.steelSpecificationId,
                              nominalBoreMm: 50,
                              distanceFromOutletMm: 100,
                              outletLocation: "branch",
                              positionDegrees: 0,
                            },
                          ]
                        : undefined,
                    },
                  });
                }}
                className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
              />
              Add Stubs
            </label>
          )}
        </div>
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${isUnequalTee || isLateral ? "md:grid-cols-6" : isReducer ? "md:grid-cols-3" : isOffsetBend ? "md:grid-cols-5" : "md:grid-cols-3"} gap-3`}
        >
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">Quantity *</label>
            <input
              type="number"
              value={fittingQuantityDisplayValue}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === "") {
                  onUpdateEntry(entry.id, {
                    specs: { ...entry.specs, quantityValue: undefined },
                  });
                  return;
                }
                const qty = Number(rawValue);
                onUpdateEntry(entry.id, {
                  specs: { ...entry.specs, quantityValue: qty },
                });
                debouncedCalculate();
              }}
              onBlur={(e) => {
                if (e.target.value === "" || Number(e.target.value) < 1) {
                  onUpdateEntry(entry.id, { specs: { ...entry.specs, quantityValue: 1 } });
                  debouncedCalculate();
                }
              }}
              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              min="1"
              placeholder="1"
            />
          </div>

          {/* Pipe Length A - or Angle Range for Laterals/Y-Pieces (not for reducers or offset bends) */}
          {(() => {
            const fittingType = specs.fittingType;
            const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType || "");
            const isOffsetBendType = fittingType === "OFFSET_BEND";
            if (isReducerType || isOffsetBendType) return null;

            const isLateral = fittingType === "LATERAL" || fittingType === "Y_PIECE";
            const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType || "");
            const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
              fittingType || "",
            );
            const isReducingTee = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(
              fittingType || "",
            );
            const isTee = isEqualTee || isUnequalTee || isReducingTee;
            const isAutoA = specs.pipeLengthAMmAuto && !specs.pipeLengthAOverride;

            if (isLateral) {
              const rawAngleRange = specs.angleRange;
              return (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Angle Range *
                  </label>
                  <select
                    value={rawAngleRange || ""}
                    onChange={async (e) => {
                      const angleRange = e.target.value;
                      const rawSteelSpecificationId16 = specs.steelSpecificationId;
                      const isSABS719 =
                        (rawSteelSpecificationId16 || globalSpecs?.steelSpecificationId) === 8;
                      const rawFittingStandard6 = specs.fittingStandard;
                      const effectiveStandard =
                        rawFittingStandard6 || (isSABS719 ? "SABS719" : "SABS62");

                      let pipeLengthA = specs.pipeLengthAMm;
                      let pipeLengthB = specs.pipeLengthBMm;
                      let pipeLengthAMmAuto = specs.pipeLengthAMmAuto;
                      let pipeLengthBMmAuto = specs.pipeLengthBMmAuto;
                      let lateralHeightMm = specs.lateralHeightMm;
                      let lateralHeightMmAuto = specs.lateralHeightMmAuto;

                      if (specs.fittingType && specs.nominalDiameterMm && angleRange) {
                        try {
                          const dims = await masterDataApi.getFittingDimensions(
                            effectiveStandard as "SABS62" | "SABS719",
                            entry.specs.fittingType,
                            entry.specs.nominalDiameterMm,
                            angleRange,
                          );
                          if (dims) {
                            const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                            const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                            if (dimA && !specs.pipeLengthAOverride) {
                              pipeLengthA = dimA;
                              pipeLengthAMmAuto = dimA;
                            }
                            if (dimB && !specs.pipeLengthBOverride) {
                              pipeLengthB = dimB;
                              pipeLengthBMmAuto = dimB;
                            }
                          }
                        } catch (err) {
                          log.debug("Could not fetch fitting dimensions:", err);
                        }

                        // Auto-populate lateral height (A/C/E dimension) from MPS manual
                        const lateralDims = getLateralDimensionsForAngle(
                          entry.specs.nominalDiameterMm,
                          angleRange as LateralAngleRange,
                        );
                        if (lateralDims && !specs.lateralHeightOverride) {
                          lateralHeightMm = lateralDims.heightMm;
                          lateralHeightMmAuto = lateralDims.heightMm;
                        }
                      }

                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          angleRange,
                          pipeLengthAMm: pipeLengthA,
                          pipeLengthBMm: pipeLengthB,
                          pipeLengthAMmAuto,
                          pipeLengthBMmAuto,
                          lateralHeightMm,
                          lateralHeightMmAuto,
                        },
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select angle range...</option>
                    <option value="60-90">60° - 90°</option>
                    <option value="45-59">45° - 59°</option>
                    <option value="30-44">30° - 44°</option>
                  </select>
                </div>
              );
            }

            const rawPipeLengthAMm = specs.pipeLengthAMm;

            return (
              <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Pipe Length A (mm) *
                  {isEqualTee && (
                    <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>
                  )}
                  {!isEqualTee && isAutoA && (
                    <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                  )}
                  {!isEqualTee && specs.pipeLengthAOverride && (
                    <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={rawPipeLengthAMm || ""}
                  onChange={(e) => {
                    if (isEqualTee) return;
                    const newValue = Number(e.target.value);
                    const isOverride =
                      specs.pipeLengthAMmAuto && newValue !== specs.pipeLengthAMmAuto;
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        pipeLengthAMm: newValue,
                        pipeLengthAOverride: isOverride,
                      },
                    });
                  }}
                  className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 ${
                    isEqualTee
                      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium"
                      : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  }`}
                  placeholder="e.g., 1000"
                  min="0"
                  readOnly={isEqualTee}
                  aria-readonly={isEqualTee}
                />
                {(isUnequalTee || isReducingTee) && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
                )}
              </div>
            );
          })()}

          {/* Pipe Length B - or Degrees for Laterals (not for reducers or offset bends) */}
          {(() => {
            const fittingType = specs.fittingType;
            const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType || "");
            const isOffsetBendType = fittingType === "OFFSET_BEND";
            if (isReducerType || isOffsetBendType) return null;

            const isLateral = fittingType === "LATERAL";
            const isYPiece = fittingType === "Y_PIECE";
            const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType || "");
            const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
              fittingType || "",
            );
            const isReducingTee = ["SHORT_REDUCING_TEE", "GUSSET_REDUCING_TEE"].includes(
              fittingType || "",
            );
            const isTee = isEqualTee || isUnequalTee || isReducingTee;
            const isAutoB = specs.pipeLengthBMmAuto && !specs.pipeLengthBOverride;

            if (isLateral) {
              const rawDegrees = specs.degrees;
              return (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Degrees *
                  </label>
                  <input
                    type="number"
                    value={rawDegrees || ""}
                    onChange={(e) => {
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, degrees: Number(e.target.value) },
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    placeholder="e.g., 45, 60, 90"
                    min="30"
                    max="90"
                  />
                </div>
              );
            }

            if (isYPiece) {
              const rawPipeLengthBMm = specs.pipeLengthBMm;
              return (
                <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Pipe Length B (mm) *
                    {isAutoB && (
                      <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                    )}
                    {specs.pipeLengthBOverride && (
                      <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={rawPipeLengthBMm || ""}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      const isOverride =
                        specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          pipeLengthBMm: newValue,
                          pipeLengthBOverride: isOverride,
                        },
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-blue-50"
                    placeholder="e.g., 1000"
                    min="0"
                  />
                </div>
              );
            }

            const rawPipeLengthBMm2 = specs.pipeLengthBMm;

            return (
              <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Pipe Length B (mm) *
                  {isEqualTee && (
                    <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>
                  )}
                  {!isEqualTee && isAutoB && (
                    <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                  )}
                  {!isEqualTee && specs.pipeLengthBOverride && (
                    <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                  )}
                </label>
                <input
                  type="number"
                  value={rawPipeLengthBMm2 || ""}
                  onChange={(e) => {
                    if (isEqualTee) return;
                    const newValue = Number(e.target.value);
                    const isOverride =
                      specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        pipeLengthBMm: newValue,
                        pipeLengthBOverride: isOverride,
                      },
                    });
                  }}
                  className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 ${
                    isEqualTee
                      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium"
                      : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  }`}
                  placeholder="e.g., 1000"
                  min="0"
                  readOnly={isEqualTee}
                  aria-readonly={isEqualTee}
                />
                {(isUnequalTee || isReducingTee) && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
                )}
              </div>
            );
          })()}

          {/* Pipe Length A - for Laterals in the same row */}
          {isLateral && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Pipe Length A (mm) *
                {specs.pipeLengthAMmAuto && !specs.pipeLengthAOverride && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                )}
                {specs.pipeLengthAOverride && (
                  <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                )}
              </label>
              <input
                type="number"
                value={rawPipeLengthAMm2 || ""}
                onChange={(e) => {
                  const newValue = Number(e.target.value);
                  const isOverride =
                    specs.pipeLengthAMmAuto && newValue !== specs.pipeLengthAMmAuto;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      pipeLengthAMm: newValue,
                      pipeLengthAOverride: isOverride,
                    },
                  });
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 915"
                min="0"
              />
            </div>
          )}

          {/* Pipe Length B - for Laterals in the same row */}
          {isLateral && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Pipe Length B (mm) *
                {specs.pipeLengthBMmAuto && !specs.pipeLengthBOverride && (
                  <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                )}
                {specs.pipeLengthBOverride && (
                  <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                )}
              </label>
              <input
                type="number"
                value={rawPipeLengthBMm3 || ""}
                onChange={(e) => {
                  const newValue = Number(e.target.value);
                  const isOverride =
                    specs.pipeLengthBMmAuto && newValue !== specs.pipeLengthBMmAuto;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      pipeLengthBMm: newValue,
                      pipeLengthBOverride: isOverride,
                    },
                  });
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 1120"
                min="0"
              />
            </div>
          )}

          {/* Dimension A/C/E - Height dimension for Laterals based on angle */}
          {isLateral && (
            <div>
              {(() => {
                const angleRange = specs.angleRange as LateralAngleRange | undefined;
                const nominalBore = specs.nominalDiameterMm;
                const dimensionLabel =
                  angleRange === "60-90" ? "A" : angleRange === "45-59" ? "C" : "E";
                const lateralDims =
                  nominalBore && angleRange
                    ? getLateralDimensionsForAngle(nominalBore, angleRange)
                    : null;
                const autoHeight = lateralDims?.heightMm;
                const currentHeight = specs.lateralHeightMm;
                const isAuto =
                  autoHeight && currentHeight === autoHeight && !specs.lateralHeightOverride;
                const isOverride = specs.lateralHeightOverride;

                const rawLateralHeightMm = specs.lateralHeightMm;

                return (
                  <>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Dimension {dimensionLabel} (mm)
                      {isAuto && (
                        <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>
                      )}
                      {isOverride && (
                        <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={rawLateralHeightMm || ""}
                      onChange={(e) => {
                        const newValue = Number(e.target.value);
                        const isOverrideNow = autoHeight && newValue !== autoHeight;
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            lateralHeightMm: newValue,
                            lateralHeightOverride: isOverrideNow,
                          },
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder={autoHeight ? `e.g., ${autoHeight}` : "Height"}
                      min="0"
                    />
                  </>
                );
              })()}
            </div>
          )}

          {/* Tee Steel Spec - Inside blue section for Unequal Tees */}
          {isUnequalTee && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Tee Steel *<span className="text-blue-600 text-xs ml-1 font-normal">(Branch)</span>
              </label>
              {(() => {
                const rawSteelSpecificationId17 = specs.steelSpecificationId;
                const mainSteelSpecId =
                  rawSteelSpecificationId17 || globalSpecs?.steelSpecificationId;
                const rawTeeSteelSpecificationId = specs.teeSteelSpecificationId;
                const teeSteelSpecId = rawTeeSteelSpecificationId || mainSteelSpecId;
                const isUsingMainSpec = !specs.teeSteelSpecificationId;

                return (
                  <Select
                    value={String(teeSteelSpecId || "")}
                    onChange={(value) => {
                      const newSpecId = value ? parseInt(value, 10) : undefined;
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          teeSteelSpecificationId: newSpecId,
                          teeNominalDiameterMm: undefined,
                        },
                      });
                    }}
                    className={
                      isUsingMainSpec ? "border-2 border-green-500" : "border-2 border-orange-500"
                    }
                    options={[]}
                    groupedOptions={groupedSteelOptions}
                    placeholder="Select..."
                  />
                );
              })()}
            </div>
          )}

          {/* Tee NB - Inside blue section for Unequal Tees */}
          {isUnequalTee && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Tee NB (mm) *
                <span className="text-blue-600 text-xs ml-1 font-normal">(Branch)</span>
              </label>
              {(() => {
                const rawNominalDiameterMm6 = specs.nominalDiameterMm;
                const mainNB = rawNominalDiameterMm6 || 0;
                const rawSteelSpecificationId18 = specs.steelSpecificationId;
                const mainSteelSpecId =
                  rawSteelSpecificationId18 || globalSpecs?.steelSpecificationId;
                const rawTeeSteelSpecificationId2 = specs.teeSteelSpecificationId;
                const teeSteelSpecId = rawTeeSteelSpecificationId2 || mainSteelSpecId;
                const isSABS719Tee = teeSteelSpecId === 8;
                const availableSizes = isSABS719Tee
                  ? [...SABS719_FITTING_SIZES]
                  : [...ALL_FITTING_SIZES];
                const sizes = availableSizes.filter((nb) => nb <= mainNB);
                const options = sizes.map((nb: number) => ({
                  value: String(nb),
                  label: `${nb}mm`,
                }));

                return (
                  <Select
                    id={`fitting-tee-nb-blue-${entry.id}`}
                    value={
                      specs.teeNominalDiameterMm ? String(entry.specs.teeNominalDiameterMm) : ""
                    }
                    onChange={(value) => {
                      if (!value) return;
                      const teeDiameter = Number(value);
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          teeNominalDiameterMm: teeDiameter,
                        },
                      });
                      debouncedCalculate();
                    }}
                    options={options}
                    placeholder="Select..."
                  />
                );
              })()}
            </div>
          )}

          {/* Location of Tee - Inside blue section for Unequal Tees */}
          {isUnequalTee && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Location (mm)
                <span className="text-blue-600 text-xs ml-1 font-normal">(from left)</span>
              </label>
              <input
                type="number"
                value={rawStubLocation || ""}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  onUpdateEntry(entry.id, {
                    specs: { ...entry.specs, stubLocation: value },
                  });
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 500"
                min="0"
              />
            </div>
          )}

          {/* Reducer Length - For Reducers */}
          {isReducer && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Length (mm)
                {specs.reducerLengthMmAuto && !specs.reducerLengthOverride && (
                  <span className="text-green-600 text-xs ml-1 font-normal">(auto)</span>
                )}
                {specs.reducerLengthOverride && (
                  <span className="text-orange-600 text-xs ml-1 font-normal">(override)</span>
                )}
              </label>
              <input
                type="number"
                value={rawReducerLengthMm || ""}
                onChange={(e) => {
                  const newValue = e.target.value ? Number(e.target.value) : undefined;
                  const autoLength = specs.reducerLengthMmAuto;
                  const isOverrideNow = autoLength && newValue !== autoLength;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      reducerLengthMm: newValue,
                      reducerLengthOverride: isOverrideNow,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder={
                  specs.reducerLengthMmAuto ? `e.g., ${entry.specs.reducerLengthMmAuto}` : "Length"
                }
                min="0"
              />
            </div>
          )}

          {/* Reducer Stub - Checkbox only, sub-fields on separate row */}
          {isReducer && (
            <div className="flex items-center h-full pt-5">
              <input
                type="checkbox"
                id={`reducer-stub-${entry.id}`}
                checked={rawHasReducerStub || false}
                onChange={(e) => {
                  const rawReducerStubNbMm = specs.reducerStubNbMm;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      hasReducerStub: e.target.checked,
                      reducerStubNbMm: e.target.checked ? rawReducerStubNbMm || 50 : undefined,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`reducer-stub-${entry.id}`}
                className="ml-2 text-xs font-semibold text-blue-900 cursor-pointer"
              >
                Add Center Stub
              </label>
            </div>
          )}

          {/* Offset Bend - Length A */}
          {isOffsetBend && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Length A (mm)
                <span className="text-gray-500 text-xs ml-1 font-normal">(first)</span>
              </label>
              <input
                type="number"
                value={rawOffsetLengthA || ""}
                onChange={(e) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      offsetLengthA: e.target.value ? Number(e.target.value) : undefined,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 300"
                min="0"
              />
            </div>
          )}

          {/* Offset Bend - Length B */}
          {isOffsetBend && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Length B (mm)
                <span className="text-gray-500 text-xs ml-1 font-normal">(middle)</span>
              </label>
              <input
                type="number"
                value={rawOffsetLengthB || ""}
                onChange={(e) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      offsetLengthB: e.target.value ? Number(e.target.value) : undefined,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 200"
                min="0"
              />
            </div>
          )}

          {/* Offset Bend - Length C */}
          {isOffsetBend && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Length C (mm)
                <span className="text-gray-500 text-xs ml-1 font-normal">(last)</span>
              </label>
              <input
                type="number"
                value={rawOffsetLengthC || ""}
                onChange={(e) => {
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      offsetLengthC: e.target.value ? Number(e.target.value) : undefined,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="e.g., 300"
                min="0"
              />
            </div>
          )}

          {/* Offset Bend - Angle */}
          {isOffsetBend && (
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Offset Angle (°)
              </label>
              <select
                value={rawOffsetAngleDegrees || ""}
                onChange={(e) => {
                  const angle = e.target.value ? Number(e.target.value) : undefined;
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      offsetAngleDegrees: angle,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
              >
                <option value="">Select...</option>
                {Array.from({ length: 90 }, (_, i) => i + 1).map((deg) => (
                  <option key={deg} value={deg}>
                    {deg}°
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Reducer Stub Sub-fields - Shown when Add Center Stub is checked */}
        {isReducer && specs.hasReducerStub && (
          <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Stub Steel</label>
              {(() => {
                const rawSteelSpecificationId19 = specs.steelSpecificationId;
                const mainSteelSpecId =
                  rawSteelSpecificationId19 || globalSpecs?.steelSpecificationId;
                const rawReducerStubSteelSpecId = specs.reducerStubSteelSpecId;
                const stubSteelSpecId = rawReducerStubSteelSpecId || mainSteelSpecId;
                const isUsingMainSpec = !specs.reducerStubSteelSpecId;
                return (
                  <Select
                    value={String(stubSteelSpecId || "")}
                    onChange={(value) => {
                      const newSpecId = value ? parseInt(value, 10) : undefined;
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          reducerStubSteelSpecId: newSpecId,
                        },
                      });
                      debouncedCalculate();
                    }}
                    className={
                      isUsingMainSpec ? "border-2 border-green-500" : "border-2 border-orange-500"
                    }
                    options={[]}
                    groupedOptions={groupedSteelOptions}
                    placeholder="Select..."
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">Stub NB (mm)</label>
              {(() => {
                const rawSmallNominalDiameterMm = specs.smallNominalDiameterMm;
                const smallNB = rawSmallNominalDiameterMm || 0;
                const maxStubNB = smallNB - 50;
                const rawReducerStubSteelSpecId2 = specs.reducerStubSteelSpecId;
                const rawSpecsSteelSpecId = specs.steelSpecificationId;
                const rawGlobalSteelSpecId = globalSpecs?.steelSpecificationId;
                const stubSteelSpecId =
                  rawReducerStubSteelSpecId2 || rawSpecsSteelSpecId || rawGlobalSteelSpecId;
                const rawSteelSpecs = masterData?.steelSpecs;
                const stubSteelSpec = rawSteelSpecs?.find(
                  (s: SteelSpecItem) => s.id === stubSteelSpecId,
                );
                const rawStubSpecName = stubSteelSpec?.steelSpecName;
                const isSABS719Stub =
                  rawStubSpecName?.includes("SABS 719") || rawStubSpecName?.includes("SANS 719");
                const minStubNB = isSABS719Stub ? 200 : 15;
                const allStubSizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
                const stubSizes = allStubSizes.filter((nb) => nb >= minStubNB && nb <= maxStubNB);
                const rawReducerStubNbMm2 = specs.reducerStubNbMm;
                return (
                  <select
                    value={rawReducerStubNbMm2 || ""}
                    onChange={(e) => {
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          reducerStubNbMm: Number(e.target.value),
                        },
                      });
                      debouncedCalculate();
                    }}
                    className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Select...</option>
                    {stubSizes.map((nb) => (
                      <option key={nb} value={nb}>
                        {nb}mm
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Location (mm)
                <span className="text-green-600 text-xs ml-1 font-normal">(center)</span>
              </label>
              <input
                type="number"
                value={specs.reducerLengthMm ? Math.round(entry.specs.reducerLengthMm / 2) : ""}
                disabled
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-gray-100 text-gray-700 cursor-not-allowed"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-1">
                Angle (°)
                <span className="text-green-600 text-xs ml-1 font-normal">(0-360)</span>
              </label>
              <input
                type="number"
                min="0"
                max="360"
                value={rawReducerStubAngleDegrees || 0}
                onChange={(e) => {
                  const angle = Math.min(360, Math.max(0, Number(e.target.value) || 0));
                  onUpdateEntry(entry.id, {
                    specs: {
                      ...entry.specs,
                      reducerStubAngleDegrees: angle,
                    },
                  });
                  debouncedCalculate();
                }}
                className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                placeholder="0"
              />
            </div>
            <p className="col-span-4 text-xs text-blue-600 mt-1">Stub flanged same as reducer</p>
          </div>
        )}
      </div>

      {/* Stubs Configuration Section - Only for Laterals when hasStubs is checked */}
      {isLateral && specs.hasStubs && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
          <h4 className="text-sm font-bold text-orange-900 border-b border-orange-400 pb-1.5 mb-3">
            Stub Configuration
          </h4>
          <div className="space-y-4">
            {/* Number of Stubs */}
            <div className="flex items-start gap-4">
              <div className="w-32">
                <label className="block text-xs font-semibold text-orange-900 mb-1">
                  No. of Stubs
                </label>
                <select
                  value={rawNumberOfStubs || 1}
                  onChange={(e) => {
                    const count = Number(e.target.value) as 1 | 2 | 3;
                    const rawStubs = specs.stubs;
                    const currentStubs = rawStubs || [];
                    const defaultStub = {
                      steelSpecId: specs.steelSpecificationId,
                      nominalBoreMm: 50,
                      distanceFromOutletMm: 100,
                      stubLengthMm: 150,
                      outletLocation: "branch" as const,
                      positionDegrees: 0,
                    };

                    let newStubs;
                    if (count === 1) {
                      const rawItem0 = currentStubs[0];
                      newStubs = [rawItem0 || defaultStub];
                    } else if (count === 2) {
                      const rawItem02 = currentStubs[0];
                      const rawItem1 = currentStubs[1];
                      newStubs = [
                        rawItem02 || defaultStub,
                        rawItem1 || {
                          ...defaultStub,
                          outletLocation: "inlet" as const,
                        },
                      ];
                    } else {
                      const rawItem03 = currentStubs[0];
                      const rawItem12 = currentStubs[1];
                      const rawItem2 = currentStubs[2];
                      newStubs = [
                        {
                          ...(rawItem03 || defaultStub),
                          outletLocation: "inlet" as const,
                        },
                        {
                          ...(rawItem12 || defaultStub),
                          outletLocation: "outlet" as const,
                        },
                        {
                          ...(rawItem2 || defaultStub),
                          outletLocation: "branch" as const,
                        },
                      ];
                    }

                    onUpdateEntry(entry.id, {
                      specs: {
                        ...entry.specs,
                        numberOfStubs: count,
                        stubs: newStubs,
                      },
                    });
                  }}
                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                >
                  <option value={1}>1 Stub</option>
                  <option value={2}>2 Stubs</option>
                  <option value={3}>3 Stubs</option>
                </select>
              </div>
            </div>

            {/* Stub Details */}
            <div className="space-y-3">
              {(rawStubs2 || []).map((stub: any, stubIndex: number) => {
                const rawHasBlankFlange = stub.hasBlankFlange;
                const rawOutletLocation = stub.outletLocation;
                const rawSteelSpecId = stub.steelSpecId;
                const rawNominalBoreMm = stub.nominalBoreMm;
                const rawDistanceFromOutletMm = stub.distanceFromOutletMm;
                const rawStubLengthMm = stub.stubLengthMm;
                const rawPositionDegrees = stub.positionDegrees;
                const rawEndConfiguration = stub.endConfiguration;
                const rawFlangeStandardId7 = stub.flangeStandardId;
                const rawFlangePressureClassId6 = stub.flangePressureClassId;

                return (
                  <div key={stubIndex} className="bg-white border border-orange-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-orange-800">Stub {stubIndex + 1}</p>
                      {stub.endConfiguration === "flanged" && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rawHasBlankFlange || false}
                            onChange={(e) => {
                              const rawStubs3 = specs.stubs;
                              const newStubs = [...(rawStubs3 || [])];
                              newStubs[stubIndex] = {
                                ...newStubs[stubIndex],
                                hasBlankFlange: e.target.checked,
                              };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs: newStubs },
                              });
                            }}
                            className="w-3.5 h-3.5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-xs font-medium text-gray-700">
                            Include Blank Flange
                          </span>
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {/* Outlet Location */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Outlet Location
                        </label>
                        <select
                          value={rawOutletLocation || "branch"}
                          onChange={(e) => {
                            const rawStubs4 = specs.stubs;
                            const newStubs = [...(rawStubs4 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              outletLocation: e.target.value,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          disabled={specs.numberOfStubs === 3}
                          className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 ${
                            specs.numberOfStubs === 3
                              ? "bg-gray-100 cursor-not-allowed"
                              : "bg-white"
                          }`}
                        >
                          <option value="inlet">Inlet (A)</option>
                          <option value="outlet">Outlet (B)</option>
                          <option value="branch">Branch</option>
                        </select>
                      </div>

                      {/* Steel Spec */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Steel Spec
                        </label>
                        <Select
                          value={String(rawSteelSpecId || "")}
                          onChange={(value) => {
                            const rawStubs5 = specs.stubs;
                            const newStubs = [...(rawStubs5 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              steelSpecId: value ? parseInt(value, 10) : undefined,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          options={[]}
                          groupedOptions={groupedSteelOptions}
                          placeholder="Select..."
                        />
                      </div>

                      {/* Nominal Bore */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          NB (mm)
                        </label>
                        <select
                          value={rawNominalBoreMm || ""}
                          onChange={(e) => {
                            const rawStubs6 = specs.stubs;
                            const newStubs = [...(rawStubs6 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              nominalBoreMm: e.target.value
                                ? parseInt(e.target.value, 10)
                                : undefined,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                        >
                          <option value="">Select...</option>
                          {[15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300].map(
                            (nb) => (
                              <option key={nb} value={nb}>
                                {nb}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {/* Distance from Outlet */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Distance from Flange Face (mm)
                        </label>
                        <input
                          type="number"
                          value={rawDistanceFromOutletMm || ""}
                          onChange={(e) => {
                            const rawStubs7 = specs.stubs;
                            const newStubs = [...(rawStubs7 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              distanceFromOutletMm: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                          placeholder="e.g., 100"
                          min="0"
                        />
                      </div>

                      {/* Stub Length */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Stub Length (mm)
                        </label>
                        <input
                          type="number"
                          value={rawStubLengthMm || ""}
                          onChange={(e) => {
                            const rawStubs8 = specs.stubs;
                            const newStubs = [...(rawStubs8 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              stubLengthMm: e.target.value ? Number(e.target.value) : undefined,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                          placeholder="e.g., 150"
                          min="0"
                        />
                      </div>

                      {/* Position (Degrees) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Position (°)
                        </label>
                        <select
                          value={rawPositionDegrees || 0}
                          onChange={(e) => {
                            const rawStubs9 = specs.stubs;
                            const newStubs = [...(rawStubs9 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              positionDegrees: Number(e.target.value),
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                        >
                          <option value={0}>0° (Top)</option>
                          <option value={45}>45°</option>
                          <option value={90}>90° (Right)</option>
                          <option value={135}>135°</option>
                          <option value={180}>180° (Bottom)</option>
                          <option value={225}>225°</option>
                          <option value={270}>270° (Left)</option>
                          <option value={315}>315°</option>
                        </select>
                      </div>
                    </div>
                    {/* Flange Specifications Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-orange-200">
                      {/* End Configuration */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          End Configuration
                        </label>
                        <select
                          value={rawEndConfiguration || "plain"}
                          onChange={(e) => {
                            const rawStubs10 = specs.stubs;
                            const newStubs = [...(rawStubs10 || [])];
                            newStubs[stubIndex] = {
                              ...newStubs[stubIndex],
                              endConfiguration: e.target.value,
                              hasBlankFlange:
                                e.target.value === "plain" ? false : stub.hasBlankFlange,
                            };
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubs: newStubs },
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                        >
                          <option value="plain">Plain (No Flange)</option>
                          <option value="flanged">Flanged</option>
                          <option value="rf">R/F (Rotating Flange)</option>
                        </select>
                      </div>

                      {/* Flange Standard - Only show if flanged or rf */}
                      {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Flange Standard
                          </label>
                          <select
                            value={rawFlangeStandardId7 || ""}
                            onChange={(e) => {
                              const standardId = parseInt(e.target.value, 10) || undefined;
                              const rawStubs11 = specs.stubs;
                              const newStubs = [...(rawStubs11 || [])];
                              newStubs[stubIndex] = {
                                ...newStubs[stubIndex],
                                flangeStandardId: standardId,
                                flangePressureClassId: undefined,
                              };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs: newStubs },
                              });
                              if (standardId) {
                                getFilteredPressureClasses(standardId);
                              }
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                          >
                            <option value="">Select...</option>
                            {masterData.flangeStandards?.map((standard: FlangeStandardItem) => (
                              <option key={standard.id} value={standard.id}>
                                {standard.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Pressure Class - Only show if flanged or rf */}
                      {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Pressure Class
                          </label>
                          <select
                            value={rawFlangePressureClassId6 || ""}
                            onChange={(e) => {
                              const rawStubs12 = specs.stubs;
                              const newStubs = [...(rawStubs12 || [])];
                              newStubs[stubIndex] = {
                                ...newStubs[stubIndex],
                                flangePressureClassId: parseInt(e.target.value, 10) || undefined,
                              };
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, stubs: newStubs },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                          >
                            <option value="">Select...</option>
                            {(() => {
                              const stdId = stub.flangeStandardId;
                              const rawStdId2 = pressureClassesByStandard[stdId];
                              const rawPressureClasses2 = masterData.pressureClasses;
                              const filtered = stdId ? rawStdId2 || [] : rawPressureClasses2 || [];
                              const seen = new Set<string>();
                              return filtered
                                .filter((pc: PressureClassItem) => {
                                  const label =
                                    pc.designation?.replace(/\/\d+$/, "") || pc.designation;
                                  if (seen.has(label)) return false;
                                  seen.add(label);
                                  return true;
                                })
                                .map((pressureClass: PressureClassItem) => (
                                  <option key={pressureClass.id} value={pressureClass.id}>
                                    {pressureClass.designation?.replace(/\/\d+$/, "") ||
                                      pressureClass.designation}
                                  </option>
                                ));
                            })()}
                          </select>
                        </div>
                      )}

                      {/* Flange Type - Only show if flanged or rf */}
                      {(stub.endConfiguration === "flanged" || stub.endConfiguration === "rf") &&
                        (() => {
                          const stubStandard = masterData.flangeStandards?.find(
                            (fs: FlangeStandardItem) => fs.id === stub.flangeStandardId,
                          );
                          const stubIsSabs1123 =
                            stubStandard?.code?.toUpperCase().includes("SABS") &&
                            stubStandard?.code?.includes("1123");
                          const stubIsBs4504 =
                            stubStandard?.code?.toUpperCase().includes("BS") &&
                            stubStandard?.code?.includes("4504");
                          const stubHasFlangeTypes = stubIsSabs1123 || stubIsBs4504;
                          const stubFlangeTypes = stubIsSabs1123
                            ? flangeTypesForStandardCode(allFlangeTypes, "SABS 1123") || []
                            : flangeTypesForStandardCode(allFlangeTypes, "BS 4504") || [];

                          const rawFlangeTypeCode5 = stub.flangeTypeCode;

                          return stubHasFlangeTypes ? (
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Flange Type
                              </label>
                              <select
                                value={rawFlangeTypeCode5 || ""}
                                onChange={(e) => {
                                  const rawStubs13 = specs.stubs;
                                  const newStubs = [...(rawStubs13 || [])];
                                  const rawValue6 = e.target.value;
                                  newStubs[stubIndex] = {
                                    ...newStubs[stubIndex],
                                    flangeTypeCode: rawValue6 || undefined,
                                  };
                                  onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, stubs: newStubs },
                                  });
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 bg-white"
                              >
                                <option value="">Select...</option>
                                {stubFlangeTypes.map((ft) => (
                                  <option key={ft.code} value={ft.code} title={ft.description}>
                                    {ft.name} ({ft.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null;
                        })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const FittingFormSpecsSection = memo(FittingFormSpecsSectionInner);
