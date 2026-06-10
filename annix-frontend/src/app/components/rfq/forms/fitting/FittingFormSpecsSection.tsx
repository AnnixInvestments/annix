"use client";

import { memo } from "react";
import {
  FITTING_END_OPTIONS,
  fittingFlangeConfig as getFittingFlangeConfig,
  reducerFlangeConfig as getReducerFlangeConfig,
  weldCountPerFitting as getWeldCountPerFitting,
  REDUCER_END_OPTIONS,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
} from "@/app/lib/config/rfq";
import { log } from "@/app/lib/logger";
import { getPipeEndConfigurationDetails } from "@/app/lib/utils/systemUtils";
import { FlangeDropdownTriplet } from "../sections/FlangeDropdownTriplet";
import { type FlangeStandardItem, type PressureClassItem } from "../shared";
import { FittingPrimarySpecsSection } from "./FittingPrimarySpecsSection";
import { FittingQuantityDimensionsSection } from "./FittingQuantityDimensionsSection";
import { FittingStubsConfigSection } from "./FittingStubsConfigSection";
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
      <FittingPrimarySpecsSection logic={props.logic} />

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
      <FittingQuantityDimensionsSection logic={props.logic} />

      {/* Stubs Configuration Section - Only for Laterals when hasStubs is checked */}
      <FittingStubsConfigSection logic={props.logic} />
    </>
  );
};

export const FittingFormSpecsSection = memo(FittingFormSpecsSectionInner);
