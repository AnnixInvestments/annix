import { useCallback, useEffect, useState } from "react";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import {
  PRESSURE_CALC_CORROSION_ALLOWANCE,
  PRESSURE_CALC_JOINT_EFFICIENCY,
  PRESSURE_CALC_SAFETY_FACTOR,
  recommendedPressureClassId,
  scheduleListForSpec,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import {
  useAllFlangeTypes,
  useAllFlangeTypeWeights,
  useAllRetainingRingWeights,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import {
  calculateMinWallThickness,
  findRecommendedSchedule,
} from "@/app/lib/utils/pipeCalculations";
import { useFlangeResolution } from "../hooks/useFlangeResolution";
import { useMaterialSelector } from "../hooks/useMaterialSelector";
import type { StraightPipeFormProps } from "../StraightPipeForm";
import { type FlangeTypeItem, type PressureClassItem, type SteelSpecItem } from "../shared";

export function useStraightPipeFormLogic(props: StraightPipeFormProps) {
  const {
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
  } = props;
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
        const rawScheduleDesignationAlt = dim.schedule_designation;
        const rawScheduleNumberStr = dim.scheduleNumber?.toString();
        const rawScheduleNumberStrAlt = dim.schedule_number?.toString();
        const schedName =
          rawScheduleDesignation ||
          rawScheduleDesignationAlt ||
          rawScheduleNumberStr ||
          rawScheduleNumberStrAlt;
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

  return {
    entry,
    index,
    globalSpecs,
    masterData,
    onUpdateEntry,
    generateItemDescription,
    nominalBores,
    availableSchedulesMap,
    pressureClassesByStandard,
    getFilteredPressureClasses,
    errors,
    isLoadingNominalBores,
    MAX_QUANTITY_UNREGISTERED,
    allFlangeTypes,
    allRetainingRings,
    allWeights,
    effectiveSteelSpecId,
    flangePressureClassId,
    flangeResolution,
    flangeSpecs,
    flangeStandardId,
    flangeTypeCode,
    flangeTypesLength,
    groupedSteelOptions,
    gsWorkingPressureBar,
    gsWorkingTemperatureC,
    handleNominalBoreChange,
    handleNumberOfSpigots,
    handleScheduleChange,
    handleSpigotDistanceChange,
    handleSpigotHeightChange,
    handleSpigotNominalBoreChange,
    handleSpigotSteelSpecChange,
    handleTemperatureChange,
    handleWorkingPressureChange,
    hasFlanges,
    isSteelFromGlobal,
    isSteelOverride,
    isUnregisteredCustomer,
    nbToOdMap,
    nominalBoreMm,
    pipeEndConfiguration,
    qtyEachDisplayValue,
    quantityLimitPopup,
    rawClosureLengthMm,
    rawDescription,
    rawFlangePressureClassId,
    rawFlangeStandardId,
    rawFlangeStandards,
    rawFlangeTypeCode,
    rawIndividualPipeLength2,
    rawLength,
    rawNominalBoreMm,
    rawNumberOfSpigots,
    rawPipeEndConfiguration,
    rawPipeEndConfiguration8,
    rawPipeType,
    rawPressureClasses,
    rawPuddleFlangeHoleCount,
    rawPuddleFlangeHoleIdMm,
    rawPuddleFlangeLocationMm,
    rawPuddleFlangeOdMm,
    rawPuddleFlangePcdMm,
    rawPuddleFlangeThicknessMm,
    rawQuantityValue,
    rawQuantityValue2,
    rawQuantityValue3,
    rawQuantityValue4,
    rawScheduleNumber,
    rawSelectedNotes,
    rawSpecs,
    rawSteelSpecs,
    rawSteelSpecs2,
    rawWallThicknessMm15,
    rawWorkingPressureBar2,
    rawWorkingPressureBar3,
    rawWorkingPressureBar4,
    rawWorkingPressureBar6,
    rawWorkingTemperatureC2,
    rawWorkingTemperatureC4,
    selectedSteelSpecName,
    setFlangeSpecs,
    setQuantityLimitPopup,
    showSurfaceProtection,
    specs,
    totalLineDisplayValue,
  };
}

export type StraightPipeFormLogic = ReturnType<typeof useStraightPipeFormLogic>;
