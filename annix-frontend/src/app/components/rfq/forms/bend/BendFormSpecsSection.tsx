"use client";

import {
  SABS62_BEND_RADIUS,
  type SABS62BendType,
  sabs62AvailableAngles,
  sabs62CFInterpolated,
} from "@annix/product-data/pipe";
import { toPairs as entries, keys } from "es-toolkit/compat";
import { memo } from "react";
import { TangentExtensionsSection } from "@/app/components/rfq/sections/TangentExtensionsSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import { Select } from "@/app/components/ui/Select";
import {
  allowedBendTypes,
  BEND_END_OPTIONS,
  FITTING_END_OPTIONS,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  hasLooseFlange,
  MAX_BEND_DEGREES,
  MIN_BEND_DEGREES,
  SABS719_BEND_TYPES,
  STEEL_SPEC_NB_FALLBACK,
  scheduleListForSpec,
  segmentedBendDeratingFactor,
  steelStandardBendRules,
} from "@/app/lib/config/rfq";
import {
  recommendDuckfootGussetCount,
  recommendDuckfootGussetThickness,
} from "@/app/lib/utils/pipeCalculations";
import { BendNominalBoreSelect } from "../sections/BendNominalBoreSelect";
import { BendSteelSpecSelect } from "../sections/BendSteelSpecSelect";
import { FlangeDropdownTriplet } from "../sections/FlangeDropdownTriplet";
import { type ScheduleItem, type SteelSpecItem } from "../shared";
import type { BendFormLogic } from "./useBendFormLogic";

interface BendFormSpecsSectionProps {
  logic: BendFormLogic;
}

