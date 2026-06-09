"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { masterDataApi } from "@/app/lib/api/client";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import {
  useAllFlangeTypes,
  useAllFlangeTypeWeights,
  useAllRetainingRingWeights,
  useAnsiFittingDimensions,
  useAnsiFittingSchedules,
  useAnsiFittingSizes,
  useAnsiFittingTypes,
  useForgedFittingDimensions,
  useForgedFittingSeries,
  useForgedFittingSizes,
  useForgedFittingTypes,
  useMalleableFittingSizes,
  useMalleableFittingTypes,
  useNbToOdMap,
} from "@/app/lib/query/hooks";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import {
  getLateralDimensionsForAngle,
  LateralAngleRange,
} from "@/app/lib/utils/sabs719LateralData";
import { useFlangeResolution } from "../hooks/useFlangeResolution";
import { useMaterialSelector } from "../hooks/useMaterialSelector";

interface StubCalcData {
  stubNB: number;
  stubLengthMm: number;
  stubOdMm: number;
  stubPipeWeight: number;
  stubFlangeWeight: number;
  stubBlankWeight: number;
  stubHasFlange: boolean;
  hasBlankFlange: boolean;
  stubToMainWeldMm: number;
  stubFlangeWeldMm: number;
  stubCircMm: number;
}

export interface FittingFormProps {
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
  onCalculateFitting?: (id: string) => void;
  generateItemDescription: (entry: any) => string;
  Tee3DPreview?: React.ComponentType<any> | null;
  Lateral3DPreview?: React.ComponentType<any> | null;
  Reducer3DPreview?: React.ComponentType<any> | null;
  OffsetBend3DPreview?: React.ComponentType<any> | null;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  requiredProducts?: string[];
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
  isUnregisteredCustomer?: boolean;
  onShowRestrictionPopup?: (
    type: "itemLimit" | "quantityLimit" | "drawings",
  ) => (e: React.MouseEvent) => void;
}

