"use client";

import Link from "next/link";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClosureLengthSelector } from "@/app/components/rfq/ClosureLengthSelector";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/MaterialSuitabilityWarning";
import { formatNotesForDisplay, SmartNotesDropdown } from "@/app/components/rfq/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/SplitPaneLayout";
import { TangentExtensionsSection } from "@/app/components/rfq/TangentExtensionsSection";
import { WorkingConditionsSection } from "@/app/components/rfq/WorkingConditionsSection";
import { Select } from "@/app/components/ui/Select";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { useBendCalculations } from "@/app/hooks/useBendCalculations";
import { masterDataApi } from "@/app/lib/api/client";
import {
  allowedBendTypes,
  BEND_END_OPTIONS,
  BS_4504_PRESSURE_CLASSES,
  FITTING_CLASS_WALL_THICKNESS,
  FITTING_END_OPTIONS,
  closureWeight as getClosureWeight,
  fittingFlangeConfig as getFittingFlangeConfig,
  flangeCountPerBend as getFlangeCountPerBend,
  flangeCountPerFitting as getFlangeCountPerFitting,
  flangeWeldCountPerBend as getFlangeWeldCountPerBend,
  flangeWeldCountPerFitting as getFlangeWeldCountPerFitting,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  getScheduleListForSpec,
  tackWeldWeight as getTackWeldWeight,
  hasLooseFlange,
  isNominalBoreValidForSpec,
  MAX_BEND_DEGREES,
  MIN_BEND_DEGREES,
  SABS_1123_PRESSURE_CLASSES,
  SABS719_BEND_TYPES,
  STEEL_SPEC_NB_FALLBACK,
  segmentedBendDeratingFactor,
  steelStandardBendRules,
  tackWeldEndsPerBend,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import {
  BS_4504_FLANGE_TYPES,
  blankFlangeWeightSync as getBlankFlangeWeight,
  flangeWeightSync as getFlangeWeight,
  NB_TO_OD_LOOKUP,
  SABS_1123_FLANGE_TYPES,
  sansBlankFlangeWeightSync as sansBlankFlangeWeight,
} from "@/app/lib/hooks/useFlangeWeights";
import { log } from "@/app/lib/logger";
import {
  calculateBendWeldVolume,
  calculateMinWallThickness,
} from "@/app/lib/utils/pipeCalculations";
import { validatePressureClass } from "@/app/lib/utils/pressureClassValidation";
import {
  SABS62_BEND_RADIUS,
  SABS62BendType,
  sabs62AvailableAngles,
  sabs62CFInterpolated,
} from "@/app/lib/utils/sabs62CfData";
import { groupSteelSpecifications } from "@/app/lib/utils/steelSpecGroups";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";

export interface BendFormProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry?: (entry: any, index: number) => void;
  onCopyEntry?: (entry: any) => void;
  copiedItemId?: string | null;
  onCalculateBend?: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  Bend3DPreview?: React.ComponentType<any> | null;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
  requiredProducts?: string[];
  isUnregisteredCustomer?: boolean;
  onShowRestrictionPopup?: (
    type: "fittings" | "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

function BendFormComponent({
  entry,
  index,
  entriesCount,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
  onCopyEntry,
  copiedItemId,
  onCalculateBend,
  generateItemDescription,
  Bend3DPreview,
  pressureClassesByStandard,
  getFilteredPressureClasses,
  errors = {},
  isLoadingNominalBores = false,
  requiredProducts = [],
  isUnregisteredCustomer: isUnregisteredCustomerProp,
  onShowRestrictionPopup,
}: BendFormProps) {
  log.info(`🔄 BendForm RENDER - entry.id: ${entry.id}, index: ${index}`);

  // Authentication status for quantity restrictions
  const { isAuthenticated } = useOptionalCustomerAuth();
  const isUnregisteredCustomer = isUnregisteredCustomerProp ?? !isAuthenticated;
  const MAX_QUANTITY_UNREGISTERED = 1;
  const [quantityLimitPopup, setQuantityLimitPopup] = useState<{ x: number; y: number } | null>(
    null,
  );

  const bendCalcs = useBendCalculations(entry, globalSpecs, masterData);

  const [flangeSpecs, setFlangeSpecs] = useState<FlangeSpecData | null>(null);

  const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
  const flangePressureClassId =
    entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
  const nominalBoreMm = entry.specs?.nominalBoreMm;
  const bendEndConfiguration = entry.specs?.bendEndConfiguration || "PE";
  const hasFlanges = bendEndConfiguration !== "PE";

  const groupedSteelOptions = useMemo(
    () => (masterData?.steelSpecs ? groupSteelSpecifications(masterData.steelSpecs) : []),
    [masterData?.steelSpecs],
  );

  const flangeTypesLength = masterData?.flangeTypes?.length ?? 0;

  useEffect(() => {
    log.info(`🔥 BendForm useEffect[flangeSpecs] FIRED - entry.id: ${entry.id}`);
    const fetchSpecs = async () => {
      log.debug("BendForm fetchSpecs", {
        hasFlanges,
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeCode,
      });
      if (!hasFlanges || !nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
        log.debug("BendForm: missing required params, setting flangeSpecs to null");
        setFlangeSpecs(null);
        return;
      }

      const flangeType = masterData?.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode);
      const flangeTypeId = flangeType?.id;
      log.debug("BendForm: fetching with flangeTypeId", flangeTypeId);

      const specs = await fetchFlangeSpecsStatic(
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeId,
      );
      log.debug("BendForm: received specs", specs);
      setFlangeSpecs(specs);
    };

    fetchSpecs();
  }, [
    hasFlanges,
    nominalBoreMm,
    flangeStandardId,
    flangePressureClassId,
    flangeTypeCode,
    flangeTypesLength,
    masterData?.flangeTypes,
  ]);

  const steelSpec = masterData?.steelSpecs?.find(
    (s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId),
  );
  const steelSpecName = steelSpec?.steelSpecName || "";
  const isSABS719 = steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
  const currentBendStyle = entry.specs?.bendStyle || (isSABS719 ? "segmented" : "pulled");
  const isCurrentlySegmented = currentBendStyle === "segmented";

  const [lastFetchedParams, setLastFetchedParams] = useState<string | null>(null);
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCalculate = useCallback(() => {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }
    calculateTimeoutRef.current = setTimeout(() => {
      if (onCalculateBend) {
        onCalculateBend(entry.id);
      }
    }, 100);
  }, [entry.id, onCalculateBend]);

  const handleSteelSpecChange = useCallback(
    (value: string) => {
      const newSpecId = value ? Number(value) : undefined;
      const nominalBore = entry.specs?.nominalBoreMm;

      const newSpec = newSpecId
        ? masterData.steelSpecs?.find((s: any) => s.id === newSpecId)
        : null;
      const newSpecName = newSpec?.steelSpecName || "";
      const isNewSABS719 = newSpecName.includes("SABS 719") || newSpecName.includes("SANS 719");

      const oldSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
      const oldSpec = oldSpecId
        ? masterData.steelSpecs?.find((s: any) => s.id === oldSpecId)
        : null;
      const oldSpecName = oldSpec?.steelSpecName || "";
      const wasOldSABS719 = oldSpecName.includes("SABS 719") || oldSpecName.includes("SANS 719");

      const specTypeChanged = isNewSABS719 !== wasOldSABS719;
      const updatedEntry: any = {
        ...entry,
        specs: {
          ...entry.specs,
          steelSpecificationId: newSpecId,
          scheduleNumber: specTypeChanged ? undefined : entry.specs?.scheduleNumber,
          wallThicknessMm: specTypeChanged ? undefined : entry.specs?.wallThicknessMm,
          bendType: specTypeChanged ? undefined : entry.specs?.bendType,
          bendRadiusType: specTypeChanged ? undefined : entry.specs?.bendRadiusType,
          bendDegrees: specTypeChanged ? undefined : entry.specs?.bendDegrees,
          numberOfSegments: specTypeChanged ? undefined : entry.specs?.numberOfSegments,
          centerToFaceMm: specTypeChanged ? undefined : entry.specs?.centerToFaceMm,
          bendRadiusMm: specTypeChanged ? undefined : entry.specs?.bendRadiusMm,
        },
      };
      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);

      if (
        !specTypeChanged &&
        nominalBore &&
        entry.specs?.scheduleNumber &&
        entry.specs?.bendType &&
        entry.specs?.bendDegrees
      ) {
        debouncedCalculate();
      }
    },
    [
      entry,
      globalSpecs?.steelSpecificationId,
      masterData.steelSpecs,
      generateItemDescription,
      onUpdateEntry,
      debouncedCalculate,
    ],
  );

  const handleWorkingPressureChange = useCallback(
    (value: number | undefined) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, workingPressureBar: value },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleWorkingTemperatureChange = useCallback(
    (value: number | undefined) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, workingTemperatureC: value },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleResetOverrides = useCallback(() => {
    onUpdateEntry(entry.id, {
      specs: {
        ...entry.specs,
        workingPressureBar: undefined,
        workingTemperatureC: undefined,
        steelSpecificationId: undefined,
        bendItemType: undefined,
      },
    });
  }, [entry.id, entry.specs, onUpdateEntry]);

  const handleItemTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newItemType = e.target.value;
      const oldItemType = entry.specs?.bendItemType || "BEND";
      const isFixed90 = newItemType === "SWEEP_TEE" || newItemType === "DUCKFOOT_BEND";
      const switchingToOrFromSweepTee =
        (newItemType === "SWEEP_TEE") !== (oldItemType === "SWEEP_TEE");
      const currentNB = entry.specs?.nominalBoreMm;
      const sweepTeeValidNBs = [
        200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
      ];
      const nbInvalidForSweepTee =
        newItemType === "SWEEP_TEE" && currentNB && !sweepTeeValidNBs.includes(currentNB);
      const hideTangentsAndStubs = newItemType === "SWEEP_TEE" || newItemType === "DUCKFOOT_BEND";
      const updatedEntry: any = {
        ...entry,
        specs: {
          ...entry.specs,
          bendItemType: newItemType,
          bendDegrees: isFixed90 ? 90 : entry.specs?.bendDegrees,
          bendEndConfiguration: switchingToOrFromSweepTee
            ? "PE"
            : entry.specs?.bendEndConfiguration,
          nominalBoreMm: nbInvalidForSweepTee ? undefined : entry.specs?.nominalBoreMm,
          numberOfTangents: hideTangentsAndStubs ? 0 : entry.specs?.numberOfTangents,
          tangentLengths: hideTangentsAndStubs ? [] : entry.specs?.tangentLengths,
          numberOfStubs: hideTangentsAndStubs ? 0 : entry.specs?.numberOfStubs,
          stubs: hideTangentsAndStubs ? [] : entry.specs?.stubs,
          closureLengthMm: hideTangentsAndStubs ? undefined : entry.specs?.closureLengthMm,
          duckfootBasePlateXMm:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootBasePlateXMm : undefined,
          duckfootBasePlateYMm:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootBasePlateYMm : undefined,
          duckfootInletCentreHeightMm:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootInletCentreHeightMm : undefined,
          duckfootRibThicknessT2Mm:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootRibThicknessT2Mm : undefined,
          duckfootPlateThicknessT1Mm:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootPlateThicknessT1Mm : undefined,
          duckfootGussetPointDDegrees:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootGussetPointDDegrees : undefined,
          duckfootGussetPointCDegrees:
            newItemType === "DUCKFOOT_BEND" ? entry.specs?.duckfootGussetPointCDegrees : undefined,
          sweepTeePipeALengthMm:
            newItemType === "SWEEP_TEE" ? entry.specs?.sweepTeePipeALengthMm : undefined,
        },
      };
      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);
    },
    [entry, generateItemDescription, onUpdateEntry],
  );

  const handleTangentCountChange = useCallback(
    (count: number, newLengths: number[]) => {
      const currentNumStubs = entry.specs?.numberOfStubs || 0;
      const adjustedNumStubs = count < 2 && currentNumStubs > 1 ? 1 : currentNumStubs;
      const currentStubs = entry.specs?.stubs || [];
      const adjustedStubs =
        adjustedNumStubs < currentNumStubs ? currentStubs.slice(0, adjustedNumStubs) : currentStubs;
      const updatedEntry = {
        ...entry,
        specs: {
          ...entry.specs,
          numberOfTangents: count,
          tangentLengths: newLengths,
          numberOfStubs: adjustedNumStubs,
          stubs: adjustedStubs,
        },
      };
      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);
      if (
        entry.specs?.nominalBoreMm &&
        entry.specs?.scheduleNumber &&
        entry.specs?.bendType &&
        entry.specs?.bendDegrees
      ) {
        debouncedCalculate();
      }
    },
    [entry, generateItemDescription, onUpdateEntry, debouncedCalculate],
  );

  const handleTangentLengthChange = useCallback(
    (index: number, length: number) => {
      const lengths = [...(entry.specs?.tangentLengths || [])];
      lengths[index] = length;
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, tangentLengths: lengths },
      });
      if (
        entry.specs?.nominalBoreMm &&
        entry.specs?.scheduleNumber &&
        entry.specs?.bendType &&
        entry.specs?.bendDegrees
      ) {
        debouncedCalculate();
      }
    },
    [entry.id, entry.specs, onUpdateEntry, debouncedCalculate],
  );

  const [pipeALengthSource, setPipeALengthSource] = useState<"auto" | "override" | null>(null);

  useEffect(() => {
    const fetchAndSetPipeALength = async () => {
      if (entry.specs?.bendItemType !== "SWEEP_TEE") {
        return;
      }
      if (!entry.specs?.nominalBoreMm) {
        return;
      }

      const segmentedToSweepTeeMap: Record<string, string> = {
        long: "long_radius",
        medium: "medium_radius",
        elbow: "elbow",
      };

      const pulledToSweepTeeMap: Record<string, string> = {
        "1D": "elbow",
        "1.5D": "elbow",
        "2D": "medium_radius",
        "3D": "long_radius",
        "5D": "long_radius",
      };

      const sweepTeeRadiusType = isCurrentlySegmented
        ? entry.specs?.bendRadiusType
          ? segmentedToSweepTeeMap[entry.specs.bendRadiusType]
          : null
        : entry.specs?.bendType
          ? pulledToSweepTeeMap[entry.specs.bendType]
          : null;

      if (!sweepTeeRadiusType) {
        return;
      }

      const fetchKey = `${entry.specs.nominalBoreMm}-${sweepTeeRadiusType}`;
      if (fetchKey === lastFetchedParams) {
        return;
      }

      try {
        const dimension = await masterDataApi.getSweepTeeDimension(
          entry.specs.nominalBoreMm,
          sweepTeeRadiusType,
        );
        setLastFetchedParams(fetchKey);
        if (dimension?.pipeALengthMm) {
          setPipeALengthSource("auto");
          onUpdateEntry(entry.id, {
            specs: { ...entry.specs, sweepTeePipeALengthMm: dimension.pipeALengthMm },
          });
        }
      } catch {
        setLastFetchedParams(fetchKey);
      }
    };

    fetchAndSetPipeALength();
  }, [
    entry.specs?.bendItemType,
    entry.specs?.nominalBoreMm,
    entry.specs?.bendRadiusType,
    entry.specs?.bendType,
    isCurrentlySegmented,
    lastFetchedParams,
    entry.id,
    entry.specs,
    onUpdateEntry,
  ]);

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="bend"
        showSplitToggle={entry.specs?.nominalBoreMm && entry.specs?.bendDegrees}
        formContent={
          <>
            {/* Item Description */}
            <div>
              <label
                htmlFor={`bend-description-${entry.id}`}
                className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
              >
                Item Description *
              </label>
              <textarea
                id={`bend-description-${entry.id}`}
                value={entry.description || ""}
                onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                rows={2}
                placeholder="e.g., 40NB 90° 1.5D Bend"
                required
                aria-required="true"
              />
            </div>

            {/* Working Conditions - Item Override + Steel Spec */}
            <WorkingConditionsSection
              color="purple"
              entryId={entry.id}
              idPrefix="bend"
              workingPressureBar={entry.specs?.workingPressureBar}
              workingTemperatureC={entry.specs?.workingTemperatureC}
              globalPressureBar={globalSpecs?.workingPressureBar}
              globalTemperatureC={globalSpecs?.workingTemperatureC}
              onPressureChange={handleWorkingPressureChange}
              onTemperatureChange={handleWorkingTemperatureChange}
              onReset={handleResetOverrides}
              gridCols={4}
              extraFields={
                <>
                  {/* Item Type Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Item Type
                    </label>
                    <select
                      id={`bend-item-type-${entry.id}`}
                      data-nix-target="bend-item-type"
                      value={entry.specs?.bendItemType || "BEND"}
                      onChange={handleItemTypeChange}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    >
                      <option value="BEND">Bend</option>
                      <option value="DUCKFOOT_BEND" data-nix-target="bend-item-type-duckfoot">
                        Duckfoot Bend
                      </option>
                      <option value="SWEEP_TEE" data-nix-target="bend-item-type-sweep-tee">
                        Sweep Tee
                      </option>
                    </select>
                  </div>
                  {/* Steel Specification Dropdown */}
                  <div>
                    {(() => {
                      const globalSpecId = globalSpecs?.steelSpecificationId;
                      const effectiveSpecId = entry.specs?.steelSpecificationId || globalSpecId;
                      const isSteelFromGlobal = globalSpecId && effectiveSpecId === globalSpecId;
                      const isSteelOverride = globalSpecId && effectiveSpecId !== globalSpecId;
                      const selectId = `bend-steel-spec-${entry.id}`;
                      const globalSelectClass =
                        "w-full border-2 border-green-500 dark:border-lime-400 rounded";
                      const overrideSelectClass =
                        "w-full border-2 border-yellow-500 dark:border-yellow-400 rounded";
                      const unsuitableSelectClass =
                        "w-full border-2 border-red-500 dark:border-red-400 rounded";
                      const defaultSelectClass = "w-full";

                      const effectivePressure =
                        entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar;
                      const effectiveTemp =
                        entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC;
                      const selectedSpec = masterData.steelSpecs?.find(
                        (s: any) => s.id === effectiveSpecId,
                      );
                      const isSteelUnsuitable =
                        effectiveSpecId &&
                        effectivePressure &&
                        selectedSpec &&
                        ((selectedSpec.maxPressureBar &&
                          effectivePressure > selectedSpec.maxPressureBar) ||
                          (selectedSpec.maxTemperatureC &&
                            effectiveTemp &&
                            effectiveTemp > selectedSpec.maxTemperatureC));

                      const steelSelectClass = isSteelUnsuitable
                        ? unsuitableSelectClass
                        : isSteelFromGlobal
                          ? globalSelectClass
                          : isSteelOverride
                            ? overrideSelectClass
                            : defaultSelectClass;

                      return (
                        <>
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            Steel Specification
                            {isSteelUnsuitable && (
                              <span className="text-red-600 text-xs ml-2 font-bold">
                                (NOT SUITABLE)
                              </span>
                            )}
                            {!isSteelUnsuitable && isSteelFromGlobal && (
                              <span className="text-green-600 text-xs ml-2">(From Specs Page)</span>
                            )}
                            {!isSteelUnsuitable && isSteelOverride && (
                              <span className="text-yellow-600 text-xs ml-2">(Override)</span>
                            )}
                          </label>
                          <Select
                            id={selectId}
                            value={String(effectiveSpecId || "")}
                            className={steelSelectClass}
                            onChange={handleSteelSpecChange}
                            options={[]}
                            groupedOptions={groupedSteelOptions}
                            placeholder="Select Steel Spec"
                          />
                        </>
                      );
                    })()}
                  </div>
                </>
              }
            />
            <MaterialSuitabilityWarning
              color="purple"
              steelSpecName={(() => {
                const steelSpecId =
                  entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                return (
                  masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName || ""
                );
              })()}
              effectivePressure={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar}
              effectiveTemperature={
                entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC
              }
              allSteelSpecs={masterData.steelSpecs || []}
              onSelectSpec={(spec) =>
                onUpdateEntry(entry.id, {
                  specs: { ...entry.specs, steelSpecificationId: spec.id },
                })
              }
            />

            {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
            {(() => {
              const effectiveSteelSpecId =
                entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
              const steelSpec = masterData.steelSpecs?.find(
                (s: any) => s.id === effectiveSteelSpecId,
              );
              const steelSpecName = steelSpec?.steelSpecName || "";
              const bendRules = steelStandardBendRules(steelSpecName);
              const allowedTypes = allowedBendTypes(steelSpecName);
              const isSABS719 =
                steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
              const isSABS62 =
                steelSpecName.includes("SABS 62") || steelSpecName.includes("SANS 62");
              const isSegmentedAllowed = allowedTypes.includes("segmented");
              const isPulledOnly = allowedTypes.length === 1 && allowedTypes[0] === "pulled";

              // Determine effective bend style (explicit selection or default from spec)
              const effectiveBendStyle =
                entry.specs?.bendStyle || (isSABS719 ? "segmented" : "pulled");
              const isSegmentedStyle = effectiveBendStyle === "segmented";

              // Common Steel Spec dropdown (used in both layouts)
              const steelGlobalSpecId = globalSpecs?.steelSpecificationId;
              const steelEffectiveSpecId = entry.specs?.steelSpecificationId || steelGlobalSpecId;
              const isSteelFromGlobal2 =
                steelGlobalSpecId && steelEffectiveSpecId === steelGlobalSpecId;
              const isSteelOverride2 =
                steelGlobalSpecId && steelEffectiveSpecId !== steelGlobalSpecId;
              const steelGlobalSelectClass =
                "w-full border-2 border-green-500 dark:border-lime-400 rounded";
              const steelOverrideSelectClass =
                "w-full border-2 border-yellow-500 dark:border-yellow-400 rounded";
              const steelUnsuitableSelectClass =
                "w-full border-2 border-red-500 dark:border-red-400 rounded";
              const steelDefaultSelectClass = "w-full";

              const effectivePressure2 =
                entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar;
              const effectiveTemp2 =
                entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC;
              const selectedSteelSpec2 = masterData.steelSpecs?.find(
                (s: any) => s.id === steelEffectiveSpecId,
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
                  {(() => {
                    const selectId = `bend-steel-spec-${entry.id}`;

                    return (
                      <Select
                        id={selectId}
                        value={String(steelEffectiveSpecId || "")}
                        className={steelSelectClass2}
                        onChange={(value) => {
                          const newSpecId = value ? Number(value) : undefined;
                          const nominalBore = entry.specs?.nominalBoreMm;

                          const newSpec = newSpecId
                            ? masterData.steelSpecs?.find((s: any) => s.id === newSpecId)
                            : null;
                          const newSpecName = newSpec?.steelSpecName || "";
                          const isNewSABS719 =
                            newSpecName.includes("SABS 719") || newSpecName.includes("SANS 719");

                          const oldSpecId =
                            entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const oldSpec = oldSpecId
                            ? masterData.steelSpecs?.find((s: any) => s.id === oldSpecId)
                            : null;
                          const oldSpecName = oldSpec?.steelSpecName || "";
                          const wasOldSABS719 =
                            oldSpecName.includes("SABS 719") || oldSpecName.includes("SANS 719");

                          const specTypeChanged = isNewSABS719 !== wasOldSABS719;

                          let matchedSchedule: string | undefined;
                          let matchedWT: number | undefined;
                          let keepNB = false;

                          if (nominalBore && newSpecId) {
                            const nbValidForNewSpec = isNominalBoreValidForSpec(
                              newSpecName,
                              nominalBore,
                            );
                            if (nbValidForNewSpec) {
                              keepNB = true;
                              const schedules = getScheduleListForSpec(
                                nominalBore,
                                newSpecId,
                                newSpecName,
                              );
                              const pressure = globalSpecs?.workingPressureBar || 0;

                              if (pressure > 0 && schedules.length > 0) {
                                const od = NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05;
                                const temperature = globalSpecs?.workingTemperatureC || 20;
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
                                  .filter((s: any) => (s.wallThicknessMm || 0) >= minWT)
                                  .sort(
                                    (a: any, b: any) =>
                                      (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0),
                                  );

                                if (eligibleSchedules.length > 0) {
                                  matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                  matchedWT = eligibleSchedules[0].wallThicknessMm;
                                } else if (schedules.length > 0) {
                                  const sorted = [...schedules].sort(
                                    (a: any, b: any) =>
                                      (b.wallThicknessMm || 0) - (a.wallThicknessMm || 0),
                                  );
                                  matchedSchedule = sorted[0].scheduleDesignation;
                                  matchedWT = sorted[0].wallThicknessMm;
                                }
                              } else if (schedules.length > 0) {
                                const sch40 = schedules.find(
                                  (s: any) =>
                                    s.scheduleDesignation === "40" ||
                                    s.scheduleDesignation === "Sch 40",
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
                            ...entry,
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: newSpecId,
                              nominalBoreMm: keepNB ? nominalBore : undefined,
                              scheduleNumber: keepNB ? matchedSchedule : undefined,
                              wallThicknessMm: keepNB ? matchedWT : undefined,
                              bendType: specTypeChanged ? undefined : entry.specs?.bendType,
                              bendRadiusType: specTypeChanged
                                ? undefined
                                : entry.specs?.bendRadiusType,
                              bendDegrees: specTypeChanged ? undefined : entry.specs?.bendDegrees,
                              numberOfSegments: specTypeChanged
                                ? undefined
                                : entry.specs?.numberOfSegments,
                              centerToFaceMm: specTypeChanged
                                ? undefined
                                : entry.specs?.centerToFaceMm,
                              bendRadiusMm: specTypeChanged ? undefined : entry.specs?.bendRadiusMm,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (keepNB && matchedSchedule) {
                            debouncedCalculate();
                          }
                        }}
                        options={[]}
                        groupedOptions={groupedSteelOptions}
                        placeholder="Select Steel Spec"
                      />
                    );
                  })()}
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
                  {(() => {
                    const selectId = `bend-nb-${entry.id}`;
                    const isDisabled = false;

                    const nbOptions = (() => {
                      const steelSpec = masterData.steelSpecs?.find(
                        (s: any) => s.id === effectiveSteelSpecId,
                      );
                      const steelSpecName = steelSpec?.steelSpecName || "";
                      const isSweepTeeItem = entry.specs?.bendItemType === "SWEEP_TEE";

                      if (isSweepTeeItem) {
                        const sweepTeeNBs = [
                          200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
                        ];
                        return sweepTeeNBs.map((nb: number) => ({
                          value: String(nb),
                          label: `${nb} NB`,
                        }));
                      }

                      const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) =>
                        steelSpecName.includes(pattern),
                      )?.[1];
                      const nbs = fallbackNBs || [
                        40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
                      ];
                      return nbs.map((nb: number) => ({
                        value: String(nb),
                        label: `${nb} NB`,
                      }));
                    })();

                    const selectedNB = entry.specs?.nominalBoreMm;
                    const nbValid = selectedNB
                      ? isNominalBoreValidForSpec(steelSpecName, selectedNB)
                      : true;
                    const nbRules = bendRules;

                    return (
                      <>
                        <Select
                          id={selectId}
                          value={
                            entry.specs?.nominalBoreMm ? String(entry.specs.nominalBoreMm) : ""
                          }
                          onChange={(value) => {
                            const nominalBore = parseInt(value, 10);
                            if (!nominalBore) return;

                            const pressure = globalSpecs?.workingPressureBar || 0;
                            const nbEffectiveSpecId =
                              entry?.specs?.steelSpecificationId ??
                              globalSpecs?.steelSpecificationId;
                            const schedules = getScheduleListForSpec(
                              nominalBore,
                              nbEffectiveSpecId,
                              steelSpecName,
                            );

                            let matchedSchedule: string | null = null;
                            let matchedWT = 0;

                            if (pressure > 0 && schedules.length > 0) {
                              const od = NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05;
                              const temperature = globalSpecs?.workingTemperatureC || 20;
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
                                .filter((s) => s.wallThicknessMm >= minWT)
                                .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

                              if (eligibleSchedules.length > 0) {
                                matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                matchedWT = eligibleSchedules[0].wallThicknessMm;
                              } else {
                                const sorted = [...schedules].sort(
                                  (a, b) => b.wallThicknessMm - a.wallThicknessMm,
                                );
                                matchedSchedule = sorted[0].scheduleDesignation;
                                matchedWT = sorted[0].wallThicknessMm;
                              }
                            } else if (schedules.length > 0) {
                              const sch40 = schedules.find(
                                (s) =>
                                  s.scheduleDesignation === "40" ||
                                  s.scheduleDesignation === "Sch 40",
                              );
                              if (sch40) {
                                matchedSchedule = sch40.scheduleDesignation;
                                matchedWT = sch40.wallThicknessMm;
                              } else {
                                matchedSchedule = schedules[0].scheduleDesignation;
                                matchedWT = schedules[0].wallThicknessMm;
                              }
                            }

                            let newCenterToFace: number | undefined;
                            let newBendRadius: number | undefined;

                            if (
                              isSegmentedStyle &&
                              entry.specs?.bendRadiusType &&
                              entry.specs?.numberOfSegments
                            ) {
                              const cfResult = getSABS719CenterToFaceBySegments(
                                entry.specs.bendRadiusType,
                                nominalBore,
                                entry.specs.numberOfSegments,
                              );
                              if (cfResult) {
                                newCenterToFace = cfResult.centerToFace;
                                newBendRadius = cfResult.radius;
                              }
                            }

                            if (
                              !isSegmentedStyle &&
                              entry.specs?.bendType &&
                              entry.specs?.bendDegrees
                            ) {
                              const bendType = entry.specs.bendType as SABS62BendType;
                              newCenterToFace = sabs62CFInterpolated(
                                bendType,
                                entry.specs.bendDegrees,
                                nominalBore,
                              );
                              newBendRadius = SABS62_BEND_RADIUS[bendType]?.[nominalBore];
                            }

                            const isSweepTee = entry.specs?.bendItemType === "SWEEP_TEE";
                            const updatedEntry: any = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                nominalBoreMm: nominalBore,
                                scheduleNumber: matchedSchedule,
                                wallThicknessMm: matchedWT,
                                centerToFaceMm: newCenterToFace,
                                bendRadiusMm: newBendRadius,
                                sweepTeePipeALengthMm: isSweepTee
                                  ? undefined
                                  : entry.specs?.sweepTeePipeALengthMm,
                              },
                            };
                            if (isSweepTee) {
                              setLastFetchedParams(null);
                              setPipeALengthSource(null);
                            }
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);

                            const hasBendSpecs = isSegmentedStyle
                              ? entry.specs?.bendRadiusType && entry.specs?.bendDegrees
                              : entry.specs?.bendType && entry.specs?.bendDegrees;
                            if (matchedSchedule && hasBendSpecs) {
                              debouncedCalculate();
                            }
                          }}
                          options={nbOptions}
                          placeholder="Select NB"
                          disabled={isDisabled}
                        />
                        {selectedNB && !nbValid && nbRules && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            {selectedNB} NB outside typical range ({nbRules.minNominalBoreMm}-
                            {nbRules.maxNominalBoreMm} NB) for {nbRules.category.replace("_", " ")}
                          </p>
                        )}
                        {errors[`bend_${index}_nb`] && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {errors[`bend_${index}_nb`]}
                          </p>
                        )}
                      </>
                    );
                  })()}
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
                    {entry.specs?.scheduleNumber && globalSpecs?.workingPressureBar && (
                      <span className="text-green-600 text-xs ml-2">(Auto)</span>
                    )}
                  </label>
                  {(() => {
                    const selectId = `bend-schedule-${entry.id}`;
                    const schedEffectiveSpecId =
                      entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                    const schedules = getScheduleListForSpec(
                      entry.specs?.nominalBoreMm || 0,
                      schedEffectiveSpecId,
                      steelSpecName,
                    );
                    const options = schedules.map((s: any) => ({
                      value: s.scheduleDesignation,
                      label: `${s.scheduleDesignation} (${s.wallThicknessMm}mm)`,
                    }));

                    return (
                      <Select
                        id={selectId}
                        value={entry.specs?.scheduleNumber || ""}
                        onChange={(schedule) => {
                          if (!schedule) return;
                          const scheduleData = schedules.find(
                            (s: any) => s.scheduleDesignation === schedule,
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
                        placeholder={
                          entry.specs?.nominalBoreMm ? "Select Schedule" : "Select NB first"
                        }
                        disabled={!entry.specs?.nominalBoreMm}
                      />
                    );
                  })()}
                  {entry.specs?.wallThicknessMm && (
                    <p className="text-xs text-green-700 mt-0.5">
                      WT: {entry.specs.wallThicknessMm}mm
                    </p>
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
                    const currentStyle =
                      entry.specs?.bendStyle || (isSABS719 ? "segmented" : "pulled");

                    return (
                      <Select
                        id={selectId}
                        value={currentStyle}
                        onChange={(style) => {
                          const currentBendType = entry.specs?.bendType;
                          const currentRadiusType = entry.specs?.bendRadiusType;
                          const switchingToSegmented = style === "segmented";
                          const switchingToPulled = style === "pulled";
                          const nominalBore = entry.specs?.nominalBoreMm;
                          const bendDegrees = entry.specs?.bendDegrees;
                          const numberOfSegments = entry.specs?.numberOfSegments;

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
                              numberOfSegments: switchingToSegmented
                                ? entry.specs?.numberOfSegments
                                : undefined,
                              centerToFaceMm: newCenterToFace,
                              bendRadiusMm: newBendRadius,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (nominalBore && entry.specs?.scheduleNumber && bendDegrees) {
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

                    return (
                      <Select
                        id={selectId}
                        value={entry.specs?.bendType || ""}
                        onChange={(bendType) => {
                          const isSweepTee = entry.specs?.bendItemType === "SWEEP_TEE";
                          const isFixed90 =
                            isSweepTee || entry.specs?.bendItemType === "DUCKFOOT_BEND";
                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              bendType: bendType || undefined,
                              nominalBoreMm: undefined,
                              bendDegrees: isFixed90 ? 90 : undefined,
                              centerToFaceMm: undefined,
                              bendRadiusMm: undefined,
                              sweepTeePipeALengthMm: isSweepTee
                                ? undefined
                                : entry.specs?.sweepTeePipeALengthMm,
                            },
                          };
                          if (isSweepTee) {
                            setLastFetchedParams(null);
                            setPipeALengthSource(null);
                          }
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
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

                    return (
                      <Select
                        id={selectId}
                        value={entry.specs?.bendRadiusType || ""}
                        onChange={(radiusType) => {
                          const isSweepTee = entry.specs?.bendItemType === "SWEEP_TEE";
                          const updatedEntry: any = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              bendRadiusType: radiusType || undefined,
                              bendType: undefined,
                              numberOfSegments: undefined,
                              centerToFaceMm: undefined,
                              bendRadiusMm: undefined,
                              bendDegrees: isSweepTee ? 90 : undefined,
                              sweepTeePipeALengthMm: isSweepTee
                                ? undefined
                                : entry.specs?.sweepTeePipeALengthMm,
                            },
                          };
                          if (isSweepTee) {
                            setLastFetchedParams(null);
                            setPipeALengthSource(null);
                          }
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        options={options}
                        placeholder="Select Radius Type"
                      />
                    );
                  })()}
                </div>
              );

              // Angle Dropdown - uses different angle lists based on bend style
              const pulledBendType = entry.specs?.bendType as SABS62BendType | undefined;
              const currentNB = entry.specs?.nominalBoreMm;
              const availableAngles =
                !isSegmentedStyle && pulledBendType && currentNB
                  ? sabs62AvailableAngles(pulledBendType, currentNB)
                  : [];

              const isFixedAngle90 =
                entry.specs?.bendItemType === "SWEEP_TEE" ||
                entry.specs?.bendItemType === "DUCKFOOT_BEND";
              const isMissingBendAngle =
                entry.specs?.nominalBoreMm && !entry.specs?.bendDegrees && !isFixedAngle90;

              const AngleDropdown = (
                <div
                  className={
                    isMissingBendAngle ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""
                  }
                >
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
                          value={entry.specs?.bendDegrees ? String(entry.specs.bendDegrees) : ""}
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
                              entry.specs?.nominalBoreMm &&
                              entry.specs?.bendType
                            ) {
                              const bendType = entry.specs.bendType as SABS62BendType;
                              centerToFaceMm = sabs62CFInterpolated(
                                bendType,
                                bendDegrees,
                                entry.specs.nominalBoreMm,
                              );
                              bendRadiusMm =
                                SABS62_BEND_RADIUS[bendType]?.[entry.specs.nominalBoreMm];
                            }
                            const updatedEntry: any = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                bendDegrees,
                                centerToFaceMm,
                                bendRadiusMm,
                                numberOfSegments: isSegmentedStyle
                                  ? undefined
                                  : entry.specs?.numberOfSegments,
                              },
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                            if (
                              bendDegrees &&
                              entry.specs?.nominalBoreMm &&
                              entry.specs?.scheduleNumber
                            ) {
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
                    {entry.specs?.centerToFaceMm && (
                      <span className="text-green-600 text-xs ml-1">(Auto)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={
                      entry.specs?.centerToFaceMm
                        ? `${Number(entry.specs.centerToFaceMm).toFixed(1)} mm`
                        : "Select specs"
                    }
                    disabled
                    className={`w-full px-2 py-1.5 border rounded text-xs cursor-not-allowed ${
                      entry.specs?.centerToFaceMm
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
                    const bendRadiusType = entry.specs?.bendRadiusType;
                    const bendDeg = entry.specs?.bendDegrees || 0;
                    const nominalBore = entry.specs?.nominalBoreMm || 0;

                    if (!bendRadiusType || bendDeg <= 0) {
                      return (
                        <>
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            Segments{" "}
                            <span className="text-purple-600 text-xs ml-1">(SABS 719)</span>
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

                    const isSweepTee = entry.specs?.bendItemType === "SWEEP_TEE";
                    const segmentOptions = getSegmentOptions(bendDeg, bendRadiusType, isSweepTee);
                    const isAutoFill = bendDeg <= 11;

                    if (isAutoFill && entry.specs?.numberOfSegments !== 2) {
                      setTimeout(() => {
                        const cfResult = getSABS719CenterToFaceBySegments(
                          bendRadiusType,
                          nominalBore,
                          2,
                        );
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
                        if (nominalBore && entry.specs?.scheduleNumber) {
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
                          value={entry.specs?.numberOfSegments || ""}
                          onChange={(e) => {
                            const segments = e.target.value
                              ? parseInt(e.target.value, 10)
                              : undefined;
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
                            if (segments && nominalBore && entry.specs?.scheduleNumber) {
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

              // Quantity Input (shared by both layouts)
              const QuantityInput = (
                <div className="relative" data-nix-target="bend-quantity-input">
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Quantity *{" "}
                    {isUnregisteredCustomer && (
                      <span className="text-gray-400 font-normal">(fixed)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={entry.specs?.quantityValue ?? ""}
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
                        entry.specs?.nominalBoreMm &&
                        entry.specs?.scheduleNumber &&
                        entry.specs?.bendType &&
                        entry.specs?.bendDegrees
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
                          className={`grid grid-cols-1 sm:grid-cols-2 ${entry.specs?.bendItemType === "SWEEP_TEE" ? "md:grid-cols-5" : "md:grid-cols-4"} gap-3`}
                        >
                          {AngleDropdown}
                          {SegmentsDropdown}
                          {CFDisplay}
                          {entry.specs?.bendItemType === "SWEEP_TEE" && (
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
                                value={entry.specs?.sweepTeePipeALengthMm || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined;
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
                      {entry.specs?.numberOfSegments &&
                        entry.specs?.numberOfSegments > 1 &&
                        entry.specs?.bendDegrees &&
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
                                  Effective pressure: {Math.round(derating * 100)}% (
                                  {deratingPercent}% reduction)
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
                          className={`grid grid-cols-1 sm:grid-cols-2 ${entry.specs?.bendItemType === "SWEEP_TEE" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}
                        >
                          {AngleDropdown}
                          {CFDisplay}
                          {entry.specs?.bendItemType === "SWEEP_TEE" && (
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
                                value={entry.specs?.sweepTeePipeALengthMm || ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined;
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
                const effectiveStandardId =
                  entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                const effectiveFlangeTypeCode =
                  entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                const normalizedFlangeTypeCode = effectiveFlangeTypeCode?.replace(/^\//, "") || "";
                const selectedStandard = masterData.flangeStandards?.find(
                  (fs: any) => fs.id === effectiveStandardId,
                );
                const standardCode = selectedStandard?.code?.toUpperCase() || "";
                const isSabs1123 =
                  (standardCode.includes("SABS") || standardCode.includes("SANS")) &&
                  standardCode.includes("1123");
                const isBs4504 =
                  (standardCode.includes("BS") && standardCode.includes("4504")) ||
                  (standardCode.includes("EN") &&
                    (standardCode.includes("1092") || standardCode.includes("10921")));
                const showFlangeType = isSabs1123 || isBs4504;
                const flangeTypes = isSabs1123 ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES;
                const pressureClasses = isSabs1123
                  ? SABS_1123_PRESSURE_CLASSES
                  : BS_4504_PRESSURE_CLASSES;

                const globalClass = masterData.pressureClasses?.find(
                  (p: any) => p.id === globalSpecs?.flangePressureClassId,
                );
                const globalBasePressure = globalClass?.designation?.replace(/\/\d+$/, "") || "";
                const targetDesignationForGlobal =
                  normalizedFlangeTypeCode && globalBasePressure
                    ? `${globalBasePressure}/${normalizedFlangeTypeCode}`
                    : null;
                const matchingClassForGlobal = targetDesignationForGlobal
                  ? masterData.pressureClasses?.find(
                      (pc: any) => pc.designation === targetDesignationForGlobal,
                    )
                  : null;
                const effectivePressureClassId =
                  entry.specs?.flangePressureClassId ||
                  matchingClassForGlobal?.id ||
                  globalSpecs?.flangePressureClassId;
                const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
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
                const currentBlankPositions = entry.specs?.blankFlangePositions || [];

                const isStandardFromGlobal =
                  globalSpecs?.flangeStandardId &&
                  effectiveStandardId === globalSpecs?.flangeStandardId;
                const effectiveClass = masterData.pressureClasses?.find(
                  (p: any) => p.id === effectivePressureClassId,
                );
                const effectiveBasePressure =
                  effectiveClass?.designation?.replace(/\/\d+$/, "") || "";
                const isClassFromGlobal =
                  globalSpecs?.flangePressureClassId &&
                  effectiveBasePressure === globalBasePressure;
                const isTypeFromGlobal =
                  globalSpecs?.flangeTypeCode &&
                  effectiveFlangeTypeCode === globalSpecs?.flangeTypeCode;

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
                      const isStandardOverride =
                        globalSpecs?.flangeStandardId &&
                        effectiveStandardId !== globalSpecs?.flangeStandardId;
                      const isClassOverride =
                        globalSpecs?.flangePressureClassId &&
                        effectiveBasePressure !== globalBasePressure;
                      const isTypeOverride =
                        globalSpecs?.flangeTypeCode &&
                        effectiveFlangeTypeCode !== globalSpecs?.flangeTypeCode;

                      const workingPressureBar =
                        entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                      const selectedPressureClass = masterData.pressureClasses?.find(
                        (pc: any) => pc.id === effectivePressureClassId,
                      );
                      const pressureClassValidation = validatePressureClass(
                        standardCode,
                        selectedPressureClass?.designation,
                        workingPressureBar,
                      );
                      const isPressureClassUnsuitable = pressureClassValidation.isUnsuitable;

                      const globalSelectClass =
                        "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400";
                      const overrideSelectClass =
                        "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-yellow-500 dark:border-yellow-400";
                      const unsuitableSelectClass =
                        "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400";
                      const defaultSelectClass =
                        "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";

                      const standardSelectClass = isStandardFromGlobal
                        ? globalSelectClass
                        : isStandardOverride
                          ? overrideSelectClass
                          : defaultSelectClass;
                      const classSelectClass = isPressureClassUnsuitable
                        ? unsuitableSelectClass
                        : isClassFromGlobal
                          ? globalSelectClass
                          : isClassOverride
                            ? overrideSelectClass
                            : defaultSelectClass;
                      const typeSelectClass = isTypeFromGlobal
                        ? globalSelectClass
                        : isTypeOverride
                          ? overrideSelectClass
                          : defaultSelectClass;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Standard
                              {isStandardFromGlobal && (
                                <span className="ml-1 text-green-600 font-normal">
                                  (From Specs Page)
                                </span>
                              )}
                              {isStandardOverride && (
                                <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
                              )}
                              <span
                                className="ml-1 text-gray-400 font-normal cursor-help"
                                title="Flange standard determines pressure class options and flange dimensions"
                              >
                                ?
                              </span>
                            </label>
                            <select
                              value={effectiveStandardId || ""}
                              onChange={(e) => {
                                const standardId = parseInt(e.target.value, 10) || undefined;
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    flangeStandardId: standardId,
                                    flangePressureClassId: undefined,
                                    flangeTypeCode: undefined,
                                  },
                                });
                                if (standardId) {
                                  getFilteredPressureClasses(standardId);
                                }
                              }}
                              className={standardSelectClass}
                            >
                              <option value="">Select...</option>
                              {masterData.flangeStandards?.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>
                                  {standard.code}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {isSabs1123 ? "Class (kPa)" : "Class"}
                              {isPressureClassUnsuitable && (
                                <span className="ml-1 text-red-600 font-bold">(NOT SUITABLE)</span>
                              )}
                              {!isPressureClassUnsuitable && isClassFromGlobal && (
                                <span className="ml-1 text-green-600 font-normal">
                                  (From Specs Page)
                                </span>
                              )}
                              {!isPressureClassUnsuitable && isClassOverride && (
                                <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
                              )}
                              <span
                                className="ml-1 text-gray-400 font-normal cursor-help"
                                title="Flange pressure rating. Should match or exceed working pressure."
                              >
                                ?
                              </span>
                            </label>
                            {showFlangeType ? (
                              <select
                                value={effectivePressureClassId || ""}
                                onChange={(e) =>
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      flangePressureClassId:
                                        parseInt(e.target.value, 10) || undefined,
                                    },
                                  })
                                }
                                className={classSelectClass}
                              >
                                <option value="">Select...</option>
                                {pressureClasses.map((pc) => {
                                  const pcValue = String(pc.value);
                                  const equivalentValue = pcValue === "64" ? "63" : pcValue;
                                  const targetDesignation = normalizedFlangeTypeCode
                                    ? `${pcValue}/${normalizedFlangeTypeCode}`
                                    : null;
                                  const matchingPc = masterData.pressureClasses?.find(
                                    (mpc: any) => {
                                      if (
                                        targetDesignation &&
                                        mpc.designation === targetDesignation
                                      )
                                        return true;
                                      return (
                                        mpc.designation?.includes(pcValue) ||
                                        mpc.designation?.includes(equivalentValue)
                                      );
                                    },
                                  );
                                  return matchingPc ? (
                                    <option key={matchingPc.id} value={matchingPc.id}>
                                      {isSabs1123 ? pc.value : pc.label}
                                    </option>
                                  ) : null;
                                })}
                              </select>
                            ) : (
                              <select
                                value={effectivePressureClassId || ""}
                                onChange={(e) =>
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      flangePressureClassId:
                                        parseInt(e.target.value, 10) || undefined,
                                    },
                                  })
                                }
                                className={classSelectClass}
                              >
                                <option value="">Select...</option>
                                {(
                                  pressureClassesByStandard[effectiveStandardId || 0] ||
                                  masterData.pressureClasses ||
                                  []
                                ).map((pc: any) => (
                                  <option key={pc.id} value={pc.id}>
                                    {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Type
                              {isTypeFromGlobal && showFlangeType && (
                                <span className="ml-1 text-green-600 font-normal">
                                  (From Specs Page)
                                </span>
                              )}
                              {isTypeOverride && showFlangeType && (
                                <span className="ml-1 text-yellow-600 font-normal">(Override)</span>
                              )}
                            </label>
                            {showFlangeType ? (
                              <select
                                value={effectiveFlangeTypeCode || ""}
                                onChange={(e) =>
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      flangeTypeCode: e.target.value || undefined,
                                    },
                                  })
                                }
                                className={typeSelectClass}
                              >
                                <option value="">Select...</option>
                                {flangeTypes.map((ft) => (
                                  <option key={ft.code} value={ft.code}>
                                    {ft.name} ({ft.code})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                N/A
                              </div>
                            )}
                          </div>
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
                              value={entry.specs?.bendEndConfiguration || "PE"}
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
                              {(entry.specs?.bendItemType === "SWEEP_TEE"
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
            {hasLooseFlange(entry.specs?.bendEndConfiguration || "") && (
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                <ClosureLengthSelector
                  nominalBore={entry.specs?.nominalBoreMm || 100}
                  currentValue={entry.specs?.closureLengthMm || null}
                  wallThickness={
                    entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 5
                  }
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
            {entry.specs?.bendItemType === "DUCKFOOT_BEND" && (
              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3 mt-3">
                <div className="mb-2">
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Duckfoot Steelwork (Base Plate & Ribs)
                  </h4>
                </div>
                {(() => {
                  const nominalBore = entry.specs?.nominalBoreMm;
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
                    nominalBore && duckfootDefaults[nominalBore]
                      ? duckfootDefaults[nominalBore]
                      : null;
                  const hasDefaults = !!defaults;

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
                          value={entry.specs?.duckfootBasePlateXMm || defaults?.x || ""}
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
                          value={entry.specs?.duckfootBasePlateYMm || defaults?.y || ""}
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
                          value={entry.specs?.duckfootInletCentreHeightMm || defaults?.inletH || ""}
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
                          value={entry.specs?.duckfootPlateThicknessT1Mm || defaults?.t1 || ""}
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
                          value={entry.specs?.duckfootRibThicknessT2Mm || defaults?.t2 || ""}
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
                          value={entry.specs?.duckfootGussetPointDDegrees || 15}
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
                          value={entry.specs?.duckfootGussetPointCDegrees || 75}
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
                {entry.specs?.nominalBoreMm && (
                  <div className="mt-2 text-xs text-orange-700 dark:text-orange-300">
                    <span className="font-medium">Note:</span> Default dimensions are based on MPS
                    manual page 30 for {entry.specs.nominalBoreMm}NB duckfoot elbows/bends.
                  </div>
                )}
              </div>
            )}

            {/* Tangent Extensions Row - hide for Sweep Tees and Duckfoot Bends */}
            {entry.specs?.bendItemType !== "SWEEP_TEE" &&
              entry.specs?.bendItemType !== "DUCKFOOT_BEND" && (
                <TangentExtensionsSection
                  entryId={entry.id}
                  numberOfTangents={entry.specs?.numberOfTangents || 0}
                  tangentLengths={entry.specs?.tangentLengths || []}
                  onTangentCountChange={handleTangentCountChange}
                  onTangentLengthChange={handleTangentLengthChange}
                />
              )}

            {/* Stub Connections Section - hide for Sweep Tees and Duckfoot Bends */}
            {entry.specs?.bendItemType !== "SWEEP_TEE" &&
              entry.specs?.bendItemType !== "DUCKFOOT_BEND" && (
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
                        const numTangents = entry.specs?.numberOfTangents || 0;
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
                        const currentValue = entry.specs?.numberOfStubs || 0;
                        const effectiveValue =
                          currentValue > 1 && numTangents < 2 ? 1 : currentValue;
                        return (
                          <Select
                            id={selectId}
                            value={String(effectiveValue)}
                            onChange={(value) => {
                              const count = parseInt(value, 10) || 0;
                              const currentStubs = entry.specs?.stubs || [];
                              const mainNB = entry.specs?.nominalBoreMm || 50;
                              const defaultStubNB = mainNB <= 50 ? mainNB : 50;
                              const defaultStub = {
                                nominalBoreMm: defaultStubNB,
                                length: 150,
                                orientation: "outside",
                                flangeSpec: "",
                              };
                              const newStubs =
                                count === 0
                                  ? []
                                  : count === 1
                                    ? [currentStubs[0] || defaultStub]
                                    : [
                                        currentStubs[0] || defaultStub,
                                        currentStubs[1] || defaultStub,
                                      ];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-0.5">
                          Steel Spec
                          {entry.specs?.stubs?.[0]?.steelSpecificationId && (
                            <span className="text-purple-600 ml-1">*</span>
                          )}
                        </label>
                        {(() => {
                          const selectId = `bend-stub1-steel-spec-${entry.id}`;
                          const stub1EffectiveSpecId =
                            entry.specs?.stubs?.[0]?.steelSpecificationId ||
                            entry.specs?.steelSpecificationId ||
                            globalSpecs?.steelSpecificationId;
                          return (
                            <Select
                              id={selectId}
                              value={String(stub1EffectiveSpecId || "")}
                              onChange={(value) => {
                                const newSpecId = value ? Number(value) : undefined;
                                const stubs = [...(entry.specs?.stubs || [])];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                        {(() => {
                          const selectId = `bend-stub1-nb-${entry.id}`;
                          const stub1EffectiveSpecId =
                            entry.specs?.stubs?.[0]?.steelSpecificationId ||
                            entry.specs?.steelSpecificationId ||
                            globalSpecs?.steelSpecificationId;
                          const stub1SteelSpec = masterData.steelSpecs?.find(
                            (s: any) => s.id === stub1EffectiveSpecId,
                          );
                          const stub1SteelSpecName = stub1SteelSpec?.steelSpecName || "";
                          const stub1FallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(
                            ([pattern]) => stub1SteelSpecName.includes(pattern),
                          )?.[1];
                          const allStub1Nbs = stub1FallbackNBs || [
                            15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                          ];
                          const mainBendNB = entry.specs?.nominalBoreMm || 0;
                          const stub1Nbs = allStub1Nbs.filter((nb: number) => nb <= mainBendNB);
                          const options = stub1Nbs.map((nb: number) => ({
                            value: String(nb),
                            label: `${nb} NB`,
                          }));
                          return (
                            <Select
                              id={selectId}
                              value={
                                entry.specs?.stubs?.[0]?.nominalBoreMm
                                  ? String(entry.specs.stubs[0].nominalBoreMm)
                                  : ""
                              }
                              onChange={(value) => {
                                const stubs = [...(entry.specs?.stubs || [])];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-0.5">
                          W/T
                          {entry.specs?.stubs?.[0]?.wallThicknessOverride ? (
                            <span className="text-purple-600 ml-1">*</span>
                          ) : entry.specs?.stubs?.[0]?.nominalBoreMm ? (
                            <span className="text-green-600 ml-1">(A)</span>
                          ) : null}
                        </label>
                        {(() => {
                          const selectId = `bend-stub1-wt-${entry.id}`;
                          const stub1NB = entry.specs?.stubs?.[0]?.nominalBoreMm;
                          const steelSpecId =
                            entry.specs?.stubs?.[0]?.steelSpecificationId ||
                            entry.specs?.steelSpecificationId ||
                            globalSpecs?.steelSpecificationId;
                          const stub1SteelSpec = masterData.steelSpecs?.find(
                            (s: any) => s.id === steelSpecId,
                          );
                          const stub1SpecName = stub1SteelSpec?.steelSpecName || "";
                          const isSABS719 =
                            stub1SpecName.includes("SABS 719") ||
                            stub1SpecName.includes("SANS 719");
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
                            const sizes = Object.keys(SABS_719_WT)
                              .map(Number)
                              .sort((a, b) => a - b);
                            let closest = sizes[0];
                            for (const size of sizes) {
                              if (size <= nb) closest = size;
                              else break;
                            }
                            return SABS_719_WT[closest] || entry.specs?.wallThicknessMm || 6.4;
                          };
                          const autoWt = stub1NB
                            ? isSABS719
                              ? getSabs719Wt(stub1NB)
                              : ASTM_STUB_WT[stub1NB] || stub1NB * 0.05
                            : null;
                          const currentWt = entry.specs?.stubs?.[0]?.wallThicknessMm;
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
                                (opt, idx, arr) =>
                                  arr.findIndex((o) => o.value === opt.value) === idx,
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
                                (opt, idx, arr) =>
                                  arr.findIndex((o) => o.value === opt.value) === idx,
                              );
                          return (
                            <Select
                              id={selectId}
                              value={currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""}
                              onChange={(value) => {
                                const stubs = [...(entry.specs?.stubs || [])];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
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
                          return (
                            <Select
                              id={selectId}
                              value={String(entry.specs?.stubs?.[0]?.angleDegrees ?? "0")}
                              onChange={(value) => {
                                const stubs = [...(entry.specs?.stubs || [])];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                        <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
                          Length (mm)
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.stubs?.[0]?.length || ""}
                          onChange={(e) => {
                            const stubs = [...(entry.specs?.stubs || [])];
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
                    {(entry.specs?.numberOfStubs || 0) >= 1 && (
                      <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                        <label className="block text-xs text-purple-800 dark:text-purple-300 mb-0.5">
                          Location (mm)
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.stubs?.[0]?.locationFromFlange || ""}
                          onChange={(e) => {
                            const stubs = [...(entry.specs?.stubs || [])];
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
                  {(entry.specs?.numberOfStubs || 0) >= 1 && (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                      {(() => {
                        const effectiveStandardId =
                          entry.specs?.stubs?.[0]?.flangeStandardId ||
                          globalSpecs?.flangeStandardId;
                        const effectiveFlangeTypeCode =
                          entry.specs?.stubs?.[0]?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                        const normalizedFlangeTypeCode =
                          effectiveFlangeTypeCode?.replace(/^\//, "") || "";
                        const selectedStandard = masterData.flangeStandards?.find(
                          (fs: any) => fs.id === effectiveStandardId,
                        );
                        const isSabs1123 =
                          selectedStandard?.code?.toUpperCase().includes("SABS") &&
                          selectedStandard?.code?.includes("1123");
                        const isBs4504 =
                          selectedStandard?.code?.toUpperCase().includes("BS") &&
                          selectedStandard?.code?.includes("4504");
                        const showFlangeType = isSabs1123 || isBs4504;
                        const flangeTypes = isSabs1123
                          ? SABS_1123_FLANGE_TYPES
                          : BS_4504_FLANGE_TYPES;
                        const pressureClasses = isSabs1123
                          ? SABS_1123_PRESSURE_CLASSES
                          : BS_4504_PRESSURE_CLASSES;

                        const stub1GlobalClass = masterData.pressureClasses?.find(
                          (p: any) => p.id === globalSpecs?.flangePressureClassId,
                        );
                        const stub1GlobalBasePressure =
                          stub1GlobalClass?.designation?.replace(/\/\d+$/, "") || "";
                        const stub1TargetDesignation =
                          normalizedFlangeTypeCode && stub1GlobalBasePressure
                            ? `${stub1GlobalBasePressure}/${normalizedFlangeTypeCode}`
                            : null;
                        const stub1MatchingClass = stub1TargetDesignation
                          ? masterData.pressureClasses?.find(
                              (pc: any) => pc.designation === stub1TargetDesignation,
                            )
                          : null;
                        const effectivePressureClassId =
                          entry.specs?.stubs?.[0]?.flangePressureClassId ||
                          stub1MatchingClass?.id ||
                          globalSpecs?.flangePressureClassId;

                        const stub1EffectiveStandardId =
                          entry.specs?.stubs?.[0]?.flangeStandardId ||
                          globalSpecs?.flangeStandardId;
                        const stub1EffectiveClassId = effectivePressureClassId;
                        const stub1EffectiveTypeCode =
                          entry.specs?.stubs?.[0]?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                        const stub1EffectiveClass = masterData.pressureClasses?.find(
                          (p: any) => p.id === stub1EffectiveClassId,
                        );
                        const stub1EffectiveBasePressure =
                          stub1EffectiveClass?.designation?.replace(/\/\d+$/, "") || "";
                        const isStandardFromGlobal =
                          globalSpecs?.flangeStandardId &&
                          stub1EffectiveStandardId === globalSpecs?.flangeStandardId &&
                          !entry.specs?.stubs?.[0]?.flangeStandardId;
                        const isClassFromGlobal =
                          globalSpecs?.flangePressureClassId &&
                          stub1EffectiveBasePressure === stub1GlobalBasePressure &&
                          !entry.specs?.stubs?.[0]?.flangePressureClassId;
                        const isTypeFromGlobal =
                          globalSpecs?.flangeTypeCode &&
                          stub1EffectiveTypeCode === globalSpecs?.flangeTypeCode &&
                          !entry.specs?.stubs?.[0]?.flangeTypeCode;
                        const isStandardOverride =
                          entry.specs?.stubs?.[0]?.flangeStandardId &&
                          entry.specs?.stubs?.[0]?.flangeStandardId !==
                            globalSpecs?.flangeStandardId;
                        const isClassOverride =
                          entry.specs?.stubs?.[0]?.flangePressureClassId &&
                          stub1EffectiveBasePressure !== stub1GlobalBasePressure;
                        const isTypeOverride =
                          entry.specs?.stubs?.[0]?.flangeTypeCode &&
                          entry.specs?.stubs?.[0]?.flangeTypeCode !== globalSpecs?.flangeTypeCode;

                        const stub1SelectedStandard = masterData.flangeStandards?.find(
                          (s: any) => s.id === stub1EffectiveStandardId,
                        );
                        const stub1StandardCode = stub1SelectedStandard?.code?.toUpperCase() || "";
                        const stub1IsSabs1123 =
                          (stub1StandardCode.includes("SABS") ||
                            stub1StandardCode.includes("SANS")) &&
                          stub1StandardCode.includes("1123");
                        const stub1IsBs4504 =
                          (stub1StandardCode.includes("BS") &&
                            stub1StandardCode.includes("4504")) ||
                          (stub1StandardCode.includes("EN") &&
                            (stub1StandardCode.includes("1092") ||
                              stub1StandardCode.includes("10921")));
                        const stub1SelectedClass = masterData.pressureClasses?.find(
                          (pc: any) => pc.id === stub1EffectiveClassId,
                        );
                        const stub1PressureClassRatingRaw = stub1SelectedClass?.designation
                          ? parseInt(stub1SelectedClass.designation.replace(/[^\d]/g, ""), 10)
                          : 0;
                        const stub1WorkingPressureBar =
                          entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                        const stub1IsPressureClassUnsuitable =
                          stub1EffectiveClassId &&
                          stub1WorkingPressureBar > 0 &&
                          stub1PressureClassRatingRaw > 0 &&
                          ((stub1IsSabs1123 &&
                            stub1PressureClassRatingRaw < stub1WorkingPressureBar * 100) ||
                            (stub1IsBs4504 &&
                              stub1PressureClassRatingRaw < stub1WorkingPressureBar));
                        const globalSelectClass =
                          "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400";
                        const overrideSelectClass =
                          "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-yellow-500 dark:border-yellow-400";
                        const unsuitableSelectClass =
                          "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400";
                        const defaultSelectClass =
                          "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                            {/* Title as first column */}
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                                Stub 1 Flange
                              </span>
                            </div>
                            {/* Standard */}
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                Standard
                                {isStandardFromGlobal && (
                                  <span className="ml-1 text-green-600 dark:text-lime-400">
                                    (From Specs Page)
                                  </span>
                                )}
                                {isStandardOverride && (
                                  <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                    (Override)
                                  </span>
                                )}
                              </label>
                              <select
                                value={effectiveStandardId || ""}
                                onChange={(e) => {
                                  const standardId = parseInt(e.target.value, 10) || undefined;
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = {
                                    ...stubs[0],
                                    flangeStandardId: standardId,
                                    flangePressureClassId: undefined,
                                    flangeTypeCode: undefined,
                                  };
                                  onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  if (standardId) {
                                    getFilteredPressureClasses(standardId);
                                  }
                                }}
                                className={
                                  isStandardFromGlobal
                                    ? globalSelectClass
                                    : isStandardOverride
                                      ? overrideSelectClass
                                      : defaultSelectClass
                                }
                              >
                                <option value="">Select...</option>
                                {masterData.flangeStandards?.map((s: any) => (
                                  <option key={s.id} value={s.id}>
                                    {s.code}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Class */}
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                {stub1IsSabs1123 ? "Class (kPa)" : "Class"}
                                {isClassFromGlobal && !stub1IsPressureClassUnsuitable && (
                                  <span className="ml-1 text-green-600 dark:text-lime-400">
                                    (From Specs Page)
                                  </span>
                                )}
                                {isClassOverride && !stub1IsPressureClassUnsuitable && (
                                  <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                    (Override)
                                  </span>
                                )}
                                {stub1IsPressureClassUnsuitable && (
                                  <span className="ml-1 text-red-600 dark:text-red-400">
                                    (NOT SUITABLE)
                                  </span>
                                )}
                              </label>
                              {showFlangeType ? (
                                <select
                                  value={effectivePressureClassId || ""}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = {
                                      ...stubs[0],
                                      flangePressureClassId:
                                        parseInt(e.target.value, 10) || undefined,
                                    };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className={
                                    stub1IsPressureClassUnsuitable
                                      ? unsuitableSelectClass
                                      : isClassFromGlobal
                                        ? globalSelectClass
                                        : isClassOverride
                                          ? overrideSelectClass
                                          : defaultSelectClass
                                  }
                                >
                                  <option value="">Select...</option>
                                  {pressureClasses.map((pc) => {
                                    const pcValue = String(pc.value);
                                    const equivalentValue = pcValue === "64" ? "63" : pcValue;
                                    const targetDesignation = normalizedFlangeTypeCode
                                      ? `${pcValue}/${normalizedFlangeTypeCode}`
                                      : null;
                                    const matchingPc = masterData.pressureClasses?.find(
                                      (mpc: any) => {
                                        if (
                                          targetDesignation &&
                                          mpc.designation === targetDesignation
                                        )
                                          return true;
                                        return (
                                          mpc.designation?.includes(pcValue) ||
                                          mpc.designation?.includes(equivalentValue)
                                        );
                                      },
                                    );
                                    return matchingPc ? (
                                      <option key={matchingPc.id} value={matchingPc.id}>
                                        {stub1IsSabs1123 ? pc.value : pc.label}
                                      </option>
                                    ) : null;
                                  })}
                                </select>
                              ) : (
                                <select
                                  value={effectivePressureClassId || ""}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = {
                                      ...stubs[0],
                                      flangePressureClassId:
                                        parseInt(e.target.value, 10) || undefined,
                                    };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className={
                                    stub1IsPressureClassUnsuitable
                                      ? unsuitableSelectClass
                                      : isClassFromGlobal
                                        ? globalSelectClass
                                        : isClassOverride
                                          ? overrideSelectClass
                                          : defaultSelectClass
                                  }
                                >
                                  <option value="">Select...</option>
                                  {(
                                    pressureClassesByStandard[effectiveStandardId || 0] ||
                                    masterData.pressureClasses ||
                                    []
                                  ).map((pc: any) => (
                                    <option key={pc.id} value={pc.id}>
                                      {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {/* Type */}
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                Type
                                {isTypeFromGlobal && showFlangeType && (
                                  <span className="ml-1 text-green-600 dark:text-lime-400">
                                    (From Specs Page)
                                  </span>
                                )}
                                {isTypeOverride && showFlangeType && (
                                  <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                    (Override)
                                  </span>
                                )}
                              </label>
                              {showFlangeType ? (
                                <select
                                  value={effectiveFlangeTypeCode || ""}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = {
                                      ...stubs[0],
                                      flangeTypeCode: e.target.value || undefined,
                                    };
                                    const updatedEntry = {
                                      ...entry,
                                      specs: { ...entry.specs, stubs },
                                    };
                                    updatedEntry.description =
                                      generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, updatedEntry);
                                  }}
                                  className={
                                    isTypeFromGlobal
                                      ? globalSelectClass
                                      : isTypeOverride
                                        ? overrideSelectClass
                                        : defaultSelectClass
                                  }
                                >
                                  <option value="">Select...</option>
                                  {flangeTypes.map((ft) => (
                                    <option key={ft.code} value={ft.code}>
                                      {ft.name} ({ft.code})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                  N/A
                                </div>
                              )}
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-1.5 pb-1.5">
                                <input
                                  type="checkbox"
                                  checked={entry.specs?.stubs?.[0]?.hasBlankFlange || false}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], hasBlankFlange: e.target.checked };
                                    const updatedEntry = {
                                      ...entry,
                                      specs: { ...entry.specs, stubs },
                                    };
                                    updatedEntry.description =
                                      generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, updatedEntry);
                                  }}
                                  className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                                />
                                <span className="text-xs text-red-700 font-medium">
                                  + Blank ({entry.specs?.stubs?.[0]?.nominalBoreMm || "?"}NB)
                                </span>
                              </label>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Stub 2 Section - only show when 2 stubs AND 2 tangents selected */}
                  {(entry.specs?.numberOfStubs || 0) >= 2 &&
                    (entry.specs?.numberOfTangents || 0) >= 2 && (
                      <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
                        <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
                          Stub 2{" "}
                          <span className="text-gray-500 dark:text-gray-400 font-normal">
                            (on T2)
                          </span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-0.5">
                              Steel Spec
                              {entry.specs?.stubs?.[1]?.steelSpecificationId && (
                                <span className="text-purple-600 ml-1">*</span>
                              )}
                            </label>
                            {(() => {
                              const selectId = `bend-stub2-steel-spec-${entry.id}`;
                              const stub2EffectiveSpecId =
                                entry.specs?.stubs?.[1]?.steelSpecificationId ||
                                entry.specs?.steelSpecificationId ||
                                globalSpecs?.steelSpecificationId;

                              return (
                                <Select
                                  id={selectId}
                                  value={String(stub2EffectiveSpecId || "")}
                                  onChange={(value) => {
                                    const newSpecId = value ? Number(value) : undefined;
                                    const stubs = [...(entry.specs?.stubs || [])];
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
                                    updatedEntry.description =
                                      generateItemDescription(updatedEntry);
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
                              const stub2EffectiveSpecId =
                                entry.specs?.stubs?.[1]?.steelSpecificationId ||
                                entry.specs?.steelSpecificationId ||
                                globalSpecs?.steelSpecificationId;
                              const stub2SteelSpec = masterData.steelSpecs?.find(
                                (s: any) => s.id === stub2EffectiveSpecId,
                              );
                              const stub2SteelSpecName = stub2SteelSpec?.steelSpecName || "";
                              const stub2FallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(
                                ([pattern]) => stub2SteelSpecName.includes(pattern),
                              )?.[1];
                              const allStub2Nbs = stub2FallbackNBs || [
                                15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                              ];
                              const mainBendNB = entry.specs?.nominalBoreMm || 0;
                              const stub2Nbs = allStub2Nbs.filter((nb: number) => nb <= mainBendNB);
                              const options = stub2Nbs.map((nb: number) => ({
                                value: String(nb),
                                label: `${nb} NB`,
                              }));

                              return (
                                <Select
                                  id={selectId}
                                  value={
                                    entry.specs?.stubs?.[1]?.nominalBoreMm
                                      ? String(entry.specs.stubs[1].nominalBoreMm)
                                      : ""
                                  }
                                  onChange={(value) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = {
                                      ...stubs[1],
                                      nominalBoreMm: parseInt(value, 10) || 0,
                                    };
                                    const updatedEntry = {
                                      ...entry,
                                      specs: { ...entry.specs, stubs },
                                    };
                                    updatedEntry.description =
                                      generateItemDescription(updatedEntry);
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
                              {entry.specs?.stubs?.[1]?.wallThicknessOverride ? (
                                <span className="text-purple-600 ml-1">(Override)</span>
                              ) : entry.specs?.stubs?.[1]?.nominalBoreMm ? (
                                <span className="text-green-600 ml-1">(Auto)</span>
                              ) : null}
                            </label>
                            {(() => {
                              const selectId = `bend-stub2-wt-${entry.id}`;
                              const stub2NB = entry.specs?.stubs?.[1]?.nominalBoreMm;
                              const steelSpecId =
                                entry.specs?.stubs?.[1]?.steelSpecificationId ||
                                entry.specs?.steelSpecificationId ||
                                globalSpecs?.steelSpecificationId;
                              const stub2SteelSpec = masterData.steelSpecs?.find(
                                (s: any) => s.id === steelSpecId,
                              );
                              const stub2SpecName = stub2SteelSpec?.steelSpecName || "";
                              const isSABS719 =
                                stub2SpecName.includes("SABS 719") ||
                                stub2SpecName.includes("SANS 719");

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
                                const sizes = Object.keys(SABS_719_WT)
                                  .map(Number)
                                  .sort((a, b) => a - b);
                                let closest = sizes[0];
                                for (const size of sizes) {
                                  if (size <= nb) closest = size;
                                  else break;
                                }
                                return SABS_719_WT[closest] || entry.specs?.wallThicknessMm || 6.4;
                              };

                              const autoWt = stub2NB
                                ? isSABS719
                                  ? getSabs719Wt(stub2NB)
                                  : ASTM_STUB_WT[stub2NB] || stub2NB * 0.05
                                : null;
                              const currentWt = entry.specs?.stubs?.[1]?.wallThicknessMm;

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
                                    (opt, idx, arr) =>
                                      arr.findIndex((o) => o.value === opt.value) === idx,
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
                                    (opt, idx, arr) =>
                                      arr.findIndex((o) => o.value === opt.value) === idx,
                                  );

                              return (
                                <Select
                                  id={selectId}
                                  value={
                                    currentWt ? String(currentWt) : autoWt ? String(autoWt) : ""
                                  }
                                  onChange={(value) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
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
                              return (
                                <Select
                                  id={selectId}
                                  value={String(entry.specs?.stubs?.[1]?.angleDegrees ?? "0")}
                                  onChange={(value) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = {
                                      ...stubs[1],
                                      angleDegrees: parseInt(value, 10) || 0,
                                      tangent: 2,
                                    };
                                    const updatedEntry = {
                                      ...entry,
                                      specs: { ...entry.specs, stubs },
                                    };
                                    updatedEntry.description =
                                      generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, updatedEntry);
                                  }}
                                  options={angleOptions}
                                  placeholder="Select angle"
                                />
                              );
                            })()}
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                            <label className="block text-xs text-purple-800 mb-0.5">
                              Length (mm)
                            </label>
                            <input
                              type="number"
                              value={entry.specs?.stubs?.[1]?.length || ""}
                              onChange={(e) => {
                                const stubs = [...(entry.specs?.stubs || [])];
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
                            <label className="block text-xs text-purple-800 mb-0.5">
                              Location (mm)
                            </label>
                            <input
                              type="number"
                              value={entry.specs?.stubs?.[1]?.locationFromFlange || ""}
                              onChange={(e) => {
                                const stubs = [...(entry.specs?.stubs || [])];
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
                            const effectiveStandardId =
                              entry.specs?.stubs?.[1]?.flangeStandardId ||
                              globalSpecs?.flangeStandardId;
                            const effectiveFlangeTypeCode =
                              entry.specs?.stubs?.[1]?.flangeTypeCode ||
                              globalSpecs?.flangeTypeCode;
                            const normalizedFlangeTypeCode =
                              effectiveFlangeTypeCode?.replace(/^\//, "") || "";
                            const selectedStandard = masterData.flangeStandards?.find(
                              (fs: any) => fs.id === effectiveStandardId,
                            );
                            const isSabs1123 =
                              selectedStandard?.code?.toUpperCase().includes("SABS") &&
                              selectedStandard?.code?.includes("1123");
                            const isBs4504 =
                              selectedStandard?.code?.toUpperCase().includes("BS") &&
                              selectedStandard?.code?.includes("4504");
                            const showFlangeType = isSabs1123 || isBs4504;
                            const flangeTypes = isSabs1123
                              ? SABS_1123_FLANGE_TYPES
                              : BS_4504_FLANGE_TYPES;
                            const pressureClasses = isSabs1123
                              ? SABS_1123_PRESSURE_CLASSES
                              : BS_4504_PRESSURE_CLASSES;

                            const stub2GlobalClass = masterData.pressureClasses?.find(
                              (p: any) => p.id === globalSpecs?.flangePressureClassId,
                            );
                            const stub2GlobalBasePressure =
                              stub2GlobalClass?.designation?.replace(/\/\d+$/, "") || "";
                            const stub2TargetDesignation =
                              normalizedFlangeTypeCode && stub2GlobalBasePressure
                                ? `${stub2GlobalBasePressure}/${normalizedFlangeTypeCode}`
                                : null;
                            const stub2MatchingClass = stub2TargetDesignation
                              ? masterData.pressureClasses?.find(
                                  (pc: any) => pc.designation === stub2TargetDesignation,
                                )
                              : null;
                            const effectivePressureClassId =
                              entry.specs?.stubs?.[1]?.flangePressureClassId ||
                              stub2MatchingClass?.id ||
                              globalSpecs?.flangePressureClassId;

                            const stub2EffectiveStandardId =
                              entry.specs?.stubs?.[1]?.flangeStandardId ||
                              globalSpecs?.flangeStandardId;
                            const stub2EffectiveClassId = effectivePressureClassId;
                            const stub2EffectiveTypeCode =
                              entry.specs?.stubs?.[1]?.flangeTypeCode ||
                              globalSpecs?.flangeTypeCode;
                            const stub2EffectiveClass = masterData.pressureClasses?.find(
                              (p: any) => p.id === stub2EffectiveClassId,
                            );
                            const stub2EffectiveBasePressure =
                              stub2EffectiveClass?.designation?.replace(/\/\d+$/, "") || "";
                            const isStandardFromGlobal =
                              globalSpecs?.flangeStandardId &&
                              stub2EffectiveStandardId === globalSpecs?.flangeStandardId &&
                              !entry.specs?.stubs?.[1]?.flangeStandardId;
                            const isClassFromGlobal =
                              globalSpecs?.flangePressureClassId &&
                              stub2EffectiveBasePressure === stub2GlobalBasePressure &&
                              !entry.specs?.stubs?.[1]?.flangePressureClassId;
                            const isTypeFromGlobal =
                              globalSpecs?.flangeTypeCode &&
                              stub2EffectiveTypeCode === globalSpecs?.flangeTypeCode &&
                              !entry.specs?.stubs?.[1]?.flangeTypeCode;
                            const isStandardOverride =
                              entry.specs?.stubs?.[1]?.flangeStandardId &&
                              entry.specs?.stubs?.[1]?.flangeStandardId !==
                                globalSpecs?.flangeStandardId;
                            const isClassOverride =
                              entry.specs?.stubs?.[1]?.flangePressureClassId &&
                              stub2EffectiveBasePressure !== stub2GlobalBasePressure;
                            const isTypeOverride =
                              entry.specs?.stubs?.[1]?.flangeTypeCode &&
                              entry.specs?.stubs?.[1]?.flangeTypeCode !==
                                globalSpecs?.flangeTypeCode;

                            const stub2SelectedStandard = masterData.flangeStandards?.find(
                              (s: any) => s.id === stub2EffectiveStandardId,
                            );
                            const stub2StandardCode =
                              stub2SelectedStandard?.code?.toUpperCase() || "";
                            const stub2IsSabs1123 =
                              (stub2StandardCode.includes("SABS") ||
                                stub2StandardCode.includes("SANS")) &&
                              stub2StandardCode.includes("1123");
                            const stub2IsBs4504 =
                              (stub2StandardCode.includes("BS") &&
                                stub2StandardCode.includes("4504")) ||
                              (stub2StandardCode.includes("EN") &&
                                (stub2StandardCode.includes("1092") ||
                                  stub2StandardCode.includes("10921")));
                            const stub2SelectedClass = masterData.pressureClasses?.find(
                              (pc: any) => pc.id === stub2EffectiveClassId,
                            );
                            const stub2PressureClassRatingRaw = stub2SelectedClass?.designation
                              ? parseInt(stub2SelectedClass.designation.replace(/[^\d]/g, ""), 10)
                              : 0;
                            const stub2WorkingPressureBar =
                              entry.specs?.workingPressureBar ||
                              globalSpecs?.workingPressureBar ||
                              0;
                            const stub2IsPressureClassUnsuitable =
                              stub2EffectiveClassId &&
                              stub2WorkingPressureBar > 0 &&
                              stub2PressureClassRatingRaw > 0 &&
                              ((stub2IsSabs1123 &&
                                stub2PressureClassRatingRaw < stub2WorkingPressureBar * 100) ||
                                (stub2IsBs4504 &&
                                  stub2PressureClassRatingRaw < stub2WorkingPressureBar));

                            const globalSelectClass =
                              "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400";
                            const overrideSelectClass =
                              "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-yellow-500 dark:border-yellow-400";
                            const unsuitableSelectClass =
                              "w-full px-2 py-1.5 border-2 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400";
                            const defaultSelectClass =
                              "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";
                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                                {/* Title as first column */}
                                <div className="flex items-center">
                                  <span className="text-xs font-semibold text-orange-900 dark:text-amber-200">
                                    Stub 2 Flange
                                  </span>
                                </div>
                                {/* Standard */}
                                <div>
                                  <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                    Standard
                                    {isStandardFromGlobal && (
                                      <span className="ml-1 text-green-600 dark:text-lime-400">
                                        (From Specs Page)
                                      </span>
                                    )}
                                    {isStandardOverride && (
                                      <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                        (Override)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={effectiveStandardId || ""}
                                    onChange={(e) => {
                                      const standardId = parseInt(e.target.value, 10) || undefined;
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = {
                                        ...stubs[1],
                                        flangeStandardId: standardId,
                                        flangePressureClassId: undefined,
                                        flangeTypeCode: undefined,
                                      };
                                      onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                      if (standardId) {
                                        getFilteredPressureClasses(standardId);
                                      }
                                    }}
                                    className={
                                      isStandardFromGlobal
                                        ? globalSelectClass
                                        : isStandardOverride
                                          ? overrideSelectClass
                                          : defaultSelectClass
                                    }
                                  >
                                    <option value="">Select...</option>
                                    {masterData.flangeStandards?.map((s: any) => (
                                      <option key={s.id} value={s.id}>
                                        {s.code}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {/* Class */}
                                <div>
                                  <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                    {stub2IsSabs1123 ? "Class (kPa)" : "Class"}
                                    {isClassFromGlobal && !stub2IsPressureClassUnsuitable && (
                                      <span className="ml-1 text-green-600 dark:text-lime-400">
                                        (From Specs Page)
                                      </span>
                                    )}
                                    {isClassOverride && !stub2IsPressureClassUnsuitable && (
                                      <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                        (Override)
                                      </span>
                                    )}
                                    {stub2IsPressureClassUnsuitable && (
                                      <span className="ml-1 text-red-600 dark:text-red-400">
                                        (NOT SUITABLE)
                                      </span>
                                    )}
                                  </label>
                                  {showFlangeType ? (
                                    <select
                                      value={effectivePressureClassId || ""}
                                      onChange={(e) => {
                                        const stubs = [...(entry.specs?.stubs || [])];
                                        stubs[1] = {
                                          ...stubs[1],
                                          flangePressureClassId:
                                            parseInt(e.target.value, 10) || undefined,
                                        };
                                        onUpdateEntry(entry.id, {
                                          specs: { ...entry.specs, stubs },
                                        });
                                      }}
                                      className={
                                        stub2IsPressureClassUnsuitable
                                          ? unsuitableSelectClass
                                          : isClassFromGlobal
                                            ? globalSelectClass
                                            : isClassOverride
                                              ? overrideSelectClass
                                              : defaultSelectClass
                                      }
                                    >
                                      <option value="">Select...</option>
                                      {pressureClasses.map((pc) => {
                                        const pcValue = String(pc.value);
                                        const equivalentValue = pcValue === "64" ? "63" : pcValue;
                                        const targetDesignation = normalizedFlangeTypeCode
                                          ? `${pcValue}/${normalizedFlangeTypeCode}`
                                          : null;
                                        const matchingPc = masterData.pressureClasses?.find(
                                          (mpc: any) => {
                                            if (
                                              targetDesignation &&
                                              mpc.designation === targetDesignation
                                            )
                                              return true;
                                            return (
                                              mpc.designation?.includes(pcValue) ||
                                              mpc.designation?.includes(equivalentValue)
                                            );
                                          },
                                        );
                                        return matchingPc ? (
                                          <option key={matchingPc.id} value={matchingPc.id}>
                                            {stub2IsSabs1123 ? pc.value : pc.label}
                                          </option>
                                        ) : null;
                                      })}
                                    </select>
                                  ) : (
                                    <select
                                      value={effectivePressureClassId || ""}
                                      onChange={(e) => {
                                        const stubs = [...(entry.specs?.stubs || [])];
                                        stubs[1] = {
                                          ...stubs[1],
                                          flangePressureClassId:
                                            parseInt(e.target.value, 10) || undefined,
                                        };
                                        onUpdateEntry(entry.id, {
                                          specs: { ...entry.specs, stubs },
                                        });
                                      }}
                                      className={
                                        stub2IsPressureClassUnsuitable
                                          ? unsuitableSelectClass
                                          : isClassFromGlobal
                                            ? globalSelectClass
                                            : isClassOverride
                                              ? overrideSelectClass
                                              : defaultSelectClass
                                      }
                                    >
                                      <option value="">Select...</option>
                                      {(
                                        pressureClassesByStandard[effectiveStandardId || 0] ||
                                        masterData.pressureClasses ||
                                        []
                                      ).map((pc: any) => (
                                        <option key={pc.id} value={pc.id}>
                                          {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                                {/* Type */}
                                <div>
                                  <label className="block text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                                    Type
                                    {isTypeFromGlobal && showFlangeType && (
                                      <span className="ml-1 text-green-600 dark:text-lime-400">
                                        (From Specs Page)
                                      </span>
                                    )}
                                    {isTypeOverride && showFlangeType && (
                                      <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                                        (Override)
                                      </span>
                                    )}
                                  </label>
                                  {showFlangeType ? (
                                    <select
                                      value={effectiveFlangeTypeCode || ""}
                                      onChange={(e) => {
                                        const stubs = [...(entry.specs?.stubs || [])];
                                        stubs[1] = {
                                          ...stubs[1],
                                          flangeTypeCode: e.target.value || undefined,
                                        };
                                        const updatedEntry = {
                                          ...entry,
                                          specs: { ...entry.specs, stubs },
                                        };
                                        updatedEntry.description =
                                          generateItemDescription(updatedEntry);
                                        onUpdateEntry(entry.id, updatedEntry);
                                      }}
                                      className={
                                        isTypeFromGlobal
                                          ? globalSelectClass
                                          : isTypeOverride
                                            ? overrideSelectClass
                                            : defaultSelectClass
                                      }
                                    >
                                      <option value="">Select...</option>
                                      {flangeTypes.map((ft) => (
                                        <option key={ft.code} value={ft.code}>
                                          {ft.name} ({ft.code})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                      N/A
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-1.5 pb-1.5">
                                    <input
                                      type="checkbox"
                                      checked={entry.specs?.stubs?.[1]?.hasBlankFlange || false}
                                      onChange={(e) => {
                                        const stubs = [...(entry.specs?.stubs || [])];
                                        stubs[1] = {
                                          ...stubs[1],
                                          hasBlankFlange: e.target.checked,
                                        };
                                        const updatedEntry = {
                                          ...entry,
                                          specs: { ...entry.specs, stubs },
                                        };
                                        updatedEntry.description =
                                          generateItemDescription(updatedEntry);
                                        onUpdateEntry(entry.id, updatedEntry);
                                      }}
                                      className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <span className="text-xs text-red-700 font-medium">
                                      + Blank ({entry.specs?.stubs?.[1]?.nominalBoreMm || "?"}NB)
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

            {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

            {/* Item Action Buttons */}
            <div className="mt-4 flex justify-end gap-2">
              {onDuplicateEntry && (
                <button
                  onClick={() => onDuplicateEntry(entry, index)}
                  className="flex items-center gap-1 px-3 py-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 text-sm font-medium border border-purple-300 rounded-md transition-colors"
                  title="Duplicate this item"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                    />
                  </svg>
                  Duplicate
                </button>
              )}
              {onCopyEntry && (
                <button
                  onClick={() => onCopyEntry(entry)}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                    copiedItemId === entry.id
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-300"
                  }`}
                  title="Copy item data to clipboard"
                >
                  {copiedItemId === entry.id ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
              {entriesCount > 1 && (
                <button
                  onClick={() => onRemoveEntry(entry.id)}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Remove Item
                </button>
              )}
            </div>
          </>
        }
        previewContent={
          <>
            {isUnregisteredCustomer && onShowRestrictionPopup ? (
              <div
                className="relative cursor-pointer group"
                onClick={onShowRestrictionPopup("drawings")}
              >
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 rounded-lg p-3 flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-slate-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-slate-600 font-semibold text-sm">3D Preview Locked</p>
                    <p className="text-slate-500 text-xs">Click to learn more</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 rounded-lg transition-opacity" />
              </div>
            ) : Bend3DPreview ? (
              (() => {
                const canRenderPreview = entry.specs?.nominalBoreMm && entry.specs?.bendDegrees;
                log.info(
                  `🎨 BendForm preview check - entry.id: ${entry.id}, nominalBoreMm: ${entry.specs?.nominalBoreMm}, bendDegrees: ${entry.specs?.bendDegrees}, canRender: ${!!canRenderPreview}`,
                );
                if (!canRenderPreview) {
                  return (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                      Select nominal bore and bend angle to see 3D preview
                    </div>
                  );
                }
                const flangeStandardId =
                  entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                const flangePressureClassId =
                  entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                const flangeStandard = masterData.flangeStandards?.find(
                  (s: any) => s.id === flangeStandardId,
                );
                const pressureClass = masterData.pressureClasses?.find(
                  (p: any) => p.id === flangePressureClassId,
                );
                const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                const flangeStandardName =
                  flangeStandard?.code === "SABS_1123"
                    ? "SABS 1123"
                    : flangeStandard?.code === "BS_4504"
                      ? "BS 4504"
                      : flangeStandard?.code?.replace(/_/g, " ") || "";
                const pressureClassDesignation = pressureClass?.designation || "";
                const steelSpecName =
                  masterData.steelSpecs.find(
                    (s: any) =>
                      s.id ===
                      (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId),
                  )?.steelSpecName || "";
                const previewIsSABS719 =
                  steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
                return (
                  <div data-nix-target="bend-3d-preview" className="h-full">
                    <Bend3DPreview
                      nominalBore={entry.specs.nominalBoreMm}
                      outerDiameter={
                        entry.calculation?.outsideDiameterMm ||
                        NB_TO_OD_LOOKUP[entry.specs.nominalBoreMm] ||
                        entry.specs.nominalBoreMm * 1.05
                      }
                      wallThickness={
                        entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 5
                      }
                      bendAngle={entry.specs.bendDegrees}
                      bendType={entry.specs.bendType || "1.5D"}
                      tangent1={entry.specs?.tangentLengths?.[0] || 0}
                      tangent2={entry.specs?.tangentLengths?.[1] || 0}
                      schedule={entry.specs.scheduleNumber}
                      materialName={steelSpecName}
                      numberOfSegments={entry.specs?.numberOfSegments}
                      isSegmented={
                        entry.specs?.bendStyle === "segmented" ||
                        (!entry.specs?.bendStyle && previewIsSABS719)
                      }
                      stubs={entry.specs?.stubs}
                      numberOfStubs={entry.specs?.numberOfStubs || 0}
                      flangeConfig={entry.specs?.bendEndConfiguration || "PE"}
                      closureLengthMm={entry.specs?.closureLengthMm || 0}
                      addBlankFlange={entry.specs?.addBlankFlange}
                      blankFlangePositions={entry.specs?.blankFlangePositions}
                      savedCameraPosition={entry.specs?.savedCameraPosition}
                      savedCameraTarget={entry.specs?.savedCameraTarget}
                      onCameraChange={(
                        position: [number, number, number],
                        target: [number, number, number],
                      ) => {
                        log.debug(
                          "BendForm onCameraChange called",
                          JSON.stringify({ position, target, entryId: entry.id }),
                        );
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            savedCameraPosition: position,
                            savedCameraTarget: target,
                          },
                        });
                      }}
                      selectedNotes={entry.selectedNotes}
                      flangeSpecs={flangeSpecs}
                      flangeStandardName={flangeStandardName}
                      pressureClassDesignation={pressureClassDesignation}
                      flangeTypeCode={flangeTypeCode}
                      centerToFaceMm={entry.specs?.centerToFaceMm}
                      bendRadiusMm={entry.specs?.bendRadiusMm}
                      bendItemType={entry.specs?.bendItemType}
                      duckfootBasePlateXMm={entry.specs?.duckfootBasePlateXMm}
                      duckfootBasePlateYMm={entry.specs?.duckfootBasePlateYMm}
                      duckfootInletCentreHeightMm={entry.specs?.duckfootInletCentreHeightMm}
                      duckfootPlateThicknessT1Mm={entry.specs?.duckfootPlateThicknessT1Mm}
                      duckfootRibThicknessT2Mm={entry.specs?.duckfootRibThicknessT2Mm}
                      duckfootGussetPointDDegrees={entry.specs?.duckfootGussetPointDDegrees}
                      duckfootGussetPointCDegrees={entry.specs?.duckfootGussetPointCDegrees}
                      sweepTeePipeALengthMm={entry.specs?.sweepTeePipeALengthMm}
                    />
                  </div>
                );
              })()
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center text-blue-600 text-sm font-medium">
                3D preview hidden. Use the toggle above to show drawings.
              </div>
            )}

            {/* Smart Notes Dropdown - Below 3D Preview */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Additional Notes & Requirements
              </label>
              <SmartNotesDropdown
                selectedNotes={entry.selectedNotes || []}
                onNotesChange={(notes) =>
                  onUpdateEntry(entry.id, {
                    selectedNotes: notes,
                    notes: formatNotesForDisplay(notes),
                  })
                }
                placeholder="Select quality/inspection requirements..."
              />
            </div>
          </>
        }
        calcResultsContent={
          <div className="mt-4">
            <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
              Calculation Results
            </h4>
            {entry.calculationError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {(() => {
                    const match = entry.calculationError.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
                    return match ? (
                      <>
                        <strong>{match[1]}</strong> {match[2]}
                      </>
                    ) : (
                      entry.calculationError
                    );
                  })()}
                </p>
              </div>
            )}
            {entry.calculation ? (
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 p-3 rounded-md">
                {(() => {
                  const cf = Number(entry.specs?.centerToFaceMm) || 0;
                  const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                  const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                  const numTangents = entry.specs?.numberOfTangents || 0;
                  const stubs = entry.specs?.stubs || [];
                  const stub1NB = stubs[0]?.nominalBoreMm;
                  const stub2NB = stubs[1]?.nominalBoreMm;
                  const stub1HasFlange = !!stub1NB;
                  const stub2HasFlange = !!stub2NB;
                  const bendEndConfig = entry.specs?.bendEndConfiguration || "PE";
                  const end1 = cf + tangent1;
                  const end2 = cf + tangent2;
                  let cfDisplay = "";
                  if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
                    if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
                      cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)}`;
                    } else if (tangent1 > 0) {
                      cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)}`;
                    } else if (tangent2 > 0) {
                      cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)}`;
                    }
                  } else {
                    cfDisplay = `${cf.toFixed(0)}`;
                  }
                  const isSweepTeeItem = entry.specs?.bendItemType === "SWEEP_TEE";
                  const bendFlangeCount = isSweepTeeItem
                    ? getFlangeCountPerFitting(bendEndConfig)
                    : getFlangeCountPerBend(bendEndConfig);
                  const bendFlangeWeldCount = isSweepTeeItem
                    ? getFlangeWeldCountPerFitting(bendEndConfig)
                    : getFlangeWeldCountPerBend(bendEndConfig);
                  const stub1FlangeCount = stub1HasFlange ? 1 : 0;
                  const stub2FlangeCount = stub2HasFlange ? 1 : 0;
                  const numSegments = entry.specs?.numberOfSegments || 0;
                  const totalFlanges = bendFlangeCount + stub1FlangeCount + stub2FlangeCount;
                  const dn = entry.specs?.nominalBoreMm;
                  const schedule = entry.specs?.scheduleNumber || "";
                  const pipeWallThickness = entry.calculation?.wallThicknessMm;
                  const steelSpecId =
                    entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  const isSABS719 = steelSpecId === 8;
                  const scheduleUpper = schedule.toUpperCase();
                  const isStdSchedule = scheduleUpper.includes("40") || scheduleUpper === "STD";
                  const isXhSchedule =
                    scheduleUpper.includes("80") ||
                    scheduleUpper === "XS" ||
                    scheduleUpper === "XH";
                  const isXxhSchedule =
                    scheduleUpper.includes("160") ||
                    scheduleUpper === "XXS" ||
                    scheduleUpper === "XXH";
                  let fittingClass: "STD" | "XH" | "XXH" | "" = "";
                  if (isXxhSchedule) fittingClass = "XXH";
                  else if (isXhSchedule) fittingClass = "XH";
                  else if (isStdSchedule) fittingClass = "STD";
                  const fittingWt =
                    isSABS719 || !fittingClass
                      ? null
                      : dn
                        ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn]
                        : null;
                  const rawEffectiveWt = fittingWt || pipeWallThickness;
                  const effectiveWt = rawEffectiveWt
                    ? roundToWeldIncrement(rawEffectiveWt)
                    : rawEffectiveWt;
                  const stub1Length = stubs[0]?.lengthMm || stubs[0]?.length || 0;
                  const stub2Length = stubs[1]?.lengthMm || stubs[1]?.length || 0;
                  const stub1RawWt =
                    isSABS719 || !fittingClass
                      ? pipeWallThickness
                      : FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness;
                  const stub2RawWt =
                    isSABS719 || !fittingClass
                      ? pipeWallThickness
                      : FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness;
                  const stub1Wt = stub1NB && stub1RawWt ? roundToWeldIncrement(stub1RawWt) : 0;
                  const stub2Wt = stub2NB && stub2RawWt ? roundToWeldIncrement(stub2RawWt) : 0;
                  const totalWeldLength = entry.calculation.totalWeldLengthMm || 0;

                  const mainOdMm = dn ? NB_TO_OD_LOOKUP[dn] || dn * 1.05 : 0;
                  const mitreWeldCount = numSegments > 1 ? numSegments - 1 : 0;
                  // Steinmetz curve saddle weld for sweep tees (bicylindric intersection)
                  // AWS D1.1 Clause 9.5.4: Total weld length for 90° equal-diameter intersection ≈ 2.7 × OD
                  const isSweepTeeCalc = entry.specs?.bendItemType === "SWEEP_TEE";
                  const STEINMETZ_FACTOR = 2.7;
                  const saddleWeldLinear = isSweepTeeCalc ? STEINMETZ_FACTOR * mainOdMm : 0;
                  const isPulledBendForVol =
                    entry.specs?.bendStyle === "pulled" || (!entry.specs?.bendStyle && !isSABS719);
                  const tangent1LenForVol = entry.specs?.tangentLengths?.[0] || 0;
                  const tangent2LenForVol = entry.specs?.tangentLengths?.[1] || 0;
                  const tangentButtWeldCount = isPulledBendForVol
                    ? (tangent1LenForVol > 0 ? 1 : 0) + (tangent2LenForVol > 0 ? 1 : 0)
                    : 0;
                  const numStubs = entry.specs?.numberOfStubs || 0;
                  const baseWeldVolume =
                    mainOdMm && pipeWallThickness
                      ? calculateBendWeldVolume({
                          mainOdMm,
                          mainWallThicknessMm: pipeWallThickness,
                          numberOfFlangeWelds: bendFlangeWeldCount,
                          numberOfMitreWelds: mitreWeldCount + tangentButtWeldCount,
                          hasSweepTeeSaddleWeld: isSweepTeeCalc,
                          stubs: [
                            stub1NB && stub1HasFlange
                              ? {
                                  odMm: NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05,
                                  wallThicknessMm: pipeWallThickness,
                                  hasFlangeWeld: true,
                                }
                              : null,
                            stub2NB && stub2HasFlange
                              ? {
                                  odMm: NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05,
                                  wallThicknessMm: pipeWallThickness,
                                  hasFlangeWeld: true,
                                }
                              : null,
                          ].filter(Boolean) as Array<{
                            odMm: number;
                            wallThicknessMm: number;
                            hasFlangeWeld: boolean;
                          }>,
                        })
                      : null;
                  const teeStub1OdForVol = stub1NB ? NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05 : 0;
                  const teeStub2OdForVol = stub2NB ? NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05 : 0;
                  const FILLET_LEG_RATIO = 0.7;
                  const tee1LegSize = pipeWallThickness ? pipeWallThickness * FILLET_LEG_RATIO : 0;
                  const tee2LegSize = pipeWallThickness ? pipeWallThickness * FILLET_LEG_RATIO : 0;
                  const teeWeld1VolMm3 =
                    numStubs >= 1 && teeStub1OdForVol > 0
                      ? 0.5 * tee1LegSize * tee1LegSize * Math.PI * teeStub1OdForVol
                      : 0;
                  const teeWeld2VolMm3 =
                    numStubs >= 2 && teeStub2OdForVol > 0
                      ? 0.5 * tee2LegSize * tee2LegSize * Math.PI * teeStub2OdForVol
                      : 0;
                  const teeWeldTotalVolCm3 = (teeWeld1VolMm3 + teeWeld2VolMm3) / 1000;
                  const weldVolume = baseWeldVolume
                    ? {
                        ...baseWeldVolume,
                        totalVolumeCm3: baseWeldVolume.totalVolumeCm3 + teeWeldTotalVolCm3,
                      }
                    : null;

                  const flangeStandardId =
                    entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                  const flangePressureClassId =
                    entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                  const flangeStandard = masterData.flangeStandards?.find(
                    (s: any) => s.id === flangeStandardId,
                  );
                  const flangeStandardCode = flangeStandard?.code || "";
                  const pressureClass = masterData.pressureClasses?.find(
                    (p: any) => p.id === flangePressureClassId,
                  );
                  const pressureClassDesignation = pressureClass?.designation || "";
                  const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                  const mainFlangeWeightPerUnit =
                    dn && pressureClassDesignation
                      ? getFlangeWeight(
                          dn,
                          pressureClassDesignation,
                          flangeStandardCode,
                          flangeTypeCode,
                        )
                      : entry.calculation?.flangeWeightPerUnit || 0;
                  const mainFlangesWeight = bendFlangeCount * mainFlangeWeightPerUnit;

                  const stub1FlangeWeightPerUnit =
                    stub1NB && pressureClassDesignation
                      ? getFlangeWeight(
                          stub1NB,
                          pressureClassDesignation,
                          flangeStandardCode,
                          flangeTypeCode,
                        )
                      : 0;
                  const stub1FlangesWeight = stub1FlangeCount * stub1FlangeWeightPerUnit;

                  const stub2FlangeWeightPerUnit =
                    stub2NB && pressureClassDesignation
                      ? getFlangeWeight(
                          stub2NB,
                          pressureClassDesignation,
                          flangeStandardCode,
                          flangeTypeCode,
                        )
                      : 0;
                  const stub2FlangesWeight = stub2FlangeCount * stub2FlangeWeightPerUnit;

                  const dynamicTotalFlangeWeight =
                    mainFlangesWeight + stub1FlangesWeight + stub2FlangesWeight;

                  const bendQuantity = entry.specs?.quantityValue || 1;
                  const blankPositions = entry.specs?.blankFlangePositions || [];
                  const blankFlangeCount = blankPositions.length * bendQuantity;
                  const isSans1123 =
                    flangeStandardCode.includes("SABS 1123") ||
                    flangeStandardCode.includes("SANS 1123");
                  const blankWeightPerUnit =
                    dn && pressureClassDesignation
                      ? isSans1123
                        ? sansBlankFlangeWeight(dn, pressureClassDesignation)
                        : getBlankFlangeWeight(dn, pressureClassDesignation)
                      : 0;
                  const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                  const tackWeldEnds = tackWeldEndsPerBend(
                    entry.specs?.bendEndConfiguration || "PE",
                  );
                  const tackWeldTotalWeight =
                    dn && tackWeldEnds > 0 ? getTackWeldWeight(dn, tackWeldEnds) * bendQuantity : 0;

                  const closureLengthMm = entry.specs?.closureLengthMm || 0;
                  const closureWallThickness = pipeWallThickness || 5;
                  const closureTotalWeight =
                    dn && closureLengthMm > 0 && closureWallThickness > 0
                      ? getClosureWeight(dn, closureLengthMm, closureWallThickness) * bendQuantity
                      : 0;

                  const STEEL_DENSITY_KG_M3 = 7850;
                  const stub1OD = stub1NB ? NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05 : 0;
                  const stub1ID = stub1OD - 2 * (pipeWallThickness || 0);
                  const stub1CrossSection =
                    stub1OD > 0 ? (Math.PI * (stub1OD * stub1OD - stub1ID * stub1ID)) / 4 : 0;
                  const stub1PipeWeight =
                    stub1CrossSection > 0 && stub1Length > 0
                      ? (stub1CrossSection / 1000000) * (stub1Length / 1000) * STEEL_DENSITY_KG_M3
                      : 0;

                  const stub2OD = stub2NB ? NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05 : 0;
                  const stub2ID = stub2OD - 2 * (pipeWallThickness || 0);
                  const stub2CrossSection =
                    stub2OD > 0 ? (Math.PI * (stub2OD * stub2OD - stub2ID * stub2ID)) / 4 : 0;
                  const stub2PipeWeight =
                    stub2CrossSection > 0 && stub2Length > 0
                      ? (stub2CrossSection / 1000000) * (stub2Length / 1000) * STEEL_DENSITY_KG_M3
                      : 0;

                  const mainID = mainOdMm - 2 * (pipeWallThickness || 0);
                  const mainCrossSection =
                    mainOdMm > 0 ? (Math.PI * (mainOdMm * mainOdMm - mainID * mainID)) / 4 : 0;
                  const tangentTotalLength =
                    (entry.specs?.tangentLengths?.[0] || 0) +
                    (entry.specs?.tangentLengths?.[1] || 0);
                  const tangentWeight =
                    mainCrossSection > 0 && tangentTotalLength > 0
                      ? (mainCrossSection / 1000000) *
                        (tangentTotalLength / 1000) *
                        STEEL_DENSITY_KG_M3
                      : 0;

                  const pipeALengthMm = isSweepTeeCalc
                    ? entry.specs?.sweepTeePipeALengthMm || 0
                    : 0;
                  const pipeAWeight =
                    mainCrossSection > 0 && pipeALengthMm > 0
                      ? (mainCrossSection / 1000000) * (pipeALengthMm / 1000) * STEEL_DENSITY_KG_M3
                      : 0;

                  const bendWeightFromCalc = entry.calculation.bendWeight || 0;
                  const bendWeightOnly =
                    bendWeightFromCalc > tangentWeight
                      ? bendWeightFromCalc - tangentWeight
                      : bendWeightFromCalc;
                  const totalWeight =
                    bendWeightFromCalc +
                    stub1PipeWeight +
                    stub2PipeWeight +
                    dynamicTotalFlangeWeight +
                    totalBlankFlangeWeight +
                    tackWeldTotalWeight +
                    closureTotalWeight +
                    pipeAWeight;

                  const teeNumStubs = entry.specs?.numberOfStubs || 0;
                  const teeStubs = entry.specs?.stubs || [];
                  const teeStub1NB = teeStubs[0]?.nominalBoreMm;
                  const teeStub2NB = teeStubs[1]?.nominalBoreMm;
                  const teeStub1OD = teeStub1NB
                    ? NB_TO_OD_LOOKUP[teeStub1NB] || teeStub1NB * 1.05
                    : 0;
                  const teeStub2OD = teeStub2NB
                    ? NB_TO_OD_LOOKUP[teeStub2NB] || teeStub2NB * 1.05
                    : 0;
                  const teeStub1Circ = Math.PI * teeStub1OD;
                  const teeStub2Circ = Math.PI * teeStub2OD;
                  const teeStub1RawWt =
                    isSABS719 || !fittingClass
                      ? pipeWallThickness
                      : teeStub1NB
                        ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[teeStub1NB] ||
                          pipeWallThickness
                        : pipeWallThickness;
                  const teeStub2RawWt =
                    isSABS719 || !fittingClass
                      ? pipeWallThickness
                      : teeStub2NB
                        ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[teeStub2NB] ||
                          pipeWallThickness
                        : pipeWallThickness;
                  const teeStub1Wt =
                    teeStub1NB && teeStub1RawWt ? roundToWeldIncrement(teeStub1RawWt) : 0;
                  const teeStub2Wt =
                    teeStub2NB && teeStub2RawWt ? roundToWeldIncrement(teeStub2RawWt) : 0;
                  const teeTotalLinear =
                    (teeNumStubs >= 1 && teeStub1NB ? teeStub1Circ : 0) +
                    (teeNumStubs >= 2 && teeStub2NB ? teeStub2Circ : 0);
                  const hasTeeWelds = teeNumStubs > 0 && (teeStub1NB || teeStub2NB);

                  const isPulledBend =
                    entry.specs?.bendStyle === "pulled" || (!entry.specs?.bendStyle && !isSABS719);
                  const tangent1HasLength = (entry.specs?.tangentLengths?.[0] || 0) > 0;
                  const tangent2HasLength = (entry.specs?.tangentLengths?.[1] || 0) > 0;
                  const buttWeldCount = isPulledBend
                    ? (tangent1HasLength ? 1 : 0) + (tangent2HasLength ? 1 : 0)
                    : 0;
                  const mainCircForButtWeld = mainOdMm > 0 ? Math.PI * mainOdMm : 0;
                  const buttWeldLinear = buttWeldCount * mainCircForButtWeld;

                  const cfVal = Number(entry.specs?.centerToFaceMm) || 0;
                  const tan1 = entry.specs?.tangentLengths?.[0] || 0;
                  const tan2 = entry.specs?.tangentLengths?.[1] || 0;
                  const numSt = entry.specs?.numberOfStubs || 0;
                  const stubsList = entry.specs?.stubs || [];
                  const st1Len = stubsList[0]?.length || 0;
                  const st2Len = stubsList[1]?.length || 0;

                  const mainBendLength = cfVal * 2 + tan1 + tan2;
                  const stub1SteelSpecId = stubsList[0]?.steelSpecificationId || steelSpecId;
                  const stub2SteelSpecId = stubsList[1]?.steelSpecificationId || steelSpecId;
                  const mainSteelSpec = masterData.steelSpecs?.find(
                    (s: any) => s.id === steelSpecId,
                  );
                  const stub1SteelSpec = masterData.steelSpecs?.find(
                    (s: any) => s.id === stub1SteelSpecId,
                  );
                  const stub2SteelSpec = masterData.steelSpecs?.find(
                    (s: any) => s.id === stub2SteelSpecId,
                  );
                  const mainSpecName = mainSteelSpec?.steelSpecName?.split(" ")[0] || "";
                  const stub1SpecName =
                    stub1SteelSpec?.steelSpecName?.split(" ")[0] || mainSpecName;
                  const stub2SpecName =
                    stub2SteelSpec?.steelSpecName?.split(" ")[0] || mainSpecName;

                  const stubsSameNBAndSpec =
                    teeStub1NB &&
                    teeStub2NB &&
                    teeStub1NB === teeStub2NB &&
                    stub1SteelSpecId === stub2SteelSpecId;
                  const stubsDiffSpecFromMain =
                    (stub1SteelSpecId && stub1SteelSpecId !== steelSpecId) ||
                    (stub2SteelSpecId && stub2SteelSpecId !== steelSpecId);

                  const mainLengthDisplay = `${mainBendLength.toFixed(0)}mm @ ${dn}NB`;
                  let stubLengthDisplay = "";
                  if (numSt >= 1 && st1Len > 0 && teeStub1NB) {
                    if (numSt >= 2 && st2Len > 0 && teeStub2NB && stubsSameNBAndSpec) {
                      stubLengthDisplay = `${st1Len + st2Len}mm @ ${teeStub1NB}NB`;
                    } else {
                      stubLengthDisplay = `${st1Len}mm @ ${teeStub1NB}NB`;
                      if (numSt >= 2 && st2Len > 0 && teeStub2NB) {
                        stubLengthDisplay += ` + ${st2Len}mm @ ${teeStub2NB}NB`;
                      }
                    }
                  }

                  return (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}
                    >
                      {/* Dimensions info */}
                      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          Dimensions
                        </p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {cfDisplay} C/F
                        </p>
                        {entry.specs?.sweepTeePipeALengthMm > 0 && (
                          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                            {entry.specs.sweepTeePipeALengthMm}mm Pipe A
                          </p>
                        )}
                        <p className="text-xs text-purple-500 dark:text-purple-400">
                          Radius: {Number(entry.specs?.bendRadiusMm || 0).toFixed(0)}mm
                        </p>
                        <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
                          {mainLengthDisplay}
                        </p>
                        {stubLengthDisplay && (
                          <p className="text-xs text-purple-500 dark:text-purple-400">
                            + {stubLengthDisplay}
                          </p>
                        )}
                        {closureLengthMm > 0 && (
                          <p className="text-xs text-purple-500 dark:text-purple-400">
                            Closure: {closureLengthMm}mm
                          </p>
                        )}
                      </div>
                      {totalFlanges > 0 && (
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded text-center">
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Total Flanges
                          </p>
                          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                            {totalFlanges}
                          </p>
                          <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {bendFlangeCount > 0 && (
                              <p>
                                {bendFlangeCount} x {dn}NB Flange
                              </p>
                            )}
                            {stub1FlangeCount > 0 && (
                              <p>
                                {stub1FlangeCount} x {stub1NB}NB Flange
                              </p>
                            )}
                            {stub2FlangeCount > 0 && (
                              <p>
                                {stub2FlangeCount} x {stub2NB}NB Flange
                              </p>
                            )}
                          </div>
                          {pressureClassDesignation && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                              {pressureClassDesignation}
                            </p>
                          )}
                          {dynamicTotalFlangeWeight > 0 && (
                            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-semibold">
                              {dynamicTotalFlangeWeight.toFixed(2)}kg total
                            </p>
                          )}
                          <div className="text-xs text-amber-500 dark:text-amber-400">
                            {bendFlangeCount > 0 && (
                              <p>
                                {bendFlangeCount} × {mainFlangeWeightPerUnit.toFixed(2)}kg
                              </p>
                            )}
                            {stub1FlangeCount > 0 && (
                              <p>
                                {stub1FlangeCount} × {stub1FlangeWeightPerUnit.toFixed(2)}kg
                              </p>
                            )}
                            {stub2FlangeCount > 0 && (
                              <p>
                                {stub2FlangeCount} × {stub2FlangeWeightPerUnit.toFixed(2)}kg
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          Weight Breakdown
                        </p>
                        <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {totalWeight.toFixed(2)}kg
                        </p>
                        <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                          {bendWeightOnly > 0 && <p>Bend: {bendWeightOnly.toFixed(2)}kg</p>}
                          {tangentWeight > 0 && <p>Tangents: {tangentWeight.toFixed(2)}kg</p>}
                          {pipeAWeight > 0 && <p>Pipe A: {pipeAWeight.toFixed(2)}kg</p>}
                          {numSt >= 1 && stub1NB && stub1PipeWeight > 0 && (
                            <p>
                              Stub ({stub1NB}NB): {stub1PipeWeight.toFixed(2)}kg
                            </p>
                          )}
                          {numSt >= 2 && stub2NB && stub2PipeWeight > 0 && (
                            <p>
                              Stub ({stub2NB}NB): {stub2PipeWeight.toFixed(2)}kg
                            </p>
                          )}
                          {dynamicTotalFlangeWeight > 0 && (
                            <p>Flanges: {dynamicTotalFlangeWeight.toFixed(2)}kg</p>
                          )}
                          {totalBlankFlangeWeight > 0 && (
                            <p>Blanks: {totalBlankFlangeWeight.toFixed(2)}kg</p>
                          )}
                          {tackWeldTotalWeight > 0 && (
                            <p>Tack Welds: {tackWeldTotalWeight.toFixed(2)}kg</p>
                          )}
                          {closureTotalWeight > 0 && (
                            <p>Closures: {closureTotalWeight.toFixed(2)}kg</p>
                          )}
                        </div>
                      </div>
                      {/* Weld with detailed breakdown */}
                      {(() => {
                        const mainCirc = Math.PI * mainOdMm;
                        const mitreWeldLinear = mitreWeldCount * mainCirc;
                        const mainFlangeWeldLinear = bendFlangeWeldCount * 2 * mainCirc;
                        const stub1Circ = stub1NB
                          ? Math.PI * (NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05)
                          : 0;
                        const stub2Circ = stub2NB
                          ? Math.PI * (NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05)
                          : 0;
                        const stub1FlangeWeldLinear = stub1FlangeCount * 2 * stub1Circ;
                        const stub2FlangeWeldLinear = stub2FlangeCount * 2 * stub2Circ;
                        const hasBranchConnection = (entry.specs?.sweepTeePipeALengthMm || 0) > 0;
                        const branchFlangeConfig = hasBranchConnection
                          ? getFittingFlangeConfig(bendEndConfig)
                          : null;
                        const branchHasWeldableFlange =
                          branchFlangeConfig?.hasBranch &&
                          branchFlangeConfig?.branchType !== "loose";
                        const branchFlangeWeldCount = branchHasWeldableFlange ? 1 : 0;
                        const branchFlangeWeldLinear = branchFlangeWeldCount * 2 * mainCirc;
                        const totalFlangeWeldLinear =
                          mainFlangeWeldLinear +
                          stub1FlangeWeldLinear +
                          stub2FlangeWeldLinear +
                          branchFlangeWeldLinear;
                        const totalFlangeWeldCount =
                          bendFlangeWeldCount +
                          stub1FlangeCount +
                          stub2FlangeCount +
                          branchFlangeWeldCount;

                        // Saddle weld for sweep tees - Steinmetz curve intersection
                        // When two equal-radius cylinders (r) intersect at 90°, the weld follows a bicylindric curve
                        // Parametric: x = r·cos(θ), y = r·cos(θ), z = r·sin(θ)
                        // Arc length: L = 4r × ∫₀^(π/2) √[1 + sin²(θ)] dθ where integral ≈ 1.3506
                        // For diameter D = 2r: L = 4(D/2) × 1.3506 ≈ 2.701 × D ≈ 2.7 × OD
                        // AWS D1.1 Clause 9.5.4: lw = total weld length, effective = lw × (1/1.5) = 66.7%
                        // DATA-DRIVEN: Calculate when Pipe A length exists (sweep tee geometry)
                        const STEINMETZ_FACTOR = 2.7;
                        const AWS_EFFECTIVE_FACTOR = 1 / 1.5;
                        const hasSweepTeeGeometry = (entry.specs?.sweepTeePipeALengthMm || 0) > 0;
                        const saddleWeldLinear =
                          hasSweepTeeGeometry && mainOdMm > 0 ? STEINMETZ_FACTOR * mainOdMm : 0;

                        // Duckfoot weld calculations
                        // DATA-DRIVEN: Calculate when duckfoot base plate dimensions exist
                        const duckfootWeldDefaults: Record<
                          number,
                          { x: number; y: number; h: number }
                        > = {
                          200: { x: 355, y: 230, h: 255 },
                          250: { x: 405, y: 280, h: 280 },
                          300: { x: 460, y: 330, h: 305 },
                          350: { x: 510, y: 380, h: 330 },
                          400: { x: 560, y: 430, h: 355 },
                          450: { x: 610, y: 485, h: 380 },
                          500: { x: 660, y: 535, h: 405 },
                          550: { x: 710, y: 585, h: 430 },
                          600: { x: 760, y: 635, h: 460 },
                          650: { x: 815, y: 693, h: 485 },
                          700: { x: 865, y: 733, h: 510 },
                          750: { x: 915, y: 793, h: 535 },
                          800: { x: 970, y: 833, h: 560 },
                          850: { x: 1020, y: 883, h: 585 },
                          900: { x: 1070, y: 933, h: 610 },
                        };
                        const duckfootDefaults =
                          dn && duckfootWeldDefaults[dn]
                            ? duckfootWeldDefaults[dn]
                            : { x: 500, y: 400, h: 400 };
                        const duckfootBasePlateXMm = entry.specs?.duckfootBasePlateXMm || 0;
                        const duckfootBasePlateYMm = entry.specs?.duckfootBasePlateYMm || 0;
                        const hasDuckfootGeometry =
                          duckfootBasePlateXMm > 0 || duckfootBasePlateYMm > 0;
                        const effectiveDuckfootX = duckfootBasePlateXMm || duckfootDefaults.x;
                        const effectiveDuckfootY = duckfootBasePlateYMm || duckfootDefaults.y;
                        const duckfootRibHeightMm = duckfootDefaults.h;
                        const duckfootPointDDeg = entry.specs?.duckfootGussetPointDDegrees || 15;
                        const duckfootPointCDeg = entry.specs?.duckfootGussetPointCDegrees || 75;

                        const outerRadiusMm = mainOdMm / 2;
                        const bendRadiusMm = entry.specs?.bendRadiusMm || (dn ? dn * 1.5 : 750);
                        const extradosRadiusMm = bendRadiusMm + outerRadiusMm;
                        const duckfootYOffsetMm = 800;

                        // Blue gusset cutout weld (semicircle where it welds to pipe)
                        const blueGussetCutoutWeld = hasDuckfootGeometry
                          ? Math.PI * outerRadiusMm
                          : 0;

                        // Yellow gusset curve weld (arc from point D to point C along extrados)
                        const pointDRad = (duckfootPointDDeg * Math.PI) / 180;
                        const pointCRad = (duckfootPointCDeg * Math.PI) / 180;
                        const yellowGussetCurveWeld = hasDuckfootGeometry
                          ? extradosRadiusMm * (pointCRad - pointDRad)
                          : 0;

                        // Gusset intersection weld (4 corners from base plate to where gussets meet)
                        const extradosAt45Y =
                          bendRadiusMm -
                          extradosRadiusMm * Math.cos(Math.PI / 4) +
                          duckfootYOffsetMm +
                          duckfootRibHeightMm;
                        const gussetIntersectionHeight = extradosAt45Y - outerRadiusMm / 2;
                        const gussetIntersectionWeld = hasDuckfootGeometry
                          ? 4 * gussetIntersectionHeight
                          : 0;

                        // Blue gusset to base plate weld (both sides of the plate)
                        const blueGussetToBaseWeld = hasDuckfootGeometry
                          ? 2 * effectiveDuckfootY
                          : 0;

                        // Yellow gusset to base plate weld (both sides of the plate)
                        const yellowGussetToBaseWeld = hasDuckfootGeometry
                          ? 2 * effectiveDuckfootX
                          : 0;

                        const totalDuckfootWeld =
                          blueGussetCutoutWeld +
                          yellowGussetCurveWeld +
                          gussetIntersectionWeld +
                          blueGussetToBaseWeld +
                          yellowGussetToBaseWeld;

                        // Tack weld calculation (8 tack welds × 20mm per end for L/F configuration)
                        const tackWeldLinear = tackWeldEnds * 8 * 20;

                        const calculatedTotalWeld =
                          mitreWeldLinear +
                          buttWeldLinear +
                          totalFlangeWeldLinear +
                          teeTotalLinear +
                          saddleWeldLinear +
                          totalDuckfootWeld +
                          tackWeldLinear;

                        return (
                          <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Weld (mm)
                            </p>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                              {calculatedTotalWeld.toFixed(0)}
                            </p>
                            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1 text-left space-y-0.5 whitespace-nowrap">
                              {mitreWeldCount > 0 && (
                                <p>
                                  {mitreWeldCount}×Mitre={mitreWeldLinear.toFixed(0)}@
                                  {effectiveWt?.toFixed(1) || pipeWallThickness?.toFixed(1)}
                                </p>
                              )}
                              {buttWeldCount > 0 && (
                                <p>
                                  {buttWeldCount}×Butt={buttWeldLinear.toFixed(0)}@
                                  {effectiveWt?.toFixed(1) || pipeWallThickness?.toFixed(1)}
                                </p>
                              )}
                              {bendFlangeWeldCount > 0 && (
                                <p>
                                  {bendFlangeWeldCount}×{hasSweepTeeGeometry ? "Run " : ""}Flg=
                                  {mainFlangeWeldLinear.toFixed(0)}@
                                  {effectiveWt?.toFixed(1) || pipeWallThickness?.toFixed(1)}
                                </p>
                              )}
                              {branchFlangeWeldCount > 0 && (
                                <p>
                                  {branchFlangeWeldCount}×BranchFlg=
                                  {branchFlangeWeldLinear.toFixed(0)}@
                                  {effectiveWt?.toFixed(1) || pipeWallThickness?.toFixed(1)}
                                </p>
                              )}
                              {stub1FlangeCount > 0 && (
                                <p>
                                  {stub1FlangeCount}×Stub1Flg={stub1FlangeWeldLinear.toFixed(0)}@
                                  {stub1Wt?.toFixed(1)}
                                </p>
                              )}
                              {stub2FlangeCount > 0 && (
                                <p>
                                  {stub2FlangeCount}×Stub2Flg={stub2FlangeWeldLinear.toFixed(0)}@
                                  {stub2Wt?.toFixed(1)}
                                </p>
                              )}
                              {teeStub1NB && teeStub1Circ > 0 && (
                                <p>
                                  Tee({teeStub1NB}NB)={teeStub1Circ.toFixed(0)}@
                                  {teeStub1Wt?.toFixed(1)}
                                </p>
                              )}
                              {teeStub2NB && teeStub2Circ > 0 && (
                                <p>
                                  Tee({teeStub2NB}NB)={teeStub2Circ.toFixed(0)}@
                                  {teeStub2Wt?.toFixed(1)}
                                </p>
                              )}
                              {saddleWeldLinear > 0 && (
                                <p>
                                  Saddle={saddleWeldLinear.toFixed(0)}@
                                  {effectiveWt?.toFixed(1) || pipeWallThickness?.toFixed(1)}
                                </p>
                              )}
                              {totalDuckfootWeld > 0 && (
                                <>
                                  <p className="font-medium text-purple-600 dark:text-purple-400 mt-1 border-t border-purple-200 pt-1">
                                    Duckfoot:
                                  </p>
                                  {blueGussetCutoutWeld > 0 && (
                                    <p>BlueCut={blueGussetCutoutWeld.toFixed(0)}</p>
                                  )}
                                  {yellowGussetCurveWeld > 0 && (
                                    <p>YellowCurve={yellowGussetCurveWeld.toFixed(0)}</p>
                                  )}
                                  {gussetIntersectionWeld > 0 && (
                                    <p>Corners={gussetIntersectionWeld.toFixed(0)}</p>
                                  )}
                                  {blueGussetToBaseWeld > 0 && (
                                    <p>Blue→Base={blueGussetToBaseWeld.toFixed(0)}</p>
                                  )}
                                  {yellowGussetToBaseWeld > 0 && (
                                    <p>Yellow→Base={yellowGussetToBaseWeld.toFixed(0)}</p>
                                  )}
                                </>
                              )}
                              {tackWeldLinear > 0 && (
                                <p>
                                  {tackWeldEnds}×L/F Tack={tackWeldLinear.toFixed(0)}
                                </p>
                              )}
                              <p className="font-semibold border-t border-purple-300 pt-0.5 mt-1">
                                Total: {calculatedTotalWeld.toFixed(0)}mm (
                                {(calculatedTotalWeld / 1000).toFixed(2)}l/m)
                              </p>
                              {weldVolume && (
                                <p className="font-semibold">
                                  Vol: {(weldVolume.totalVolumeCm3 * bendQuantity).toFixed(1)}cm³
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      {requiredProducts.includes("surface_protection") &&
                        mainOdMm &&
                        pipeWallThickness &&
                        (() => {
                          const mainIdMm = mainOdMm - 2 * pipeWallThickness;
                          const mainOdM = mainOdMm / 1000;
                          const mainIdM = mainIdMm / 1000;

                          const bendDegrees = entry.specs?.bendDegrees || 90;
                          const bendAngleRad = (bendDegrees * Math.PI) / 180;

                          const centerLineBendRadiusMm = entry.specs?.bendRadiusMm
                            ? entry.specs.bendRadiusMm
                            : dn *
                              (parseFloat((entry.specs?.bendType || "1.5D").replace("D", "")) ||
                                1.5);

                          const bendArcLengthMm = centerLineBendRadiusMm * bendAngleRad;
                          const bendArcLengthM = bendArcLengthMm / 1000;
                          const bendExtM2 = Math.PI * mainOdM * bendArcLengthM;
                          const bendIntM2 = Math.PI * mainIdM * bendArcLengthM;

                          const tangentTotalMm =
                            (entry.specs?.tangentLengths?.[0] || 0) +
                            (entry.specs?.tangentLengths?.[1] || 0);
                          const tangentTotalM = tangentTotalMm / 1000;
                          const tangentExtM2 = Math.PI * mainOdM * tangentTotalM;
                          const tangentIntM2 = Math.PI * mainIdM * tangentTotalM;

                          const pipeALengthM = pipeALengthMm / 1000;
                          const pipeAExtM2 =
                            pipeALengthMm > 0 ? Math.PI * mainOdM * pipeALengthM : 0;
                          const pipeAIntM2 =
                            pipeALengthMm > 0 ? Math.PI * mainIdM * pipeALengthM : 0;

                          const stub1OdM = stub1OD / 1000;
                          const stub1IdM = stub1ID / 1000;
                          const stub1LengthM = stub1Length / 1000;
                          const stub1ExtM2 =
                            stub1OD > 0 && stub1Length > 0 ? Math.PI * stub1OdM * stub1LengthM : 0;
                          const stub1IntM2 =
                            stub1OD > 0 && stub1Length > 0 ? Math.PI * stub1IdM * stub1LengthM : 0;

                          const stub2OdM = stub2OD / 1000;
                          const stub2IdM = stub2ID / 1000;
                          const stub2LengthM = stub2Length / 1000;
                          const stub2ExtM2 =
                            stub2OD > 0 && stub2Length > 0 ? Math.PI * stub2OdM * stub2LengthM : 0;
                          const stub2IntM2 =
                            stub2OD > 0 && stub2Length > 0 ? Math.PI * stub2IdM * stub2LengthM : 0;

                          const mainFlangeResult = flangeSpecs || null;
                          const mainFlangeOdM = mainFlangeResult?.flangeOdMm
                            ? mainFlangeResult.flangeOdMm / 1000
                            : mainOdM * 1.8;
                          const mainFlangeBoreM = mainFlangeResult?.flangeBoreMm
                            ? mainFlangeResult.flangeBoreMm / 1000
                            : mainIdM;
                          const mainRaisedFaceM = mainFlangeResult?.flangeFaceMm
                            ? mainFlangeResult.flangeFaceMm / 1000
                            : mainOdM * 1.2;
                          const mainFlangeExtFaceM2 =
                            bendFlangeCount > 0
                              ? bendFlangeCount *
                                (Math.PI / 4) *
                                (mainFlangeOdM * mainFlangeOdM - mainOdM * mainOdM)
                              : 0;
                          const mainFlangeIntFaceM2 =
                            bendFlangeCount > 0
                              ? bendFlangeCount *
                                (Math.PI / 4) *
                                (mainRaisedFaceM * mainRaisedFaceM -
                                  mainFlangeBoreM * mainFlangeBoreM)
                              : 0;

                          const stub1FlangeOdM = stub1NB
                            ? ((NB_TO_OD_LOOKUP[stub1NB] || stub1NB) * 1.8) / 1000
                            : 0;
                          const stub1FlangeBoreM = stub1IdM;
                          const stub1RaisedFaceM = stub1NB
                            ? ((NB_TO_OD_LOOKUP[stub1NB] || stub1NB) * 1.2) / 1000
                            : 0;
                          const stub1FlangeExtFaceM2 =
                            stub1FlangeCount > 0
                              ? stub1FlangeCount *
                                (Math.PI / 4) *
                                (stub1FlangeOdM * stub1FlangeOdM - stub1OdM * stub1OdM)
                              : 0;
                          const stub1FlangeIntFaceM2 =
                            stub1FlangeCount > 0
                              ? stub1FlangeCount *
                                (Math.PI / 4) *
                                (stub1RaisedFaceM * stub1RaisedFaceM -
                                  stub1FlangeBoreM * stub1FlangeBoreM)
                              : 0;

                          const stub2FlangeOdM = stub2NB
                            ? ((NB_TO_OD_LOOKUP[stub2NB] || stub2NB) * 1.8) / 1000
                            : 0;
                          const stub2FlangeBoreM = stub2IdM;
                          const stub2RaisedFaceM = stub2NB
                            ? ((NB_TO_OD_LOOKUP[stub2NB] || stub2NB) * 1.2) / 1000
                            : 0;
                          const stub2FlangeExtFaceM2 =
                            stub2FlangeCount > 0
                              ? stub2FlangeCount *
                                (Math.PI / 4) *
                                (stub2FlangeOdM * stub2FlangeOdM - stub2OdM * stub2OdM)
                              : 0;
                          const stub2FlangeIntFaceM2 =
                            stub2FlangeCount > 0
                              ? stub2FlangeCount *
                                (Math.PI / 4) *
                                (stub2RaisedFaceM * stub2RaisedFaceM -
                                  stub2FlangeBoreM * stub2FlangeBoreM)
                              : 0;

                          const branchFlangeCountForArea =
                            pipeALengthMm > 0 && getFittingFlangeConfig(bendEndConfig).hasBranch
                              ? 1
                              : 0;
                          const branchFlangeExtFaceM2 =
                            branchFlangeCountForArea > 0
                              ? branchFlangeCountForArea *
                                (Math.PI / 4) *
                                (mainFlangeOdM * mainFlangeOdM - mainOdM * mainOdM)
                              : 0;
                          const branchFlangeIntFaceM2 =
                            branchFlangeCountForArea > 0
                              ? branchFlangeCountForArea *
                                (Math.PI / 4) *
                                (mainRaisedFaceM * mainRaisedFaceM -
                                  mainFlangeBoreM * mainFlangeBoreM)
                              : 0;

                          const totalFlangeExtM2 =
                            mainFlangeExtFaceM2 +
                            stub1FlangeExtFaceM2 +
                            stub2FlangeExtFaceM2 +
                            branchFlangeExtFaceM2;
                          const totalFlangeIntM2 =
                            mainFlangeIntFaceM2 +
                            stub1FlangeIntFaceM2 +
                            stub2FlangeIntFaceM2 +
                            branchFlangeIntFaceM2;

                          const pipeExtM2 =
                            bendExtM2 + tangentExtM2 + pipeAExtM2 + stub1ExtM2 + stub2ExtM2;
                          const pipeIntM2 =
                            bendIntM2 + tangentIntM2 + pipeAIntM2 + stub1IntM2 + stub2IntM2;
                          const totalExtM2 = pipeExtM2 + totalFlangeExtM2;
                          const totalIntM2 = pipeIntM2 + totalFlangeIntM2;

                          return (
                            <div className="flex gap-2">
                              <div className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded text-center">
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                  External m²
                                </p>
                                <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                                  {(totalExtM2 * bendQuantity).toFixed(2)}
                                </p>
                                <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 text-left">
                                  <p>Bend: {bendExtM2.toFixed(3)}</p>
                                  {tangentExtM2 > 0 && <p>Tangents: {tangentExtM2.toFixed(3)}</p>}
                                  {pipeAExtM2 > 0 && <p>Pipe A: {pipeAExtM2.toFixed(3)}</p>}
                                  {stub1ExtM2 > 0 && (
                                    <p>
                                      Stub ({stub1NB}NB): {stub1ExtM2.toFixed(3)}
                                    </p>
                                  )}
                                  {stub2ExtM2 > 0 && (
                                    <p>
                                      Stub ({stub2NB}NB): {stub2ExtM2.toFixed(3)}
                                    </p>
                                  )}
                                  {totalFlangeExtM2 > 0 && (
                                    <p>Flanges: {totalFlangeExtM2.toFixed(3)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 bg-cyan-100 dark:bg-cyan-900/40 p-2 rounded text-center">
                                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                                  Internal m²
                                </p>
                                <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
                                  {(totalIntM2 * bendQuantity).toFixed(2)}
                                </p>
                                <div className="text-xs text-cyan-500 dark:text-cyan-400 mt-1 text-left">
                                  <p>Bend: {bendIntM2.toFixed(3)}</p>
                                  {tangentIntM2 > 0 && <p>Tangents: {tangentIntM2.toFixed(3)}</p>}
                                  {pipeAIntM2 > 0 && <p>Pipe A: {pipeAIntM2.toFixed(3)}</p>}
                                  {stub1IntM2 > 0 && (
                                    <p>
                                      Stub ({stub1NB}NB): {stub1IntM2.toFixed(3)}
                                    </p>
                                  )}
                                  {stub2IntM2 > 0 && (
                                    <p>
                                      Stub ({stub2NB}NB): {stub2IntM2.toFixed(3)}
                                    </p>
                                  )}
                                  {totalFlangeIntM2 > 0 && (
                                    <p>Flanges: {totalFlangeIntM2.toFixed(3)}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-md text-center text-sm text-gray-500">
                Complete bend specifications to see calculation results
              </div>
            )}
          </div>
        }
      />

      {/* Quantity Limit Popup for unregistered customers */}
      {quantityLimitPopup && (
        <div
          className="fixed z-[100] bg-slate-800 text-white px-4 py-4 rounded-lg shadow-xl border border-slate-600 max-w-sm"
          style={{
            left: Math.min(quantityLimitPopup.x - 150, window.innerWidth - 400),
            top: quantityLimitPopup.y + 10,
          }}
          onMouseLeave={() => setQuantityLimitPopup(null)}
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-7a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-400">Quantity Limit Reached</p>
              <p className="text-xs text-gray-300 mt-2">
                Unregistered users can set a maximum quantity of {MAX_QUANTITY_UNREGISTERED} units
                per item.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                To request larger quantities, please create a free account.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-600">
                <p className="text-xs text-gray-300">
                  <Link
                    href="/register"
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={() => setQuantityLimitPopup(null)}
                  >
                    Create a free account
                  </Link>{" "}
                  to request unlimited quantities and access all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const BendForm = memo(BendFormComponent);
export default BendForm;
