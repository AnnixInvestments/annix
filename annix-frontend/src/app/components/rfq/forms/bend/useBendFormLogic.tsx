"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalCustomerAuth } from "@/app/context/CustomerAuthContext";
import { useBendCalculations } from "@/app/hooks/useBendCalculations";
import { masterDataApi } from "@/app/lib/api/client";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import { useAllFlangeTypes, useAllFlangeTypeWeights, useNbToOdMap } from "@/app/lib/query/hooks";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import { isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";
import { useFlangeResolution } from "../hooks/useFlangeResolution";
import { useMaterialSelector } from "../hooks/useMaterialSelector";
import { type FlangeTypeItem, type SteelSpecItem } from "../shared";

export interface BendFormProps {
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
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

export function useBendFormLogic(props: BendFormProps) {
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
    onCalculateBend,
    generateItemDescription,
    Bend3DPreview,
    pressureClassesByStandard,
    getFilteredPressureClasses,
    isUnregisteredCustomer: isUnregisteredCustomerProp,
    onShowRestrictionPopup,
  } = props;
  const rawErrors = props.errors;
  const errors = rawErrors || {};
  const rawIsLoadingNominalBores = props.isLoadingNominalBores;
  const isLoadingNominalBores = rawIsLoadingNominalBores || false;
  const rawRequiredProducts = props.requiredProducts;
  const requiredProducts = rawRequiredProducts || [];
  log.info(`🔄 BendForm RENDER - entry.id: ${entry.id}, index: ${index}`);

  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();

  // Authentication status for quantity restrictions
  // Don't apply restrictions while auth is still loading
  const { isAuthenticated, isLoading: isAuthLoading } = useOptionalCustomerAuth();
  const isUnregisteredCustomer = isUnregisteredCustomerProp ?? (!isAuthLoading && !isAuthenticated);
  const MAX_QUANTITY_UNREGISTERED = 1;
  const [quantityLimitPopup, setQuantityLimitPopup] = useState<{ x: number; y: number } | null>(
    null,
  );

  const bendCalcs = useBendCalculations(entry, globalSpecs, masterData);

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
  const rawBendEndConfiguration = specs.bendEndConfiguration;
  const bendEndConfiguration = rawBendEndConfiguration || "PE";
  const hasFlanges = bendEndConfiguration !== "PE";

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
    endConfiguration: bendEndConfiguration,
  });

  const rawLength = masterData?.flangeTypes?.length;

  const flangeTypesLength = rawLength || 0;

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

      const flangeType = masterData?.flangeTypes?.find(
        (ft: FlangeTypeItem) => ft.code === flangeTypeCode,
      );
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

  const steelSpec = masterData?.steelSpecs?.find((s: SteelSpecItem) => {
    const rawSteelSpecificationId = specs.steelSpecificationId;
    return s.id === (rawSteelSpecificationId || globalSpecs?.steelSpecificationId);
  });
  const rawSteelSpecName = steelSpec?.steelSpecName;
  const steelSpecName = rawSteelSpecName || "";
  const isSABS719 = steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
  const rawBendStyle = specs.bendStyle;
  const currentBendStyle = rawBendStyle || (isSABS719 ? "segmented" : "pulled");
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
      const nominalBore = specs.nominalBoreMm;

      const newSpec = newSpecId
        ? masterData.steelSpecs?.find((s: SteelSpecItem) => s.id === newSpecId)
        : null;
      const rawSteelSpecName2 = newSpec?.steelSpecName;
      const newSpecName = rawSteelSpecName2 || "";
      const isNewSABS719 = newSpecName.includes("SABS 719") || newSpecName.includes("SANS 719");

      const rawSteelSpecificationId2 = specs.steelSpecificationId;

      const oldSpecId = rawSteelSpecificationId2 || globalSpecs?.steelSpecificationId;
      const oldSpec = oldSpecId
        ? masterData.steelSpecs?.find((s: SteelSpecItem) => s.id === oldSpecId)
        : null;
      const rawSteelSpecName3 = oldSpec?.steelSpecName;
      const oldSpecName = rawSteelSpecName3 || "";
      const wasOldSABS719 = oldSpecName.includes("SABS 719") || oldSpecName.includes("SANS 719");

      const specTypeChanged = isNewSABS719 !== wasOldSABS719;
      const clearPslFields = !isApi5LSpec(newSpecName);
      const updatedEntry: any = {
        ...entry,
        specs: {
          ...entry.specs,
          steelSpecificationId: newSpecId,
          scheduleNumber: specTypeChanged ? undefined : specs.scheduleNumber,
          wallThicknessMm: specTypeChanged ? undefined : specs.wallThicknessMm,
          bendType: specTypeChanged ? undefined : specs.bendType,
          bendRadiusType: specTypeChanged ? undefined : specs.bendRadiusType,
          bendDegrees: specTypeChanged ? undefined : specs.bendDegrees,
          numberOfSegments: specTypeChanged ? undefined : specs.numberOfSegments,
          centerToFaceMm: specTypeChanged ? undefined : specs.centerToFaceMm,
          bendRadiusMm: specTypeChanged ? undefined : specs.bendRadiusMm,
          ...(clearPslFields
            ? {
                pslLevel: null,
                cvnTestTemperatureC: null,
                cvnAverageJoules: null,
                cvnMinimumJoules: null,
                heatNumber: null,
                mtcReference: null,
              }
            : {}),
        },
      };
      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);

      if (
        !specTypeChanged &&
        nominalBore &&
        specs.scheduleNumber &&
        specs.bendType &&
        specs.bendDegrees
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
      const rawBendItemType = specs.bendItemType;
      const oldItemType = rawBendItemType || "BEND";
      const isFixed90 = newItemType === "SWEEP_TEE" || newItemType === "DUCKFOOT_BEND";
      const switchingToOrFromSweepTee =
        (newItemType === "SWEEP_TEE") !== (oldItemType === "SWEEP_TEE");
      const currentNB = specs.nominalBoreMm;
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
          bendDegrees: isFixed90 ? 90 : specs.bendDegrees,
          bendEndConfiguration: switchingToOrFromSweepTee ? "PE" : specs.bendEndConfiguration,
          nominalBoreMm: nbInvalidForSweepTee ? undefined : specs.nominalBoreMm,
          numberOfTangents: hideTangentsAndStubs ? 0 : specs.numberOfTangents,
          tangentLengths: hideTangentsAndStubs ? [] : specs.tangentLengths,
          numberOfStubs: hideTangentsAndStubs ? 0 : specs.numberOfStubs,
          stubs: hideTangentsAndStubs ? [] : specs.stubs,
          closureLengthMm: hideTangentsAndStubs ? undefined : specs.closureLengthMm,
          duckfootBasePlateXMm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootBasePlateXMm : undefined,
          duckfootBasePlateYMm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootBasePlateYMm : undefined,
          duckfootInletCentreHeightMm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootInletCentreHeightMm : undefined,
          duckfootRibThicknessT2Mm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootRibThicknessT2Mm : undefined,
          duckfootPlateThicknessT1Mm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootPlateThicknessT1Mm : undefined,
          duckfootGussetPointDDegrees:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetPointDDegrees : undefined,
          duckfootGussetPointCDegrees:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetPointCDegrees : undefined,
          duckfootGussetCount:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetCount : undefined,
          duckfootGussetPlacement:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetPlacement : undefined,
          duckfootGussetThicknessMm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetThicknessMm : undefined,
          duckfootGussetMaterialGrade:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetMaterialGrade : undefined,
          duckfootGussetHeelOffsetMm:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetHeelOffsetMm : undefined,
          duckfootGussetAngleDegrees:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetAngleDegrees : undefined,
          duckfootGussetWeldType:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetWeldType : undefined,
          duckfootGussetWeldElectrode:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetWeldElectrode : undefined,
          duckfootGussetPreheatTempC:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetPreheatTempC : undefined,
          duckfootGussetPwhtRequired:
            newItemType === "DUCKFOOT_BEND" ? specs.duckfootGussetPwhtRequired : undefined,
          sweepTeePipeALengthMm:
            newItemType === "SWEEP_TEE" ? specs.sweepTeePipeALengthMm : undefined,
        },
      };
      updatedEntry.description = generateItemDescription(updatedEntry);
      onUpdateEntry(entry.id, updatedEntry);
    },
    [entry, generateItemDescription, onUpdateEntry],
  );

  const handleTangentCountChange = useCallback(
    (count: number, newLengths: number[]) => {
      const rawNumberOfStubs = specs.numberOfStubs;
      const currentNumStubs = rawNumberOfStubs || 0;
      const adjustedNumStubs = count < 2 && currentNumStubs > 1 ? 1 : currentNumStubs;
      const rawStubs = specs.stubs;
      const currentStubs = rawStubs || [];
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
      if (specs.nominalBoreMm && specs.scheduleNumber && specs.bendType && specs.bendDegrees) {
        debouncedCalculate();
      }
    },
    [entry, generateItemDescription, onUpdateEntry, debouncedCalculate],
  );

  const handleTangentLengthChange = useCallback(
    (index: number, length: number) => {
      const rawTangentLengths = specs.tangentLengths;
      const lengths = [...(rawTangentLengths || [])];
      lengths[index] = length;
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, tangentLengths: lengths },
      });
      if (specs.nominalBoreMm && specs.scheduleNumber && specs.bendType && specs.bendDegrees) {
        debouncedCalculate();
      }
    },
    [entry.id, entry.specs, onUpdateEntry, debouncedCalculate],
  );

  const [pipeALengthSource, setPipeALengthSource] = useState<"auto" | "override" | null>(null);

  useEffect(() => {
    const fetchAndSetPipeALength = async () => {
      if (specs.bendItemType !== "SWEEP_TEE") {
        return;
      }
      if (!specs.nominalBoreMm) {
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
        ? specs.bendRadiusType
          ? segmentedToSweepTeeMap[entry.specs.bendRadiusType]
          : null
        : specs.bendType
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
    specs.bendItemType,
    specs.nominalBoreMm,
    specs.bendRadiusType,
    specs.bendType,
    isCurrentlySegmented,
    lastFetchedParams,
    entry.id,
    entry.specs,
    onUpdateEntry,
  ]);

  const rawItem0 = specs.stubs?.[0];

  const stub0 = rawItem0 || {};
  const rawItem1 = specs.stubs?.[1];
  const stub1 = rawItem1 || {};

  const rawDescription = entry.description;
  const rawBendItemType2 = specs.bendItemType;
  const rawWorkingPressureBar2 = specs.workingPressureBar;
  const rawWorkingTemperatureC2 = specs.workingTemperatureC;
  const rawSteelSpecs = masterData.steelSpecs;
  const rawBendEndConfiguration4 = specs.bendEndConfiguration;
  const rawNominalBoreMm3 = specs.nominalBoreMm;
  const rawClosureLengthMm = specs.closureLengthMm;
  const rawWallThicknessMm6 = specs.wallThicknessMm;
  const calcWallThicknessMm = entry.calculation?.wallThicknessMm;
  const rawNumberOfTangents = specs.numberOfTangents;
  const rawTangentLengths2 = specs.tangentLengths;
  const rawNumberOfStubs3 = specs.numberOfStubs;
  const rawNumberOfStubs4 = specs.numberOfStubs;
  const rawNumberOfStubs5 = specs.numberOfStubs;
  const rawNumberOfStubs6 = specs.numberOfStubs;
  const rawNumberOfStubs7 = specs.numberOfStubs;
  const rawLength2 = stub0.length;
  const rawNumberOfStubs8 = specs.numberOfStubs;
  const rawLocationFromFlange = stub0.locationFromFlange;
  const rawNumberOfStubs9 = specs.numberOfStubs;
  const rawNumberOfStubs10 = specs.numberOfStubs;
  const rawNumberOfTangents3 = specs.numberOfTangents;
  const rawLength3 = stub1.length;
  const rawLocationFromFlange2 = stub1.locationFromFlange;
  const rawSelectedNotes = entry.selectedNotes;

  return {
    Bend3DPreview,
    MAX_QUANTITY_UNREGISTERED,
    allFlangeTypes,
    allWeights,
    bendCalcs,
    calcWallThicknessMm,
    copiedItemId,
    debouncedCalculate,
    entriesCount,
    entry,
    errors,
    flangeResolution,
    flangeSpecs,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    handleItemTypeChange,
    handleResetOverrides,
    handleSteelSpecChange,
    handleTangentCountChange,
    handleTangentLengthChange,
    handleWorkingPressureChange,
    handleWorkingTemperatureChange,
    index,
    isUnregisteredCustomer,
    masterData,
    nbToOdMap,
    onCopyEntry,
    onDuplicateEntry,
    onRemoveEntry,
    onShowRestrictionPopup,
    onUpdateEntry,
    pipeALengthSource,
    pressureClassesByStandard,
    quantityLimitPopup,
    rawBendEndConfiguration4,
    rawBendItemType2,
    rawClosureLengthMm,
    rawDescription,
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
    rawSelectedNotes,
    rawSteelSpecs,
    rawTangentLengths2,
    rawWallThicknessMm6,
    rawWorkingPressureBar2,
    rawWorkingTemperatureC2,
    requiredProducts,
    selectedSteelSpecName,
    setLastFetchedParams,
    setPipeALengthSource,
    setQuantityLimitPopup,
    specs,
    stub0,
    stub1,
  };
}
export type BendFormLogic = ReturnType<typeof useBendFormLogic>;
