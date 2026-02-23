"use client";

import Link from "next/link";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  BS_4504_PRESSURE_CLASSES,
  DEFAULT_PIPE_LENGTH_M,
  FITTING_CLASS_WALL_THICKNESS,
  closureWeight as getClosureWeight,
  flangeWeldCountPerPipe as getFlangeWeldCountPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  getScheduleListForSpec,
  tackWeldEndsPerPipe as getTackWeldEndsPerPipe,
  tackWeldWeight as getTackWeldWeight,
  weldCountPerPipe as getWeldCountPerPipe,
  hasLooseFlange,
  isSabs62Spec,
  isSabs719Spec,
  PIPE_END_OPTIONS,
  PRESSURE_CALC_CORROSION_ALLOWANCE,
  PRESSURE_CALC_JOINT_EFFICIENCY,
  PRESSURE_CALC_SAFETY_FACTOR,
  PUDDLE_PIPE_LENGTHS_M,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  SABS_1123_PRESSURE_CLASSES,
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  STANDARD_PIPE_LENGTHS_M,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import {
  BS_4504_FLANGE_TYPES,
  blankFlangeWeightSync as getBlankFlangeWeight,
  flangeWeightSync as getFlangeWeight,
  NB_TO_OD_LOOKUP,
  retainingRingWeightSync as retainingRingWeight,
  SABS_1123_FLANGE_TYPES,
  sansBlankFlangeWeightSync as sansBlankFlangeWeight,
} from "@/app/lib/hooks/useFlangeWeights";
import { log } from "@/app/lib/logger";
import {
  calculateFlangeWeldVolume,
  calculateInsideDiameter,
  calculateMinWallThickness,
  calculateTotalSurfaceArea,
  findRecommendedSchedule,
} from "@/app/lib/utils/pipeCalculations";
import { validatePressureClass } from "@/app/lib/utils/pressureClassValidation";
import { groupSteelSpecifications, isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";
import { getPipeEndConfigurationDetails } from "@/app/lib/utils/systemUtils";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";

const formatWeight = (weight: number | undefined) => {
  if (weight === undefined || weight === null || Number.isNaN(weight)) return "Not calculated";
  return `${weight.toFixed(2)} kg`;
};

const extractBarRating = (designation: string, isSabs1123: boolean, isBs4504: boolean): number => {
  const pnMatch = designation.match(/PN\s*(\d+)/i);
  if (pnMatch) {
    return parseInt(pnMatch[1], 10);
  }
  if (isSabs1123) {
    const kpaMatch = designation.match(/^(\d+)/);
    if (kpaMatch) {
      return parseInt(kpaMatch[1], 10) / 100;
    }
  }
  if (isBs4504) {
    const numMatch = designation.match(/^(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
  }
  const numMatch = designation.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num >= 500 ? num / 100 : num;
  }
  return 0;
};

const findRecommendedPressureClass = (
  availableClasses: any[],
  workingPressure: number,
  isSabs1123: boolean,
  isBs4504: boolean,
): number | undefined => {
  if (!workingPressure || availableClasses.length === 0) return undefined;

  const classesWithRating = availableClasses
    .map((pc: any) => ({
      ...pc,
      barRating: extractBarRating(pc.designation || "", isSabs1123, isBs4504),
    }))
    .filter((pc: any) => pc.barRating > 0)
    .sort((a: any, b: any) => a.barRating - b.barRating);

  const suitableClass = classesWithRating.find((pc: any) => pc.barRating >= workingPressure);
  return suitableClass?.id;
};

const calculateQuantities = (entry: any, field: string, value: number) => {
  const pipeLength = entry.specs?.individualPipeLength || DEFAULT_PIPE_LENGTH_M;

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
  globalSpecs: any;
  masterData: any;
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
    type: "fittings" | "itemLimit" | "quantityLimit" | "drawings",
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

  const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
  const flangePressureClassId =
    entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
  const nominalBoreMm = entry.specs?.nominalBoreMm;
  const pipeEndConfiguration = entry.specs?.pipeEndConfiguration || "PE";
  const hasFlanges = pipeEndConfiguration !== "PE";

  const groupedSteelOptions = useMemo(
    () => (masterData?.steelSpecs ? groupSteelSpecifications(masterData.steelSpecs) : []),
    [masterData?.steelSpecs],
  );

  const flangeTypesLength = masterData?.flangeTypes?.length ?? 0;

  const handleWorkingPressureChange = useCallback(
    (value: number | undefined) => {
      const flangeStandard = masterData.flangeStandards?.find(
        (s: any) => s.id === flangeStandardId,
      );
      const flangeCode = flangeStandard?.code || "";
      const isSabs1123 = flangeCode.includes("SABS 1123") || flangeCode.includes("SANS 1123");
      const isBs4504 = flangeCode.includes("BS 4504");

      if (flangeStandardId && !pressureClassesByStandard[flangeStandardId]) {
        getFilteredPressureClasses(flangeStandardId);
      }

      let availableClasses = flangeStandardId
        ? pressureClassesByStandard[flangeStandardId] || []
        : [];
      if (availableClasses.length === 0) {
        availableClasses =
          masterData.pressureClasses?.filter(
            (pc: any) =>
              pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId,
          ) || [];
      }

      const recommendedPressureClassId = value
        ? findRecommendedPressureClass(availableClasses, value, isSabs1123, isBs4504) ||
          entry.specs?.flangePressureClassId
        : entry.specs?.flangePressureClassId;

      const endConfig = entry.specs?.pipeEndConfiguration || "PE";
      const effectiveFlangeTypeCode =
        entry.specs?.flangeTypeCode ||
        globalSpecs?.flangeTypeCode ||
        recommendedFlangeTypeCode(endConfig);

      onUpdateEntry(entry.id, {
        specs: {
          ...entry.specs,
          workingPressureBar: value,
          flangePressureClassId: recommendedPressureClassId,
          flangeTypeCode: effectiveFlangeTypeCode,
        },
      });
    },
    [
      entry.id,
      entry.specs,
      flangeStandardId,
      globalSpecs?.flangeTypeCode,
      masterData.flangeStandards,
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

      const steelSpecId =
        entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
      const steelSpecName =
        masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName || "";
      const pressure = globalSpecs?.workingPressureBar || 0;
      const temperature = globalSpecs?.workingTemperatureC || 20;

      const nbEffectiveSpecId =
        entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
      const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId, steelSpecName);

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
          const od = NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05;
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
        minimumSchedule: matchedSchedule,
        minimumWallThickness: minWT,
        isScheduleOverridden: false,
        specs: {
          ...entry.specs,
          nominalBoreMm: nominalBore,
          scheduleNumber: matchedSchedule,
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
      const fallbackEffectiveSpecId =
        entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
      const fallbackSpecName =
        masterData.steelSpecs?.find((s: any) => s.id === fallbackEffectiveSpecId)?.steelSpecName ||
        "";
      const fallbackSchedules = getScheduleListForSpec(
        entry.specs?.nominalBoreMm,
        fallbackEffectiveSpecId,
        fallbackSpecName,
      );
      const mapSchedules = availableSchedulesMap[entry.id] || [];
      const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
      const selectedDimension = availableSchedules.find((dim: any) => {
        const schedName =
          dim.scheduleDesignation ||
          dim.schedule_designation ||
          dim.scheduleNumber?.toString() ||
          dim.schedule_number?.toString();
        return schedName === newSchedule;
      });
      const autoWallThickness =
        selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;
      const updatedEntry: any = {
        specs: {
          ...entry.specs,
          scheduleNumber: newSchedule,
          wallThicknessMm: autoWallThickness || entry.specs?.wallThicknessMm,
        },
        isScheduleOverridden: newSchedule !== entry.minimumSchedule,
      };
      updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
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

      const flangeType = masterData?.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode);
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

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="straight_pipe"
        showSplitToggle={entry.specs?.nominalBoreMm}
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
                value={entry.description || generateItemDescription(entry)}
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
                  {!entry.specs?.workingPressureBar && !entry.specs?.workingTemperatureC && (
                    <span className="ml-2 text-xs font-normal text-blue-600">
                      (From Specs Page)
                    </span>
                  )}
                  {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
                    <span className="ml-2 text-xs font-normal text-blue-600">(Override)</span>
                  )}
                </h4>
                {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
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
                    value={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || ""}
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
                    value={
                      entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC || ""
                    }
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
                  {(() => {
                    const globalSpecId = globalSpecs?.steelSpecificationId;
                    const effectiveSpecId = entry.specs?.steelSpecificationId || globalSpecId;
                    const isSteelFromGlobal = globalSpecId && effectiveSpecId === globalSpecId;
                    const isSteelOverride = globalSpecId && effectiveSpecId !== globalSpecId;
                    const selectId = `pipe-steel-spec-wc-${entry.id}`;
                    const globalSelectClass =
                      "w-full px-2 py-1.5 border-2 border-green-500 dark:border-lime-400 rounded text-xs";
                    const overrideSelectClass =
                      "w-full px-2 py-1.5 border-2 border-orange-500 dark:border-orange-400 rounded text-xs";
                    const defaultSelectClass =
                      "w-full px-2 py-1.5 border border-gray-300 rounded text-xs";

                    return (
                      <>
                        <label
                          htmlFor={selectId}
                          className="block text-xs font-semibold text-gray-900 mb-1"
                        >
                          Steel Specification *
                          {isSteelFromGlobal && (
                            <span className="text-green-600 text-xs ml-1 font-normal">
                              (From Specs Page)
                            </span>
                          )}
                          {isSteelOverride && (
                            <span className="text-orange-600 text-xs ml-1 font-normal">
                              (Override)
                            </span>
                          )}
                        </label>
                        <Select
                          id={selectId}
                          value={String(effectiveSpecId || "")}
                          className={
                            isSteelFromGlobal
                              ? globalSelectClass
                              : isSteelOverride
                                ? overrideSelectClass
                                : defaultSelectClass
                          }
                          onChange={(value) => {
                            const specId = value ? Number(value) : undefined;
                            const nominalBore = entry.specs?.nominalBoreMm;

                            if (!specId || !nominalBore) {
                              const newSpecName = specId
                                ? masterData.steelSpecs?.find((s: any) => s.id === specId)
                                    ?.steelSpecName || ""
                                : "";
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  steelSpecificationId: specId,
                                  ...(isApi5LSpec(newSpecName)
                                    ? {}
                                    : {
                                        pslLevel: null,
                                        cvnTestTemperatureC: null,
                                        cvnAverageJoules: null,
                                        cvnMinimumJoules: null,
                                        heatNumber: null,
                                        mtcReference: null,
                                      }),
                                },
                              });
                              return;
                            }

                            const specName =
                              masterData.steelSpecs?.find((s: any) => s.id === specId)
                                ?.steelSpecName || "";
                            const schedules = getScheduleListForSpec(nominalBore, specId, specName);
                            const pressure = globalSpecs?.workingPressureBar || 0;
                            const temperature = globalSpecs?.workingTemperatureC || 20;

                            let matchedSchedule: string | undefined;
                            let matchedWT: number | undefined;

                            if (pressure > 0 && schedules.length > 0) {
                              const od = NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05;
                              const minWT = calculateMinWallThickness(od, pressure, temperature);

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

                            const updatedEntry: any = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                steelSpecificationId: specId,
                                scheduleNumber: matchedSchedule,
                                wallThicknessMm: matchedWT,
                                ...(isApi5LSpec(specName)
                                  ? {}
                                  : {
                                      pslLevel: null,
                                      cvnTestTemperatureC: null,
                                      cvnAverageJoules: null,
                                      cvnMinimumJoules: null,
                                      heatNumber: null,
                                      mtcReference: null,
                                    }),
                              },
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          options={[]}
                          groupedOptions={groupedSteelOptions}
                          placeholder="Select steel spec..."
                          aria-required={true}
                          aria-invalid={!!errors[`pipe_${index}_steel_spec`]}
                        />
                        {errors[`pipe_${index}_steel_spec`] && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {errors[`pipe_${index}_steel_spec`]}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <MaterialSuitabilityWarning
                color="blue"
                steelSpecName={(() => {
                  const steelSpecId =
                    entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  return (
                    masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName ||
                    ""
                  );
                })()}
                effectivePressure={
                  entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar
                }
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
              {/* PSL Level and CVN Fields - Only for API 5L specs */}
              {(() => {
                const steelSpecId =
                  entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                const steelSpecName =
                  masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName ||
                  "";
                const showPslFields = isApi5LSpec(steelSpecName);
                const pslLevel = entry.specs?.pslLevel;
                const showCvnFields = pslLevel === "PSL2";

                if (!showPslFields) return null;

                return (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                    <h5 className="text-xs font-semibold text-amber-800 mb-2">
                      API 5L Specification Level
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          PSL Level *
                        </label>
                        <select
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                          value={pslLevel || ""}
                          onChange={(e) => {
                            const newPslLevel = e.target.value || null;
                            const updates: any = {
                              specs: {
                                ...entry.specs,
                                pslLevel: newPslLevel,
                              },
                            };
                            if (newPslLevel !== "PSL2") {
                              updates.specs.cvnTestTemperatureC = null;
                              updates.specs.cvnAverageJoules = null;
                              updates.specs.cvnMinimumJoules = null;
                            }
                            onUpdateEntry(entry.id, updates);
                          }}
                        >
                          <option value="">Select PSL level...</option>
                          <option value="PSL1">PSL1 - Standard</option>
                          <option value="PSL2">PSL2 - Enhanced (with CVN testing)</option>
                        </select>
                      </div>
                      {showCvnFields && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              CVN Test Temp (°C) *
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                              value={entry.specs?.cvnTestTemperatureC ?? ""}
                              onChange={(e) =>
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    cvnTestTemperatureC: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  },
                                })
                              }
                              placeholder="-46"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              CVN Avg (J) *
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                              value={entry.specs?.cvnAverageJoules ?? ""}
                              onChange={(e) =>
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    cvnAverageJoules: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  },
                                })
                              }
                              placeholder="27"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              CVN Min (J) *
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                              value={entry.specs?.cvnMinimumJoules ?? ""}
                              onChange={(e) =>
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    cvnMinimumJoules: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  },
                                })
                              }
                              placeholder="20"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    {/* PSL2 CVN Validation Warning */}
                    {showCvnFields &&
                      (entry.specs?.cvnTestTemperatureC === null ||
                        entry.specs?.cvnTestTemperatureC === undefined ||
                        entry.specs?.cvnAverageJoules === null ||
                        entry.specs?.cvnAverageJoules === undefined ||
                        entry.specs?.cvnMinimumJoules === null ||
                        entry.specs?.cvnMinimumJoules === undefined) && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          PSL2 requires all CVN test data (temperature, average, and minimum values)
                        </div>
                      )}
                    {/* Traceability fields */}
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <h5 className="text-xs font-semibold text-amber-800 mb-2">
                        Traceability (Optional)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Heat Number
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            value={entry.specs?.heatNumber || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  heatNumber: e.target.value || null,
                                },
                              })
                            }
                            placeholder="Enter heat number"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            MTC Reference
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            value={entry.specs?.mtcReference || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  mtcReference: e.target.value || null,
                                },
                              })
                            }
                            placeholder="Enter MTC reference"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Lot Number
                          </label>
                          <input
                            type="text"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            value={entry.specs?.lotNumber || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  lotNumber: e.target.value || null,
                                },
                              })
                            }
                            placeholder="Enter lot number"
                          />
                        </div>
                      </div>
                    </div>
                    {/* NACE/Sour Service Compliance */}
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <h5 className="text-xs font-semibold text-amber-800 mb-2">
                        NACE/Sour Service Compliance (Optional)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`nace-compliant-${entry.id}`}
                            checked={entry.specs?.naceCompliant || false}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  naceCompliant: e.target.checked || null,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <label
                            htmlFor={`nace-compliant-${entry.id}`}
                            className="text-xs font-medium text-gray-700"
                          >
                            NACE MR0175 Compliant
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            H2S Zone
                          </label>
                          <select
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            value={entry.specs?.h2sZone || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  h2sZone: e.target.value ? Number(e.target.value) : null,
                                },
                              })
                            }
                          >
                            <option value="">Not specified</option>
                            <option value="1">Zone 1 (Severe)</option>
                            <option value="2">Zone 2 (Moderate)</option>
                            <option value="3">Zone 3 (Mild)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Max Hardness (HRC)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            max="70"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            value={entry.specs?.maxHardnessHrc ?? ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  maxHardnessHrc: e.target.value ? Number(e.target.value) : null,
                                },
                              })
                            }
                            placeholder="≤22 for sour"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`ssc-tested-${entry.id}`}
                            checked={entry.specs?.sscTested || false}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  sscTested: e.target.checked || null,
                                },
                              })
                            }
                            className="w-4 h-4"
                          />
                          <label
                            htmlFor={`ssc-tested-${entry.id}`}
                            className="text-xs font-medium text-gray-700"
                          >
                            SSC Tested
                          </label>
                        </div>
                      </div>
                      {/* Sour service validation warning */}
                      {entry.specs?.naceCompliant &&
                        entry.specs?.maxHardnessHrc &&
                        entry.specs.maxHardnessHrc > 22 && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            Sour service materials require hardness ≤22 HRC per NACE MR0175
                          </div>
                        )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Material & Dimensions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
              <h4 className="text-xs font-semibold text-gray-800 mb-1">Material & Dimensions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {/* Nominal Bore - moved from Working Conditions */}
                {(() => {
                  const isMissingForPreview =
                    entry.specs?.individualPipeLength && !entry.specs?.nominalBoreMm;
                  const effectiveSpecId =
                    entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  const steelSpecName =
                    masterData.steelSpecs?.find((s: any) => s.id === effectiveSpecId)
                      ?.steelSpecName || "";
                  const hasItemOverride = !!entry.specs?.steelSpecificationId;

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
                    {entry.specs?.scheduleNumber && (
                      <span className="ml-1 text-green-600 text-xs">
                        ({entry.specs.wallThicknessMm?.toFixed(2)}mm)
                      </span>
                    )}
                  </label>
                  <select
                    value={entry.specs?.scheduleNumber || ""}
                    onChange={(e) => handleScheduleChange(e.target.value)}
                    disabled={!entry.specs?.nominalBoreMm}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {!entry.specs?.nominalBoreMm ? (
                      <option value="">Select NB first</option>
                    ) : (
                      <>
                        <option value="">Select schedule...</option>
                        {(() => {
                          const fallbackEffectiveSpecId =
                            entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const fallbackSpecName =
                            masterData.steelSpecs?.find(
                              (s: any) => s.id === fallbackEffectiveSpecId,
                            )?.steelSpecName || "";
                          const fallbackSchedules = getScheduleListForSpec(
                            entry.specs?.nominalBoreMm,
                            fallbackEffectiveSpecId,
                            fallbackSpecName,
                          );
                          const mapSchedules = availableSchedulesMap[entry.id] || [];
                          const allSchedules =
                            fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                          const effectivePressure =
                            entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                          const effectiveTemp =
                            entry.specs?.workingTemperatureC ||
                            globalSpecs?.workingTemperatureC ||
                            20;
                          const nominalBore = entry.specs?.nominalBoreMm;
                          const od = NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05;
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
                              const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                              return wt >= minimumWT;
                            })
                            .sort((a: any, b: any) => {
                              const wtA = a.wallThicknessMm || a.wall_thickness_mm || 0;
                              const wtB = b.wallThicknessMm || b.wall_thickness_mm || 0;
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
                            const scheduleValue =
                              dim.scheduleDesignation ||
                              dim.schedule_designation ||
                              dim.scheduleNumber?.toString() ||
                              dim.schedule_number?.toString() ||
                              "Unknown";
                            const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
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
                    const minimumWT = entry.minimumWallThickness || 0;
                    const selectedWT = entry.specs?.wallThicknessMm || 0;
                    const hasSchedule = entry.specs?.scheduleNumber;

                    if (!hasSchedule || minimumWT <= 0) return null;
                    if (selectedWT >= minimumWT) return null;

                    const shortfall = minimumWT - selectedWT;
                    const fallbackEffectiveSpecId =
                      entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                    const fallbackSpecName =
                      masterData.steelSpecs?.find((s: any) => s.id === fallbackEffectiveSpecId)
                        ?.steelSpecName || "";
                    const allSchedules = getScheduleListForSpec(
                      entry.specs?.nominalBoreMm,
                      fallbackEffectiveSpecId,
                      fallbackSpecName,
                    );
                    const eligibleSchedules = allSchedules
                      .filter((dim: any) => (dim.wallThicknessMm || 0) >= minimumWT)
                      .sort(
                        (a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0),
                      );
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
                              });
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
                    value={entry.specs?.pipeType || "plain"}
                    onChange={(value) => {
                      const newPipeType = value;
                      const currentEndConfig = entry.specs?.pipeEndConfiguration || "PE";
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
                    const weldCount = getWeldCountPerPipe(
                      entry.specs?.pipeEndConfiguration || "PE",
                    );
                    const dn = entry.specs?.nominalBoreMm;
                    const schedule = entry.specs?.scheduleNumber || "";
                    const steelSpecId =
                      entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    const isSABS719 = steelSpecId === 8;
                    const pipeWallThickness = entry.specs?.wallThicknessMm;

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

                      if (isXxhSchedule) {
                        fittingClass = "XXH";
                      } else if (isXhSchedule) {
                        fittingClass = "XH";
                      } else if (isStdSchedule) {
                        fittingClass = "STD";
                      } else {
                        fittingClass = "";
                      }

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
            {entry.specs?.pipeType === "spigot" && (
              <SpigotConfigurationSection
                entryId={entry.id}
                spigotSteelSpecificationId={entry.specs?.spigotSteelSpecificationId}
                numberOfSpigots={entry.specs?.numberOfSpigots || 2}
                spigotNominalBoreMm={entry.specs?.spigotNominalBoreMm}
                spigotDistanceFromEndMm={entry.specs?.spigotDistanceFromEndMm}
                spigotHeightMm={entry.specs?.spigotHeightMm}
                mainPipeSteelSpecificationId={entry.specs?.steelSpecificationId}
                mainPipeNominalBoreMm={entry.specs?.nominalBoreMm}
                globalSteelSpecificationId={globalSpecs?.steelSpecificationId}
                steelSpecs={masterData.steelSpecs || []}
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
            {(!entry.specs?.pipeType ||
              entry.specs.pipeType === "plain" ||
              entry.specs.pipeType === "spigot" ||
              entry.specs.pipeType === "puddle") && (
              <>
                {/* Flange Specification - Third Box (Amber) */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-2 mt-2">
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-900 mb-1">
                    Flange Specification
                  </h4>
                  {(() => {
                    const selectedStandard = masterData.flangeStandards?.find(
                      (fs: any) =>
                        fs.id === (entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId),
                    );
                    const isSabs1123 =
                      selectedStandard?.code?.toUpperCase().includes("SABS") &&
                      selectedStandard?.code?.includes("1123");
                    const isBs4504 =
                      selectedStandard?.code?.toUpperCase().includes("BS") &&
                      selectedStandard?.code?.includes("4504");
                    const showFlangeType = isSabs1123 || isBs4504;

                    const pipeEndConfig = entry.specs?.pipeEndConfiguration || "PE";
                    const configUpper = pipeEndConfig.toUpperCase();
                    const hasInletFlange = ["FBE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"].includes(
                      configUpper,
                    );
                    const hasOutletFlange = [
                      "FOE",
                      "FBE",
                      "FOE_LF",
                      "FOE_RF",
                      "2X_RF",
                      "2XLF",
                    ].includes(configUpper);
                    const hasFlanges = hasInletFlange || hasOutletFlange;
                    const availableBlankPositions: { key: string; label: string }[] = [
                      ...(hasInletFlange ? [{ key: "inlet", label: "End A" }] : []),
                      ...(hasOutletFlange ? [{ key: "outlet", label: "End B" }] : []),
                    ];
                    const currentBlankPositions = entry.specs?.blankFlangePositions || [];

                    const effectiveStandardId =
                      entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                    const effectiveTypeCode =
                      entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                    const normalizedTypeCode = effectiveTypeCode?.replace(/^\//, "") || "";

                    const globalClass = masterData.pressureClasses?.find(
                      (p: any) => p.id === globalSpecs?.flangePressureClassId,
                    );
                    const globalBasePressure =
                      globalClass?.designation?.replace(/\/\d+$/, "") || "";
                    const targetDesignationForGlobal =
                      normalizedTypeCode && globalBasePressure
                        ? `${globalBasePressure}/${normalizedTypeCode}`
                        : null;
                    const matchingClassForGlobal = targetDesignationForGlobal
                      ? masterData.pressureClasses?.find(
                          (pc: any) => pc.designation === targetDesignationForGlobal,
                        )
                      : null;
                    const effectiveClassId =
                      entry.specs?.flangePressureClassId ||
                      matchingClassForGlobal?.id ||
                      globalSpecs?.flangePressureClassId;

                    const isStandardFromGlobal =
                      globalSpecs?.flangeStandardId &&
                      effectiveStandardId === globalSpecs?.flangeStandardId;
                    const isStandardOverride =
                      globalSpecs?.flangeStandardId &&
                      effectiveStandardId !== globalSpecs?.flangeStandardId;
                    const effectiveClass = masterData.pressureClasses?.find(
                      (p: any) => p.id === effectiveClassId,
                    );
                    const effectiveBasePressure =
                      effectiveClass?.designation?.replace(/\/\d+$/, "") || "";
                    const isClassFromGlobal =
                      globalSpecs?.flangePressureClassId &&
                      effectiveBasePressure === globalBasePressure;
                    const isClassOverride =
                      globalSpecs?.flangePressureClassId &&
                      effectiveBasePressure !== globalBasePressure;
                    const isTypeFromGlobal =
                      globalSpecs?.flangeTypeCode &&
                      effectiveTypeCode === globalSpecs?.flangeTypeCode;
                    const isTypeOverride =
                      globalSpecs?.flangeTypeCode &&
                      effectiveTypeCode !== globalSpecs?.flangeTypeCode;

                    const workingPressureBar =
                      entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                    const selectedPressureClass = masterData.pressureClasses?.find(
                      (pc: any) => pc.id === effectiveClassId,
                    );
                    const pressureClassValidation = validatePressureClass(
                      selectedStandard?.code,
                      selectedPressureClass?.designation,
                      workingPressureBar,
                    );
                    const isPressureClassUnsuitable = pressureClassValidation.isUnsuitable;

                    const globalSelectClass =
                      "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400";
                    const overrideSelectClass =
                      "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-yellow-500 dark:border-yellow-400";
                    const unsuitableSelectClass =
                      "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400";
                    const defaultSelectClass =
                      "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {/* Flange Standard */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Standard
                              {isStandardFromGlobal && (
                                <span className="ml-1 text-green-600 font-normal">
                                  (From Specs Page)
                                </span>
                              )}
                              {isStandardOverride && (
                                <span className="ml-1 text-red-600 font-normal">(Override)</span>
                              )}
                              <span
                                className="ml-1 text-gray-400 font-normal cursor-help"
                                title="Flange standard determines pressure class options and flange dimensions"
                              >
                                ?
                              </span>
                            </label>
                            <select
                              value={
                                entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ""
                              }
                              onChange={(e) => {
                                const newFlangeStandardId = e.target.value
                                  ? Number(e.target.value)
                                  : undefined;
                                const newStandard = masterData.flangeStandards?.find(
                                  (s: any) => s.id === newFlangeStandardId,
                                );
                                const newStandardCode = newStandard?.code || "";

                                const endConfig = entry.specs?.pipeEndConfiguration || "PE";
                                const effectiveFlangeTypeCode =
                                  entry.specs?.flangeTypeCode ||
                                  globalSpecs?.flangeTypeCode ||
                                  recommendedFlangeTypeCode(endConfig);

                                const workingPressure =
                                  entry.specs?.workingPressureBar ||
                                  globalSpecs?.workingPressureBar ||
                                  0;

                                let newPressureClassId: number | undefined;
                                if (newFlangeStandardId && workingPressure > 0) {
                                  let availableClasses =
                                    pressureClassesByStandard[newFlangeStandardId] || [];
                                  if (availableClasses.length === 0) {
                                    availableClasses =
                                      masterData.pressureClasses?.filter(
                                        (pc: any) =>
                                          pc.flangeStandardId === newFlangeStandardId ||
                                          pc.standardId === newFlangeStandardId,
                                      ) || [];
                                  }
                                  if (availableClasses.length > 0) {
                                    newPressureClassId =
                                      recommendedPressureClassId(
                                        workingPressure,
                                        availableClasses,
                                        newStandardCode,
                                        effectiveFlangeTypeCode,
                                      ) || undefined;
                                  }
                                }

                                const updatedEntry = {
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    flangeStandardId: newFlangeStandardId,
                                    flangeTypeCode: effectiveFlangeTypeCode,
                                    flangePressureClassId: newPressureClassId,
                                  },
                                };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    flangeStandardId: newFlangeStandardId,
                                    flangeTypeCode: effectiveFlangeTypeCode,
                                    flangePressureClassId: newPressureClassId,
                                  },
                                  description: newDescription,
                                });
                                if (
                                  newFlangeStandardId &&
                                  !pressureClassesByStandard[newFlangeStandardId]
                                ) {
                                  getFilteredPressureClasses(newFlangeStandardId);
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
                              {masterData.flangeStandards?.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>
                                  {standard.code}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Pressure Class */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
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
                                title="Flange pressure rating. Should match or exceed working pressure. Auto-selected based on working pressure."
                              >
                                ?
                              </span>
                            </label>
                            <select
                              value={entry.specs?.flangePressureClassId || effectiveClassId || ""}
                              onChange={(e) => {
                                const newFlangePressureClassId = e.target.value
                                  ? Number(e.target.value)
                                  : undefined;
                                const updatedEntry = {
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    flangePressureClassId: newFlangePressureClassId,
                                  },
                                };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    flangePressureClassId: newFlangePressureClassId,
                                  },
                                  description: newDescription,
                                });
                              }}
                              className={
                                isPressureClassUnsuitable
                                  ? unsuitableSelectClass
                                  : isClassFromGlobal
                                    ? globalSelectClass
                                    : isClassOverride
                                      ? overrideSelectClass
                                      : defaultSelectClass
                              }
                              onFocus={() => {
                                const stdId =
                                  entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                if (stdId && !pressureClassesByStandard[stdId]) {
                                  getFilteredPressureClasses(stdId);
                                }
                              }}
                            >
                              <option value="">Select...</option>
                              {(() => {
                                if (isSabs1123) {
                                  return SABS_1123_PRESSURE_CLASSES.map((pc) => {
                                    const pcValue = String(pc.value);
                                    const targetDesignation = normalizedTypeCode
                                      ? `${pcValue}/${normalizedTypeCode}`
                                      : null;
                                    const matchingPc = masterData.pressureClasses?.find(
                                      (mpc: any) => {
                                        if (
                                          targetDesignation &&
                                          mpc.designation === targetDesignation
                                        )
                                          return true;
                                        return mpc.designation?.includes(pcValue);
                                      },
                                    );
                                    return matchingPc ? (
                                      <option key={matchingPc.id} value={matchingPc.id}>
                                        {pc.value}
                                      </option>
                                    ) : null;
                                  });
                                } else if (isBs4504) {
                                  return BS_4504_PRESSURE_CLASSES.map((pc) => {
                                    const pcValue = String(pc.value);
                                    const equivalentValue = pcValue === "64" ? "63" : pcValue;
                                    const targetDesignation = normalizedTypeCode
                                      ? `${pcValue}/${normalizedTypeCode}`
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
                                        {pc.label}
                                      </option>
                                    ) : null;
                                  });
                                } else {
                                  const stdId =
                                    entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                  const filteredClasses = stdId
                                    ? pressureClassesByStandard[stdId]
                                    : [];
                                  return (
                                    filteredClasses?.map((pc: any) => (
                                      <option key={pc.id} value={pc.id}>
                                        {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
                                      </option>
                                    )) || null
                                  );
                                }
                              })()}
                            </select>
                          </div>

                          {/* Flange Type */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Type
                              {isTypeFromGlobal && showFlangeType && (
                                <span className="ml-1 text-green-600 font-normal">
                                  (From Specs Page)
                                </span>
                              )}
                              {isTypeOverride && showFlangeType && (
                                <span className="ml-1 text-red-600 font-normal">(Override)</span>
                              )}
                            </label>
                            {showFlangeType ? (
                              <select
                                value={
                                  entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode || ""
                                }
                                onChange={(e) => {
                                  const updatedEntry = {
                                    ...entry,
                                    specs: {
                                      ...entry.specs,
                                      flangeTypeCode: e.target.value || undefined,
                                    },
                                  };
                                  const newDescription = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      flangeTypeCode: e.target.value || undefined,
                                    },
                                    description: newDescription,
                                  });
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
                                {(isSabs1123 ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES).map(
                                  (ft) => (
                                    <option key={ft.code} value={ft.code} title={ft.description}>
                                      {ft.name} ({ft.code})
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-700">
                                N/A
                              </div>
                            )}
                          </div>

                          {/* Pipe End Configuration */}
                          <div data-nix-target="pipe-end-config-select">
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Config
                              <span
                                className="ml-1 text-gray-400 font-normal cursor-help"
                                title="PE = Plain End (no flanges, for butt welding to other pipes). FOE = Flanged One End (connect to equipment/valve). FBE = Flanged Both Ends (spool piece). L/F = Loose Flange (slip-on, easier bolt alignment). R/F = Rotating Flange (backing ring allows rotation for bolt hole alignment)."
                              >
                                ?
                              </span>
                            </label>
                            {entry.specs?.pipeType === "spigot" ? (
                              <div className="px-2 py-1.5 bg-teal-100 border border-teal-300 rounded text-xs text-teal-800 font-medium">
                                FBE - Flanged Both Ends
                              </div>
                            ) : (
                              <Select
                                id={`pipe-config-${entry.id}`}
                                value={
                                  entry.specs.pipeEndConfiguration ||
                                  (entry.specs?.pipeType === "puddle" ? "FOE" : "PE")
                                }
                                onChange={async (value) => {
                                  const newConfig = value;
                                  let weldDetails = null;
                                  try {
                                    weldDetails = await getPipeEndConfigurationDetails(newConfig);
                                  } catch (error) {
                                    log.warn(
                                      "Could not get pipe end configuration details:",
                                      error,
                                    );
                                  }

                                  const effectiveFlangeTypeCode =
                                    globalSpecs?.flangeTypeCode ||
                                    recommendedFlangeTypeCode(newConfig);

                                  const flangeStandardId =
                                    entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                  const flangeStandard = masterData.flangeStandards?.find(
                                    (s: any) => s.id === flangeStandardId,
                                  );
                                  const flangeCode = flangeStandard?.code || "";
                                  const isSabs1123 =
                                    flangeCode.includes("SABS 1123") ||
                                    flangeCode.includes("SANS 1123");

                                  const workingPressure =
                                    entry.specs?.workingPressureBar ||
                                    globalSpecs?.workingPressureBar ||
                                    0;
                                  let availableClasses = flangeStandardId
                                    ? pressureClassesByStandard[flangeStandardId] || []
                                    : [];
                                  if (availableClasses.length === 0) {
                                    availableClasses =
                                      masterData.pressureClasses?.filter(
                                        (pc: any) =>
                                          pc.flangeStandardId === flangeStandardId ||
                                          pc.standardId === flangeStandardId,
                                      ) || [];
                                  }
                                  const newPressureClassId =
                                    workingPressure > 0 && availableClasses.length > 0
                                      ? recommendedPressureClassId(
                                          workingPressure,
                                          availableClasses,
                                          flangeCode,
                                          effectiveFlangeTypeCode,
                                        )
                                      : entry.specs?.flangePressureClassId ||
                                        globalSpecs?.flangePressureClassId;

                                  const updatedEntry: any = {
                                    specs: {
                                      ...entry.specs,
                                      pipeEndConfiguration: newConfig,
                                      blankFlangePositions: [],
                                      addBlankFlange: false,
                                      blankFlangeCount: 0,
                                      flangeTypeCode: effectiveFlangeTypeCode,
                                      ...(newPressureClassId && {
                                        flangePressureClassId: newPressureClassId,
                                      }),
                                    },
                                    ...(weldDetails && { weldInfo: weldDetails }),
                                  };
                                  updatedEntry.description = generateItemDescription({
                                    ...entry,
                                    ...updatedEntry,
                                  });
                                  onUpdateEntry(entry.id, updatedEntry);
                                  // For plain pipes, focus the Pipe Length field next
                                  if (entry.specs?.pipeType === "plain" || !entry.specs?.pipeType) {
                                    setTimeout(() => {
                                      const pipeLengthInput = document.getElementById(
                                        `pipe-length-${entry.id}`,
                                      ) as HTMLInputElement;
                                      if (pipeLengthInput) {
                                        pipeLengthInput.focus();
                                        pipeLengthInput.scrollIntoView({
                                          behavior: "smooth",
                                          block: "center",
                                        });
                                        pipeLengthInput.select();
                                      }
                                    }, 100);
                                  }
                                  // For puddle pipes, focus the Puddle Flange OD field next
                                  if (entry.specs?.pipeType === "puddle") {
                                    setTimeout(() => {
                                      const puddleOdInput = document.getElementById(
                                        `puddle-od-${entry.id}`,
                                      ) as HTMLInputElement;
                                      if (puddleOdInput) {
                                        puddleOdInput.focus();
                                        puddleOdInput.scrollIntoView({
                                          behavior: "smooth",
                                          block: "center",
                                        });
                                        puddleOdInput.select();
                                      }
                                    }, 100);
                                  }
                                }}
                                options={
                                  entry.specs?.pipeType === "puddle"
                                    ? [
                                        { value: "PE", label: "PE - Plain Ended" },
                                        { value: "FOE", label: "FOE - Flanged One End" },
                                        { value: "FBE", label: "FBE - Flanged Both Ends" },
                                      ]
                                    : [...PIPE_END_OPTIONS]
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                              />
                            )}
                          </div>
                        </div>

                        {/* Blank Flange Options - Only show when flanges are selected, aligned right under Config */}
                        {hasFlanges && availableBlankPositions.length > 0 && (
                          <div className="mt-2 flex justify-end">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-900">
                                Blank:
                              </span>
                              <span
                                className="text-gray-400 font-normal cursor-help text-xs"
                                title="Add blank flanges for hydrostatic testing, isolation, or future connections. Select both ends when pipes will be tested individually before installation."
                              >
                                ?
                              </span>
                              {availableBlankPositions.map((pos) => (
                                <label
                                  key={pos.key}
                                  className="flex items-center gap-1 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={currentBlankPositions.includes(pos.key)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      const newPositions = checked
                                        ? [...currentBlankPositions, pos.key]
                                        : currentBlankPositions.filter(
                                            (p: string) => p !== pos.key,
                                          );
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
                                  <span className="text-xs text-gray-800 dark:text-gray-900">
                                    {pos.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {/* Warning for pressure override - only show if actual pressure rating differs, not just flange type */}
                  {(() => {
                    const currentClassId = entry.specs?.flangePressureClassId;
                    const recommendedClassId = globalSpecs?.flangePressureClassId;
                    if (
                      currentClassId &&
                      recommendedClassId &&
                      currentClassId !== recommendedClassId
                    ) {
                      const currentClass = masterData.pressureClasses?.find(
                        (p: any) => p.id === currentClassId,
                      );
                      const recommendedClass = masterData.pressureClasses?.find(
                        (p: any) => p.id === recommendedClassId,
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
                  {entry.specs?.pipeType === "spigot" &&
                    entry.specs?.numberOfSpigots &&
                    entry.specs?.numberOfSpigots >= 2 && (
                      <div className="mt-2 pt-2 border-t border-amber-300">
                        <h5 className="text-xs font-semibold text-teal-700 mb-1">
                          Spigot Flange Configuration
                        </h5>
                        {(() => {
                          const mainFlangeStandardId =
                            entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const spigotFlangeStandardId =
                            entry.specs?.spigotFlangeStandardId || mainFlangeStandardId;
                          const isStandardFromMain = !entry.specs?.spigotFlangeStandardId;

                          const mainPressureClassId =
                            entry.specs?.flangePressureClassId ||
                            globalSpecs?.flangePressureClassId;
                          const spigotPressureClassId =
                            entry.specs?.spigotFlangePressureClassId || mainPressureClassId;
                          const isClassFromMain = !entry.specs?.spigotFlangePressureClassId;

                          const mainFlangeTypeCode =
                            entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                          const spigotFlangeTypeCode =
                            entry.specs?.spigotFlangeTypeCode || mainFlangeTypeCode;
                          const isTypeFromMain = !entry.specs?.spigotFlangeTypeCode;

                          const spigotFlangeConfig = entry.specs?.spigotFlangeConfig || "PE";

                          const selectedStandard = masterData.flangeStandards?.find(
                            (fs: any) => fs.id === spigotFlangeStandardId,
                          );
                          const isSabs1123 =
                            selectedStandard?.code?.toUpperCase().includes("SABS") &&
                            selectedStandard?.code?.includes("1123");
                          const isBs4504 =
                            selectedStandard?.code?.toUpperCase().includes("BS") &&
                            selectedStandard?.code?.includes("4504");
                          const showFlangeType = isSabs1123 || isBs4504;

                          const availablePressureClasses = spigotFlangeStandardId
                            ? pressureClassesByStandard[spigotFlangeStandardId] ||
                              masterData.pressureClasses?.filter(
                                (pc: any) =>
                                  pc.flangeStandardId === spigotFlangeStandardId ||
                                  pc.standardId === spigotFlangeStandardId,
                              ) ||
                              []
                            : [];

                          const numberOfSpigots = entry.specs?.numberOfSpigots || 2;
                          const spigotBlankFlanges = entry.specs?.spigotBlankFlanges || [];

                          const mainSelectClass =
                            "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-green-500";
                          const overrideSelectClass =
                            "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-yellow-500";
                          const defaultSelectClass =
                            "w-full px-2 py-1.5 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-900 bg-white border-teal-300";

                          return (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {/* Spigot Flange Standard */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Standard
                                    {isStandardFromMain && (
                                      <span className="ml-1 text-green-600 font-normal">
                                        (Main)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={spigotFlangeStandardId || ""}
                                    onChange={(e) => {
                                      const newStandardId = e.target.value
                                        ? Number(e.target.value)
                                        : undefined;
                                      onUpdateEntry(entry.id, {
                                        specs: {
                                          ...entry.specs,
                                          spigotFlangeStandardId: newStandardId,
                                          spigotFlangePressureClassId: undefined,
                                          spigotFlangeTypeCode: undefined,
                                        },
                                      });
                                    }}
                                    className={
                                      isStandardFromMain ? mainSelectClass : overrideSelectClass
                                    }
                                  >
                                    <option value="">Select...</option>
                                    {masterData.flangeStandards?.map((fs: any) => (
                                      <option key={fs.id} value={fs.id}>
                                        {fs.code?.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Spigot Pressure Class */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Class
                                    {isClassFromMain && (
                                      <span className="ml-1 text-green-600 font-normal">
                                        (Main)
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={spigotPressureClassId || ""}
                                    onChange={(e) => {
                                      onUpdateEntry(entry.id, {
                                        specs: {
                                          ...entry.specs,
                                          spigotFlangePressureClassId: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        },
                                      });
                                    }}
                                    className={
                                      isClassFromMain ? mainSelectClass : overrideSelectClass
                                    }
                                  >
                                    <option value="">Select...</option>
                                    {availablePressureClasses.map((pc: any) => (
                                      <option key={pc.id} value={pc.id}>
                                        {pc.designation?.replace(/\/\d+$/, "") || pc.designation}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Spigot Flange Type */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Type
                                    {isTypeFromMain && showFlangeType && (
                                      <span className="ml-1 text-green-600 font-normal">
                                        (Main)
                                      </span>
                                    )}
                                  </label>
                                  {showFlangeType ? (
                                    <select
                                      value={spigotFlangeTypeCode || ""}
                                      onChange={(e) => {
                                        onUpdateEntry(entry.id, {
                                          specs: {
                                            ...entry.specs,
                                            spigotFlangeTypeCode: e.target.value || undefined,
                                          },
                                        });
                                      }}
                                      className={
                                        isTypeFromMain ? mainSelectClass : overrideSelectClass
                                      }
                                    >
                                      <option value="">Select...</option>
                                      {(isSabs1123
                                        ? SABS_1123_FLANGE_TYPES
                                        : BS_4504_FLANGE_TYPES
                                      ).map((ft) => (
                                        <option key={ft.code} value={ft.code}>
                                          {ft.name} ({ft.code})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500">
                                      N/A
                                    </div>
                                  )}
                                </div>

                                {/* Spigot End Config */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Spigot Config
                                  </label>
                                  <select
                                    value={spigotFlangeConfig}
                                    onChange={(e) => {
                                      onUpdateEntry(entry.id, {
                                        specs: {
                                          ...entry.specs,
                                          spigotFlangeConfig: e.target.value,
                                        },
                                      });
                                    }}
                                    className={defaultSelectClass}
                                  >
                                    <option value="PE">PE - Plain End</option>
                                    <option value="FAE">FAE - Flanged All Ends</option>
                                    <option value="RF">R/F - Rotating Flange</option>
                                  </select>
                                </div>
                              </div>

                              {/* Blank Flange Checkboxes for each Spigot */}
                              {spigotFlangeConfig !== "PE" && (
                                <div className="mt-2 flex items-center gap-4 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-900">
                                    Blank Flanges:
                                  </span>
                                  {Array.from({ length: numberOfSpigots }, (_, i) => (
                                    <label
                                      key={i}
                                      className="flex items-center gap-1 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={spigotBlankFlanges.includes(i + 1)}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          const newBlanks = checked
                                            ? [...spigotBlankFlanges, i + 1]
                                            : spigotBlankFlanges.filter((s: number) => s !== i + 1);
                                          onUpdateEntry(entry.id, {
                                            specs: {
                                              ...entry.specs,
                                              spigotBlankFlanges: newBlanks.sort(
                                                (a: number, b: number) => a - b,
                                              ),
                                            },
                                          });
                                        }}
                                        className="w-3.5 h-3.5 text-teal-600 border-teal-400 rounded focus:ring-teal-500"
                                      />
                                      <span className="text-xs text-gray-800">S{i + 1}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                  {/* Puddle Flange Dims - Only shown for Puddle Pipe */}
                  {entry.specs?.pipeType === "puddle" && (
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
                            value={entry.specs?.puddleFlangeOdMm || ""}
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
                            value={entry.specs?.puddleFlangePcdMm || ""}
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
                            value={entry.specs?.puddleFlangeHoleCount || ""}
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
                            value={entry.specs?.puddleFlangeHoleIdMm || ""}
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
                            value={entry.specs?.puddleFlangeThicknessMm || ""}
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
                            value={entry.specs?.puddleFlangeLocationMm || ""}
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
                        entry.specs?.nominalBoreMm && !entry.specs?.individualPipeLength;
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
                              {(entry.specs?.pipeType === "puddle"
                                ? PUDDLE_PIPE_LENGTHS_M
                                : STANDARD_PIPE_LENGTHS_M
                              ).map((pl) => (
                                <button
                                  key={pl.value}
                                  type="button"
                                  title={pl.description}
                                  onClick={() => {
                                    const numPipes =
                                      entry.specs.quantityType === "number_of_pipes"
                                        ? entry.specs.quantityValue || 1
                                        : Math.ceil(
                                            (entry.specs.quantityValue || pl.value) / pl.value,
                                          );
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
                            value={entry.specs.individualPipeLength || ""}
                            onChange={(e) => {
                              const pipeLength = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                              const numPipes =
                                pipeLength && entry.specs.quantityType === "number_of_pipes"
                                  ? entry.specs.quantityValue || 1
                                  : pipeLength
                                    ? Math.ceil(
                                        (entry.specs.quantityValue || pipeLength) / pipeLength,
                                      )
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
                    {hasLooseFlange(entry.specs.pipeEndConfiguration || "") ? (
                      <div>
                        <ClosureLengthSelector
                          nominalBore={entry.specs?.nominalBoreMm || 100}
                          currentValue={entry.specs?.closureLengthMm || null}
                          wallThickness={entry.specs?.wallThicknessMm || 5}
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
                          value={
                            entry.specs.quantityType === "total_length"
                              ? entry.specs.quantityValue || ""
                              : (entry.specs.quantityValue || 1) *
                                (entry.specs.individualPipeLength || 0)
                          }
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
                        value={
                          entry.specs.quantityType === "number_of_pipes"
                            ? (entry.specs.quantityValue ?? "")
                            : entry.specs.individualPipeLength
                              ? Math.ceil(
                                  (entry.specs.quantityValue || 0) /
                                    entry.specs.individualPipeLength,
                                )
                              : ""
                        }
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
              const canRenderPreview =
                entry.specs?.nominalBoreMm && entry.specs?.individualPipeLength;
              if (!canRenderPreview) {
                return (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                    Select nominal bore and pipe length to see 3D preview
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
              return (
                <div data-nix-target="pipe-3d-preview" className="h-full">
                  <Pipe3DPreview
                    length={entry.specs.individualPipeLength || DEFAULT_PIPE_LENGTH_M}
                    outerDiameter={
                      entry.calculation?.outsideDiameterMm || entry.specs.nominalBoreMm * 1.1
                    }
                    wallThickness={
                      entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5
                    }
                    endConfiguration={entry.specs.pipeEndConfiguration || "PE"}
                    materialName={
                      masterData.steelSpecs.find(
                        (s: any) =>
                          s.id ===
                          (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId),
                      )?.steelSpecName
                    }
                    nominalBoreMm={entry.specs.nominalBoreMm}
                    pressureClass={globalSpecs?.pressureClassDesignation || "PN16"}
                    addBlankFlange={entry.specs?.addBlankFlange}
                    blankFlangePositions={entry.specs?.blankFlangePositions}
                    savedCameraPosition={entry.specs?.savedCameraPosition}
                    savedCameraTarget={entry.specs?.savedCameraTarget}
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
                    pipeType={entry.specs?.pipeType}
                    numberOfSpigots={entry.specs?.numberOfSpigots}
                    spigotNominalBoreMm={entry.specs?.spigotNominalBoreMm}
                    spigotDistanceFromEndMm={entry.specs?.spigotDistanceFromEndMm}
                    spigotHeightMm={entry.specs?.spigotHeightMm}
                    individualPipeLengthM={entry.specs?.individualPipeLength}
                    spigotFlangeConfig={entry.specs?.spigotFlangeConfig}
                    spigotBlankFlanges={entry.specs?.spigotBlankFlanges}
                    puddleFlangeOdMm={entry.specs?.puddleFlangeOdMm}
                    puddleFlangePcdMm={entry.specs?.puddleFlangePcdMm}
                    puddleFlangeHoleCount={entry.specs?.puddleFlangeHoleCount}
                    puddleFlangeHoleIdMm={entry.specs?.puddleFlangeHoleIdMm}
                    puddleFlangeThicknessMm={entry.specs?.puddleFlangeThicknessMm}
                    puddleFlangeLocationMm={entry.specs?.puddleFlangeLocationMm}
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

                  {(() => {
                    const configUpper = (entry.specs.pipeEndConfiguration || "PE").toUpperCase();
                    const hasRotatingFlange = ["FOE_RF", "2X_RF"].includes(configUpper);
                    const hasLooseFlangeConfig = hasLooseFlange(
                      entry.specs.pipeEndConfiguration || "",
                    );

                    let backingRingTotalWeight = 0;
                    if (hasRotatingFlange) {
                      const backingRingCountPerPipe =
                        configUpper === "FOE_RF" ? 1 : configUpper === "2X_RF" ? 2 : 0;
                      const totalBackingRings =
                        backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);
                      const nb = entry.specs.nominalBoreMm || 100;
                      const ringWeightEach = retainingRingWeight(
                        nb,
                        entry.calculation?.outsideDiameterMm,
                      );
                      backingRingTotalWeight = ringWeightEach * totalBackingRings;
                    }

                    const physicalFlanges = getPhysicalFlangeCount(
                      entry.specs.pipeEndConfiguration || "PE",
                    );
                    const totalFlanges =
                      physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                    const nominalBore = entry.specs?.nominalBoreMm;

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
                    const flangeTypeCode =
                      entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                    const flangeWeightPerUnit =
                      nominalBore && pressureClassDesignation
                        ? getFlangeWeight(
                            nominalBore,
                            pressureClassDesignation,
                            flangeStandardCode,
                            flangeTypeCode,
                          )
                        : entry.calculation?.flangeWeightPerUnit || 0;
                    const dynamicTotalFlangeWeight = totalFlanges * flangeWeightPerUnit;

                    const blankPositions = entry.specs?.blankFlangePositions || [];
                    const blankFlangeCount =
                      blankPositions.length * (entry.calculation?.calculatedPipeCount || 0);
                    const isSans1123 =
                      flangeStandardCode.includes("SABS 1123") ||
                      flangeStandardCode.includes("SANS 1123");
                    const blankWeightPerUnit =
                      nominalBore && pressureClassDesignation
                        ? isSans1123
                          ? sansBlankFlangeWeight(nominalBore, pressureClassDesignation)
                          : getBlankFlangeWeight(nominalBore, pressureClassDesignation)
                        : 0;
                    const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                    const tackWeldEnds = getTackWeldEndsPerPipe(
                      entry.specs?.pipeEndConfiguration || "PE",
                    );
                    const tackWeldTotalWeight =
                      nominalBore && tackWeldEnds > 0
                        ? getTackWeldWeight(nominalBore, tackWeldEnds) *
                          (entry.calculation?.calculatedPipeCount || 0)
                        : 0;

                    const closureLengthMm = entry.specs?.closureLengthMm || 0;
                    const wallThickness =
                      entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 0;
                    const closureTotalWeight =
                      nominalBore && closureLengthMm > 0 && wallThickness > 0
                        ? getClosureWeight(nominalBore, closureLengthMm, wallThickness) *
                          (entry.calculation?.calculatedPipeCount || 0)
                        : 0;

                    // Spigot weight calculation
                    const isSpigotPipe = entry.specs?.pipeType === "spigot";
                    const spigotCount = entry.specs?.numberOfSpigots || 0;
                    const spigotNb = entry.specs?.spigotNominalBoreMm || 0;
                    const spigotHeight = entry.specs?.spigotHeightMm || 150;
                    const spigotFlangeConfig = entry.specs?.spigotFlangeConfig || "PE";
                    const spigotBlankFlanges = entry.specs?.spigotBlankFlanges || [];
                    const nbToOdLookup: Record<number, number> = {
                      15: 21.3,
                      20: 26.9,
                      25: 33.7,
                      32: 42.4,
                      40: 48.3,
                      50: 60.3,
                      65: 76.1,
                      80: 88.9,
                      100: 114.3,
                      125: 139.7,
                      150: 168.3,
                      200: 219.1,
                      250: 273.0,
                      300: 323.9,
                      350: 355.6,
                      400: 406.4,
                      450: 457.0,
                      500: 508.0,
                      600: 610.0,
                    };
                    const spigotOd = nbToOdLookup[spigotNb] || spigotNb * 1.1;
                    const spigotWt = spigotOd < 100 ? 3.2 : spigotOd < 200 ? 4.5 : 6.0;
                    const spigotId = spigotOd - 2 * spigotWt;
                    const steelDensity = 7850; // kg/m³
                    const singleSpigotWeight =
                      isSpigotPipe && spigotNb > 0
                        ? (((Math.PI * (spigotOd ** 2 - spigotId ** 2)) / 4) *
                            (spigotHeight / 1000) *
                            steelDensity) /
                          1000000
                        : 0;
                    const totalSpigotWeight =
                      singleSpigotWeight *
                      spigotCount *
                      (entry.calculation?.calculatedPipeCount || 0);

                    // Spigot flange weight calculations
                    const hasSpigotFlanges =
                      isSpigotPipe && (spigotFlangeConfig === "FAE" || spigotFlangeConfig === "RF");
                    const isSpigotRF = spigotFlangeConfig === "RF";
                    const spigotFlangeStdId =
                      entry.specs?.spigotFlangeStandardId ||
                      entry.specs?.flangeStandardId ||
                      globalSpecs?.flangeStandardId;
                    const spigotPressureClassId =
                      entry.specs?.spigotFlangePressureClassId ||
                      entry.specs?.flangePressureClassId ||
                      globalSpecs?.flangePressureClassId;
                    const spigotFlangeStd = masterData.flangeStandards?.find(
                      (s: any) => s.id === spigotFlangeStdId,
                    );
                    const spigotFlangeStdCode = spigotFlangeStd?.code || "";
                    const spigotPressureClass = masterData.pressureClasses?.find(
                      (p: any) => p.id === spigotPressureClassId,
                    );
                    const spigotPressureClassDesignation = spigotPressureClass?.designation || "";
                    const spigotFlangeTypeCode =
                      entry.specs?.spigotFlangeTypeCode ||
                      entry.specs?.flangeTypeCode ||
                      globalSpecs?.flangeTypeCode;

                    const singleSpigotFlangeWeight =
                      hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
                        ? getFlangeWeight(
                            spigotNb,
                            spigotPressureClassDesignation,
                            spigotFlangeStdCode,
                            spigotFlangeTypeCode,
                          ) || 0
                        : 0;
                    const totalSpigotFlangeCount = hasSpigotFlanges
                      ? spigotCount * (entry.calculation?.calculatedPipeCount || 0)
                      : 0;
                    const totalSpigotFlangeWeight =
                      singleSpigotFlangeWeight * totalSpigotFlangeCount;

                    // Spigot R/F ring weight
                    const singleSpigotRingWeight =
                      isSpigotRF && spigotNb ? retainingRingWeight(spigotNb) || 0 : 0;
                    const totalSpigotRingWeight = singleSpigotRingWeight * totalSpigotFlangeCount;

                    // Spigot blank flange weight
                    const spigotBlankCount =
                      spigotBlankFlanges.length * (entry.calculation?.calculatedPipeCount || 0);
                    const isSans1123Spigot =
                      (spigotFlangeStdCode.toUpperCase().includes("SABS") ||
                        spigotFlangeStdCode.toUpperCase().includes("SANS")) &&
                      spigotFlangeStdCode.includes("1123");
                    const singleSpigotBlankWeight =
                      hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
                        ? (isSans1123Spigot
                            ? sansBlankFlangeWeight(spigotNb, spigotPressureClassDesignation)
                            : getBlankFlangeWeight(spigotNb, spigotPressureClassDesignation)) || 0
                        : 0;
                    const totalSpigotBlankWeight = singleSpigotBlankWeight * spigotBlankCount;

                    // Puddle flange weight calculation
                    // Formula: Weight = π × (R_outer² - R_inner²) × thickness × density
                    // Where R_inner = pipe OD (puddle flange slips over pipe)
                    const isPuddlePipe = entry.specs?.pipeType === "puddle";
                    const puddleFlangeOd = entry.specs?.puddleFlangeOdMm || 0;
                    const puddleFlangeThickness = entry.specs?.puddleFlangeThicknessMm || 0;
                    const pipeOdMm = entry.calculation?.outsideDiameterMm || 0;
                    const singlePuddleFlangeWeight =
                      isPuddlePipe &&
                      puddleFlangeOd > 0 &&
                      puddleFlangeThickness > 0 &&
                      pipeOdMm > 0
                        ? Math.PI *
                          ((puddleFlangeOd / 2000) ** 2 - (pipeOdMm / 2000) ** 2) *
                          (puddleFlangeThickness / 1000) *
                          steelDensity
                        : 0;
                    const totalPuddleFlangeWeight =
                      singlePuddleFlangeWeight * (entry.calculation?.calculatedPipeCount || 0);

                    const totalWeight =
                      (entry.calculation.totalPipeWeight || 0) +
                      dynamicTotalFlangeWeight +
                      backingRingTotalWeight +
                      totalBlankFlangeWeight +
                      tackWeldTotalWeight +
                      closureTotalWeight +
                      totalSpigotWeight +
                      totalSpigotFlangeWeight +
                      totalSpigotRingWeight +
                      totalSpigotBlankWeight +
                      totalPuddleFlangeWeight;

                    return (
                      <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                        <p className="text-xs text-green-800 font-medium">Weight Breakdown</p>
                        <p className="text-lg font-bold text-green-900">
                          {formatWeight(totalWeight)}
                        </p>
                        <div className="text-xs text-green-600 mt-1">
                          <p>Pipe: {formatWeight(entry.calculation.totalPipeWeight)}</p>
                          {dynamicTotalFlangeWeight > 0 && (
                            <p>Flanges: {dynamicTotalFlangeWeight.toFixed(2)}kg</p>
                          )}
                          {backingRingTotalWeight > 0 && (
                            <p>R/F Rings: {backingRingTotalWeight.toFixed(2)}kg</p>
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
                          {totalSpigotWeight > 0 && (
                            <p>
                              Spigots: {totalSpigotWeight.toFixed(2)}kg ({spigotCount}×
                              {singleSpigotWeight.toFixed(2)}kg)
                            </p>
                          )}
                          {totalSpigotFlangeWeight > 0 && (
                            <p>
                              Spigot Flanges: {totalSpigotFlangeWeight.toFixed(2)}kg (
                              {totalSpigotFlangeCount}×{singleSpigotFlangeWeight.toFixed(2)}kg)
                            </p>
                          )}
                          {totalSpigotRingWeight > 0 && (
                            <p>
                              Spigot R/F Rings: {totalSpigotRingWeight.toFixed(2)}kg (
                              {totalSpigotFlangeCount}×{singleSpigotRingWeight.toFixed(2)}kg)
                            </p>
                          )}
                          {totalSpigotBlankWeight > 0 && (
                            <p>
                              Spigot Blanks: {totalSpigotBlankWeight.toFixed(2)}kg (
                              {spigotBlankCount}×{singleSpigotBlankWeight.toFixed(2)}kg)
                            </p>
                          )}
                          {totalPuddleFlangeWeight > 0 && (
                            <p>Puddle Flange: {totalPuddleFlangeWeight.toFixed(2)}kg</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const physicalFlanges = getPhysicalFlangeCount(
                      entry.specs.pipeEndConfiguration || "PE",
                    );
                    const totalFlanges =
                      physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                    const nominalBore = entry.specs?.nominalBoreMm;

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
                    const flangeTypeCode =
                      entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                    const flangeWeightPerUnit =
                      nominalBore && pressureClassDesignation
                        ? getFlangeWeight(
                            nominalBore,
                            pressureClassDesignation,
                            flangeStandardCode,
                            flangeTypeCode,
                          )
                        : entry.calculation?.flangeWeightPerUnit || 0;
                    const regularFlangeWeight = totalFlanges * flangeWeightPerUnit;

                    const blankPositions = entry.specs?.blankFlangePositions || [];
                    const blankFlangeCount =
                      blankPositions.length * (entry.calculation?.calculatedPipeCount || 0);
                    const isSans1123 =
                      flangeStandardCode.includes("SABS 1123") ||
                      flangeStandardCode.includes("SANS 1123");
                    const blankWeightPerUnit =
                      nominalBore && pressureClassDesignation
                        ? isSans1123
                          ? sansBlankFlangeWeight(nominalBore, pressureClassDesignation)
                          : getBlankFlangeWeight(nominalBore, pressureClassDesignation)
                        : 0;
                    const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                    // Puddle flange calculations
                    const isPuddlePipe = entry.specs?.pipeType === "puddle";
                    const hasPuddleFlange =
                      isPuddlePipe &&
                      entry.specs?.puddleFlangeOdMm &&
                      entry.specs?.puddleFlangeThicknessMm;
                    const puddleOd = entry.specs?.puddleFlangeOdMm || 0;
                    const puddleThickness = entry.specs?.puddleFlangeThicknessMm || 0;
                    const puddlePcd = entry.specs?.puddleFlangePcdMm;
                    const puddleHoles = entry.specs?.puddleFlangeHoleCount;
                    const puddleHoleId = entry.specs?.puddleFlangeHoleIdMm;
                    const pipeOd = entry.calculation?.outsideDiameterMm || 0;
                    const numPipes = entry.calculation?.calculatedPipeCount || 1;
                    const steelDensityKgM3 = 7850;
                    const singlePuddleWeight =
                      hasPuddleFlange && pipeOd > 0
                        ? Math.PI *
                          ((puddleOd / 2000) ** 2 - (pipeOd / 2000) ** 2) *
                          (puddleThickness / 1000) *
                          steelDensityKgM3
                        : 0;
                    const totalPuddleWeight = singlePuddleWeight * numPipes;
                    const puddleFlangeCount = hasPuddleFlange ? numPipes : 0;

                    // Spigot flange calculations
                    const isSpigotPipe = entry.specs?.pipeType === "spigot";
                    const spigotCount = entry.specs?.numberOfSpigots || 0;
                    const spigotNb = entry.specs?.spigotNominalBoreMm || 0;
                    const spigotFlangeConfig = entry.specs?.spigotFlangeConfig || "PE";
                    const hasSpigotFlanges =
                      isSpigotPipe && (spigotFlangeConfig === "FAE" || spigotFlangeConfig === "RF");
                    const spigotFlangeStdId =
                      entry.specs?.spigotFlangeStandardId ||
                      entry.specs?.flangeStandardId ||
                      globalSpecs?.flangeStandardId;
                    const spigotPressureClassId =
                      entry.specs?.spigotFlangePressureClassId ||
                      entry.specs?.flangePressureClassId ||
                      globalSpecs?.flangePressureClassId;
                    const spigotFlangeStd = masterData.flangeStandards?.find(
                      (s: any) => s.id === spigotFlangeStdId,
                    );
                    const spigotFlangeStdCode = spigotFlangeStd?.code || "";
                    const spigotPressureClass = masterData.pressureClasses?.find(
                      (p: any) => p.id === spigotPressureClassId,
                    );
                    const spigotPressureClassDesignation = spigotPressureClass?.designation || "";
                    const spigotFlangeTypeCode =
                      entry.specs?.spigotFlangeTypeCode ||
                      entry.specs?.flangeTypeCode ||
                      globalSpecs?.flangeTypeCode;
                    const spigotFlangeWeightPerUnit =
                      hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
                        ? getFlangeWeight(
                            spigotNb,
                            spigotPressureClassDesignation,
                            spigotFlangeStdCode,
                            spigotFlangeTypeCode,
                          ) || 0
                        : 0;
                    const totalSpigotFlangeCount = hasSpigotFlanges ? spigotCount * numPipes : 0;
                    const totalSpigotFlangeWeight =
                      spigotFlangeWeightPerUnit * totalSpigotFlangeCount;

                    // Spigot blank flanges
                    const spigotBlankPositions = entry.specs?.spigotBlankFlanges || [];
                    const spigotBlankCount = spigotBlankPositions.length * numPipes;
                    const isSans1123Spigot =
                      (spigotFlangeStdCode.toUpperCase().includes("SABS") ||
                        spigotFlangeStdCode.toUpperCase().includes("SANS")) &&
                      spigotFlangeStdCode.includes("1123");
                    const spigotBlankWeightPerUnit =
                      hasSpigotFlanges && spigotNb && spigotPressureClassDesignation
                        ? (isSans1123Spigot
                            ? sansBlankFlangeWeight(spigotNb, spigotPressureClassDesignation)
                            : getBlankFlangeWeight(spigotNb, spigotPressureClassDesignation)) || 0
                        : 0;
                    const totalSpigotBlankWeight = spigotBlankWeightPerUnit * spigotBlankCount;

                    const totalFlangeWeight =
                      regularFlangeWeight +
                      totalBlankFlangeWeight +
                      totalSpigotFlangeWeight +
                      totalSpigotBlankWeight;
                    const grandTotalFlangeCount =
                      totalFlanges +
                      blankFlangeCount +
                      puddleFlangeCount +
                      totalSpigotFlangeCount +
                      spigotBlankCount;

                    return (
                      <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                        <p className="text-[10px] text-amber-800 font-medium">Total Flanges</p>
                        <p className="text-lg font-bold text-amber-900">{grandTotalFlangeCount}</p>
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          {totalFlanges > 0 && (
                            <p>
                              {totalFlanges} x {nominalBore}NB Flange {pressureClassDesignation}
                            </p>
                          )}
                          {blankFlangeCount > 0 && (
                            <p>
                              {blankFlangeCount} x {nominalBore}NB Blank {pressureClassDesignation}
                            </p>
                          )}
                          {puddleFlangeCount > 0 && (
                            <p>
                              {puddleFlangeCount} x Puddle Flange (OD:{puddleOd}mm
                              {puddlePcd ? ` PCD:${puddlePcd}mm` : ""})
                            </p>
                          )}
                          {totalSpigotFlangeCount > 0 && (
                            <p>
                              {totalSpigotFlangeCount} x {spigotNb}NB Spigot Flange{" "}
                              {spigotPressureClassDesignation}
                            </p>
                          )}
                          {spigotBlankCount > 0 && (
                            <p>
                              {spigotBlankCount} x {spigotNb}NB Spigot Blank{" "}
                              {spigotPressureClassDesignation}
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-500 mt-0.5">
                          {totalFlanges > 0 && (
                            <p>
                              {totalFlanges} × {flangeWeightPerUnit.toFixed(2)}kg ={" "}
                              <span className="font-semibold text-amber-600">
                                {regularFlangeWeight.toFixed(2)}kg
                              </span>
                            </p>
                          )}
                          {blankFlangeCount > 0 && (
                            <p>
                              {blankFlangeCount} × {blankWeightPerUnit.toFixed(2)}kg ={" "}
                              <span className="font-semibold text-amber-600">
                                {totalBlankFlangeWeight.toFixed(2)}kg
                              </span>
                            </p>
                          )}
                          {totalPuddleWeight > 0 && (
                            <p>
                              {puddleFlangeCount} × {singlePuddleWeight.toFixed(2)}kg ={" "}
                              <span className="font-semibold text-amber-600">
                                {totalPuddleWeight.toFixed(2)}kg
                              </span>
                            </p>
                          )}
                          {totalSpigotFlangeCount > 0 && (
                            <p>
                              {totalSpigotFlangeCount} × {spigotFlangeWeightPerUnit.toFixed(2)}kg ={" "}
                              <span className="font-semibold text-amber-600">
                                {totalSpigotFlangeWeight.toFixed(2)}kg
                              </span>
                            </p>
                          )}
                          {spigotBlankCount > 0 && (
                            <p>
                              {spigotBlankCount} × {spigotBlankWeightPerUnit.toFixed(2)}kg ={" "}
                              <span className="font-semibold text-amber-600">
                                {totalSpigotBlankWeight.toFixed(2)}kg
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const configUpper = (entry.specs.pipeEndConfiguration || "PE").toUpperCase();
                    const hasRotatingFlange = ["FOE_RF", "2X_RF"].includes(configUpper);
                    if (!hasRotatingFlange) return null;

                    const backingRingCountPerPipe =
                      configUpper === "FOE_RF" ? 1 : configUpper === "2X_RF" ? 2 : 0;
                    const totalBackingRings =
                      backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);

                    const nb = entry.specs.nominalBoreMm || 100;
                    const ringWeightEach = retainingRingWeight(
                      nb,
                      entry.calculation?.outsideDiameterMm,
                    );
                    const totalWeight = ringWeightEach * totalBackingRings;

                    return (
                      <div className="bg-orange-50 p-2 rounded text-center border border-orange-200">
                        <p className="text-xs text-orange-700 font-medium">R/F Retaining Rings</p>
                        <p className="text-lg font-bold text-orange-900">
                          {totalWeight.toFixed(2)} kg
                        </p>
                        <p className="text-xs text-orange-600">
                          {totalBackingRings} rings × {ringWeightEach.toFixed(2)}kg
                        </p>
                      </div>
                    );
                  })()}

                  {(() => {
                    // Calculate flange welds dynamically based on configuration
                    const pipeEndConfig = entry.specs.pipeEndConfiguration || "PE";
                    const baseFlangeWeldsPerPipe = getFlangeWeldCountPerPipe(pipeEndConfig);
                    const isPuddlePipe = entry.specs?.pipeType === "puddle";
                    const hasPuddleFlange =
                      isPuddlePipe &&
                      entry.specs?.puddleFlangeOdMm &&
                      entry.specs?.puddleFlangeThicknessMm;
                    const flangeWeldsPerPipe = baseFlangeWeldsPerPipe + (hasPuddleFlange ? 1 : 0);
                    const numPipes = entry.calculation?.calculatedPipeCount || 1;
                    const totalFlangeWelds = flangeWeldsPerPipe * numPipes;

                    // Calculate tack welds for loose flanges (8 × 20mm per loose flange end)
                    const tackWeldEnds = getTackWeldEndsPerPipe(pipeEndConfig);
                    const totalTackWeldEnds = tackWeldEnds * numPipes;
                    const tackWeldLengthMm = totalTackWeldEnds * 8 * 20;
                    const tackWeldLengthM = tackWeldLengthMm / 1000;

                    const circumferenceMm = Math.PI * entry.calculation.outsideDiameterMm;
                    const flangeWeldLengthM = (circumferenceMm * 2 * totalFlangeWelds) / 1000;

                    // Spigot weld calculations
                    const isSpigotPipe = entry.specs?.pipeType === "spigot";
                    const spigotCount = entry.specs?.numberOfSpigots || 0;
                    const spigotNb = entry.specs?.spigotNominalBoreMm || 0;
                    const nbToOd: Record<number, number> = {
                      15: 21.3,
                      20: 26.9,
                      25: 33.7,
                      32: 42.4,
                      40: 48.3,
                      50: 60.3,
                      65: 76.1,
                      80: 88.9,
                      100: 114.3,
                      125: 139.7,
                      150: 168.3,
                      200: 219.1,
                      250: 273.0,
                      300: 323.9,
                      350: 355.6,
                      400: 406.4,
                      450: 457.0,
                      500: 508.0,
                      600: 610.0,
                    };
                    const spigotOdMm = nbToOd[spigotNb] || spigotNb * 1.1;
                    const spigotCircumferenceMm = Math.PI * spigotOdMm;
                    const totalSpigotWelds =
                      isSpigotPipe && spigotNb > 0 ? spigotCount * numPipes : 0;
                    const spigotWeldLengthM = (spigotCircumferenceMm * totalSpigotWelds) / 1000;

                    // Combined totals
                    const totalWelds = totalFlangeWelds + totalSpigotWelds;
                    const totalWeldLengthM =
                      flangeWeldLengthM + tackWeldLengthM + spigotWeldLengthM;

                    if (totalWelds === 0 && totalTackWeldEnds === 0) return null;

                    // Calculate weld volume if we have the required data
                    let weldVolumeInfo = null;
                    if (
                      entry.calculation?.numberOfFlangeWelds > 0 &&
                      entry.calculation?.outsideDiameterMm &&
                      entry.specs.wallThicknessMm
                    ) {
                      const weldVolume = calculateFlangeWeldVolume({
                        outsideDiameterMm: entry.calculation.outsideDiameterMm,
                        wallThicknessMm: entry.specs.wallThicknessMm,
                        numberOfFlangeWelds: entry.calculation.numberOfFlangeWelds,
                      });
                      const totalVolumeCm3 = weldVolume.volumeCm3 * numPipes;
                      weldVolumeInfo = { totalVolumeCm3, legSizeMm: weldVolume.legSizeMm };
                    }

                    return (
                      <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                        <p className="text-xs text-purple-800 font-medium">Welds</p>
                        <p className="text-lg font-bold text-purple-900">{totalWelds}</p>
                        <div className="text-xs text-purple-600 mt-0.5">
                          {totalFlangeWelds > 0 && (
                            <p>
                              {totalFlangeWelds} flange × 2×{circumferenceMm.toFixed(0)}mm ={" "}
                              {flangeWeldLengthM.toFixed(2)} l/m
                            </p>
                          )}
                          {totalSpigotWelds > 0 && (
                            <p>
                              {totalSpigotWelds} spigot × {spigotCircumferenceMm.toFixed(0)}mm ={" "}
                              {spigotWeldLengthM.toFixed(2)} l/m
                            </p>
                          )}
                          {totalTackWeldEnds > 0 && (
                            <p>
                              {totalTackWeldEnds} L/F tack = {tackWeldLengthM.toFixed(2)} l/m
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-purple-800 font-semibold mt-1">
                          Total: {totalWeldLengthM.toFixed(2)} l/m
                        </p>
                        {weldVolumeInfo && (
                          <>
                            <p className="text-xs text-purple-800 font-medium mt-1">Weld Volume</p>
                            <p className="text-sm font-bold text-purple-900">
                              {weldVolumeInfo.totalVolumeCm3.toFixed(1)} cm³{" "}
                              <span className="font-normal text-xs text-purple-600">
                                ({weldVolumeInfo.legSizeMm.toFixed(1)}mm leg)
                              </span>
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {showSurfaceProtection &&
                    entry.calculation?.outsideDiameterMm &&
                    entry.specs.wallThicknessMm &&
                    (() => {
                      const pressureClassId =
                        entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                      const pressureClassDesignation = pressureClassId
                        ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)
                            ?.designation
                        : undefined;
                      const surfaceAreaResult = calculateTotalSurfaceArea({
                        outsideDiameterMm: entry.calculation.outsideDiameterMm,
                        insideDiameterMm: calculateInsideDiameter(
                          entry.calculation.outsideDiameterMm,
                          entry.specs.wallThicknessMm,
                        ),
                        individualPipeLengthM: entry.specs.individualPipeLength || 0,
                        numberOfPipes: entry.calculation?.calculatedPipeCount || 0,
                        hasFlangeEnd1: (entry.specs.pipeEndConfiguration || "PE") !== "PE",
                        hasFlangeEnd2: ["FBE", "FOE_RF", "2X_RF"].includes(
                          entry.specs.pipeEndConfiguration || "PE",
                        ),
                        dn: entry.specs.nominalBoreMm,
                        pressureClass: pressureClassDesignation,
                      });
                      const numPipes = entry.calculation?.calculatedPipeCount || 0;
                      return (
                        <div className="flex gap-2">
                          <div className="flex-1 bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                            <p className="text-xs text-indigo-700 font-medium">External m²</p>
                            <p className="text-lg font-bold text-indigo-900">
                              {surfaceAreaResult.total.totalExternalAreaM2.toFixed(2)}
                            </p>
                            <div className="text-xs text-indigo-600 mt-1 text-left">
                              <p>
                                Pipe:{" "}
                                {(surfaceAreaResult.perPipe.externalPipeAreaM2 * numPipes).toFixed(
                                  3,
                                )}
                              </p>
                              {surfaceAreaResult.perPipe.externalFlangeBackAreaM2 > 0 && (
                                <p>
                                  Flanges:{" "}
                                  {(
                                    surfaceAreaResult.perPipe.externalFlangeBackAreaM2 * numPipes
                                  ).toFixed(3)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 bg-cyan-50 p-2 rounded text-center border border-cyan-200">
                            <p className="text-xs text-cyan-700 font-medium">Internal m²</p>
                            <p className="text-lg font-bold text-cyan-900">
                              {surfaceAreaResult.total.totalInternalAreaM2.toFixed(2)}
                            </p>
                            <div className="text-xs text-cyan-600 mt-1 text-left">
                              <p>
                                Pipe:{" "}
                                {(surfaceAreaResult.perPipe.internalPipeAreaM2 * numPipes).toFixed(
                                  3,
                                )}
                              </p>
                              {surfaceAreaResult.perPipe.internalFlangeFaceAreaM2 > 0 && (
                                <p>
                                  Flanges:{" "}
                                  {(
                                    surfaceAreaResult.perPipe.internalFlangeFaceAreaM2 * numPipes
                                  ).toFixed(3)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