const BendFormSpecsSectionInner = (props: BendFormSpecsSectionProps) => {
  const {
    MAX_QUANTITY_UNREGISTERED,
    allFlangeTypes,
    calcWallThicknessMm,
    debouncedCalculate,
    entry,
    errors,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    handleTangentCountChange,
    handleTangentLengthChange,
    index,
    isUnregisteredCustomer,
    masterData,
    nbToOdMap,
    onUpdateEntry,
    pipeALengthSource,
    pressureClassesByStandard,
    rawBendEndConfiguration4,
    rawClosureLengthMm,
    rawLength2,
    rawLength3,
    rawLocationFromFlange,
    rawLocationFromFlange2,
    rawNominalBoreMm3,
    rawNumberOfStubs10,
    rawNumberOfStubs3,
    rawNumberOfStubs4,
    rawNumberOfStubs5,
    rawNumberOfStubs6,
    rawNumberOfStubs7,
    rawNumberOfStubs8,
    rawNumberOfStubs9,
    rawNumberOfTangents,
    rawNumberOfTangents3,
    rawTangentLengths2,
    rawWallThicknessMm6,
    setLastFetchedParams,
    setPipeALengthSource,
    setQuantityLimitPopup,
    specs,
    stub0,
    stub1,
  } = props.logic;
  const specsSteelSpecificationId = specs.steelSpecificationId;
  const specsWallThicknessMm = specs.wallThicknessMm;

  return (
    <>
      {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
      {(() => {
        const rawSteelSpecificationId6 = specsSteelSpecificationId;
        const effectiveSteelSpecId = rawSteelSpecificationId6 || globalSpecs?.steelSpecificationId;
        const steelSpec = masterData.steelSpecs?.find(
          (s: SteelSpecItem) => s.id === effectiveSteelSpecId,
        );
        const rawSteelSpecName6 = steelSpec?.steelSpecName;
        const steelSpecName = rawSteelSpecName6 || "";
        const bendRules = steelStandardBendRules(steelSpecName);
        const allowedTypes = allowedBendTypes(steelSpecName);
        const isSABS719 = steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
        const isSABS62 = steelSpecName.includes("SABS 62") || steelSpecName.includes("SANS 62");
        const isSegmentedAllowed = allowedTypes.includes("segmented");
        const isPulledOnly = allowedTypes.length === 1 && allowedTypes[0] === "pulled";

        const rawBendStyle2 = specs.bendStyle;

        // Determine effective bend style (explicit selection or default from spec)
        const effectiveBendStyle = rawBendStyle2 || (isSABS719 ? "segmented" : "pulled");
        const isSegmentedStyle = effectiveBendStyle === "segmented";

        // Common Steel Spec dropdown (used in both layouts)
        const steelGlobalSpecId = globalSpecs?.steelSpecificationId;
        const rawSteelSpecificationId7 = specsSteelSpecificationId;
        const steelEffectiveSpecId = rawSteelSpecificationId7 || steelGlobalSpecId;
        const isSteelFromGlobal2 = steelGlobalSpecId && steelEffectiveSpecId === steelGlobalSpecId;
        const isSteelOverride2 = steelGlobalSpecId && steelEffectiveSpecId !== steelGlobalSpecId;
        const steelGlobalSelectClass =
          "w-full border-2 border-green-500 dark:border-lime-400 rounded";
        const steelOverrideSelectClass =
          "w-full border-2 border-yellow-500 dark:border-yellow-400 rounded";
        const steelUnsuitableSelectClass =
          "w-full border-2 border-red-500 dark:border-red-400 rounded";
        const steelDefaultSelectClass = "w-full";

        const rawWorkingPressureBar3 = specs.workingPressureBar;

        const effectivePressure2 = rawWorkingPressureBar3 || globalSpecs?.workingPressureBar;
        const rawWorkingTemperatureC3 = specs.workingTemperatureC;
        const effectiveTemp2 = rawWorkingTemperatureC3 || globalSpecs?.workingTemperatureC;
        const selectedSteelSpec2 = masterData.steelSpecs?.find(
          (s: SteelSpecItem) => s.id === steelEffectiveSpecId,
        );
        const isSteelUnsuitable2 =
          steelEffectiveSpecId &&
          effectivePressure2 &&
          selectedSteelSpec2 &&
          ((selectedSteelSpec2.maxPressureBar &&
            effectivePressure2 > selectedSteelSpec2.maxPressureBar) ||
            (selectedSteelSpec2.maxTemperatureC &&
              effectiveTemp2 &&
              effectiveTemp2 > selectedSteelSpec2.maxTemperatureC));
        const steelSelectClass2 = isSteelUnsuitable2
          ? steelUnsuitableSelectClass
          : isSteelFromGlobal2
            ? steelGlobalSelectClass
            : isSteelOverride2
              ? steelOverrideSelectClass
              : steelDefaultSelectClass;

        const SteelSpecDropdown = (
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Steel Specification
              {isSteelUnsuitable2 && (
                <span className="text-red-600 text-xs ml-2 font-bold">(NOT SUITABLE)</span>
              )}
              {!isSteelUnsuitable2 && isSteelFromGlobal2 && (
                <span className="text-green-600 text-xs ml-2">(From Specs Page)</span>
              )}
              {!isSteelUnsuitable2 && isSteelOverride2 && (
                <span className="text-yellow-600 text-xs ml-2">(Override)</span>
              )}
            </label>
            <BendSteelSpecSelect
              entryId={entry.id}
              entry={entry}
              specs={specs}
              globalSpecs={globalSpecs}
              masterData={masterData}
              steelEffectiveSpecId={steelEffectiveSpecId}
              steelSelectClass={steelSelectClass2}
              groupedSteelOptions={groupedSteelOptions}
              nbToOdMap={nbToOdMap}
              generateItemDescription={generateItemDescription}
              onUpdateEntry={onUpdateEntry}
              debouncedCalculate={debouncedCalculate}
            />
            {errors[`bend_${index}_steelSpec`] && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors[`bend_${index}_steelSpec`]}
              </p>
            )}
          </div>
        );

        // NB Dropdown (shared logic but different placement)
        const NBDropdown = (
          <div data-nix-target="bend-nb-select">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Nominal Bore (mm) *
              <span
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title="Internal pipe diameter designation. NB (Nominal Bore) is the standard way to specify pipe size. Actual OD (Outside Diameter) varies by schedule."
              >
                ?
              </span>
            </label>
            <BendNominalBoreSelect
              entryId={entry.id}
              entry={entry}
              specs={specs}
              index={index}
              globalSpecs={globalSpecs}
              masterData={masterData}
              effectiveSteelSpecId={effectiveSteelSpecId}
              steelSpecName={steelSpecName}
              isSegmentedStyle={isSegmentedStyle}
              nbToOdMap={nbToOdMap}
              bendRules={bendRules}
              errors={errors}
              generateItemDescription={generateItemDescription}
              onUpdateEntry={onUpdateEntry}
              debouncedCalculate={debouncedCalculate}
              setLastFetchedParams={setLastFetchedParams}
              setPipeALengthSource={setPipeALengthSource}
            />
          </div>
        );

        // Schedule Dropdown (shared)
        const ScheduleDropdown = (
          <div data-nix-target="bend-schedule-select">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Schedule *
              <span
                className="ml-1 text-gray-400 font-normal cursor-help"
                title="Schedule determines wall thickness. Auto-selected based on ASME B31.3 pressure requirements when working pressure is set. Higher schedules = thicker walls = higher pressure rating."
              >
                ?
              </span>
              {specs.scheduleNumber && globalSpecs?.workingPressureBar && (
                <span className="text-green-600 text-xs ml-2">(Auto)</span>
              )}
            </label>
            {(() => {
              const selectId = `bend-schedule-${entry.id}`;
              const rawSteelSpecificationId10 = specsSteelSpecificationId;
              const schedEffectiveSpecId =
                rawSteelSpecificationId10 || globalSpecs?.steelSpecificationId;
              const rawNominalBoreMm = specs.nominalBoreMm;
              const schedules = scheduleListForSpec(
                rawNominalBoreMm || 0,
                schedEffectiveSpecId,
                steelSpecName,
              );
              const options = schedules.map((s: ScheduleItem) => ({
                value: s.scheduleDesignation,
                label: `${s.scheduleDesignation} (${s.wallThicknessMm}mm)`,
              }));

              const rawScheduleNumber = specs.scheduleNumber;

              return (
                <Select
                  id={selectId}
                  value={rawScheduleNumber || ""}
                  onChange={(schedule) => {
                    if (!schedule) return;
                    const scheduleData = schedules.find(
                      (s: ScheduleItem) => s.scheduleDesignation === schedule,
                    );
                    const updatedEntry: any = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        scheduleNumber: schedule,
                        wallThicknessMm: scheduleData?.wallThicknessMm,
                      },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  options={options}
                  placeholder={specs.nominalBoreMm ? "Select Schedule" : "Select NB first"}
                  disabled={!specs.nominalBoreMm}
                />
              );
            })()}
            {specsWallThicknessMm && (
              <p className="text-xs text-green-700 mt-0.5">WT: {entry.specsWallThicknessMm}mm</p>
            )}
            {errors[`bend_${index}_schedule`] && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors[`bend_${index}_schedule`]}
              </p>
            )}
          </div>
        );

        // Bend Style Dropdown (Segmented vs Pulled)
        const BendStyleDropdown = (
          <div data-nix-target="bend-style-select">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Bend Style *
              <span
                className="ml-1 text-gray-400 font-normal cursor-help"
                title="Segmented = welded mitre segments (SABS 719). Pulled = smooth induction bends (SABS 62). Steel spec may restrict options."
              >
                ?
              </span>
            </label>
            {(() => {
              const selectId = `bend-style-${entry.id}`;
              const options = [
                {
                  value: "segmented",
                  label: "Segmented Bend",
                  disabled: !isSegmentedAllowed,
                },
                { value: "pulled", label: "Pulled Bend" },
              ];
              const rawBendStyle3 = specs.bendStyle;
              const currentStyle = rawBendStyle3 || (isSABS719 ? "segmented" : "pulled");

              return (
                <Select
                  id={selectId}
                  value={currentStyle}
                  onChange={(style) => {
                    const currentBendType = specs.bendType;
                    const currentRadiusType = specs.bendRadiusType;
                    const switchingToSegmented = style === "segmented";
                    const switchingToPulled = style === "pulled";
                    const nominalBore = specs.nominalBoreMm;
                    const bendDegrees = specs.bendDegrees;
                    const numberOfSegments = specs.numberOfSegments;

                    let newBendType: string | undefined;
                    let newBendRadiusType: string | undefined;
                    let newCenterToFace: number | undefined;
                    let newBendRadius: number | undefined;

                    if (switchingToSegmented && currentBendType) {
                      const pulledToSegmentedMap: Record<string, string> = {
                        "1.5D": "elbow",
                        "2D": "medium",
                        "3D": "long",
                      };
                      newBendRadiusType = pulledToSegmentedMap[currentBendType];
                      if (newBendRadiusType && nominalBore && numberOfSegments) {
                        const cfResult = getSABS719CenterToFaceBySegments(
                          newBendRadiusType,
                          nominalBore,
                          numberOfSegments,
                        );
                        if (cfResult) {
                          newCenterToFace = cfResult.centerToFace;
                          newBendRadius = cfResult.radius;
                        }
                      }
                    } else if (switchingToPulled && currentRadiusType) {
                      const segmentedToPulledMap: Record<string, string> = {
                        elbow: "1.5D",
                        medium: "2D",
                        long: "3D",
                      };
                      newBendType = segmentedToPulledMap[currentRadiusType];
                      if (newBendType && nominalBore && bendDegrees) {
                        newCenterToFace = sabs62CFInterpolated(
                          newBendType as SABS62BendType,
                          bendDegrees,
                          nominalBore,
                        );
                        newBendRadius =
                          SABS62_BEND_RADIUS[newBendType as SABS62BendType]?.[nominalBore];
                      }
                    }

                    const updatedEntry: any = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        bendStyle: style,
                        bendType: switchingToPulled ? newBendType : undefined,
                        bendRadiusType: switchingToSegmented ? newBendRadiusType : undefined,
                        numberOfSegments: switchingToSegmented ? specs.numberOfSegments : undefined,
                        centerToFaceMm: newCenterToFace,
                        bendRadiusMm: newBendRadius,
                      },
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);

                    if (nominalBore && specs.scheduleNumber && bendDegrees) {
                      debouncedCalculate();
                    }
                  }}
                  options={options}
                  placeholder="Select Bend Style"
                />
              );
            })()}
          </div>
        );

        // Pulled Bend Type Dropdown (1D, 1.5D, 2D, etc.)
        const BendTypeDropdown = (
          <div data-nix-target="bend-radius-select">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Bend Radius *
              <span
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title="Radius multiplier of nominal bore. 1D = tight elbow (radius = 1×NB). 1.5D = short radius (1.5×NB). 2D = standard (2×NB). 3D = long radius (3×NB). 5D = extra long (5×NB). Larger D = gentler curve, lower pressure drop."
              >
                ?
              </span>
            </label>
            {(() => {
              const selectId = `bend-type-${entry.id}`;
              const options = [
                { value: "1D", label: "1D (Elbow)" },
                { value: "1.5D", label: "1.5D (Short Radius)" },
                { value: "2D", label: "2D (Standard)" },
                { value: "3D", label: "3D (Long Radius)" },
                { value: "5D", label: "5D (Extra Long)" },
              ];

              const rawBendType = specs.bendType;

              return (
                <Select
                  id={selectId}
                  value={rawBendType || ""}
                  onChange={(bendType) => {
                    const isSweepTee = specs.bendItemType === "SWEEP_TEE";
                    const isFixed90 = isSweepTee || specs.bendItemType === "DUCKFOOT_BEND";
                    const nb = specs.nominalBoreMm;
                    let newCenterToFace: number | undefined;
                    let newBendRadius: number | undefined;
                    if (isFixed90 && bendType && nb) {
                      const bt = bendType as SABS62BendType;
                      newCenterToFace = sabs62CFInterpolated(bt, 90, nb);
                      newBendRadius = SABS62_BEND_RADIUS[bt]?.[nb];
                    }
                    const updatedEntry: any = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        bendType: bendType || undefined,
                        bendDegrees: isFixed90 ? 90 : undefined,
                        centerToFaceMm: newCenterToFace,
                        bendRadiusMm: newBendRadius,
                        sweepTeePipeALengthMm: isSweepTee ? undefined : specs.sweepTeePipeALengthMm,
                      },
                    };
                    if (isSweepTee) {
                      setLastFetchedParams(null);
                      setPipeALengthSource(null);
                    }
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                    if (isFixed90 && bendType && nb && specs.scheduleNumber) {
                      debouncedCalculate();
                    }
                  }}
                  options={options}
                  placeholder="Select Bend Type"
                />
              );
            })()}
          </div>
        );

        // Segmented Bend Radius Type Dropdown (Short/Medium/Long)
        const RadiusTypeDropdown = (
          <div data-nix-target="bend-radius-select">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Bend Radius *
              <span
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title="LRSE = Long Radius (3D, gentler curve). MRSE = Medium Radius (2.5D, tighter curve). Larger radius = lower pressure drop, easier flow."
              >
                ?
              </span>
            </label>
            {(() => {
              const selectId = `bend-radius-type-${entry.id}`;
              const options = SABS719_BEND_TYPES.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }));

              const rawBendRadiusType = specs.bendRadiusType;

              return (
                <Select
                  id={selectId}
                  value={rawBendRadiusType || ""}
                  onChange={(radiusType) => {
                    const isSweepTee = specs.bendItemType === "SWEEP_TEE";
                    const nb = specs.nominalBoreMm;
                    let newCenterToFace: number | undefined;
                    let newBendRadius: number | undefined;
                    if (radiusType && nb) {
                      const bt = radiusType as SABS62BendType;
                      newCenterToFace = sabs62CFInterpolated(bt, 90, nb);
                      const radiusMap = SABS62_BEND_RADIUS[bt];
                      newBendRadius = radiusMap?.[nb];
                    }
                    const updatedEntry: any = {
                      ...entry,
                      specs: {
                        ...entry.specs,
                        bendRadiusType: radiusType || undefined,
                        bendType: undefined,
                        numberOfSegments: undefined,
                        centerToFaceMm: newCenterToFace,
                        bendRadiusMm: newBendRadius,
                        bendDegrees: isSweepTee ? 90 : undefined,
                        nominalBoreMm: nb,
                        scheduleNumber: specs.scheduleNumber,
                        wallThicknessMm: specsWallThicknessMm,
                        sweepTeePipeALengthMm: isSweepTee ? undefined : specs.sweepTeePipeALengthMm,
                      },
                    };
                    if (isSweepTee) {
                      setLastFetchedParams(null);
                      setPipeALengthSource(null);
                    }
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                    if (nb && specs.scheduleNumber) {
                      debouncedCalculate();
                    }
                  }}
                  options={options}
                  placeholder="Select Radius Type"
                />
              );
            })()}
          </div>
        );

        // Angle Dropdown - uses different angle lists based on bend style
        const pulledBendType = specs.bendType as SABS62BendType | undefined;
        const currentNB = specs.nominalBoreMm;
        const availableAngles =
          !isSegmentedStyle && pulledBendType && currentNB
            ? sabs62AvailableAngles(pulledBendType, currentNB)
            : [];

        const isFixedAngle90 =
          specs.bendItemType === "SWEEP_TEE" || specs.bendItemType === "DUCKFOOT_BEND";
        const isMissingBendAngle = specs.nominalBoreMm && !specs.bendDegrees && !isFixedAngle90;

        const AngleDropdown = (
          <div className={isMissingBendAngle ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""}>
            <label
              className={`block text-xs font-semibold mb-1 ${isMissingBendAngle ? "text-red-700" : "text-gray-900 dark:text-gray-100"}`}
            >
              Bend Angle *{" "}
              {isMissingBendAngle && (
                <span className="text-red-600 font-bold">⚠ Required for preview</span>
              )}
              <span
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title="The angle of direction change. 90° is a right-angle turn, 45° is a diagonal, 180° is a U-turn (return bend)."
              >
                ?
              </span>
            </label>
            {isFixedAngle90 ? (
              <input
                type="text"
                value="90°"
                disabled
                className="w-full px-2 py-1.5 border border-green-300 rounded text-xs bg-green-50 text-green-900 font-medium cursor-not-allowed"
                title="Sweep Tees and Duckfoot Bends are always 90°"
              />
            ) : (
              (() => {
                const selectId = `bend-angle-${entry.id}`;
                const isDisabled = !isSegmentedStyle && !pulledBendType;

                const angleOptions = (() => {
                  if (!isSegmentedStyle) {
                    return availableAngles.map((deg) => ({
                      value: String(deg),
                      label: `${deg}°`,
                    }));
                  }
                  const sabs719Angles = [
                    ...Array.from({ length: 22 }, (_, i) => i + 1),
                    22.5,
                    ...Array.from({ length: 15 }, (_, i) => i + 23),
                    37.5,
                    ...Array.from({ length: 52 }, (_, i) => i + 38),
                    90,
                    ...Array.from({ length: 90 }, (_, i) => i + 91),
                  ];
                  return sabs719Angles.map((deg) => ({
                    value: String(deg),
                    label: `${deg}°`,
                  }));
                })();

                return (
                  <Select
                    id={selectId}
                    value={specs.bendDegrees ? String(entry.specs.bendDegrees) : ""}
                    onChange={(value) => {
                      const rawDegrees = value ? parseFloat(value) : undefined;
                      const bendDegrees =
                        rawDegrees !== undefined
                          ? Math.max(MIN_BEND_DEGREES, Math.min(MAX_BEND_DEGREES, rawDegrees))
                          : undefined;
                      let centerToFaceMm: number | undefined;
                      let bendRadiusMm: number | undefined;
                      if (
                        !isSegmentedStyle &&
                        bendDegrees &&
                        specs.nominalBoreMm &&
                        specs.bendType
                      ) {
                        const bendType = entry.specs.bendType as SABS62BendType;
                        centerToFaceMm = sabs62CFInterpolated(
                          bendType,
                          bendDegrees,
                          entry.specs.nominalBoreMm,
                        );
                        bendRadiusMm = SABS62_BEND_RADIUS[bendType]?.[entry.specs.nominalBoreMm];
                      }
                      const updatedEntry: any = {
                        ...entry,
                        specs: {
                          ...entry.specs,
                          bendDegrees,
                          centerToFaceMm,
                          bendRadiusMm,
                          numberOfSegments: isSegmentedStyle ? undefined : specs.numberOfSegments,
                        },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                      if (bendDegrees && specs.nominalBoreMm && specs.scheduleNumber) {
                        debouncedCalculate();
                      }
                    }}
                    options={angleOptions}
                    placeholder={isDisabled ? "Select Bend Radius first" : "Select Angle"}
                    disabled={isDisabled}
                  />
                );
              })()
            )}
          </div>
        );

        // SABS 62 C/F Display
        const CFDisplay = (
          <div>
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              C/F (mm)
              {specs.centerToFaceMm && <span className="text-green-600 text-xs ml-1">(Auto)</span>}
            </label>
            <input
              type="text"
              value={
                specs.centerToFaceMm
                  ? `${Number(entry.specs.centerToFaceMm).toFixed(1)} mm`
                  : "Select specs"
              }
              disabled
              className={`w-full px-2 py-1.5 border rounded text-xs cursor-not-allowed ${
                specs.centerToFaceMm
                  ? "bg-green-50 border-green-300 text-green-900 font-medium"
                  : "bg-gray-100 border-gray-300 text-gray-600"
              }`}
            />
          </div>
        );

        // SABS 719 Segments Dropdown
        const SegmentsDropdown = (
          <div>
            {(() => {
              const bendRadiusType = specs.bendRadiusType;
              const rawBendDegrees = specs.bendDegrees;
              const bendDeg = rawBendDegrees || 0;
              const rawNominalBoreMm2 = specs.nominalBoreMm;
              const nominalBore = rawNominalBoreMm2 || 0;

              if (!bendRadiusType || bendDeg <= 0) {
                return (
                  <>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Segments <span className="text-purple-600 text-xs ml-1">(SABS 719)</span>
                    </label>
                    <input
                      type="text"
                      value="Select radius & angle"
                      disabled
                      data-nix-target="bend-segments-select"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </>
                );
              }

              const getSegmentOptions = (
                deg: number,
                radiusType?: string,
                isSweepTee?: boolean,
              ): number[] => {
                if (isSweepTee && radiusType) {
                  if (radiusType === "long") return [5, 6];
                  if (radiusType === "medium") return [4, 5];
                  if (radiusType === "elbow") return [3, 4];
                }
                if (deg <= 11) return [2];
                if (deg <= 37) return [2, 3];
                if (deg <= 59) return [3, 4];
                return [5, 6, 7];
              };

              const isSweepTee = specs.bendItemType === "SWEEP_TEE";
              const segmentOptions = getSegmentOptions(bendDeg, bendRadiusType, isSweepTee);
              const isAutoFill = bendDeg <= 11;

              if (isAutoFill && specs.numberOfSegments !== 2) {
                setTimeout(() => {
                  const cfResult = getSABS719CenterToFaceBySegments(bendRadiusType, nominalBore, 2);
                  const updatedEntry: any = {
                    ...entry,
                    specs: {
                      ...entry.specs,
                      numberOfSegments: 2,
                      centerToFaceMm: cfResult?.centerToFace,
                      bendRadiusMm: cfResult?.radius,
                    },
                  };
                  updatedEntry.description = generateItemDescription(updatedEntry);
                  onUpdateEntry(entry.id, updatedEntry);
                  if (nominalBore && specs.scheduleNumber) {
                    debouncedCalculate();
                  }
                }, 50);
              }

              if (isAutoFill) {
                return (
                  <>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Segments <span className="text-green-600 text-xs ml-1">(Auto: 2)</span>
                    </label>
                    <input
                      type="text"
                      value="2 segments"
                      disabled
                      data-nix-target="bend-segments-select"
                      className="w-full px-2 py-1.5 border border-green-300 rounded text-xs bg-green-50 text-green-900 font-medium cursor-not-allowed"
                    />
                  </>
                );
              }

              const rawNumberOfSegments = specs.numberOfSegments;

              return (
                <>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Segments *
                    <span
                      className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Number of welded pipe sections forming the bend. More segments = smoother curve but more mitre welds. Fewer segments = simpler fabrication but more abrupt angle changes."
                    >
                      ?
                    </span>
                    <span className="text-purple-600 text-xs ml-1">
                      ({segmentOptions.join(" or ")})
                    </span>
                  </label>
                  <select
                    value={rawNumberOfSegments || ""}
                    onChange={(e) => {
                      const segments = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      let centerToFace: number | undefined;
                      let bendRadius: number | undefined;
                      if (segments && bendRadiusType && nominalBore) {
                        const cfResult = getSABS719CenterToFaceBySegments(
                          bendRadiusType,
                          nominalBore,
                          segments,
                        );
                        if (cfResult) {
                          centerToFace = cfResult.centerToFace;
                          bendRadius = cfResult.radius;
                        }
                      }
                      const updatedEntry: any = {
                        ...entry,
                        specs: {
                          ...entry.specs,
                          numberOfSegments: segments,
                          centerToFaceMm: centerToFace,
                          bendRadiusMm: bendRadius,
                        },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                      if (segments && nominalBore && specs.scheduleNumber) {
                        debouncedCalculate();
                      }
                    }}
                    data-nix-target="bend-segments-select"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  >
                    <option value="">Select</option>
                    {segmentOptions.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg} segments
                      </option>
                    ))}
                  </select>
                </>
              );
            })()}
          </div>
        );

        const rawQuantityValue = specs.quantityValue;

        // Quantity Input (shared by both layouts)
        const QuantityInput = (
          <div className="relative" data-nix-target="bend-quantity-input">
            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Quantity *{" "}
              {isUnregisteredCustomer && <span className="text-gray-400 font-normal">(fixed)</span>}
            </label>
            <input
              type="number"
              value={rawQuantityValue || ""}
              onChange={(e) => {
                if (isUnregisteredCustomer) {
                  const rect = e.target.getBoundingClientRect();
                  setQuantityLimitPopup({ x: rect.left + rect.width / 2, y: rect.bottom });
                  return;
                }
                const rawValue = e.target.value;
                if (rawValue === "") {
                  onUpdateEntry(entry.id, {
                    specs: { ...entry.specs, quantityValue: undefined },
                  });
                  return;
                }
                const quantity = parseInt(rawValue, 10);
                onUpdateEntry(entry.id, {
                  specs: { ...entry.specs, quantityValue: quantity },
                });
                if (
                  specs.nominalBoreMm &&
                  specs.scheduleNumber &&
                  specs.bendType &&
                  specs.bendDegrees
                ) {
                  debouncedCalculate();
                }
              }}
              onBlur={(e) => {
                if (e.target.value === "" || parseInt(e.target.value, 10) < 1) {
                  onUpdateEntry(entry.id, { specs: { ...entry.specs, quantityValue: 1 } });
                  debouncedCalculate();
                }
              }}
              className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 ${isUnregisteredCustomer ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-gray-300 dark:border-gray-600 dark:bg-gray-800"}`}
              min="1"
              max={isUnregisteredCustomer ? MAX_QUANTITY_UNREGISTERED : undefined}
              placeholder="1"
              readOnly={isUnregisteredCustomer}
            />
          </div>
        );

        const rawSweepTeePipeALengthMm = specs.sweepTeePipeALengthMm;
        const rawSweepTeePipeALengthMm2 = specs.sweepTeePipeALengthMm;

        // Unified Layout: Row 1: NB | Schedule | Bend Style | Bend Radius, Row 2: depends on style
        return (
          <>
            {/* Row 1: NB | Schedule | Bend Style | Bend Radius */}
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {NBDropdown}
                {ScheduleDropdown}
                {BendStyleDropdown}
                {isSegmentedStyle ? RadiusTypeDropdown : BendTypeDropdown}
              </div>
            </div>
            {/* Row 2: Based on Bend Style selection */}
            {isSegmentedStyle ? (
              <>
                {/* Segmented: Angle | Segments | C/F | (Pipe A Length for Sweep Tee) | Quantity */}
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 ${specs.bendItemType === "SWEEP_TEE" ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}
                  >
                    {AngleDropdown}
                    {SegmentsDropdown}
                    {CFDisplay}
                    {specs.bendItemType === "SWEEP_TEE" && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Pipe A Length (mm)
                            <span
                              className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                              title="Length of Pipe A section for the sweep tee"
                            >
                              ?
                            </span>
                          </label>
                          {pipeALengthSource && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${pipeALengthSource === "auto" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"}`}
                            >
                              {pipeALengthSource}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={rawSweepTeePipeALengthMm || ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            setPipeALengthSource("override");
                            const updatedEntry = {
                              ...entry,
                              specs: { ...entry.specs, sweepTeePipeALengthMm: value },
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          placeholder="Enter length"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                          min="1"
                        />
                      </div>
                    )}
                    {QuantityInput}
                  </div>
                </div>
                {/* Pressure Derating for Segmented Bends - Single line */}
                {specs.numberOfSegments &&
                  specs.numberOfSegments > 1 &&
                  specs.bendDegrees &&
                  (() => {
                    const derating = segmentedBendDeratingFactor(
                      entry.specs.numberOfSegments,
                      entry.specs.bendDegrees,
                    );
                    const deratingPercent = Math.round((1 - derating) * 100);
                    return (
                      <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2 mt-3">
                        <p className="text-xs text-orange-800 dark:text-orange-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-bold">Segmented Bend Pressure Derating:</span>
                          <span className="text-orange-700 dark:text-orange-300">
                            {entry.specs.numberOfSegments} segments (
                            {entry.specs.numberOfSegments - 1} mitre welds)
                          </span>
                          <span className="font-medium">
                            Effective pressure: {Math.round(derating * 100)}% ({deratingPercent}%
                            reduction)
                          </span>
                          <span className="text-orange-600 dark:text-orange-400 italic">
                            Per ASME B31.3
                          </span>
                        </p>
                      </div>
                    );
                  })()}
              </>
            ) : (
              <>
                {/* Pulled: Angle | C/F | (Pipe A Length for Sweep Tee) | QTY */}
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 ${specs.bendItemType === "SWEEP_TEE" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}
                  >
                    {AngleDropdown}
                    {CFDisplay}
                    {specs.bendItemType === "SWEEP_TEE" && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Pipe A Length (mm)
                            <span
                              className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                              title="Length of Pipe A section for the sweep tee"
                            >
                              ?
                            </span>
                          </label>
                          {pipeALengthSource && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${pipeALengthSource === "auto" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"}`}
                            >
                              {pipeALengthSource}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={rawSweepTeePipeALengthMm2 || ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            setPipeALengthSource("override");
                            const updatedEntry = {
                              ...entry,
                              specs: { ...entry.specs, sweepTeePipeALengthMm: value },
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          placeholder="Enter length"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                          min="1"
                        />
                      </div>
                    )}
                    {QuantityInput}
                  </div>
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* Flange Configuration Row - 4 columns (matching Pipes form) */}
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mt-3">
        {(() => {
          const rawBendEndConfiguration2 = specs.bendEndConfiguration;
          const bendEndConfig = rawBendEndConfiguration2 || "PE";
          const configUpper = bendEndConfig.toUpperCase();
          const hasInletFlange = ["FOE", "FBE", "FOE_LF", "FOE_RF", "2X_RF", "2xLF"].includes(
            configUpper,
          );
          const hasOutletFlange = ["FBE", "FOE_LF", "FOE_RF", "2X_RF", "2xLF"].includes(
            configUpper,
          );
          const hasFlanges = hasInletFlange || hasOutletFlange;
          const availableBlankPositions: { key: string; label: string }[] = [
            ...(hasInletFlange ? [{ key: "inlet", label: "Inlet" }] : []),
            ...(hasOutletFlange ? [{ key: "outlet", label: "Outlet" }] : []),
          ];
          const rawBlankFlangePositions = specs.blankFlangePositions;
          const currentBlankPositions = rawBlankFlangePositions || [];

          return (
            <>
              {/* Title row with blank checkboxes */}
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  Flange Specification
                </h4>
                {hasFlanges && availableBlankPositions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Blank:
                    </span>
                    <span
                      className="text-gray-400 cursor-help text-xs"
                      title="Add blank flanges for hydrostatic testing, isolation, or future connections."
                    >
                      ?
                    </span>
                    {availableBlankPositions.map((pos) => (
                      <label key={pos.key} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentBlankPositions.includes(pos.key)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const newPositions = checked
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
                          className="w-3.5 h-3.5 text-amber-600 border-amber-400 dark:border-amber-600 rounded focus:ring-amber-500"
                        />
                        <span className="text-xs text-gray-800 dark:text-gray-300">
                          {pos.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Dropdown row - 4 columns */}
              {(() => {
                const rawWorkingPressureBar6 = specs.workingPressureBar;
                const globalWorkingPressureBar = globalSpecs?.workingPressureBar;
                const workingPressureBar = rawWorkingPressureBar6 || globalWorkingPressureBar || 0;
                const rawBendEndConfiguration3 = specs.bendEndConfiguration;
                const rawFlangeStandards = masterData.flangeStandards;
                const rawPressureClasses = masterData.pressureClasses;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                    <FlangeDropdownTriplet
                      flangeStandardId={specs.flangeStandardId}
                      flangePressureClassId={specs.flangePressureClassId}
                      flangeTypeCode={specs.flangeTypeCode}
                      globalFlangeStandardId={globalSpecs?.flangeStandardId}
                      globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                      globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                      flangeStandards={rawFlangeStandards || []}
                      pressureClasses={rawPressureClasses || []}
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
                    <div data-nix-target="bend-end-config-select">
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Config
                        <span
                          className="ml-1 text-gray-400 font-normal cursor-help"
                          title="PE = Plain End (for butt welding). FOE = Flanged One End. FBE = Flanged Both Ends. L/F = Loose Flange (slip-on). R/F = Rotating Flange (backing ring)."
                        >
                          ?
                        </span>
                      </label>
                      <select
                        value={rawBendEndConfiguration3 || "PE"}
                        onChange={(e) => {
                          const newConfig = e.target.value;
                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              bendEndConfiguration: newConfig,
                              blankFlangePositions: [],
                              addBlankFlange: false,
                              blankFlangeCount: 0,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                      >
                        {(specs.bendItemType === "SWEEP_TEE"
                          ? FITTING_END_OPTIONS
                          : BEND_END_OPTIONS
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>

      {/* Closure Length Field - Only shown when L/F configuration is selected */}
      {hasLooseFlange(rawBendEndConfiguration4 || "") && (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
          <ClosureLengthSelector
            nominalBore={rawNominalBoreMm3 || 100}
            currentValue={rawClosureLengthMm || null}
            wallThickness={rawWallThicknessMm6 || calcWallThicknessMm || 5}
            onUpdate={(closureLength) => {
              const updatedEntry = {
                ...entry,
                specs: { ...entry.specs, closureLengthMm: closureLength },
              };
              updatedEntry.description = generateItemDescription(updatedEntry);
              onUpdateEntry(entry.id, updatedEntry);
            }}
            variant="compact"
            showTackWeldInfo={false}
          />
        </div>
      )}

      {/* Duckfoot Steelwork Row - Only shown when Item Type is Duckfoot Bend */}
      {specs.bendItemType === "DUCKFOOT_BEND" && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3 mt-3">
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Duckfoot Steelwork (Base Plate & Ribs)
            </h4>
          </div>
          {(() => {
            const nominalBore = specs.nominalBoreMm;
            const duckfootDefaults: Record<
              number,
              { x: number; y: number; t1: number; t2: number; inletH: number }
            > = {
              200: { x: 355, y: 230, t1: 6, t2: 10, inletH: 365 },
              250: { x: 405, y: 280, t1: 6, t2: 10, inletH: 417 },
              300: { x: 460, y: 330, t1: 6, t2: 10, inletH: 467 },
              350: { x: 510, y: 380, t1: 8, t2: 12, inletH: 519 },
              400: { x: 560, y: 430, t1: 8, t2: 12, inletH: 559 },
              450: { x: 610, y: 485, t1: 8, t2: 12, inletH: 633 },
              500: { x: 660, y: 535, t1: 10, t2: 14, inletH: 703 },
              550: { x: 710, y: 585, t1: 10, t2: 14, inletH: 752 },
              600: { x: 760, y: 635, t1: 10, t2: 14, inletH: 790 },
              650: { x: 815, y: 693, t1: 12, t2: 16, inletH: 847 },
              700: { x: 865, y: 733, t1: 12, t2: 16, inletH: 892 },
              750: { x: 915, y: 793, t1: 12, t2: 16, inletH: 940 },
              800: { x: 970, y: 833, t1: 14, t2: 18, inletH: 991 },
              850: { x: 1020, y: 883, t1: 14, t2: 18, inletH: 1016 },
              900: { x: 1070, y: 933, t1: 14, t2: 18, inletH: 1067 },
            };
            const defaults =
              nominalBore && duckfootDefaults[nominalBore] ? duckfootDefaults[nominalBore] : null;
            const hasDefaults = !!defaults;

            const rawDuckfootBasePlateXMm = specs.duckfootBasePlateXMm;
            const rawDuckfootBasePlateYMm = specs.duckfootBasePlateYMm;
            const rawDuckfootInletCentreHeightMm = specs.duckfootInletCentreHeightMm;
            const rawDuckfootPlateThicknessT1Mm = specs.duckfootPlateThicknessT1Mm;
            const rawDuckfootRibThicknessT2Mm = specs.duckfootRibThicknessT2Mm;
            const rawDuckfootGussetPointDDegrees = specs.duckfootGussetPointDDegrees;
            const rawDuckfootGussetPointCDegrees = specs.duckfootGussetPointCDegrees;

            const defaultX = defaults?.x;
            const defaultY = defaults?.y;
            const defaultInletH = defaults?.inletH;
            const defaultT1 = defaults?.t1;
            const defaultT2 = defaults?.t2;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Plate X
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Width of the duckfoot base plate (longer dimension) in mm"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    type="number"
                    value={rawDuckfootBasePlateXMm || defaultX || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootBasePlateXMm: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    placeholder={hasDefaults ? `${defaults.x}` : "X"}
                    className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Plate Y
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Depth of the duckfoot base plate (shorter dimension) in mm"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    type="number"
                    value={rawDuckfootBasePlateYMm || defaultY || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootBasePlateYMm: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    placeholder={hasDefaults ? `${defaults.y}` : "Y"}
                    className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Plate Height
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Height from base plate to centre of inlet opening in mm. Steelwork height is calculated from this minus wall thickness and half inner diameter."
                    >
                      ?
                    </span>
                  </label>
                  <input
                    type="number"
                    value={rawDuckfootInletCentreHeightMm || defaultInletH || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootInletCentreHeightMm: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    placeholder={hasDefaults ? `${defaults.inletH}` : "H"}
                    className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Rib T1
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Thickness of the vertical ribs supporting the pipe in mm"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    type="number"
                    value={rawDuckfootPlateThicknessT1Mm || defaultT1 || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootPlateThicknessT1Mm: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    placeholder={hasDefaults ? `${defaults.t1}` : "T1"}
                    className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    min="4"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Plate T2
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Thickness of the base plate in mm"
                    >
                      ?
                    </span>
                  </label>
                  <input
                    type="number"
                    value={rawDuckfootRibThicknessT2Mm || defaultT2 || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootRibThicknessT2Mm: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    placeholder={hasDefaults ? `${defaults.t2}` : "T2"}
                    className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    min="6"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Pt C
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Angle position of Point C on the yellow gusset (degrees from bend start)"
                    >
                      ?
                    </span>
                  </label>
                  <select
                    value={rawDuckfootGussetPointDDegrees || 15}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootGussetPointDDegrees: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  >
                    <option value={5}>5°</option>
                    <option value={10}>10°</option>
                    <option value={15}>15°</option>
                    <option value={20}>20°</option>
                    <option value={25}>25°</option>
                    <option value={30}>30°</option>
                    <option value={35}>35°</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Pt D
                    <span
                      className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                      title="Angle position of Point D on the yellow gusset (degrees from bend start)"
                    >
                      ?
                    </span>
                  </label>
                  <select
                    value={rawDuckfootGussetPointCDegrees || 75}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, duckfootGussetPointCDegrees: value },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                  >
                    <option value={55}>55°</option>
                    <option value={60}>60°</option>
                    <option value={65}>65°</option>
                    <option value={70}>70°</option>
                    <option value={75}>75°</option>
                    <option value={80}>80°</option>
                    <option value={85}>85°</option>
                  </select>
                </div>
              </div>
            );
          })()}

          {/* Gusset Configuration Row */}
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-600">
            <h5 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Gusset Configuration
            </h5>
            {(() => {
              const nominalBore = specs.nominalBoreMm;
              const rawWorkingPressureBar7 = specs.workingPressureBar;
              const workingPressure = rawWorkingPressureBar7 || globalSpecs?.workingPressureBar;
              const recommendedCount = nominalBore ? recommendDuckfootGussetCount(nominalBore) : 2;
              const recommendedThickness =
                nominalBore && workingPressure
                  ? recommendDuckfootGussetThickness({
                      nominalBoreMm: nominalBore,
                      designPressureBar: workingPressure,
                    })
                  : null;

              const rawDuckfootGussetCount = specs.duckfootGussetCount;
              const rawDuckfootGussetPlacement = specs.duckfootGussetPlacement;
              const rawDuckfootGussetThicknessMm = specs.duckfootGussetThicknessMm;
              const rawDuckfootGussetMaterialGrade = specs.duckfootGussetMaterialGrade;
              const rawDuckfootGussetWeldType = specs.duckfootGussetWeldType;
              const rawDuckfootGussetWeldElectrode = specs.duckfootGussetWeldElectrode;
              const rawDuckfootGussetPreheatTempC = specs.duckfootGussetPreheatTempC;
              const rawDuckfootGussetPwhtRequired = specs.duckfootGussetPwhtRequired;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Count
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Number of gussets (2=basic, 4=medium bore, 6=large bore)"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={rawDuckfootGussetCount || recommendedCount}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, duckfootGussetCount: value },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value={2}>2</option>
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Placement
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Gusset placement pattern: HEEL_ONLY (at base), SYMMETRICAL (around pipe), FULL_COVERAGE (comprehensive)"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={rawDuckfootGussetPlacement || "HEEL_ONLY"}
                      onChange={(e) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, duckfootGussetPlacement: e.target.value },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value="HEEL_ONLY">Heel Only</option>
                      <option value="SYMMETRICAL">Symmetrical</option>
                      <option value="FULL_COVERAGE">Full Coverage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Thickness
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title={`Gusset plate thickness in mm${recommendedThickness ? ` (calculated: ${recommendedThickness.toFixed(1)}mm)` : ""}`}
                      >
                        ?
                      </span>
                    </label>
                    <input
                      type="number"
                      value={rawDuckfootGussetThicknessMm || recommendedThickness || ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, duckfootGussetThicknessMm: value },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      placeholder={recommendedThickness ? recommendedThickness.toFixed(1) : "mm"}
                      className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                      min="6"
                      step="0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Material
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Gusset plate material grade"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={rawDuckfootGussetMaterialGrade || "A36"}
                      onChange={(e) => {
                        const updatedEntry = {
                          ...entry,
                          specs: {
                            ...entry.specs,
                            duckfootGussetMaterialGrade: e.target.value,
                          },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value="A36">A36</option>
                      <option value="Q235">Q235</option>
                      <option value="A283_C">A283-C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Weld Type
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Type of weld for gusset attachment"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={rawDuckfootGussetWeldType || "FILLET"}
                      onChange={(e) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, duckfootGussetWeldType: e.target.value },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value="FILLET">Fillet</option>
                      <option value="FULL_PENETRATION">Full Pen.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Electrode
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Welding electrode specification"
                      >
                        ?
                      </span>
                    </label>
                    <select
                      value={rawDuckfootGussetWeldElectrode || "E7018"}
                      onChange={(e) => {
                        const updatedEntry = {
                          ...entry,
                          specs: {
                            ...entry.specs,
                            duckfootGussetWeldElectrode: e.target.value,
                          },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value="E7018">E7018</option>
                      <option value="E7024">E7024</option>
                      <option value="E6013">E6013</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Preheat
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Preheat temperature in °C (optional, for thicker plates)"
                      >
                        ?
                      </span>
                    </label>
                    <input
                      type="number"
                      value={rawDuckfootGussetPreheatTempC || ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, duckfootGussetPreheatTempC: value },
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      placeholder="°C"
                      className="w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                      min="0"
                      max="400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      PWHT
                      <span
                        className="ml-0.5 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                        title="Post-Weld Heat Treatment required"
                      >
                        ?
                      </span>
                    </label>
                    <div className="flex items-center h-[30px]">
                      <input
                        type="checkbox"
                        checked={rawDuckfootGussetPwhtRequired || false}
                        onChange={(e) => {
                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              duckfootGussetPwhtRequired: e.target.checked,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        className="w-4 h-4 text-orange-500 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500"
                      />
                      <span className="ml-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                        Required
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {specs.nominalBoreMm && (
            <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
              <span className="font-medium">Note:</span> Default dimensions are based on MPS manual
              page 30 for {entry.specs.nominalBoreMm}NB duckfoot elbows/bends.
            </div>
          )}
        </div>
      )}

      {/* Tangent Extensions Row - hide for Sweep Tees and Duckfoot Bends */}
      {specs.bendItemType !== "SWEEP_TEE" && specs.bendItemType !== "DUCKFOOT_BEND" && (
        <TangentExtensionsSection
          entryId={entry.id}
          numberOfTangents={rawNumberOfTangents || 0}
          tangentLengths={rawTangentLengths2 || []}
          onTangentCountChange={handleTangentCountChange}
          onTangentLengthChange={handleTangentLengthChange}
        />
      )}

      {/* Stub Connections Section - hide for Sweep Tees and Duckfoot Bends */}
      {specs.bendItemType !== "SWEEP_TEE" && specs.bendItemType !== "DUCKFOOT_BEND" && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mt-3">
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Stub Connections
            </h4>
          </div>
          {/* Stub 1 Row - All fields in one row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {/* No Of Stubs */}
            <div>
              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                No. of Stubs
              </label>
              {(() => {
                const selectId = `bend-num-stubs-${entry.id}`;
                const rawNumberOfTangents2 = specs.numberOfTangents;
                const numTangents = rawNumberOfTangents2 || 0;
                const options =
                  numTangents >= 2
                    ? [
                        { value: "0", label: "0 - None" },
                        { value: "1", label: "1 - Single" },
                        { value: "2", label: "2 - Both" },
                      ]
                    : [
                        { value: "0", label: "0 - None" },
                        { value: "1", label: "1 - Single" },
                      ];
                const rawNumberOfStubs2 = specs.numberOfStubs;
                const currentValue = rawNumberOfStubs2 || 0;
                const effectiveValue = currentValue > 1 && numTangents < 2 ? 1 : currentValue;
                return (
                  <Select
                    id={selectId}
                    value={String(effectiveValue)}
                    onChange={(value) => {
                      const count = parseInt(value, 10) || 0;
                      const rawStubs2 = specs.stubs;
                      const currentStubs = rawStubs2 || [];
                      const rawNominalBoreMm4 = specs.nominalBoreMm;
                      const mainNB = rawNominalBoreMm4 || 50;
                      const defaultStubNB = mainNB <= 50 ? mainNB : 50;
                      const defaultStub = {
                        nominalBoreMm: defaultStubNB,
                        length: 150,
                        orientation: "outside",
                        flangeSpec: "",
                      };
                      const rawItem02 = currentStubs[0];
                      const rawItem03 = currentStubs[0];
                      const rawItem12 = currentStubs[1];
                      const newStubs =
                        count === 0
                          ? []
                          : count === 1
                            ? [rawItem02 || defaultStub]
                            : [rawItem03 || defaultStub, rawItem12 || defaultStub];
                      const updatedEntry = {
                        ...entry,
                        specs: { ...entry.specs, numberOfStubs: count, stubs: newStubs },
                      };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    options={options}
                    placeholder="Stubs"
                  />
                );
              })()}
            </div>
            {/* Steel Spec - visible when stubs >= 1 */}
            {(rawNumberOfStubs3 || 0) >= 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">
                  Steel Spec
                  {stub0.steelSpecificationId && <span className="text-purple-600 ml-1">*</span>}
                </label>
                {(() => {
                  const selectId = `bend-stub1-steel-spec-${entry.id}`;
                  const rawSteelSpecificationId11 = stub0.steelSpecificationId;
                  const stub1EffectiveSpecId =
                    rawSteelSpecificationId11 ||
                    specsSteelSpecificationId ||
                    globalSpecs?.steelSpecificationId;
                  return (
                    <Select
                      id={selectId}
                      value={String(stub1EffectiveSpecId || "")}
                      onChange={(value) => {
                        const newSpecId = value ? Number(value) : undefined;
                        const rawStubs3 = specs.stubs;
                        const stubs = [...(rawStubs3 || [])];
                        stubs[0] = {
                          ...stubs[0],
                          steelSpecificationId: newSpecId,
                          nominalBoreMm: undefined,
                          wallThicknessMm: undefined,
                        };
                        const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      options={[]}
                      groupedOptions={groupedSteelOptions}
                      placeholder="Spec"
                    />
                  );
                })()}
              </div>
            )}
            {/* NB - visible when stubs >= 1 */}
            {(rawNumberOfStubs4 || 0) >= 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                {(() => {
                  const selectId = `bend-stub1-nb-${entry.id}`;
                  const rawSteelSpecificationId12 = stub0.steelSpecificationId;
                  const stub1EffectiveSpecId =
                    rawSteelSpecificationId12 ||
                    specsSteelSpecificationId ||
                    globalSpecs?.steelSpecificationId;
                  const stub1SteelSpec = masterData.steelSpecs?.find(
                    (s: SteelSpecItem) => s.id === stub1EffectiveSpecId,
                  );
                  const rawSteelSpecName10 = stub1SteelSpec?.steelSpecName;
                  const stub1SteelSpecName = rawSteelSpecName10 || "";
                  const stub1FallbackNBs = entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
                    stub1SteelSpecName.includes(pattern),
                  )?.[1];
                  const allStub1Nbs = stub1FallbackNBs || [
                    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                  ];
                  const rawNominalBoreMm5 = specs.nominalBoreMm;
                  const mainBendNB = rawNominalBoreMm5 || 0;
                  const stub1Nbs = allStub1Nbs.filter((nb: number) => nb <= mainBendNB);
                  const options = stub1Nbs.map((nb: number) => ({
                    value: String(nb),
                    label: `${nb} NB`,
                  }));
                  return (
                    <Select
                      id={selectId}
                      value={stub0.nominalBoreMm ? String(entry.specs.stubs[0].nominalBoreMm) : ""}
                      onChange={(value) => {
                        const rawStubs4 = specs.stubs;
                        const stubs = [...(rawStubs4 || [])];
                        stubs[0] = { ...stubs[0], nominalBoreMm: parseInt(value, 10) || 0 };
                        const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      options={options}
                      placeholder="NB"
                    />
                  );
                })()}
              </div>
            )}
            {/* W/T - visible when stubs >= 1 */}
            {(rawNumberOfStubs5 || 0) >= 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">
                  W/T
                  {stub0.wallThicknessOverride ? (
                    <span className="text-purple-600 ml-1">*</span>
                  ) : stub0.nominalBoreMm ? (
                    <span className="text-green-600 ml-1">(A)</span>
                  ) : null}
                </label>
                {(() => {
                  const selectId = `bend-stub1-wt-${entry.id}`;
                  const stub1NB = stub0.nominalBoreMm;
                  const rawSteelSpecificationId13 = stub0.steelSpecificationId;
                  const steelSpecId =
                    rawSteelSpecificationId13 ||
                    specsSteelSpecificationId ||
                    globalSpecs?.steelSpecificationId;
                  const stub1SteelSpec = masterData.steelSpecs?.find(
                    (s: SteelSpecItem) => s.id === steelSpecId,
                  );
                  const rawSteelSpecName11 = stub1SteelSpec?.steelSpecName;
                  const stub1SpecName = rawSteelSpecName11 || "";
                  const isSABS719 =
                    stub1SpecName.includes("SABS 719") || stub1SpecName.includes("SANS 719");
                  const SABS_719_WT: Record<number, number> = {
                    200: 5.2,
                    250: 5.2,
                    300: 6.4,
                    350: 6.4,
                    400: 6.4,
                    450: 6.4,
                    500: 6.4,
                    550: 6.4,
                    600: 6.4,
                    650: 8.0,
                    700: 8.0,
                    750: 8.0,
                    800: 8.0,
                    850: 9.5,
                    900: 9.5,
                    1000: 9.5,
                    1050: 9.5,
                    1200: 12.7,
                  };
                  const ASTM_STUB_WT: Record<number, number> = {
                    15: 2.77,
                    20: 2.87,
                    25: 3.38,
                    32: 3.56,
                    40: 3.68,
                    50: 3.91,
                    65: 5.16,
                    80: 5.49,
                    100: 6.02,
                    125: 6.55,
                    150: 7.11,
                    200: 8.18,
                    250: 9.27,
                    300: 10.31,
                  };
                  const getSabs719Wt = (nb: number): number => {
                    const sizes = keys(SABS_719_WT)
                      .map(Number)
                      .sort((a, b) => a - b);
                    let closest = sizes[0];
                    for (const size of sizes) {
                      if (size <= nb) closest = size;
                      else break;
                    }
                    const rawClosest = SABS_719_WT[closest];
                    return rawClosest || specsWallThicknessMm || 6.4;
                  };
                  const rawStub1NB = ASTM_STUB_WT[stub1NB];
                  const autoWt = stub1NB
                    ? isSABS719
                      ? getSabs719Wt(stub1NB)
                      : rawStub1NB || stub1NB * 0.05
                    : null;
                  const currentWt = stub0.wallThicknessMm;
                  const wtOptions = isSABS719
                    ? [
                        ...(autoWt
                          ? [
                              {
                                value: String(autoWt),
                                label: `${autoWt.toFixed(1)} (Auto)`,
                              },
                            ]
                          : []),
                        { value: "4.0", label: "4.0" },
                        { value: "5.0", label: "5.0" },
                        { value: "5.2", label: "5.2" },
                        { value: "6.0", label: "6.0" },
                        { value: "6.4", label: "6.4" },
                        { value: "8.0", label: "8.0" },
                        { value: "9.5", label: "9.5" },
                        { value: "10.0", label: "10.0" },
                        { value: "12.0", label: "12.0" },
                        { value: "12.7", label: "12.7" },
                      ].filter(
                        (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx,
                      )
                    : [
                        ...(autoWt
                          ? [
                              {
                                value: String(autoWt),
                                label: `${autoWt.toFixed(2)} (Auto)`,
                              },
                            ]
                          : []),
                        { value: "2.77", label: "2.77" },
                        { value: "3.38", label: "3.38" },
                        { value: "3.91", label: "3.91" },
                        { value: "5.16", label: "5.16" },
                        { value: "5.49", label: "5.49" },
                        { value: "6.02", label: "6.02" },
                        { value: "6.55", label: "6.55" },
                        { value: "7.11", label: "7.11" },
                        { value: "8.18", label: "8.18" },
                        { value: "9.27", label: "9.27" },
                        { value: "10.31", label: "10.31" },
                      ].filter(
                        (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx,
                      );
                  return (
                    <Select
                      id={selectId}
                      value={currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""}
                      onChange={(value) => {
                        const rawStubs5 = specs.stubs;
                        const stubs = [...(rawStubs5 || [])];
                        const newWt = parseFloat(value) || 0;
                        const isOverride = autoWt && newWt !== autoWt;
                        stubs[0] = {
                          ...stubs[0],
                          wallThicknessMm: newWt,
                          wallThicknessOverride: isOverride,
                        };
                        const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      options={wtOptions}
                      placeholder="W/T"
                    />
                  );
                })()}
              </div>
            )}
            {/* Position on T1 - visible when stubs >= 1 */}
            {(rawNumberOfStubs6 || 0) >= 1 && (
              <div>
                <label className="block text-xs text-gray-600 mb-0.5">Position</label>
                {(() => {
                  const selectId = `bend-stub1-angle-${entry.id}`;
                  const angleOptions = [
                    { value: "0", label: "0° (Top)" },
                    { value: "45", label: "45°" },
                    { value: "90", label: "90° (Side)" },
                    { value: "135", label: "135°" },
                    { value: "180", label: "180° (Bot)" },
                    { value: "225", label: "225°" },
                    { value: "270", label: "270° (Side)" },
                    { value: "315", label: "315°" },
                  ];
                  const rawAngleDegrees = stub0.angleDegrees;
                  return (
                    <Select
                      id={selectId}
                      value={String(rawAngleDegrees || "0")}
                      onChange={(value) => {
                        const rawStubs6 = specs.stubs;
                        const stubs = [...(rawStubs6 || [])];
                        stubs[0] = {
                          ...stubs[0],
                          angleDegrees: parseInt(value, 10) || 0,
                          tangent: 1,
                        };
                        const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      options={angleOptions}
                      placeholder="Pos"
                    />
                  );
                })()}
              </div>
            )}
            {/* Length - visible when stubs >= 1 */}
            {(rawNumberOfStubs7 || 0) >= 1 && (
              <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
                  Length (mm)
                </label>
                <input
                  type="number"
                  value={rawLength2 || ""}
                  onChange={(e) => {
                    const rawStubs7 = specs.stubs;
                    const stubs = [...(rawStubs7 || [])];
                    stubs[0] = { ...stubs[0], length: parseInt(e.target.value, 10) || 0 };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                  placeholder="150"
                />
              </div>
            )}
            {/* Location - visible when stubs >= 1 */}
            {(rawNumberOfStubs8 || 0) >= 1 && (
              <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
                  Location (mm)
                </label>
                <input
                  type="number"
                  value={rawLocationFromFlange || ""}
                  onChange={(e) => {
                    const rawStubs8 = specs.stubs;
                    const stubs = [...(rawStubs8 || [])];
                    stubs[0] = {
                      ...stubs[0],
                      locationFromFlange: parseInt(e.target.value, 10) || 0,
                    };
                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                  placeholder="From flange"
                />
              </div>
            )}
          </div>
          {/* Stub 1 Flange - shown below the row when stubs >= 1 */}
          {(rawNumberOfStubs9 || 0) >= 1 && (
            <div className="mt-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
              {(() => {
                const rawHasBlankFlange = stub0.hasBlankFlange;
                const rawNominalBoreMm6 = stub0.nominalBoreMm;
                const rawFlangeStandards2 = masterData.flangeStandards;
                const rawPressureClasses2 = masterData.pressureClasses;
                const rawWpb2 = specs.workingPressureBar;
                const rawGlobalWpb2 = globalSpecs?.workingPressureBar;
                const stub1WorkingPressure = rawWpb2 || rawGlobalWpb2 || 0;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                    {/* Title as first column */}
                    <div className="flex items-center">
                      <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                        Stub 1 Flange
                      </span>
                    </div>
                    {/* Standard */}
                    <FlangeDropdownTriplet
                      flangeStandardId={stub0.flangeStandardId}
                      flangePressureClassId={stub0.flangePressureClassId}
                      flangeTypeCode={stub0.flangeTypeCode}
                      globalFlangeStandardId={globalSpecs?.flangeStandardId}
                      globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                      globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                      flangeStandards={rawFlangeStandards2 || []}
                      pressureClasses={rawPressureClasses2 || []}
                      pressureClassesByStandard={pressureClassesByStandard}
                      allFlangeTypes={allFlangeTypes}
                      workingPressureBar={stub1WorkingPressure}
                      onStandardChange={(standardId) => {
                        const rawStubs15 = specs.stubs;
                        const stubs = [...(rawStubs15 || [])];
                        stubs[0] = {
                          ...stubs[0],
                          flangeStandardId: standardId,
                          flangePressureClassId: undefined,
                          flangeTypeCode: undefined,
                        };
                        onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                      }}
                      onPressureClassChange={(classId) => {
                        const rawStubs16 = specs.stubs;
                        const stubs = [...(rawStubs16 || [])];
                        stubs[0] = { ...stubs[0], flangePressureClassId: classId };
                        onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                      }}
                      onFlangeTypeChange={(typeCode) => {
                        const rawStubs17 = specs.stubs;
                        const stubs = [...(rawStubs17 || [])];
                        stubs[0] = { ...stubs[0], flangeTypeCode: typeCode };
                        onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                      }}
                      onLoadPressureClasses={getFilteredPressureClasses}
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-1.5 pb-1.5">
                        <input
                          type="checkbox"
                          checked={rawHasBlankFlange || false}
                          onChange={(e) => {
                            const rawStubs13 = specs.stubs;
                            const stubs = [...(rawStubs13 || [])];
                            stubs[0] = { ...stubs[0], hasBlankFlange: e.target.checked };
                            const updatedEntry = {
                              ...entry,
                              specs: { ...entry.specs, stubs },
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                        />
                        <span className="text-xs text-red-700 font-medium">
                          + Blank ({rawNominalBoreMm6 || "?"}NB)
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Stub 2 Section - only show when 2 stubs AND 2 tangents selected */}
          {(rawNumberOfStubs10 || 0) >= 2 && (rawNumberOfTangents3 || 0) >= 2 && (
            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
              <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
                Stub 2 <span className="text-gray-500 dark:text-gray-400 font-normal">(on T2)</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">
                    Steel Spec
                    {stub1.steelSpecificationId && <span className="text-purple-600 ml-1">*</span>}
                  </label>
                  {(() => {
                    const selectId = `bend-stub2-steel-spec-${entry.id}`;
                    const rawSteelSpecificationId14 = stub1.steelSpecificationId;
                    const stub2EffectiveSpecId =
                      rawSteelSpecificationId14 ||
                      specsSteelSpecificationId ||
                      globalSpecs?.steelSpecificationId;

                    return (
                      <Select
                        id={selectId}
                        value={String(stub2EffectiveSpecId || "")}
                        onChange={(value) => {
                          const newSpecId = value ? Number(value) : undefined;
                          const rawStubs14 = specs.stubs;
                          const stubs = [...(rawStubs14 || [])];
                          stubs[1] = {
                            ...stubs[1],
                            steelSpecificationId: newSpecId,
                            nominalBoreMm: undefined,
                            wallThicknessMm: undefined,
                          };
                          const updatedEntry = {
                            ...entry,
                            specs: { ...entry.specs, stubs },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        options={[]}
                        groupedOptions={groupedSteelOptions}
                        placeholder="Spec"
                      />
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                  {(() => {
                    const selectId = `bend-stub2-nb-${entry.id}`;
                    const rawSteelSpecificationId15 = stub1.steelSpecificationId;
                    const stub2EffectiveSpecId =
                      rawSteelSpecificationId15 ||
                      specsSteelSpecificationId ||
                      globalSpecs?.steelSpecificationId;
                    const stub2SteelSpec = masterData.steelSpecs?.find(
                      (s: SteelSpecItem) => s.id === stub2EffectiveSpecId,
                    );
                    const rawSteelSpecName12 = stub2SteelSpec?.steelSpecName;
                    const stub2SteelSpecName = rawSteelSpecName12 || "";
                    const stub2FallbackNBs = entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
                      stub2SteelSpecName.includes(pattern),
                    )?.[1];
                    const allStub2Nbs = stub2FallbackNBs || [
                      15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                    ];
                    const rawNominalBoreMm7 = specs.nominalBoreMm;
                    const mainBendNB = rawNominalBoreMm7 || 0;
                    const stub2Nbs = allStub2Nbs.filter((nb: number) => nb <= mainBendNB);
                    const options = stub2Nbs.map((nb: number) => ({
                      value: String(nb),
                      label: `${nb} NB`,
                    }));

                    return (
                      <Select
                        id={selectId}
                        value={
                          stub1.nominalBoreMm ? String(entry.specs.stubs[1].nominalBoreMm) : ""
                        }
                        onChange={(value) => {
                          const rawStubs15 = specs.stubs;
                          const stubs = [...(rawStubs15 || [])];
                          stubs[1] = {
                            ...stubs[1],
                            nominalBoreMm: parseInt(value, 10) || 0,
                          };
                          const updatedEntry = {
                            ...entry,
                            specs: { ...entry.specs, stubs },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        options={options}
                        placeholder="Select NB"
                      />
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">
                    W/T (mm)
                    {stub1.wallThicknessOverride ? (
                      <span className="text-purple-600 ml-1">(Override)</span>
                    ) : stub1.nominalBoreMm ? (
                      <span className="text-green-600 ml-1">(Auto)</span>
                    ) : null}
                  </label>
                  {(() => {
                    const selectId = `bend-stub2-wt-${entry.id}`;
                    const stub2NB = stub1.nominalBoreMm;
                    const rawSteelSpecificationId16 = stub1.steelSpecificationId;
                    const steelSpecId =
                      rawSteelSpecificationId16 ||
                      specsSteelSpecificationId ||
                      globalSpecs?.steelSpecificationId;
                    const stub2SteelSpec = masterData.steelSpecs?.find(
                      (s: SteelSpecItem) => s.id === steelSpecId,
                    );
                    const rawSteelSpecName13 = stub2SteelSpec?.steelSpecName;
                    const stub2SpecName = rawSteelSpecName13 || "";
                    const isSABS719 =
                      stub2SpecName.includes("SABS 719") || stub2SpecName.includes("SANS 719");

                    const SABS_719_WT: Record<number, number> = {
                      200: 5.2,
                      250: 5.2,
                      300: 6.4,
                      350: 6.4,
                      400: 6.4,
                      450: 6.4,
                      500: 6.4,
                      550: 6.4,
                      600: 6.4,
                      650: 8.0,
                      700: 8.0,
                      750: 8.0,
                      800: 8.0,
                      850: 9.5,
                      900: 9.5,
                      1000: 9.5,
                      1050: 9.5,
                      1200: 12.7,
                    };
                    const ASTM_STUB_WT: Record<number, number> = {
                      15: 2.77,
                      20: 2.87,
                      25: 3.38,
                      32: 3.56,
                      40: 3.68,
                      50: 3.91,
                      65: 5.16,
                      80: 5.49,
                      100: 6.02,
                      125: 6.55,
                      150: 7.11,
                      200: 8.18,
                      250: 9.27,
                      300: 10.31,
                    };

                    const getSabs719Wt = (nb: number): number => {
                      const sizes = keys(SABS_719_WT)
                        .map(Number)
                        .sort((a, b) => a - b);
                      let closest = sizes[0];
                      for (const size of sizes) {
                        if (size <= nb) closest = size;
                        else break;
                      }
                      const rawClosest2 = SABS_719_WT[closest];
                      return rawClosest2 || specsWallThicknessMm || 6.4;
                    };

                    const rawStub2NB = ASTM_STUB_WT[stub2NB];

                    const autoWt = stub2NB
                      ? isSABS719
                        ? getSabs719Wt(stub2NB)
                        : rawStub2NB || stub2NB * 0.05
                      : null;
                    const currentWt = stub1.wallThicknessMm;

                    const wtOptions = isSABS719
                      ? [
                          ...(autoWt
                            ? [
                                {
                                  value: String(autoWt),
                                  label: `${autoWt.toFixed(1)} (Auto - SABS 719)`,
                                },
                              ]
                            : []),
                          { value: "4.0", label: "4.0 (WT4)" },
                          { value: "5.0", label: "5.0 (WT5)" },
                          { value: "5.2", label: "5.2" },
                          { value: "6.0", label: "6.0 (WT6)" },
                          { value: "6.4", label: "6.4" },
                          { value: "8.0", label: "8.0 (WT8)" },
                          { value: "9.5", label: "9.5" },
                          { value: "10.0", label: "10.0 (WT10)" },
                          { value: "12.0", label: "12.0 (WT12)" },
                          { value: "12.7", label: "12.7" },
                        ].filter(
                          (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx,
                        )
                      : [
                          ...(autoWt
                            ? [
                                {
                                  value: String(autoWt),
                                  label: `${autoWt.toFixed(2)} (Auto)`,
                                },
                              ]
                            : []),
                          { value: "2.77", label: "2.77" },
                          { value: "3.38", label: "3.38" },
                          { value: "3.91", label: "3.91" },
                          { value: "5.16", label: "5.16" },
                          { value: "5.49", label: "5.49" },
                          { value: "6.02", label: "6.02" },
                          { value: "6.55", label: "6.55" },
                          { value: "7.11", label: "7.11" },
                          { value: "8.18", label: "8.18" },
                          { value: "9.27", label: "9.27" },
                          { value: "10.31", label: "10.31" },
                        ].filter(
                          (opt, idx, arr) => arr.findIndex((o) => o.value === opt.value) === idx,
                        );

                    return (
                      <Select
                        id={selectId}
                        value={currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""}
                        onChange={(value) => {
                          const rawStubs16 = specs.stubs;
                          const stubs = [...(rawStubs16 || [])];
                          const newWt = parseFloat(value) || 0;
                          const isOverride = autoWt && newWt !== autoWt;
                          stubs[1] = {
                            ...stubs[1],
                            wallThicknessMm: newWt,
                            wallThicknessOverride: isOverride,
                          };
                          const updatedEntry = {
                            ...entry,
                            specs: { ...entry.specs, stubs },
                          };
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        options={wtOptions}
                        placeholder="Select W/T"
                      />
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-0.5">
                    Position <span className="text-gray-400">on T2</span>
                  </label>
                  {(() => {
                    const selectId = `bend-stub2-angle-${entry.id}`;
                    const angleOptions = [
                      { value: "0", label: "0° (Top)" },
                      { value: "45", label: "45°" },
                      { value: "90", label: "90° (Side)" },
                      { value: "135", label: "135°" },
                      { value: "180", label: "180° (Bottom)" },
                      { value: "225", label: "225°" },
                      { value: "270", label: "270° (Side)" },
                      { value: "315", label: "315°" },
                    ];
                    const rawAngleDegrees2 = stub1.angleDegrees;
                    return (
                      <Select
                        id={selectId}
                        value={String(rawAngleDegrees2 || "0")}
                        onChange={(value) => {
                          const rawStubs17 = specs.stubs;
                          const stubs = [...(rawStubs17 || [])];
                          stubs[1] = {
                            ...stubs[1],
                            angleDegrees: parseInt(value, 10) || 0,
                            tangent: 2,
                          };
                          const updatedEntry = {
                            ...entry,
                            specs: { ...entry.specs, stubs },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        options={angleOptions}
                        placeholder="Select angle"
                      />
                    );
                  })()}
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                  <label className="block text-xs text-purple-800 mb-0.5">Length (mm)</label>
                  <input
                    type="number"
                    value={rawLength3 || ""}
                    onChange={(e) => {
                      const rawStubs18 = specs.stubs;
                      const stubs = [...(rawStubs18 || [])];
                      stubs[1] = {
                        ...stubs[1],
                        length: parseInt(e.target.value, 10) || 0,
                      };
                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                    placeholder="150"
                  />
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                  <label className="block text-xs text-purple-800 mb-0.5">Location (mm)</label>
                  <input
                    type="number"
                    value={rawLocationFromFlange2 || ""}
                    onChange={(e) => {
                      const rawStubs19 = specs.stubs;
                      const stubs = [...(rawStubs19 || [])];
                      stubs[1] = {
                        ...stubs[1],
                        locationFromFlange: parseInt(e.target.value, 10) || 0,
                      };
                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                      updatedEntry.description = generateItemDescription(updatedEntry);
                      onUpdateEntry(entry.id, updatedEntry);
                    }}
                    className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                    placeholder="From flange"
                  />
                </div>
              </div>
              {/* Stub 2 Flange - matching Stub 1 layout */}
              <div className="mt-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                {(() => {
                  const rawHasBlankFlange2 = stub1.hasBlankFlange;
                  const rawNominalBoreMm8 = stub1.nominalBoreMm;
                  const rawWpb = specs.workingPressureBar;
                  const rawGlobalWpb = globalSpecs?.workingPressureBar;
                  const stub2WorkingPressure = rawWpb || rawGlobalWpb || 0;
                  const rawFlangeStandards3 = masterData.flangeStandards;
                  const rawPressureClasses3 = masterData.pressureClasses;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                      {/* Title as first column */}
                      <div className="flex items-center">
                        <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                          Stub 2 Flange
                        </span>
                      </div>
                      <FlangeDropdownTriplet
                        flangeStandardId={stub1.flangeStandardId}
                        flangePressureClassId={stub1.flangePressureClassId}
                        flangeTypeCode={stub1.flangeTypeCode}
                        globalFlangeStandardId={globalSpecs?.flangeStandardId}
                        globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                        globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                        flangeStandards={rawFlangeStandards3 || []}
                        pressureClasses={rawPressureClasses3 || []}
                        pressureClassesByStandard={pressureClassesByStandard}
                        allFlangeTypes={allFlangeTypes}
                        workingPressureBar={stub2WorkingPressure}
                        onStandardChange={(standardId) => {
                          const rawStubs = specs.stubs;
                          const currentStubs = [...(rawStubs || [])];
                          currentStubs[1] = {
                            ...currentStubs[1],
                            flangeStandardId: standardId,
                            flangePressureClassId: undefined,
                            flangeTypeCode: undefined,
                          };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: currentStubs },
                          });
                        }}
                        onPressureClassChange={(classId) => {
                          const rawStubs2 = specs.stubs;
                          const currentStubs = [...(rawStubs2 || [])];
                          currentStubs[1] = {
                            ...currentStubs[1],
                            flangePressureClassId: classId,
                          };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: currentStubs },
                          });
                        }}
                        onFlangeTypeChange={(typeCode) => {
                          const rawStubs3 = specs.stubs;
                          const currentStubs = [...(rawStubs3 || [])];
                          currentStubs[1] = { ...currentStubs[1], flangeTypeCode: typeCode };
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, stubs: currentStubs },
                          });
                        }}
                        onLoadPressureClasses={getFilteredPressureClasses}
                      />
                      <div className="flex items-end">
                        <label className="flex items-center gap-1.5 pb-1.5">
                          <input
                            type="checkbox"
                            checked={rawHasBlankFlange2 || false}
                            onChange={(e) => {
                              const rawStubs24 = specs.stubs;
                              const stubs = [...(rawStubs24 || [])];
                              stubs[1] = {
                                ...stubs[1],
                                hasBlankFlange: e.target.checked,
                              };
                              const updatedEntry = {
                                ...entry,
                                specs: { ...entry.specs, stubs },
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                            }}
                            className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs text-red-700 font-medium">
                            + Blank ({rawNominalBoreMm8 || "?"}NB)
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export const BendFormSpecsSection = memo(BendFormSpecsSectionInner);
