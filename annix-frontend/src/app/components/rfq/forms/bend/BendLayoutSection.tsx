"use client";

import {
  SABS62_BEND_RADIUS,
  type SABS62BendType,
  sabs62AvailableAngles,
  sabs62CFInterpolated,
} from "@annix/product-data/pipe";
import { memo } from "react";
import { Select } from "@/app/components/ui/Select";
import {
  allowedBendTypes,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  MAX_BEND_DEGREES,
  MIN_BEND_DEGREES,
  SABS719_BEND_TYPES,
  scheduleListForSpec,
  segmentedBendDeratingFactor,
  steelStandardBendRules,
} from "@/app/lib/config/rfq";
import { BendNominalBoreSelect } from "../sections/BendNominalBoreSelect";
import { BendSteelSpecSelect } from "../sections/BendSteelSpecSelect";
import { type ScheduleItem, type SteelSpecItem } from "../shared";
import type { BendFormLogic } from "./useBendFormLogic";

const BendLayoutSectionInner = (props: { logic: BendFormLogic }) => {
  const {
    MAX_QUANTITY_UNREGISTERED,
    debouncedCalculate,
    entry,
    errors,
    generateItemDescription,
    globalSpecs,
    groupedSteelOptions,
    index,
    isUnregisteredCustomer,
    masterData,
    nbToOdMap,
    onUpdateEntry,
    pipeALengthSource,
    setLastFetchedParams,
    setPipeALengthSource,
    setQuantityLimitPopup,
    specs,
  } = props.logic;
  const specsSteelSpecificationId = specs.steelSpecificationId;
  const specsWallThicknessMm = specs.wallThicknessMm;
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

  // Determine effective bend style (explicit selection or default from spec).
  // S-bends are always pulled regardless of steel spec.
  const effectiveBendStyle =
    specs.bendItemType === "S_BEND"
      ? "pulled"
      : rawBendStyle2 || (isSABS719 ? "segmented" : "pulled");
  const isSegmentedStyle = effectiveBendStyle === "segmented";

  // Common Steel Spec dropdown (used in both layouts)
  const steelGlobalSpecId = globalSpecs?.steelSpecificationId;
  const rawSteelSpecificationId7 = specsSteelSpecificationId;
  const steelEffectiveSpecId = rawSteelSpecificationId7 || steelGlobalSpecId;
  const isSteelFromGlobal2 = steelGlobalSpecId && steelEffectiveSpecId === steelGlobalSpecId;
  const isSteelOverride2 = steelGlobalSpecId && steelEffectiveSpecId !== steelGlobalSpecId;
  const steelGlobalSelectClass = "w-full border-2 border-green-500 dark:border-lime-400 rounded";
  const steelOverrideSelectClass =
    "w-full border-2 border-yellow-500 dark:border-yellow-400 rounded";
  const steelUnsuitableSelectClass = "w-full border-2 border-red-500 dark:border-red-400 rounded";
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
        const schedEffectiveSpecId = rawSteelSpecificationId10 || globalSpecs?.steelSpecificationId;
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
        const isSBendItemType = specs.bendItemType === "S_BEND";
        const options = [
          {
            value: "segmented",
            label: "Segmented Bend",
            disabled: !isSegmentedAllowed || isSBendItemType,
          },
          { value: "pulled", label: "Pulled Bend" },
        ];
        const rawBendStyle3 = specs.bendStyle;
        const currentStyle = isSBendItemType
          ? "pulled"
          : rawBendStyle3 || (isSABS719 ? "segmented" : "pulled");

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
                  newBendRadius = SABS62_BEND_RADIUS[newBendType as SABS62BendType]?.[nominalBore];
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
              const isFixed90 =
                isSweepTee ||
                specs.bendItemType === "DUCKFOOT_BEND" ||
                specs.bendItemType === "S_BEND";
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
    specs.bendItemType === "SWEEP_TEE" ||
    specs.bendItemType === "DUCKFOOT_BEND" ||
    specs.bendItemType === "S_BEND";
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
          title="Sweep Tees, Duckfoot Bends and S-Bends are always 90°"
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
                if (!isSegmentedStyle && bendDegrees && specs.nominalBoreMm && specs.bendType) {
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
              <span className="text-purple-600 text-xs ml-1">({segmentOptions.join(" or ")})</span>
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
          if (specs.nominalBoreMm && specs.scheduleNumber && specs.bendType && specs.bendDegrees) {
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
                      {entry.specs.numberOfSegments} segments ({entry.specs.numberOfSegments - 1}{" "}
                      mitre welds)
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
};

export const BendLayoutSection = memo(BendLayoutSectionInner);