export function useFittingFormLogic(props: FittingFormProps) {
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
    onCalculateFitting,
    generateItemDescription,
    Tee3DPreview,
    Lateral3DPreview,
    Reducer3DPreview,
    OffsetBend3DPreview,
    pressureClassesByStandard,
    getFilteredPressureClasses,
    requiredProducts = [],
    errors = {},
    isLoadingNominalBores = false,
    isUnregisteredCustomer = false,
    onShowRestrictionPopup,
  } = props;
  log.info(`🔄 FittingForm RENDER - entry.id: ${entry.id}, index: ${index}`);

  const { data: nbToOdMap = {} } = useNbToOdMap();
  const { data: allWeights = [] } = useAllFlangeTypeWeights();
  const { data: allRetainingRings = [] } = useAllRetainingRingWeights();
  const { data: allFlangeTypes = [] } = useAllFlangeTypes();

  const effectiveFittingStandard = useMemo(() => {
    if (entry.specs?.fittingStandard) return entry.specs.fittingStandard;
    const rawSteelSpecificationId = entry.specs?.steelSpecificationId;
    const isSABS719Steel = (rawSteelSpecificationId || globalSpecs?.steelSpecificationId) === 8;
    return isSABS719Steel ? "SABS719" : "SABS62";
  }, [
    entry.specs?.fittingStandard,
    entry.specs?.steelSpecificationId,
    globalSpecs?.steelSpecificationId,
  ]);

  const isAnsiStandard = effectiveFittingStandard === "ASME_B16_9";
  const isForgedStandard = effectiveFittingStandard === "ASME_B16_11";
  const isMalleableStandard = effectiveFittingStandard === "BS_143";

  const { data: ansiFittingTypes = [] } = useAnsiFittingTypes();
  const rawFittingType = entry.specs?.fittingType;
  const { data: ansiSchedules = [] } = useAnsiFittingSchedules(
    isAnsiStandard ? rawFittingType || null : null,
  );
  const rawFittingType2 = entry.specs?.fittingType;
  const rawAnsiSchedule = entry.specs?.ansiSchedule;
  const { data: ansiSizes = [] } = useAnsiFittingSizes(
    isAnsiStandard ? rawFittingType2 || null : null,
    isAnsiStandard ? rawAnsiSchedule || undefined : undefined,
  );
  const rawFittingType3 = entry.specs?.fittingType;
  const rawNominalDiameterMm = entry.specs?.nominalDiameterMm;
  const rawAnsiSchedule2 = entry.specs?.ansiSchedule;
  const { data: ansiDimensionData } = useAnsiFittingDimensions(
    isAnsiStandard ? rawFittingType3 || null : null,
    isAnsiStandard ? rawNominalDiameterMm || null : null,
    isAnsiStandard ? rawAnsiSchedule2 || null : null,
  );

  const { data: forgedFittingTypes = [] } = useForgedFittingTypes();
  const { data: forgedSeries = [] } = useForgedFittingSeries();
  const rawFittingType4 = entry.specs?.fittingType;
  const rawForgedPressureClass = entry.specs?.forgedPressureClass;
  const rawForgedConnectionType = entry.specs?.forgedConnectionType;
  const { data: forgedSizes = [] } = useForgedFittingSizes(
    isForgedStandard ? rawFittingType4 || null : null,
    isForgedStandard ? rawForgedPressureClass || null : null,
    isForgedStandard ? rawForgedConnectionType || null : null,
  );
  const rawFittingType5 = entry.specs?.fittingType;
  const rawNominalDiameterMm2 = entry.specs?.nominalDiameterMm;
  const rawForgedPressureClass2 = entry.specs?.forgedPressureClass;
  const rawForgedConnectionType2 = entry.specs?.forgedConnectionType;
  const { data: forgedDimensionData } = useForgedFittingDimensions(
    isForgedStandard ? rawFittingType5 || null : null,
    isForgedStandard ? rawNominalDiameterMm2 || null : null,
    isForgedStandard ? rawForgedPressureClass2 || null : null,
    isForgedStandard ? rawForgedConnectionType2 || null : null,
  );

  const { data: malleableFittingTypes = [] } = useMalleableFittingTypes();
  const rawFittingType6 = entry.specs?.fittingType;
  const rawMalleablePressureClass = entry.specs?.malleablePressureClass;
  const { data: malleableSizes = [] } = useMalleableFittingSizes(
    isMalleableStandard ? rawFittingType6 || null : null,
    isMalleableStandard ? rawMalleablePressureClass || null : null,
  );

  useEffect(() => {
    if (!isAnsiStandard && !isForgedStandard) return;
    const dims = isAnsiStandard ? ansiDimensionData : forgedDimensionData;
    const dbWeight = dims ? Number(isAnsiStandard ? dims.weightKg : dims.massKg) || null : null;
    if (dbWeight !== null && dbWeight !== entry.specs?.dbFittingWeightKg) {
      onUpdateEntry(entry.id, {
        specs: { ...entry.specs, dbFittingWeightKg: dbWeight },
      });
    }
  }, [
    isAnsiStandard,
    isForgedStandard,
    ansiDimensionData,
    forgedDimensionData,
    entry.id,
    entry.specs,
    onUpdateEntry,
  ]);

  const [flangeSpecs, setFlangeSpecs] = useState<FlangeSpecData | null>(null);
  const [dimensionsUnavailable, setDimensionsUnavailable] = useState(false);
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoPopulatedDimensionsRef = useRef<Set<string>>(new Set());

  const debouncedCalculate = useCallback(() => {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }
    calculateTimeoutRef.current = setTimeout(() => {
      if (onCalculateFitting) {
        onCalculateFitting(entry.id);
      }
    }, 100);
  }, [entry.id, onCalculateFitting]);

  const handleWorkingPressureChange = useCallback(
    (value: number | undefined) => {
      onUpdateEntry(entry.id, { specs: { ...entry.specs, workingPressureBar: value } });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleWorkingTemperatureChange = useCallback(
    (value: number | undefined) => {
      onUpdateEntry(entry.id, { specs: { ...entry.specs, workingTemperatureC: value } });
    },
    [entry.id, entry.specs, onUpdateEntry],
  );

  const handleResetOverrides = useCallback(() => {
    onUpdateEntry(entry.id, {
      specs: { ...entry.specs, workingPressureBar: undefined, workingTemperatureC: undefined },
    });
  }, [entry.id, entry.specs, onUpdateEntry]);

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

  const rawLength = masterData?.flangeTypes?.length;

  const flangeTypesLength = rawLength || 0;

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

  const resolvedFlangeStandardCode = flangeResolution.flangeStandardCode;
  const resolvedPressureClassDesignation = flangeResolution.pressureClassDesignation;
  const resolvedFlangeTypeCode = flangeResolution.flangeTypeCode;

  useEffect(() => {
    log.info(`🔥 FittingForm useEffect[flangeSpecs] FIRED - entry.id: ${entry.id}`);
    const fetchSpecs = async () => {
      log.debug("FittingForm fetchSpecs", {
        hasFlanges,
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeCode,
      });
      if (!hasFlanges || !nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
        log.debug("FittingForm: missing required params, setting flangeSpecs to null");
        setFlangeSpecs(null);
        return;
      }

      const flangeType = masterData?.flangeTypes?.find((ft) => ft.code === flangeTypeCode);
      const flangeTypeId = flangeType?.id;
      log.debug("FittingForm: fetching with flangeTypeId", flangeTypeId);

      const specs = await fetchFlangeSpecsStatic(
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeId,
      );
      log.debug("FittingForm: received specs", specs);
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

  const fittingType = specs.fittingType;
  const fittingNb = specs.nominalDiameterMm;
  const isTeeType = [
    "SHORT_TEE",
    "GUSSET_TEE",
    "EQUAL_TEE",
    "UNEQUAL_SHORT_TEE",
    "UNEQUAL_GUSSET_TEE",
    "SHORT_REDUCING_TEE",
    "GUSSET_REDUCING_TEE",
  ].includes(fittingType || "");
  const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(fittingType || "");
  const isLateral = ["LATERAL", "REDUCING_LATERAL"].includes(fittingType || "");
  const isReducer = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType || "");
  const isOffsetBend = fittingType === "OFFSET_BEND";
  const rawSteelSpecificationId2 = specs.steelSpecificationId;
  const isSABS719ForDims = (rawSteelSpecificationId2 || globalSpecs?.steelSpecificationId) === 8;
  const rawFittingStandard = specs.fittingStandard;
  const effectiveStandardForDims = rawFittingStandard || (isSABS719ForDims ? "SABS719" : "SABS62");

  useEffect(() => {
    const trackingKey = `${entry.id}-${fittingType}-${fittingNb}`;
    const needsAutoPopulation =
      isTeeType && fittingType && fittingNb && !specs.pipeLengthAMm && !specs.pipeLengthBMm;

    if (!needsAutoPopulation || autoPopulatedDimensionsRef.current.has(trackingKey)) {
      return;
    }

    autoPopulatedDimensionsRef.current.add(trackingKey);
    setDimensionsUnavailable(false);

    masterDataApi
      .getFittingDimensions(
        effectiveStandardForDims as "SABS62" | "SABS719",
        fittingType!,
        fittingNb!,
        specs.angleRange,
      )
      .then((dims) => {
        if (dims) {
          const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(fittingType!);
          let pipeLengthA: number | null = null;
          let pipeLengthB: number | null = null;

          if (effectiveStandardForDims === "SABS62") {
            const centreToFace = dims.centreToFaceCMm ? Number(dims.centreToFaceCMm) : null;
            if (isEqualTee && centreToFace) {
              pipeLengthA = centreToFace * 2;
              pipeLengthB = centreToFace;
            } else if (centreToFace) {
              pipeLengthA = centreToFace;
              pipeLengthB = centreToFace;
            }
          } else {
            const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
            const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
            pipeLengthA = dimA;
            pipeLengthB = dimB;
          }

          if (pipeLengthA && pipeLengthB) {
            onUpdateEntry(entry.id, {
              specs: {
                ...entry.specs,
                pipeLengthAMm: pipeLengthA,
                pipeLengthAMmAuto: pipeLengthA,
                pipeLengthBMm: pipeLengthB,
                pipeLengthBMmAuto: pipeLengthB,
              },
            });
          }
        }
      })
      .catch(() => {
        setDimensionsUnavailable(true);
        log.debug(
          `Fitting dimensions not available for ${effectiveStandardForDims} ${fittingType} ${fittingNb}mm`,
        );
      });
  }, [
    entry.id,
    entry.specs,
    fittingType,
    fittingNb,
    isTeeType,
    effectiveStandardForDims,
    onUpdateEntry,
  ]);

  // Auto-populate lateral height (A/C/E dimension) when angle range or nominal bore changes
  useEffect(() => {
    const isLateralType = fittingType === "LATERAL" || fittingType === "Y_PIECE";
    const angleRange = specs.angleRange as LateralAngleRange | undefined;
    const nominalBore = specs.nominalDiameterMm;

    if (!isLateralType || !angleRange || !nominalBore) {
      return;
    }

    // Skip if user has manually overridden the value
    if (specs.lateralHeightOverride) {
      return;
    }

    const lateralDims = getLateralDimensionsForAngle(nominalBore, angleRange);
    if (lateralDims && specs.lateralHeightMm !== lateralDims.heightMm) {
      onUpdateEntry(entry.id, {
        specs: {
          ...entry.specs,
          lateralHeightMm: lateralDims.heightMm,
          lateralHeightMmAuto: lateralDims.heightMm,
        },
      });
    }
  }, [
    entry.id,
    specs.angleRange,
    specs.nominalDiameterMm,
    specs.lateralHeightOverride,
    specs.lateralHeightMm,
    fittingType,
    onUpdateEntry,
  ]);

  const rawQuantityValue = specs.quantityValue;

  const fittingQuantityDisplayValue = rawQuantityValue || "";

  const rawDescription = entry.description;
  const rawWorkingPressureBar = specs.workingPressureBar;
  const rawWorkingTemperatureC = specs.workingTemperatureC;
  const rawSteelSpecs = masterData.steelSpecs;
  const rawAnsiSchedule3 = specs.ansiSchedule;
  const rawForgedConnectionType3 = specs.forgedConnectionType;
  const rawNominalDiameterMm4 = specs.nominalDiameterMm;
  const rawSteelSpecificationId13 = specs.steelSpecificationId;
  const rawHasStubs = specs.hasStubs;
  const rawPipeLengthAMm2 = specs.pipeLengthAMm;
  const rawPipeLengthBMm3 = specs.pipeLengthBMm;
  const rawStubLocation = specs.stubLocation;
  const rawReducerLengthMm = specs.reducerLengthMm;
  const rawHasReducerStub = specs.hasReducerStub;
  const rawOffsetLengthA = specs.offsetLengthA;
  const rawOffsetLengthB = specs.offsetLengthB;
  const rawOffsetLengthC = specs.offsetLengthC;
  const rawOffsetAngleDegrees = specs.offsetAngleDegrees;
  const rawReducerStubAngleDegrees = specs.reducerStubAngleDegrees;
  const rawNumberOfStubs = specs.numberOfStubs;
  const rawStubs2 = specs.stubs;
  const rawNominalDiameterMm8 = specs.nominalDiameterMm;
  const rawPipeEndConfiguration4 = specs.pipeEndConfiguration;
  const rawNominalDiameterMm9 = specs.nominalDiameterMm;
  const rawClosureLengthMm = specs.closureLengthMm;
  const rawWallThicknessMm17 = specs.wallThicknessMm;
  const rawCalcWallThickness17 = entry.calculation?.wallThicknessMm;
  const rawSelectedNotes = entry.selectedNotes;

  return {
    Lateral3DPreview,
    OffsetBend3DPreview,
    Reducer3DPreview,
    Tee3DPreview,
    allFlangeTypes,
    allRetainingRings,
    allWeights,
    ansiDimensionData,
    ansiFittingTypes,
    ansiSchedules,
    ansiSizes,
    copiedItemId,
    debouncedCalculate,
    dimensionsUnavailable,
    effectiveFittingStandard,
    entriesCount,
    entry,
    errors,
    fittingNb,
    fittingQuantityDisplayValue,
    fittingType,
    flangeSpecs,
    forgedDimensionData,
    forgedFittingTypes,
    forgedSeries,
    forgedSizes,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    handleResetOverrides,
    handleWorkingPressureChange,
    handleWorkingTemperatureChange,
    index,
    isAnsiStandard,
    isForgedStandard,
    isLateral,
    isMalleableStandard,
    isOffsetBend,
    isReducer,
    isTeeType,
    isUnequalTee,
    isUnregisteredCustomer,
    malleableFittingTypes,
    malleableSizes,
    masterData,
    nbToOdMap,
    onCopyEntry,
    onDuplicateEntry,
    onRemoveEntry,
    onShowRestrictionPopup,
    onUpdateEntry,
    pressureClassesByStandard,
    rawAnsiSchedule3,
    rawCalcWallThickness17,
    rawClosureLengthMm,
    rawDescription,
    rawForgedConnectionType3,
    rawForgedPressureClass,
    rawHasReducerStub,
    rawHasStubs,
    rawNominalDiameterMm4,
    rawNominalDiameterMm8,
    rawNominalDiameterMm9,
    rawNumberOfStubs,
    rawOffsetAngleDegrees,
    rawOffsetLengthA,
    rawOffsetLengthB,
    rawOffsetLengthC,
    rawPipeEndConfiguration4,
    rawPipeLengthAMm2,
    rawPipeLengthBMm3,
    rawReducerLengthMm,
    rawReducerStubAngleDegrees,
    rawSelectedNotes,
    rawSteelSpecificationId13,
    rawSteelSpecs,
    rawStubLocation,
    rawStubs2,
    rawWallThicknessMm17,
    rawWorkingPressureBar,
    rawWorkingTemperatureC,
    requiredProducts,
    resolvedFlangeStandardCode,
    resolvedFlangeTypeCode,
    resolvedPressureClassDesignation,
    selectedSteelSpecName,
    specs,
  };
}
export type FittingFormLogic = ReturnType<typeof useFittingFormLogic>;
