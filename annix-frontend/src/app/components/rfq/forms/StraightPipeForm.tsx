"use client";

import Link from "next/link";
import React, { memo, useCallback, useEffect, useState } from "react";
import { SpigotConfigurationSection } from "@/app/components/rfq/sections/SpigotConfigurationSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/warnings/MaterialSuitabilityWarning";
import { Select } from "@/app/components/ui/Select";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import {
  DEFAULT_PIPE_LENGTH_M,
  FITTING_CLASS_WALL_THICKNESS,
  weldCountPerPipe as getWeldCountPerPipe,
  hasLooseFlange,
  isSabs62Spec,
  isSabs719Spec,
  PRESSURE_CALC_CORROSION_ALLOWANCE,
  PRESSURE_CALC_JOINT_EFFICIENCY,
  PRESSURE_CALC_SAFETY_FACTOR,
  PUDDLE_PIPE_LENGTHS_M,
  recommendedPressureClassId,
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  STANDARD_PIPE_LENGTHS_M,
  scheduleListForSpec,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import {
  useAllFlangeTypes,
  useAllFlangeTypeWeights,
  useAllRetainingRingWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import {
  calculateMinWallThickness,
  findRecommendedSchedule,
} from "@/app/lib/utils/pipeCalculations";
import { scheduleToFittingClass } from "@/app/lib/utils/rfqFlangeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import { useFlangeResolution } from "./hooks/useFlangeResolution";
import { useMaterialSelector } from "./hooks/useMaterialSelector";
import { PipeEndConfigSection } from "./sections/PipeEndConfigSection";
import { PipeSteelSpecSelect } from "./sections/PipeSteelSpecSelect";
import { PipeWeightWeldSummary } from "./sections/PipeWeightWeldSummary";
import { PslCvnNaceSection } from "./sections/PslCvnNaceSection";
import { SpigotFlangeSection } from "./sections/SpigotFlangeSection";
import {
  type FlangeStandardItem,
  type FlangeTypeItem,
  type PressureClassItem,
  type SteelSpecItem,
} from "./shared";

const calculateQuantities = (entry: any, field: string, value: number) => {
  const rawIndividualPipeLength = entry.specs?.individualPipeLength;
  const pipeLength = rawIndividualPipeLength || DEFAULT_PIPE_LENGTH_M;

  if (field === "totalLength") {
    const quantity = Math.ceil(value / pipeLength);
    return {
      ...entry,
      specs: {
        ...entry.specs,
        quantityValue: value,
        quantityType: "total_length",
      },
      calculatedPipes: quantity,
    };
  } else if (field === "numberOfPipes") {
    return {
      ...entry,
      specs: {
        ...entry.specs,
        quantityValue: value,
        quantityType: "number_of_pipes",
      },
      calculatedPipes: value,
    };
  }
  return entry;
};

export interface StraightPipeFormProps {
  entry: any;
  index: number;
  entriesCount: number;
  globalSpecs: GlobalSpecs;
  masterData: MasterData;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry?: (entry: any, index: number) => void;
  onCopyEntry?: (entry: any) => void;
  copiedItemId?: string | null;
  onCalculate?: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  Pipe3DPreview?: React.ComponentType<any> | null;
  nominalBores: number[];
  availableSchedulesMap: Record<string, any[]>;
  setAvailableSchedulesMap: (fn: (prev: Record<string, any[]>) => Record<string, any[]>) => void;
  fetchAvailableSchedules: (entryId: string, steelSpecId: number, nominalBore: number) => void;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
  requiredProducts?: string[];
  isUnregisteredCustomer?: boolean;
  onShowRestrictionPopup?: (
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

function StraightPipeFormComponent({
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
  onCalculate,
  generateItemDescription,
  Pipe3DPreview,
  nominalBores,
  availableSchedulesMap,
  setAvailableSchedulesMap,
  fetchAvailableSchedules,
  pressureClassesByStandard,
  getFilteredPressureClasses,
  errors = {},
  isLoadingNominalBores = false,
  requiredProducts = [],
  isUnregisteredCustomer: isUnregisteredCustomerProp,
  onShowRestrictionPopup,
}: StraightPipeFormProps) {
  log.info(`🔄 StraightPipeForm RENDER - entry.id: ${entry.id}, index: ${index}`);

  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allRetainingRings = [] } = useAllRetainingRingWeights();
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();

  // Authentication status for quantity restrictions
  // Don't apply restrictions while auth is still loading
  const { isAuthenticated, isLoading: isAuthLoading } = useOptionalCustomerAuth();
  const isUnregisteredCustomer = isUnregisteredCustomerProp ?? (!isAuthLoading && !isAuthenticated);
  const MAX_QUANTITY_UNREGISTERED = 1;
  const [quantityLimitPopup, setQuantityLimitPopup] = useState<{ x: number; y: number } | null>(
    null,
  );

  const showSurfaceProtection = requiredProducts.includes("surface_protection");

  const [flangeSpecs, setFlangeSpecs] = useState<FlangeSpecData | null>(null);

  const rawSpecs = entry.specs;

  const specs = rawSpecs || {};
  const rawFlangeStandardId = specs.flangeStandardId;
  const flangeStandardId = rawFlangeStandardId || globalSpecs?.flangeStandardId;
  const rawFlangePressureClassId = specs.flangePressureClassId;
  const flangePressureClassId = rawFlangePressureClassId || globalSpecs?.flangePressureClassId;
  const rawFlangeTypeCode = specs.flangeTypeCode;
  const flangeTypeCode = rawFlangeTypeCode || globalSpecs?.flangeTypeCode;
  const nominalBoreMm = specs.nominalBoreMm;
  const rawPipeEndConfiguration = specs.pipeEndConfiguration;
  const pipeEndConfiguration = rawPipeEndConfiguration || "PE";
  const hasFlanges = pipeEndConfiguration !== "PE";

  const {
    groupedOptions: groupedSteelOptions,
    effectiveSpecId: effectiveSteelSpecId,
    specName: selectedSteelSpecName,
    isFromGlobal: isSteelFromGlobal,
    isOverride: isSteelOverride,
  } = useMaterialSelector({
    masterData,
    steelSpecificationId: specs.steelSpecificationId,
    globalSpecs,
  });

  const flangeResolution = useFlangeResolution({
    flangeStandardId: specs.flangeStandardId,
    flangePressureClassId: specs.flangePressureClassId,
    flangeTypeCode: specs.flangeTypeCode,
    globalSpecs,
    masterData,
    endConfiguration: pipeEndConfiguration,
  });

  const rawLength = masterData?.flangeTypes?.length;

  const flangeTypesLength = rawLength || 0;

  const handleWorkingPressureChange = useCallback(
    (value: number | undefined) => {
      if (flangeStandardId && !pressureClassesByStandard[flangeStandardId]) {
        getFilteredPressureClasses(flangeStandardId);
      }

      const rawFlangeStandardId2 = pressureClassesByStandard[flangeStandardId];

      let availableClasses = flangeStandardId ? rawFlangeStandardId2 || [] : [];
      if (availableClasses.length === 0) {
        availableClasses =
          masterData.pressureClasses?.filter(
            (pc: PressureClassItem) =>
              pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId,
          ) || [];
      }

      const newPressureClassId =
        value && availableClasses.length > 0
          ? recommendedPressureClassId(
              value,
              availableClasses,
              flangeResolution.flangeStandardCode,
              flangeResolution.effectiveFlangeTypeCode,
            ) || specs.flangePressureClassId
          : specs.flangePressureClassId;

      onUpdateEntry(entry.id, {
        specs: {
          ...entry.specs,
          workingPressureBar: value,
          flangePressureClassId: newPressureClassId,
          flangeTypeCode: flangeResolution.effectiveFlangeTypeCode,
        },
      });
    },
    [
      entry.id,
      entry.specs,
      flangeStandardId,
      flangeResolution.flangeStandardCode,
      flangeResolution.effectiveFlangeTypeCode,
      masterData.pressureClasses,
      pressureClassesByStandard,
      getFilteredPressureClasses,
      onUpdateEntry,
    ],
  );

  const handleNominalBoreChange = useCallback(
    (value: string) => {
      const nominalBore = Number(value);
      if (!nominalBore) return;

      const rawSteelSpecificationId = entry.specs.steelSpecificationId;
      const gsSpecId = globalSpecs?.steelSpecificationId;
      const steelSpecId = rawSteelSpecificationId || gsSpecId || 2;
      const rawSteelSpecName = masterData.steelSpecs?.find(
        (s: SteelSpecItem) => s.id === steelSpecId,
      )?.steelSpecName;
      const steelSpecName = rawSteelSpecName || "";
      const rawWorkingPressureBar = globalSpecs?.workingPressureBar;
      const pressure = rawWorkingPressureBar || 0;
      const rawWorkingTemperatureC = globalSpecs?.workingTemperatureC;
      const temperature = rawWorkingTemperatureC || 20;

      const rawSteelSpecificationId2 = entry?.specs?.steelSpecificationId;

      const nbEffectiveSpecId = rawSteelSpecificationId2 || globalSpecs?.steelSpecificationId;
      const schedules = scheduleListForSpec(nominalBore, nbEffectiveSpecId, steelSpecName);

      if (schedules.length > 0) {
        setAvailableSchedulesMap((prev: Record<string, any[]>) => ({
          ...prev,
          [entry.id]: schedules,
        }));
      }

      let matchedSchedule: string | null = null;
      let matchedWT = 0;
      let minWT = 0;

      if (schedules.length > 0) {
        if (pressure > 0) {
          const rawNominalBore = nbToOdMap[nominalBore];
          const od = rawNominalBore || nominalBore * 1.05;
          const materialCode = steelSpecId === 1 ? "ASTM_A53_Grade_B" : "ASTM_A106_Grade_B";
          minWT = calculateMinWallThickness(
            od,
            pressure,
            materialCode,
            temperature,
            PRESSURE_CALC_JOINT_EFFICIENCY,
            PRESSURE_CALC_CORROSION_ALLOWANCE,
            PRESSURE_CALC_SAFETY_FACTOR,
          );

          const recommendation = findRecommendedSchedule(
            schedules,
            od,
            pressure,
            materialCode,
            temperature,
            PRESSURE_CALC_SAFETY_FACTOR,
          );

          if (recommendation.schedule) {
            matchedSchedule = recommendation.schedule.scheduleDesignation;
            matchedWT = recommendation.schedule.wallThicknessMm;
          } else {
            const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
            matchedSchedule = sorted[0].scheduleDesignation;
            matchedWT = sorted[0].wallThicknessMm;
          }
        } else {
          const sorted = [...schedules].sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);
          matchedSchedule = sorted[0].scheduleDesignation;
          matchedWT = sorted[0].wallThicknessMm;
        }
      }

      const updatedEntry: any = {
        ...entry,
        minimumSchedule: matchedSchedule ?? undefined,
        minimumWallThickness: minWT,
        isScheduleOverridden: false,
        specs: {
          ...entry.specs,
          nominalBoreMm: nominalBore,
          scheduleNumber: matchedSchedule ?? undefined,
          wallThicknessMm: matchedWT,
        },
      };

      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);
      fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
    },
    [
      entry,
      globalSpecs?.steelSpecificationId,
      globalSpecs?.workingPressureBar,
      globalSpecs?.workingTemperatureC,
      setAvailableSchedulesMap,
      generateItemDescription,
      onUpdateEntry,
      fetchAvailableSchedules,
    ],
  );

  const handleScheduleChange = useCallback(
    (newSchedule: string) => {
      const rawSteelSpecificationId3 = specs.steelSpecificationId;
      const fallbackEffectiveSpecId = rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId;

      const rawSteelSpecName2 = masterData.steelSpecs?.find(
        (s: SteelSpecItem) => s.id === fallbackEffectiveSpecId,
      )?.steelSpecName;

      const fallbackSpecName = rawSteelSpecName2 || "";
      const fallbackSchedules = scheduleListForSpec(
        specs.nominalBoreMm,
        fallbackEffectiveSpecId,
        fallbackSpecName,
      );
      const rawId = availableSchedulesMap[entry.id];
      const mapSchedules = rawId || [];
      const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
      const selectedDimension = availableSchedules.find((dim: any) => {
        const rawScheduleDesignation = dim.scheduleDesignation;
        const schedName =
          rawScheduleDesignation ||
          dim.schedule_designation ||
          dim.scheduleNumber?.toString() ||
          dim.schedule_number?.toString();
        return schedName === newSchedule;
      });
      const rawWallThicknessMm = selectedDimension?.wallThicknessMm;
      const sdWallThickness = selectedDimension?.wall_thickness_mm;
      const autoWallThickness = rawWallThicknessMm || sdWallThickness || null;
      const updatedEntry: any = {
        specs: {
          ...entry.specs,
          scheduleNumber: newSchedule,
          wallThicknessMm: autoWallThickness || specs.wallThicknessMm,
        },
        isScheduleOverridden: newSchedule !== entry.minimumSchedule,
      };
      updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry } as any);
      onUpdateEntry(entry.id, updatedEntry);
    },
    [
      entry,
      globalSpecs?.steelSpecificationId,
      availableSchedulesMap,
      generateItemDescription,
      onUpdateEntry,
    ],
  );

  const handleTemperatureChange = useCallback(
    (value: number | undefined) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, workingTemperatureC: value },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleSpigotSteelSpecChange = useCallback(
    (specId: number | undefined) => {
      onUpdateEntry(entry.id, {
        specs: {
          ...entry.specs,
          spigotSteelSpecificationId: specId,
          spigotNominalBoreMm: null,
        },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleNumberOfSpigots = useCallback(
    (count: number) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, numberOfSpigots: count },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleSpigotNominalBoreChange = useCallback(
    (nb: number | null) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, spigotNominalBoreMm: nb },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleSpigotDistanceChange = useCallback(
    (distance: number | null) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, spigotDistanceFromEndMm: distance },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleSpigotHeightChange = useCallback(
    (height: number | null) => {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, spigotHeightMm: height },
      });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  useEffect(() => {
    const fetchSpecs = async () => {
      log.debug("StraightPipeForm fetchSpecs", {
        hasFlanges,
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeCode,
      });
      if (!hasFlanges || !nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
        log.debug("StraightPipeForm: missing required params, setting flangeSpecs to null");
        setFlangeSpecs(null);
        return;
      }

      const flangeType = masterData?.flangeTypes?.find(
        (ft: FlangeTypeItem) => ft.code === flangeTypeCode,
      );
      const flangeTypeId = flangeType?.id;
      log.debug("StraightPipeForm: fetching with flangeTypeId", flangeTypeId);

      const specs = await fetchFlangeSpecsStatic(
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeId,
      );
      log.debug("StraightPipeForm: received specs", specs);
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

  const rawQuantityValue = specs.quantityValue;
  const rawQuantityValue2 = specs.quantityValue;
  const rawIndividualPipeLength2 = specs.individualPipeLength;

  const totalLineDisplayValue =
    specs.quantityType === "total_length"
      ? rawQuantityValue || ""
      : (rawQuantityValue2 || 1) * (rawIndividualPipeLength2 || 0);

  const rawQuantityValue3 = specs.quantityValue;
  const rawQuantityValue4 = specs.quantityValue;

  const qtyEachDisplayValue =
    specs.quantityType === "number_of_pipes"
      ? rawQuantityValue3 || ""
      : specs.individualPipeLength
        ? Math.ceil((rawQuantityValue4 || 0) / specs.individualPipeLength)
        : "";

  const rawDescription = entry.description;
  const rawWorkingPressureBar2 = specs.workingPressureBar;
  const rawWorkingPressureBar3 = specs.workingPressureBar;
  const rawWorkingPressureBar4 = specs.workingPressureBar;
  const rawWorkingTemperatureC2 = specs.workingTemperatureC;
  const rawWorkingPressureBar6 = specs.workingPressureBar;
  const rawWorkingTemperatureC4 = specs.workingTemperatureC;
  const rawSteelSpecs = masterData.steelSpecs;
  const rawScheduleNumber = specs.scheduleNumber;
  const rawPipeType = specs.pipeType;
  const rawNumberOfSpigots = specs.numberOfSpigots;
  const rawSteelSpecs2 = masterData.steelSpecs;
  const rawPuddleFlangeOdMm = specs.puddleFlangeOdMm;
  const rawPuddleFlangePcdMm = specs.puddleFlangePcdMm;
  const rawPuddleFlangeHoleCount = specs.puddleFlangeHoleCount;
  const rawPuddleFlangeHoleIdMm = specs.puddleFlangeHoleIdMm;
  const rawPuddleFlangeThicknessMm = specs.puddleFlangeThicknessMm;
  const rawPuddleFlangeLocationMm = specs.puddleFlangeLocationMm;
  const rawPipeEndConfiguration8 = entry.specs.pipeEndConfiguration;
  const rawNominalBoreMm = specs.nominalBoreMm;
  const rawClosureLengthMm = specs.closureLengthMm;
  const rawWallThicknessMm15 = specs.wallThicknessMm;
  const rawSelectedNotes = entry.selectedNotes;
  const gsWorkingPressureBar = globalSpecs?.workingPressureBar;
  const gsWorkingTemperatureC = globalSpecs?.workingTemperatureC;
  const rawFlangeStandards = masterData.flangeStandards;
  const rawPressureClasses = masterData.pressureClasses;

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="straight_pipe"
        showSplitToggle={specs.nominalBoreMm}
        formContent={
          <>
            {/* Material Type Badge for non-steel materials */}
            {entry.materialType && entry.materialType !== "steel" && (
              <div className="mb-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      entry.materialType === "hdpe"
                        ? "bg-gray-900 text-white"
                        : "bg-blue-400 text-white"
                    }`}
                  >
                    {entry.materialType === "hdpe" ? "HDPE" : "PVC"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {entry.materialType === "hdpe" ? "HDPE Straight Pipe" : "PVC Straight Pipe"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Detailed {entry.materialType.toUpperCase()} specifications will use the global
                  settings configured in Step 2. Item-specific overrides coming soon.
                </p>
              </div>
            )}

            {/* Item Description - Single Field */}
            <div>
              <label
                htmlFor={`pipe-description-${entry.id}`}
                className="block text-xs font-semibold text-gray-900 mb-1"
              >
                Item Description *
              </label>
              <textarea
                id={`pipe-description-${entry.id}`}
                value={rawDescription || generateItemDescription(entry)}
                onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                rows={2}
                placeholder="Enter item description..."
                required
                aria-required="true"
              />
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-500">
                  Edit the description or use the auto-generated one
                </p>
                {entry.description && entry.description !== generateItemDescription(entry) && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEntry(entry.id, { description: generateItemDescription(entry) })
                    }
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reset to Auto-generated
                  </button>
                )}
              </div>
            </div>

            {/* Working Conditions - Item Override */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold text-gray-800">
                  Working Conditions
                  {!specs.workingPressureBar && !specs.workingTemperatureC && (
                    <span className="ml-2 text-xs font-normal text-blue-600">
                      (From Specs Page)
                    </span>
                  )}
                  {(rawWorkingPressureBar2 || specs.workingTemperatureC) && (
                    <span className="ml-2 text-xs font-normal text-blue-600">(Override)</span>
                  )}
                </h4>
                {(rawWorkingPressureBar3 || specs.workingTemperatureC) && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEntry(entry.id, {
                        specs: {
                          ...entry.specs,
                          workingPressureBar: undefined,
                          workingTemperatureC: undefined,
                        },
                      })
                    }
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reset to Global
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor={`pipe-pressure-${entry.id}`}
                    className="block text-xs font-semibold text-gray-900 mb-1"
                  >
                    Working Pressure (bar)
                    <span
                      id={`pipe-pressure-help-${entry.id}`}
                      className="ml-1 text-gray-400 font-normal cursor-help"
                      title="Design pressure for the piping system. Affects minimum wall thickness and recommended flange pressure class."
                    >
                      ?
                    </span>
                  </label>
                  <select
                    id={`pipe-pressure-${entry.id}`}
                    aria-describedby={`pipe-pressure-help-${entry.id}`}
                    value={rawWorkingPressureBar4 || gsWorkingPressureBar || ""}
                    onChange={(e) =>
                      handleWorkingPressureChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  >
                    <option value="">Select pressure...</option>
                    {WORKING_PRESSURE_BAR.map((pressure) => (
                      <option key={pressure} value={pressure}>
                        {pressure} bar
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor={`pipe-temp-${entry.id}`}
                    className="block text-xs font-semibold text-gray-900 mb-1"
                  >
                    Working Temperature (°C)
                    <span
                      id={`pipe-temp-help-${entry.id}`}
                      className="ml-1 text-gray-400 font-normal cursor-help"
                      title="Operating temperature of the system. Affects material suitability and de-rating factors."
                    >
                      ?
                    </span>
                  </label>
                  <select
                    id={`pipe-temp-${entry.id}`}
                    aria-describedby={`pipe-temp-help-${entry.id}`}
                    value={rawWorkingTemperatureC2 || gsWorkingTemperatureC || ""}
                    onChange={(e) =>
                      handleTemperatureChange(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  >
                    <option value="">Select temperature...</option>
                    {WORKING_TEMPERATURE_CELSIUS.map((temp) => (
                      <option key={temp} value={temp}>
                        {temp}°C
                      </option>
                    ))}
                  </select>
                </div>
                {/* Steel Specification - moved from Material & Dimensions */}
                <div>
                  <PipeSteelSpecSelect
                    entryId={entry.id}
                    entry={entry}
                    specs={specs}
                    globalSpecs={globalSpecs}
                    masterData={masterData}
                    groupedSteelOptions={groupedSteelOptions}
                    nbToOdMap={nbToOdMap}
                    generateItemDescription={generateItemDescription}
                    onUpdateEntry={onUpdateEntry}
                    errors={errors}
                    index={index}
                  />
                </div>
              </div>
              <MaterialSuitabilityWarning
                color="blue"
                steelSpecName={selectedSteelSpecName}
                effectivePressure={rawWorkingPressureBar6 || globalSpecs?.workingPressureBar}
                effectiveTemperature={rawWorkingTemperatureC4 || globalSpecs?.workingTemperatureC}
                allSteelSpecs={rawSteelSpecs || []}
                onSelectSpec={(spec) =>
                  onUpdateEntry(entry.id, {
                    specs: { ...entry.specs, steelSpecificationId: spec.id },
                  })
                }
              />
              <PslCvnNaceSection
                steelSpecName={selectedSteelSpecName}
                entryId={entry.id}
                specs={specs}
                onUpdateSpecs={(updates) =>
                  onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } })
                }
              />
            </div>

            {/* Material & Dimensions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1">Material & Dimensions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {/* Nominal Bore - moved from Working Conditions */}
                {(() => {
                  const isMissingForPreview = specs.individualPipeLength && !specs.nominalBoreMm;
                  const rawSteelSpecificationId7 = specs.steelSpecificationId;
                  const effectiveSpecId =
                    rawSteelSpecificationId7 || globalSpecs?.steelSpecificationId;

                  const rawSteelSpecName7 = masterData.steelSpecs?.find(
                    (s: SteelSpecItem) => s.id === effectiveSpecId,
                  )?.steelSpecName;

                  const steelSpecName = rawSteelSpecName7 || "";
                  const hasItemOverride = !!specs.steelSpecificationId;

                  const allAvailableNBs = hasItemOverride
                    ? [...SABS62_FITTING_SIZES, ...SABS719_FITTING_SIZES]
                    : nominalBores;

                  const filteredNominalBores = (() => {
                    if (isSabs62Spec(steelSpecName, effectiveSpecId)) {
                      return (SABS62_FITTING_SIZES as readonly number[]).slice();
                    }
                    if (isSabs719Spec(steelSpecName, effectiveSpecId)) {
                      return (SABS719_FITTING_SIZES as readonly number[]).slice();
                    }
                    return allAvailableNBs;
                  })();

                  const sizesAvailableText =
                    filteredNominalBores.length > 0
                      ? `${filteredNominalBores.length} sizes available`
                      : "No sizes available";

                  return (
                    <div
                      data-nix-target="pipe-nb-select"
                      className={
                        isMissingForPreview ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""
                      }
                    >
                      <label
                        htmlFor={`pipe-nb-${entry.id}`}
                        className={`block text-xs font-semibold mb-1 ${isMissingForPreview ? "text-red-700" : "text-gray-900"}`}
                      >
                        Nominal Bore (mm) *{" "}
                        {isMissingForPreview && (
                          <span className="text-red-600 font-bold">⚠ Required for preview</span>
                        )}
                      </label>
                      <Select
                        id={`pipe-nb-${entry.id}`}
                        value={entry.specs.nominalBoreMm ? String(entry.specs.nominalBoreMm) : ""}
                        onChange={handleNominalBoreChange}
                        options={filteredNominalBores.map((nb: number) => ({
                          value: String(nb),
                          label: `${nb}NB`,
                        }))}
                        placeholder={isLoadingNominalBores ? "Loading..." : "Select NB"}
                        disabled={isLoadingNominalBores}
                        aria-required={true}
                        aria-invalid={!!errors[`pipe_${index}_nb`]}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                      <span className="text-xs text-gray-500">{sizesAvailableText}</span>
                      {errors[`pipe_${index}_nb`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                          {errors[`pipe_${index}_nb`]}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Schedule */}
                <div data-nix-target="pipe-schedule-select">
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Schedule
                    <span
                      className="ml-1 text-gray-400 font-normal cursor-help"
                      title="★ = Minimum schedule meeting ASME B31.3 pressure requirements with 1.2x safety margin. Higher schedules provide thicker walls and greater pressure capacity."
                    >
                      ?
                    </span>
                    {specs.scheduleNumber && (
                      <span className="ml-1 text-green-600 text-xs">
                        ({entry.specs.wallThicknessMm?.toFixed(2)}mm)
                      </span>
                    )}
                  </label>
                  <select
                    value={rawScheduleNumber || ""}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    disabled={!specs.nominalBoreMm}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {!specs.nominalBoreMm ? (
                      <option value="">Select NB first</option>
                    ) : (
                      <>
                        <option value="">Select schedule...</option>
                        {(() => {
                          const rawSteelSpecificationId8 = specs.steelSpecificationId;
                          const fallbackEffectiveSpecId =
                            rawSteelSpecificationId8 || globalSpecs?.steelSpecificationId;

                          const rawSteelSpecName8 = masterData.steelSpecs?.find(
                            (s: SteelSpecItem) => s.id === fallbackEffectiveSpecId,
                          )?.steelSpecName;

                          const fallbackSpecName = rawSteelSpecName8 || "";
                          const fallbackSchedules = scheduleListForSpec(
                            specs.nominalBoreMm,
                            fallbackEffectiveSpecId,
                            fallbackSpecName,
                          );
                          const rawId2 = availableSchedulesMap[entry.id];
                          const mapSchedules = rawId2 || [];
                          const allSchedules =
                            fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                          const rawWorkingPressureBar7 = specs.workingPressureBar;
                          const gsWpb7 = globalSpecs?.workingPressureBar;
                          const effectivePressure = rawWorkingPressureBar7 || gsWpb7 || 0;
                          const rawWorkingTemperatureC5 = specs.workingTemperatureC;
                          const gsWtc5 = globalSpecs?.workingTemperatureC;
                          const effectiveTemp = rawWorkingTemperatureC5 || gsWtc5 || 20;
                          const nominalBore = specs.nominalBoreMm;
                          const rawNominalBore3 = nbToOdMap[nominalBore];
                          const od = rawNominalBore3 || nominalBore * 1.05;
                          const materialCode =
                            fallbackEffectiveSpecId === 1
                              ? "ASTM_A53_Grade_B"
                              : "ASTM_A106_Grade_B";
                          const minimumWT =
                            effectivePressure > 0
                              ? calculateMinWallThickness(
                                  od,
                                  effectivePressure,
                                  materialCode,
                                  effectiveTemp,
                                  1.0,
                                  0,
                                  1.2,
                                )
                              : 0;
                          const eligibleSchedules = allSchedules
                            .filter((dim: any) => {
                              const rawWallThicknessMm7 = dim.wallThicknessMm;
                              const wt = rawWallThicknessMm7 || dim.wall_thickness_mm || 0;
                              return wt >= minimumWT;
                            })
                            .sort((a: any, b: any) => {
                              const rawWallThicknessMm8 = a.wallThicknessMm;
                              const wtA = rawWallThicknessMm8 || a.wall_thickness_mm || 0;
                              const rawWallThicknessMm9 = b.wallThicknessMm;
                              const wtB = rawWallThicknessMm9 || b.wall_thickness_mm || 0;
                              return wtA - wtB;
                            });
                          const recommendedSchedule =
                            eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;
                          if (eligibleSchedules.length === 0 && effectivePressure > 0) {
                            return (
                              <option disabled>
                                No schedules meet {minimumWT.toFixed(2)}mm min WT
                              </option>
                            );
                          }
                          if (allSchedules.length === 0) {
                            return <option disabled>No schedules available</option>;
                          }
                          return eligibleSchedules.map((dim: any) => {
                            const rawScheduleDesignation2 = dim.scheduleDesignation;
                            const scheduleValue =
                              rawScheduleDesignation2 ||
                              dim.schedule_designation ||
                              dim.scheduleNumber?.toString() ||
                              dim.schedule_number?.toString() ||
                              "Unknown";
                            const rawWallThicknessMm10 = dim.wallThicknessMm;
                            const wt = rawWallThicknessMm10 || dim.wall_thickness_mm || 0;
                            const isRecommended =
                              recommendedSchedule && dim.id === recommendedSchedule.id;
                            const label = isRecommended
                              ? `${scheduleValue} (${wt}mm) ★`
                              : `${scheduleValue} (${wt}mm)`;
                            return (
                              <option key={dim.id} value={scheduleValue}>
                                {label}
                              </option>
                            );
                          });
                        })()}
                      </>
                    )}
                  </select>
                  {/* Schedule validation warning */}
                  {(() => {
                    const rawMinimumWallThickness = entry.minimumWallThickness;
                    const minimumWT = rawMinimumWallThickness || 0;
                    const rawWallThicknessMm11 = specs.wallThicknessMm;
                    const selectedWT = rawWallThicknessMm11 || 0;
                    const hasSchedule = specs.scheduleNumber;

                    if (!hasSchedule || minimumWT <= 0) return null;
                    if (selectedWT >= minimumWT) return null;

                    const shortfall = minimumWT - selectedWT;
                    const rawSteelSpecificationId9 = specs.steelSpecificationId;
                    const fallbackEffectiveSpecId =
                      rawSteelSpecificationId9 || globalSpecs?.steelSpecificationId;

                    const rawSteelSpecName9 = masterData.steelSpecs?.find(
                      (s: SteelSpecItem) => s.id === fallbackEffectiveSpecId,
                    )?.steelSpecName;

                    const fallbackSpecName = rawSteelSpecName9 || "";
                    const allSchedules = scheduleListForSpec(
                      specs.nominalBoreMm,
                      fallbackEffectiveSpecId,
                      fallbackSpecName,
                    );
                    const eligibleSchedules = allSchedules
                      .filter((dim: any) => {
                        const rawWallThicknessMm12 = dim.wallThicknessMm;
                        return (rawWallThicknessMm12 || 0) >= minimumWT;
                      })
                      .sort((a: any, b: any) => {
                        const rawWallThicknessMm13 = a.wallThicknessMm;
                        const rawWallThicknessMm14 = b.wallThicknessMm;
                        return (rawWallThicknessMm13 || 0) - (rawWallThicknessMm14 || 0);
                      });
                    const recommendedSchedule = eligibleSchedules[0];

                    return (
                      <div className="mt-1 p-1.5 bg-red-50 border border-red-300 rounded text-xs">
                        <span className="text-red-600">
                          ⚠ {selectedWT.toFixed(2)}mm &lt; {minimumWT.toFixed(2)}mm min
                        </span>
                        {recommendedSchedule && (
                          <button
                            type="button"
                            onClick={() => {
                              const schedValue = recommendedSchedule.scheduleDesignation;
                              const updatedEntry: any = {
                                specs: {
                                  ...entry.specs,
                                  scheduleNumber: schedValue,
                                  wallThicknessMm: recommendedSchedule.wallThicknessMm,
                                },
                                isScheduleOverridden: false,
                              };
                              updatedEntry.description = generateItemDescription({
                                ...entry,
                                ...updatedEntry,
                              } as any);
                              onUpdateEntry(entry.id, updatedEntry);
                            }}
                            className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                          >
                            Use {recommendedSchedule.scheduleDesignation}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {errors[`pipe_${index}_schedule`] && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {errors[`pipe_${index}_schedule`]}
                    </p>
                  )}
                </div>

                {/* Pipe Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Pipe Type
                  </label>
                  <Select
                    id={`pipe-type-${entry.id}`}
                    value={rawPipeType || "plain"}
                    onChange={(value) => {
                      const newPipeType = value;
                      const rawPipeEndConfiguration3 = specs.pipeEndConfiguration;
                      const currentEndConfig = rawPipeEndConfiguration3 || "PE";
                      const isPuddleEndConfig =
                        currentEndConfig === "FOE" || currentEndConfig === "FBE";
                      const updatedSpecs: any = {
                        ...entry.specs,
                        pipeType: newPipeType,
                      };
                      if (newPipeType === "puddle" && !isPuddleEndConfig) {
                        updatedSpecs.pipeEndConfiguration = "FOE";
                      }
                      if (newPipeType === "spigot") {
                        updatedSpecs.pipeEndConfiguration = "FBE";
                      }
                      if (newPipeType !== "puddle") {
                        updatedSpecs.puddleFlangeOdMm = null;
                        updatedSpecs.puddleFlangePcdMm = null;
                        updatedSpecs.puddleFlangeHoleCount = null;
                        updatedSpecs.puddleFlangeHoleIdMm = null;
                        updatedSpecs.puddleFlangeThicknessMm = null;
                        updatedSpecs.puddleFlangeLocationMm = null;
                      }
                      onUpdateEntry(entry.id, { specs: updatedSpecs });
                      // For plain pipes, open the Config dropdown next
                      if (newPipeType === "plain") {
                        setTimeout(() => {
                          const configSelectId = `pipe-config-${entry.id}`;
                          const configElement = document.getElementById(configSelectId);
                          if (configElement) {
                            configElement.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }, 150);
                      }
                      // For spigot pipes, open the Spigot Steel Spec dropdown next
                      if (newPipeType === "spigot") {
                        setTimeout(() => {
                          const spigotSteelSelectId = `spigot-steel-spec-${entry.id}`;
                          const spigotSteelElement = document.getElementById(spigotSteelSelectId);
                          if (spigotSteelElement) {
                            spigotSteelElement.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }, 150);
                      }
                    }}
                    options={[
                      { value: "plain", label: "Plain Pipe" },
                      { value: "spigot", label: "Spigot Pipe" },
                      { value: "puddle", label: "Puddle Pipe" },
                    ]}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>

                {/* Weld Thickness Display */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Flange Weld WT
                    <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                      (Auto)
                    </span>
                    <span
                      className="ml-1 text-gray-400 font-normal cursor-help"
                      title="For ASTM/ASME specs: Uses fitting class wall thickness (STD/XH/XXH based on schedule). For SABS 719: Uses pipe wall thickness. Rounded to nearest 0.5mm for WPS matching."
                    >
                      ?
                    </span>
                  </label>
                  {(() => {
                    const rawPipeEndConfiguration4 = specs.pipeEndConfiguration;
                    const weldCount = getWeldCountPerPipe(rawPipeEndConfiguration4 || "PE");
                    const dn = specs.nominalBoreMm;
                    const rawScheduleNumber2 = specs.scheduleNumber;
                    const schedule = rawScheduleNumber2 || "";
                    const rawSteelSpecificationId10 = specs.steelSpecificationId;
                    const steelSpecId =
                      rawSteelSpecificationId10 || globalSpecs?.steelSpecificationId;
                    const isSABS719 = steelSpecId === 8;
                    const pipeWallThickness = specs.wallThicknessMm;

                    if (weldCount === 0) {
                      return (
                        <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400">
                          No welds (PE)
                        </div>
                      );
                    }

                    if (!dn || !pipeWallThickness) {
                      return (
                        <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400">
                          Select NB first
                        </div>
                      );
                    }

                    let effectiveWeldThickness: number | null = null;
                    let fittingClass: "STD" | "XH" | "XXH" | "" = "STD";
                    const usingPipeThickness = isSABS719 || !dn || dn > 300;

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
                      ? `SABS 719 ERW - pipe WT (${schedule || "WT"})`
                      : !fittingClass || usingPipeThickness
                        ? `Pipe WT (${schedule || "WT"})`
                        : `${fittingClass} fitting class`;

                    return (
                      <div>
                        <div className="px-2 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 rounded text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          {effectiveWeldThickness?.toFixed(2)} mm
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{descText}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Spigot Configuration - Only for Spigot Pipe */}
            {specs.pipeType === "spigot" && (
              <SpigotConfigurationSection
                entryId={entry.id}
                spigotSteelSpecificationId={specs.spigotSteelSpecificationId}
                numberOfSpigots={rawNumberOfSpigots || 2}
                spigotNominalBoreMm={specs.spigotNominalBoreMm}
                spigotDistanceFromEndMm={specs.spigotDistanceFromEndMm}
                spigotHeightMm={specs.spigotHeightMm}
                mainPipeSteelSpecificationId={specs.steelSpecificationId}
                mainPipeNominalBoreMm={specs.nominalBoreMm}
                globalSteelSpecificationId={globalSpecs?.steelSpecificationId}
                steelSpecs={rawSteelSpecs2 || []}
                nominalBores={nominalBores}
                groupedSteelOptions={groupedSteelOptions}
                onSpigotSteelSpecChange={handleSpigotSteelSpecChange}
                onNumberOfSpigots={handleNumberOfSpigots}
                onSpigotNominalBoreChange={handleSpigotNominalBoreChange}
                onSpigotDistanceChange={handleSpigotDistanceChange}
                onSpigotHeightChange={handleSpigotHeightChange}
              />
            )}

            {/* Plain Pipe, Spigot Pipe, and Puddle Pipe sections */}
            {(!specs.pipeType ||
              entry.specs.pipeType === "plain" ||
              entry.specs.pipeType === "spigot" ||
              entry.specs.pipeType === "puddle") && (
              <>
                {/* Flange Specification - Third Box (Amber) */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-2 mt-2">
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-900 mb-1">
                    Flange Specification
                  </h4>
                  <PipeEndConfigSection
                    entryId={entry.id}
                    entry={entry}
                    specs={specs}
                    globalSpecs={globalSpecs}
                    masterData={masterData}
                    pressureClassesByStandard={pressureClassesByStandard}
                    allFlangeTypes={allFlangeTypes}
                    generateItemDescription={generateItemDescription}
                    onUpdateEntry={onUpdateEntry}
                    onLoadPressureClasses={getFilteredPressureClasses}
                  />
                  {/* Warning for pressure override - only show if actual pressure rating differs, not just flange type */}
                  {(() => {
                    const currentClassId = specs.flangePressureClassId;
                    const recommendedClassId = globalSpecs?.flangePressureClassId;
                    if (
                      currentClassId &&
                      recommendedClassId &&
                      currentClassId !== recommendedClassId
                    ) {
                      const currentClass = masterData.pressureClasses?.find(
                        (p: PressureClassItem) => p.id === currentClassId,
                      );
                      const recommendedClass = masterData.pressureClasses?.find(
                        (p: PressureClassItem) => p.id === recommendedClassId,
                      );
                      const currentBasePressure =
                        currentClass?.designation?.replace(/\/\d+$/, "") || "";
                      const recommendedBasePressure =
                        recommendedClass?.designation?.replace(/\/\d+$/, "") || "";
                      if (currentBasePressure === recommendedBasePressure) {
                        return null;
                      }
                      return (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:text-red-800">
                          <span className="font-medium">Warning:</span> Using {currentBasePressure}{" "}
                          instead of recommended {recommendedBasePressure}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Spigot Flange Configuration - Only shown for Spigot Pipe */}
                  {specs.pipeType === "spigot" &&
                    specs.numberOfSpigots &&
                    specs.numberOfSpigots >= 2 && (
                      <div className="mt-2 pt-2 border-t border-amber-300">
                        <h5 className="text-xs font-semibold text-teal-700 mb-1">
                          Spigot Flange Configuration
                        </h5>
                        <SpigotFlangeSection
                          entryId={entry.id}
                          entry={entry}
                          specs={specs}
                          globalSpecs={globalSpecs}
                          masterData={masterData}
                          pressureClassesByStandard={pressureClassesByStandard}
                          allFlangeTypes={allFlangeTypes}
                          onUpdateEntry={onUpdateEntry}
                        />
                      </div>
                    )}

                  {/* Puddle Flange Dims - Only shown for Puddle Pipe */}
                  {specs.pipeType === "puddle" && (
                    <div className="mt-2 pt-2 border-t border-amber-300">
                      <h5 className="text-xs font-semibold text-amber-700 mb-1">
                        Puddle Flange Dims
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {/* Flange OD */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Flange OD (mm)
                          </label>
                          <input
                            id={`puddle-od-${entry.id}`}
                            type="number"
                            value={rawPuddleFlangeOdMm || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangeOdMm: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 200"
                            min="0"
                          />
                        </div>

                        {/* PCD */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            PCD (mm)
                          </label>
                          <input
                            type="number"
                            value={rawPuddleFlangePcdMm || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangePcdMm: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 160"
                            min="0"
                          />
                        </div>

                        {/* No of Holes */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            No of Holes
                          </label>
                          <input
                            type="number"
                            value={rawPuddleFlangeHoleCount || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangeHoleCount: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 4"
                            min="0"
                          />
                        </div>

                        {/* Hole ID */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Hole ID (mm)
                          </label>
                          <input
                            type="number"
                            value={rawPuddleFlangeHoleIdMm || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangeHoleIdMm: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 18"
                            min="0"
                          />
                        </div>

                        {/* Flange Thickness */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Flange Thk (mm)
                          </label>
                          <input
                            type="number"
                            value={rawPuddleFlangeThicknessMm || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangeThicknessMm: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 12"
                            min="0"
                          />
                        </div>

                        {/* Location from Flange Face */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Loc. from Face (mm)
                          </label>
                          <input
                            type="number"
                            value={rawPuddleFlangeLocationMm || ""}
                            onChange={(e) => {
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  puddleFlangeLocationMm: parseInt(e.target.value, 10) || null,
                                },
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-900 bg-white"
                            placeholder="e.g. 500"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity & Lengths - Blue Box */}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-2 mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-end">
                    {/* Pipe Length */}
                    {(() => {
                      const isMissingForPreview =
                        specs.nominalBoreMm && !specs.individualPipeLength;
                      const rawIndividualPipeLength3 = entry.specs.individualPipeLength;
                      return (
                        <div
                          data-nix-target="pipe-length-input"
                          className={
                            isMissingForPreview
                              ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50"
                              : ""
                          }
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <label
                              className={`text-xs font-semibold ${isMissingForPreview ? "text-red-700" : "text-gray-900 dark:text-gray-100"}`}
                            >
                              Pipe Length (m){" "}
                              {isMissingForPreview && (
                                <span className="text-red-600 font-bold">
                                  ⚠ Required for preview
                                </span>
                              )}
                            </label>
                            <div className="flex gap-1">
                              {(specs.pipeType === "puddle"
                                ? PUDDLE_PIPE_LENGTHS_M
                                : STANDARD_PIPE_LENGTHS_M
                              ).map((pl) => (
                                <button
                                  key={pl.value}
                                  type="button"
                                  title={pl.description}
                                  onClick={() => {
                                    const rawQuantityValue5 = entry.specs.quantityValue;
                                    const rawQuantityValue6 = entry.specs.quantityValue;
                                    const numPipes =
                                      entry.specs.quantityType === "number_of_pipes"
                                        ? rawQuantityValue5 || 1
                                        : Math.ceil((rawQuantityValue6 || pl.value) / pl.value);
                                    const updatedEntry = {
                                      ...entry,
                                      specs: { ...entry.specs, individualPipeLength: pl.value },
                                    };
                                    const newDescription = generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, {
                                      specs: { ...entry.specs, individualPipeLength: pl.value },
                                      calculatedPipes: numPipes,
                                      description: newDescription,
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 text-xs rounded border ${entry.specs.individualPipeLength && Math.abs(entry.specs.individualPipeLength - pl.value) < 0.001 ? "bg-blue-200 dark:bg-blue-700 border-blue-400 dark:border-blue-500 font-medium text-blue-900 dark:text-blue-100" : "bg-white dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/40 border-blue-300 dark:border-blue-600 text-gray-700 dark:text-gray-300"}`}
                                >
                                  {pl.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <input
                            id={`pipe-length-${entry.id}`}
                            type="number"
                            step="0.001"
                            value={rawIndividualPipeLength3 || ""}
                            onChange={(e) => {
                              const pipeLength = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                              const rawQuantityValue7 = entry.specs.quantityValue;
                              const rawQuantityValue8 = entry.specs.quantityValue;
                              const numPipes =
                                pipeLength && entry.specs.quantityType === "number_of_pipes"
                                  ? rawQuantityValue7 || 1
                                  : pipeLength
                                    ? Math.ceil((rawQuantityValue8 || pipeLength) / pipeLength)
                                    : undefined;
                              const updatedEntry = {
                                ...entry,
                                specs: { ...entry.specs, individualPipeLength: pipeLength },
                              };
                              const newDescription = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, individualPipeLength: pipeLength },
                                calculatedPipes: numPipes,
                                description: newDescription,
                              });
                            }}
                            className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-blue-900/20"
                            placeholder="Custom length"
                          />
                        </div>
                      );
                    })()}

                    {/* Total Length or Closure Length (when L/F selected) */}
                    {hasLooseFlange(rawPipeEndConfiguration8 || "") ? (
                      <div>
                        <ClosureLengthSelector
                          nominalBore={rawNominalBoreMm || 100}
                          currentValue={rawClosureLengthMm || null}
                          wallThickness={rawWallThicknessMm15 || 5}
                          onUpdate={(closureLength) =>
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, closureLengthMm: closureLength },
                            })
                          }
                          error={errors[`pipe_${index}_closure_length`]}
                          variant="compact"
                          showTackWeldInfo={false}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          Total Line (m)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={totalLineDisplayValue}
                          onChange={(e) => {
                            const totalLength = Number(e.target.value);
                            const updatedEntry = calculateQuantities(
                              entry,
                              "totalLength",
                              totalLength,
                            );
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-blue-900/20"
                          placeholder="Total length"
                          required
                        />
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="relative" data-nix-target="pipe-quantity-input">
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Qty (Each){" "}
                        {isUnregisteredCustomer && (
                          <span className="text-gray-400 font-normal">(fixed)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={isUnregisteredCustomer ? MAX_QUANTITY_UNREGISTERED : undefined}
                        value={qtyEachDisplayValue}
                        onChange={(e) => {
                          if (isUnregisteredCustomer) {
                            const rect = e.target.getBoundingClientRect();
                            setQuantityLimitPopup({
                              x: rect.left + rect.width / 2,
                              y: rect.bottom,
                            });
                            return;
                          }
                          const rawValue = e.target.value;
                          if (rawValue === "") {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, quantityValue: undefined },
                            });
                            return;
                          }
                          const numberOfPipes = Number(rawValue);
                          const updatedEntry = calculateQuantities(
                            entry,
                            "numberOfPipes",
                            numberOfPipes,
                          );
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "" || Number(e.target.value) < 1) {
                            const updatedEntry = calculateQuantities(entry, "numberOfPipes", 1);
                            onUpdateEntry(entry.id, updatedEntry);
                          }
                        }}
                        className={`w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 ${isUnregisteredCustomer ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-900/20"}`}
                        placeholder="Number of pipes"
                        required
                        readOnly={isUnregisteredCustomer}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        }
        previewContent={
          isUnregisteredCustomer && onShowRestrictionPopup ? (
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
          ) : Pipe3DPreview ? (
            (() => {
              const canRenderPreview = specs.nominalBoreMm && specs.individualPipeLength;
              if (!canRenderPreview) {
                return (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                    Select nominal bore and pipe length to see 3D preview
                  </div>
                );
              }
              const rawFlangeStandardId11 = specs.flangeStandardId;
              const flangeStandardId = rawFlangeStandardId11 || globalSpecs?.flangeStandardId;
              const rawFlangePressureClassId6 = specs.flangePressureClassId;
              const flangePressureClassId =
                rawFlangePressureClassId6 || globalSpecs?.flangePressureClassId;
              const flangeStandard = masterData.flangeStandards?.find(
                (s: FlangeStandardItem) => s.id === flangeStandardId,
              );
              const pressureClass = masterData.pressureClasses?.find(
                (p: PressureClassItem) => p.id === flangePressureClassId,
              );
              const rawFlangeTypeCode8 = specs.flangeTypeCode;
              const flangeTypeCode = rawFlangeTypeCode8 || globalSpecs?.flangeTypeCode;
              const flangeStandardName =
                flangeStandard?.code === "SABS_1123"
                  ? "SABS 1123"
                  : flangeStandard?.code === "BS_4504"
                    ? "BS 4504"
                    : flangeStandard?.code?.replace(/_/g, " ") || "";
              const rawDesignation2 = pressureClass?.designation;
              const pressureClassDesignation = rawDesignation2 || "";
              const rawIndividualPipeLength4 = entry.specs.individualPipeLength;
              const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
              const rawWallThicknessMm16 = entry.calculation?.wallThicknessMm;
              const rawPipeEndConfiguration9 = entry.specs.pipeEndConfiguration;
              const rawPressureClassDesignation = globalSpecs?.pressureClassDesignation;
              return (
                <div data-nix-target="pipe-3d-preview" className="h-full">
                  <Pipe3DPreview
                    length={rawIndividualPipeLength4 || DEFAULT_PIPE_LENGTH_M}
                    outerDiameter={rawOutsideDiameterMm || entry.specs.nominalBoreMm * 1.1}
                    wallThickness={rawWallThicknessMm16 || entry.specs.wallThicknessMm || 5}
                    endConfiguration={rawPipeEndConfiguration9 || "PE"}
                    materialName={
                      masterData.steelSpecs?.find((s: SteelSpecItem) => {
                        const rawSteelSpecificationId11 = specs.steelSpecificationId;

                        return (
                          s.id === (rawSteelSpecificationId11 || globalSpecs?.steelSpecificationId)
                        );
                      })?.steelSpecName
                    }
                    nominalBoreMm={entry.specs.nominalBoreMm}
                    pressureClass={rawPressureClassDesignation || "PN16"}
                    addBlankFlange={specs.addBlankFlange}
                    blankFlangePositions={specs.blankFlangePositions}
                    savedCameraPosition={specs.savedCameraPosition}
                    savedCameraTarget={specs.savedCameraTarget}
                    onCameraChange={(
                      position: [number, number, number],
                      target: [number, number, number],
                    ) => {
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
                    pipeType={specs.pipeType}
                    numberOfSpigots={specs.numberOfSpigots}
                    spigotNominalBoreMm={specs.spigotNominalBoreMm}
                    spigotDistanceFromEndMm={specs.spigotDistanceFromEndMm}
                    spigotHeightMm={specs.spigotHeightMm}
                    individualPipeLengthM={specs.individualPipeLength}
                    spigotFlangeConfig={specs.spigotFlangeConfig}
                    spigotBlankFlanges={specs.spigotBlankFlanges}
                    puddleFlangeOdMm={specs.puddleFlangeOdMm}
                    puddleFlangePcdMm={specs.puddleFlangePcdMm}
                    puddleFlangeHoleCount={specs.puddleFlangeHoleCount}
                    puddleFlangeHoleIdMm={specs.puddleFlangeHoleIdMm}
                    puddleFlangeThicknessMm={specs.puddleFlangeThicknessMm}
                    puddleFlangeLocationMm={specs.puddleFlangeLocationMm}
                  />
                </div>
              );
            })()
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
              3D preview hidden. Use the toggle above to show drawings.
            </div>
          )
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
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
                >
                  <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">Qty Pipes</p>
                    <p className="text-base font-bold text-blue-900">
                      {entry.calculation.calculatedPipeCount}{" "}
                      <span className="text-xs font-normal">pieces</span>
                    </p>
                    <p className="text-xs text-blue-800 font-medium mt-1">Total Length</p>
                    <p className="text-base font-bold text-blue-900">
                      {entry.calculation.calculatedTotalLength?.toFixed(1)}m
                    </p>
                  </div>

                  <PipeWeightWeldSummary
                    entry={entry}
                    specs={specs}
                    globalSpecs={globalSpecs}
                    masterData={masterData}
                    flangeResolution={flangeResolution}
                    allWeights={allWeights}
                    allRetainingRings={allRetainingRings}
                    nbToOdMap={nbToOdMap}
                    showSurfaceProtection={showSurfaceProtection}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                <p className="text-sm text-gray-600 text-center">
                  Fill in pipe specifications to see calculated results
                </p>
              </div>
            )}
          </div>
        }
      />
      {/* Item Action Buttons */}
      <div className="mt-4 flex justify-end gap-2">
        {onDuplicateEntry && (
          <button
            onClick={() => onDuplicateEntry(entry, index)}
            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-sm font-medium border border-blue-300 rounded-md transition-colors"
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
      {/* Smart Notes Dropdown */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <label className="block text-xs font-semibold text-gray-900 mb-2">
          Additional Notes & Requirements
        </label>
        <SmartNotesDropdown
          selectedNotes={rawSelectedNotes || []}
          onNotesChange={(notes) =>
            onUpdateEntry(entry.id, {
              selectedNotes: notes,
              notes: formatNotesForDisplay(notes),
            })
          }
          placeholder="Select quality/inspection requirements..."
        />
      </div>
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

const StraightPipeForm = memo(StraightPipeFormComponent);
export default StraightPipeForm;
