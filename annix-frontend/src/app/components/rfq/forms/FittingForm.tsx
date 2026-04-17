"use client";

import { NACE_MAX_HARDNESS_HRC } from "@annix/product-data/steel";
import { toPairs as entries, keys } from "es-toolkit/compat";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkingConditionsSection } from "@/app/components/rfq/sections/WorkingConditionsSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/warnings/MaterialSuitabilityWarning";
import { Select } from "@/app/components/ui/Select";
import { masterDataApi } from "@/app/lib/api/client";
import {
  ALL_FITTING_SIZES,
  BS_4504_PRESSURE_CLASSES,
  FITTING_CLASS_WALL_THICKNESS,
  FITTING_END_OPTIONS,
  closureWeight as getClosureWeight,
  fittingFlangeConfig as getFittingFlangeConfig,
  reducerFlangeConfig as getReducerFlangeConfig,
  tackWeldWeight as getTackWeldWeight,
  weldCountPerFitting as getWeldCountPerFitting,
  hasLooseFlange,
  REDUCER_END_OPTIONS,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  SABS_1123_PRESSURE_CLASSES,
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  scheduleListForSpec,
  standardReducerLengthForNb,
  validSmallNbForLargeNb,
} from "@/app/lib/config/rfq";
import { FlangeSpecData, fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import {
  flangeTypesForStandardCode,
  flangeWeight,
  retainingRingWeightLookup,
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
  calculateComprehensiveSurfaceArea,
  calculateFittingWeldVolume,
  calculatePipeWeightPerMeter,
  getMinWallThicknessForNB,
} from "@/app/lib/utils/pipeCalculations";
import { validatePressureClass } from "@/app/lib/utils/pressureClassValidation";
import {
  calculateBlankFlangeWeight,
  flangeWeightOr,
  resolveFlangeConfig,
  scheduleToFittingClass,
} from "@/app/lib/utils/rfqFlangeCalculations";
import {
  getLateralDimensionsForAngle,
  LateralAngleRange,
} from "@/app/lib/utils/sabs719LateralData";
import { getGussetSection } from "@/app/lib/utils/sabs719TeeData";
import { isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";
import { getPipeEndConfigurationDetails } from "@/app/lib/utils/systemUtils";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import {
  type FlangeStandardItem,
  type PressureClassItem,
  type SteelSpecItem,
  SurfaceAreaDisplay,
  useGroupedSteelOptions,
  WeldSummaryCard,
} from "./shared";

type ScheduleItem = {
  id: number;
  scheduleDesignation: string;
  wallThicknessMm: number;
  scheduleNumber?: number;
};

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

function FittingFormComponent({
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
}: FittingFormProps) {
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

  const groupedSteelOptions = useGroupedSteelOptions(masterData);

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
  const rawSelectedNotes = entry.selectedNotes;

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="fitting"
        showSplitToggle={
          specs.fittingType &&
          [
            "SHORT_TEE",
            "GUSSET_TEE",
            "UNEQUAL_SHORT_TEE",
            "UNEQUAL_GUSSET_TEE",
            "SHORT_REDUCING_TEE",
            "GUSSET_REDUCING_TEE",
            "EQUAL_TEE",
            "UNEQUAL_TEE",
            "SWEEP_TEE",
            "GUSSETTED_TEE",
            "LATERAL",
            "REDUCING_LATERAL",
            "CON_REDUCER",
            "ECCENTRIC_REDUCER",
            "OFFSET_BEND",
          ].includes(specs.fittingType)
        }
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
                    {entry.materialType === "hdpe" ? "HDPE Fitting" : "PVC Fitting"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Detailed {entry.materialType.toUpperCase()} specifications will use the global
                  settings configured in Step 2. Item-specific overrides coming soon.
                </p>
              </div>
            )}

            {/* Item Description */}
            <div>
              <label
                htmlFor={`fitting-description-${entry.id}`}
                className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
              >
                Item Description *
              </label>
              <textarea
                id={`fitting-description-${entry.id}`}
                value={rawDescription || generateItemDescription(entry)}
                onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                rows={2}
                placeholder="e.g., 100NB Short Equal Tee Sch40 SABS719"
                required
                aria-required="true"
              />
              <div className="flex justify-between items-center mt-0.5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Edit the description or use the auto-generated one
                </p>
                {entry.description && entry.description !== generateItemDescription(entry) && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEntry(entry.id, { description: generateItemDescription(entry) })
                    }
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Reset to Auto-generated
                  </button>
                )}
              </div>
            </div>

            {/* Working Conditions - Item Override */}
            <WorkingConditionsSection
              color="green"
              entryId={entry.id}
              idPrefix="fitting"
              workingPressureBar={specs.workingPressureBar}
              workingTemperatureC={specs.workingTemperatureC}
              globalPressureBar={globalSpecs?.workingPressureBar}
              globalTemperatureC={globalSpecs?.workingTemperatureC}
              onPressureChange={handleWorkingPressureChange}
              onTemperatureChange={handleWorkingTemperatureChange}
              onReset={handleResetOverrides}
              gridCols={3}
              className="mb-3"
              extraFields={
                <div>
                  <label className="block text-xs font-semibold text-green-900 dark:text-green-300 mb-1">
                    Steel Specification *{(() => {
                      const hasGlobal = !!globalSpecs?.steelSpecificationId;
                      const hasOverride = !!specs.steelSpecificationId;
                      if (hasGlobal && !hasOverride)
                        return (
                          <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">
                            (From Specs Page)
                          </span>
                        );
                      if (hasOverride)
                        return (
                          <span className="text-orange-600 text-xs ml-1 font-normal">
                            (Override)
                          </span>
                        );
                      return null;
                    })()}
                  </label>
                  {(() => {
                    const selectId = `fitting-steel-spec-wc-${entry.id}`;
                    const rawSteelSpecificationId3 = specs.steelSpecificationId;
                    const effectiveSpecId =
                      rawSteelSpecificationId3 || globalSpecs?.steelSpecificationId;
                    const isOverride = !!specs.steelSpecificationId;
                    const isFromGlobal =
                      !specs.steelSpecificationId && !!globalSpecs?.steelSpecificationId;

                    return (
                      <Select
                        id={selectId}
                        value={String(effectiveSpecId || "")}
                        className={
                          isFromGlobal
                            ? "border-2 border-green-500"
                            : isOverride
                              ? "border-2 border-orange-500"
                              : ""
                        }
                        onChange={(value) => {
                          const newSpecId = value ? parseInt(value, 10) : undefined;

                          const rawSteelSpecName = masterData.steelSpecs?.find(
                            (s: SteelSpecItem) => s.id === newSpecId,
                          )?.steelSpecName;

                          const newSpecName = rawSteelSpecName || "";
                          const isSABS719 =
                            newSpecName.includes("SABS 719") || newSpecName.includes("SANS 719");
                          const newFittingStandard = isSABS719 ? "SABS719" : "SABS62";

                          const clearPslFields = !isApi5LSpec(newSpecName);
                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: newSpecId,
                              fittingStandard: newFittingStandard,
                              nominalDiameterMm: undefined,
                              scheduleNumber: undefined,
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
                        }}
                        options={[]}
                        groupedOptions={groupedSteelOptions}
                        placeholder="Select steel spec..."
                      />
                    );
                  })()}
                </div>
              }
            />
            <MaterialSuitabilityWarning
              color="green"
              steelSpecName={(() => {
                const rawSteelSpecificationId4 = specs.steelSpecificationId;
                const steelSpecId = rawSteelSpecificationId4 || globalSpecs?.steelSpecificationId;

                const rawSteelSpecName2 = masterData.steelSpecs?.find(
                  (s: SteelSpecItem) => s.id === steelSpecId,
                )?.steelSpecName;

                return rawSteelSpecName2 || "";
              })()}
              effectivePressure={rawWorkingPressureBar || globalSpecs?.workingPressureBar}
              effectiveTemperature={rawWorkingTemperatureC || globalSpecs?.workingTemperatureC}
              allSteelSpecs={rawSteelSpecs || []}
              onSelectSpec={(spec) => {
                const nominalDiameter = specs.nominalDiameterMm;
                let scheduleNumber = specs.scheduleNumber;
                let wallThicknessMm = specs.wallThicknessMm;

                if (nominalDiameter && globalSpecs?.workingPressureBar) {
                  const schedules = scheduleListForSpec(nominalDiameter, spec.id);
                  const minWT = getMinWallThicknessForNB(
                    nominalDiameter,
                    globalSpecs.workingPressureBar,
                  );

                  const eligibleSchedules = schedules
                    .filter((s: ScheduleItem) => {
                      const rawWallThicknessMm = s.wallThicknessMm;
                      return (rawWallThicknessMm || 0) >= minWT;
                    })
                    .sort((a: ScheduleItem, b: ScheduleItem) => {
                      const rawWallThicknessMm2 = a.wallThicknessMm;
                      const rawWallThicknessMm3 = b.wallThicknessMm;
                      return (rawWallThicknessMm2 || 0) - (rawWallThicknessMm3 || 0);
                    });

                  if (eligibleSchedules.length > 0) {
                    scheduleNumber = eligibleSchedules[0].scheduleDesignation;
                    wallThicknessMm = eligibleSchedules[0].wallThicknessMm;
                  } else if (schedules.length > 0) {
                    const sorted = [...schedules].sort((a: ScheduleItem, b: ScheduleItem) => {
                      const rawWallThicknessMm4 = b.wallThicknessMm;
                      const rawWallThicknessMm5 = a.wallThicknessMm;
                      return (rawWallThicknessMm4 || 0) - (rawWallThicknessMm5 || 0);
                    });
                    scheduleNumber = sorted[0].scheduleDesignation;
                    wallThicknessMm = sorted[0].wallThicknessMm;
                  }
                }

                onUpdateEntry(entry.id, {
                  specs: {
                    ...entry.specs,
                    steelSpecificationId: spec.id,
                    scheduleNumber,
                    wallThicknessMm,
                  },
                });
              }}
            />
            {/* PSL Level and CVN Fields - Only for API 5L specs */}
            {(() => {
              const rawSteelSpecificationId5 = specs.steelSpecificationId;
              const steelSpecId = rawSteelSpecificationId5 || globalSpecs?.steelSpecificationId;

              const rawSteelSpecName3 = masterData.steelSpecs?.find(
                (s: SteelSpecItem) => s.id === steelSpecId,
              )?.steelSpecName;

              const steelSpecName = rawSteelSpecName3 || "";
              const showPslFields = isApi5LSpec(steelSpecName);
              const pslLevel = specs.pslLevel;
              const showCvnFields = pslLevel === "PSL2";

              if (!showPslFields) return null;

              const rawCvnTestTemperatureC = specs.cvnTestTemperatureC;
              const rawCvnAverageJoules = specs.cvnAverageJoules;
              const rawCvnMinimumJoules = specs.cvnMinimumJoules;
              const rawHeatNumber = specs.heatNumber;
              const rawMtcReference = specs.mtcReference;
              const rawNaceCompliant = specs.naceCompliant;
              const rawH2sZone = specs.h2sZone;
              const rawMaxHardnessHrc = specs.maxHardnessHrc;
              const rawSscTested = specs.sscTested;

              return (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <h5 className="text-xs font-semibold text-amber-800 mb-2">
                    API 5L Specification Level
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        PSL Level *
                      </label>
                      <select
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                        value={pslLevel || ""}
                        onChange={(e) => {
                          const rawValue2 = e.target.value;
                          const newPslLevel = rawValue2 || null;
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
                            value={rawCvnTestTemperatureC || ""}
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
                            value={rawCvnAverageJoules || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  cvnAverageJoules: e.target.value ? Number(e.target.value) : null,
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
                            value={rawCvnMinimumJoules || ""}
                            onChange={(e) =>
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  cvnMinimumJoules: e.target.value ? Number(e.target.value) : null,
                                },
                              })
                            }
                            placeholder="20"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {/* Traceability fields */}
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <h5 className="text-xs font-semibold text-amber-800 mb-2">
                      Traceability (Optional)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Heat Number
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                          value={rawHeatNumber || ""}
                          onChange={(e) => {
                            const rawValue3 = e.target.value;

                            return onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                heatNumber: rawValue3 || null,
                              },
                            });
                          }}
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
                          value={rawMtcReference || ""}
                          onChange={(e) => {
                            const rawValue4 = e.target.value;

                            return onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                mtcReference: rawValue4 || null,
                              },
                            });
                          }}
                          placeholder="Enter MTC reference"
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
                          checked={rawNaceCompliant || false}
                          onChange={(e) => {
                            const rawChecked = e.target.checked;

                            return onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                naceCompliant: rawChecked || null,
                              },
                            });
                          }}
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
                          value={rawH2sZone || ""}
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
                          value={rawMaxHardnessHrc || ""}
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
                          checked={rawSscTested || false}
                          onChange={(e) => {
                            const rawChecked2 = e.target.checked;

                            return onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                sscTested: rawChecked2 || null,
                              },
                            });
                          }}
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
                    {specs.naceCompliant &&
                      specs.maxHardnessHrc &&
                      entry.specs.maxHardnessHrc > NACE_MAX_HARDNESS_HRC && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          Sour service materials require hardness ≤{NACE_MAX_HARDNESS_HRC} HRC per
                          NACE MR0175
                        </div>
                      )}
                  </div>
                </div>
              );
            })()}

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
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Fitting Type *
                  </label>
                  {(() => {
                    const selectId = `fitting-type-${entry.id}`;
                    const rawSteelSpecificationId6 = specs.steelSpecificationId;
                    const isSABS719 =
                      (rawSteelSpecificationId6 || globalSpecs?.steelSpecificationId) === 8;
                    const rawFittingStandard2 = specs.fittingStandard;
                    const effectiveStandard =
                      rawFittingStandard2 || (isSABS719 ? "SABS719" : "SABS62");
                    const sabs62Options = [
                      { value: "EQUAL_TEE", label: "Equal Tee" },
                      { value: "UNEQUAL_TEE", label: "Unequal Tee" },
                      { value: "LATERAL", label: "Lateral" },
                      { value: "SWEEP_TEE", label: "Sweep Tee" },
                      { value: "Y_PIECE", label: "Y-Piece" },
                      { value: "GUSSETTED_TEE", label: "Gussetted Tee" },
                      { value: "EQUAL_CROSS", label: "Equal Cross" },
                      { value: "UNEQUAL_CROSS", label: "Unequal Cross" },
                    ];
                    const sabs719Options = [
                      { value: "SHORT_TEE", label: "Short Tee (Equal)" },
                      { value: "UNEQUAL_SHORT_TEE", label: "Short Tee (Unequal/Reducing)" },
                      { value: "GUSSET_TEE", label: "Gusset Tee (Equal)" },
                      { value: "UNEQUAL_GUSSET_TEE", label: "Gusset Tee (Unequal/Reducing)" },
                      { value: "LATERAL", label: "Lateral" },
                    ];
                    const commonOptions = [
                      { value: "CON_REDUCER", label: "Concentric Reducer" },
                      { value: "ECCENTRIC_REDUCER", label: "Eccentric Reducer" },
                      { value: "OFFSET_BEND", label: "Offset Bend" },
                    ];
                    const ansiOptions = ansiFittingTypes.map((t) => ({
                      value: t.code,
                      label: t.name,
                    }));
                    const forgedOptions = forgedFittingTypes.map((t) => ({
                      value: t.code,
                      label: t.name,
                    }));
                    const malleableOptions = malleableFittingTypes.map((t) => ({
                      value: t,
                      label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    }));
                    const optionsByStandard: Record<string, { value: string; label: string }[]> = {
                      SABS62: [...sabs62Options, ...commonOptions],
                      SABS719: [...sabs719Options, ...commonOptions],
                      ASME_B16_9: ansiOptions,
                      ASME_B16_11: forgedOptions,
                      BS_143: malleableOptions,
                    };
                    const rawEffectiveStandard = optionsByStandard[effectiveStandard];
                    const options = rawEffectiveStandard || [...sabs62Options, ...commonOptions];

                    const rawFittingType7 = specs.fittingType;

                    return (
                      <Select
                        id={selectId}
                        value={rawFittingType7 || ""}
                        onChange={(fittingType) => {
                          if (!fittingType) return;

                          const isReducingTee = [
                            "SHORT_REDUCING_TEE",
                            "GUSSET_REDUCING_TEE",
                          ].includes(fittingType);
                          const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(
                            fittingType,
                          );
                          const isUnequalTee = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
                            fittingType,
                          );
                          const isNewReducer = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                            fittingType,
                          );
                          const rawFittingType8 = specs.fittingType;
                          const wasReducer = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                            rawFittingType8 || "",
                          );
                          const isNewOffsetBend = fittingType === "OFFSET_BEND";
                          const wasOffsetBend = specs.fittingType === "OFFSET_BEND";
                          const isNewTwoEndType = isNewReducer || isNewOffsetBend;
                          const wasTwoEndType = wasReducer || wasOffsetBend;

                          const currentEndConfig = specs.pipeEndConfiguration;
                          const validTwoEndConfigs = [
                            "PE",
                            "FOE",
                            "FBE",
                            "2X_RF",
                            "2X_LF",
                            "FOE_RF",
                            "FOE_LF",
                            "RF_LF",
                          ];
                          const validFittingConfigs = [
                            "PE",
                            "FAE",
                            "F2E",
                            "F2E_LF",
                            "F2E_RF",
                            "3X_RF",
                            "3X_LF",
                            "2X_LF_FOE",
                            "2X_RF_FOE",
                          ];
                          const needsEndConfigReset = isNewTwoEndType
                            ? !validTwoEndConfigs.includes(currentEndConfig || "")
                            : wasTwoEndType &&
                              !validFittingConfigs.includes(currentEndConfig || "");

                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              fittingType,
                              pipeEndConfiguration: needsEndConfigReset ? "PE" : currentEndConfig,
                              branchNominalDiameterMm: isReducingTee
                                ? specs.branchNominalDiameterMm
                                : undefined,
                              teeNominalDiameterMm: isUnequalTee
                                ? specs.teeNominalDiameterMm
                                : undefined,
                              teeSteelSpecificationId: isUnequalTee
                                ? specs.teeSteelSpecificationId
                                : undefined,
                              stubLocation: isEqualTee ? undefined : specs.stubLocation,
                              pipeLengthAOverride: isEqualTee ? false : specs.pipeLengthAOverride,
                              pipeLengthBOverride: isEqualTee ? false : specs.pipeLengthBOverride,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);

                          if (fittingType && specs.nominalDiameterMm) {
                            masterDataApi
                              .getFittingDimensions(
                                effectiveStandard as "SABS62" | "SABS719",
                                fittingType,
                                entry.specs.nominalDiameterMm,
                                specs.angleRange,
                              )
                              .then((dims) => {
                                if (dims) {
                                  const pipeUpdates: Record<string, unknown> = {};
                                  let pipeLengthA: number | null = null;
                                  let pipeLengthB: number | null = null;

                                  if (effectiveStandard === "SABS62") {
                                    const centreToFace = dims.centreToFaceCMm
                                      ? Number(dims.centreToFaceCMm)
                                      : null;
                                    if (isEqualTee && centreToFace) {
                                      pipeLengthA = centreToFace * 2;
                                      pipeLengthB = centreToFace;
                                    } else if (centreToFace) {
                                      pipeLengthA = centreToFace;
                                      pipeLengthB = centreToFace;
                                    }
                                  } else {
                                    const dimA = dims.dimensionAMm
                                      ? Number(dims.dimensionAMm)
                                      : null;
                                    const dimB = dims.dimensionBMm
                                      ? Number(dims.dimensionBMm)
                                      : null;
                                    pipeLengthA = dimA;
                                    pipeLengthB = dimB;
                                  }

                                  if (pipeLengthA && (isEqualTee || !specs.pipeLengthAOverride)) {
                                    pipeUpdates.pipeLengthAMm = pipeLengthA;
                                    pipeUpdates.pipeLengthAMmAuto = pipeLengthA;
                                  }
                                  if (pipeLengthB && (isEqualTee || !specs.pipeLengthBOverride)) {
                                    pipeUpdates.pipeLengthBMm = pipeLengthB;
                                    pipeUpdates.pipeLengthBMmAuto = pipeLengthB;
                                  }
                                  if (keys(pipeUpdates).length > 0) {
                                    onUpdateEntry(entry.id, { specs: pipeUpdates });
                                  }
                                }
                              })
                              .catch((err) => {
                                log.debug("Could not fetch fitting dimensions:", err);
                              });
                          }

                          debouncedCalculate();
                        }}
                        options={options}
                        placeholder="Select fitting type..."
                      />
                    );
                  })()}
                  {errors[`fitting_${index}_type`] && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {errors[`fitting_${index}_type`]}
                    </p>
                  )}
                </div>

                {/* Nominal Diameter - Linked to Steel Specification */}
                {(() => {
                  const rawFittingType9 = specs.fittingType;
                  const fittingType = rawFittingType9 || "";
                  const isTeeType = [
                    "SHORT_TEE",
                    "GUSSET_TEE",
                    "UNEQUAL_SHORT_TEE",
                    "UNEQUAL_GUSSET_TEE",
                    "SHORT_REDUCING_TEE",
                    "GUSSET_REDUCING_TEE",
                    "EQUAL_TEE",
                    "UNEQUAL_TEE",
                    "SWEEP_TEE",
                    "GUSSETTED_TEE",
                  ].includes(fittingType);
                  const isMissingForPreview = isTeeType && !specs.nominalDiameterMm;
                  return (
                    <div
                      className={
                        isMissingForPreview ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""
                      }
                    >
                      <label
                        className={`block text-xs font-semibold mb-1 ${isMissingForPreview ? "text-red-700" : "text-gray-900 dark:text-gray-100"}`}
                      >
                        Nominal Diameter (mm) *{" "}
                        {isMissingForPreview && (
                          <span className="text-red-600 font-bold">⚠ Required for preview</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `fitting-nb-${entry.id}`;
                        const rawSteelSpecificationId7 = specs.steelSpecificationId;
                        const isSABS719 =
                          (rawSteelSpecificationId7 || globalSpecs?.steelSpecificationId) === 8;
                        const rawFittingStandard3 = specs.fittingStandard;
                        const effectiveStandard =
                          rawFittingStandard3 || (isSABS719 ? "SABS719" : "SABS62");
                        const sizesByStandard: Record<string, number[]> = {
                          SABS62: [...SABS62_FITTING_SIZES],
                          SABS719: [...SABS719_FITTING_SIZES],
                          ASME_B16_9: [...ansiSizes],
                          ASME_B16_11: [...forgedSizes],
                          BS_143: [...malleableSizes],
                        };
                        const rawEffectiveStandard2 = sizesByStandard[effectiveStandard];
                        const sizes = rawEffectiveStandard2 || [...SABS62_FITTING_SIZES];
                        const options = sizes.map((nb: number) => ({
                          value: String(nb),
                          label: `${nb}mm`,
                        }));

                        return (
                          <Select
                            id={selectId}
                            value={
                              specs.nominalDiameterMm ? String(entry.specs.nominalDiameterMm) : ""
                            }
                            onChange={(selectedValue) => {
                              if (!selectedValue) return;

                              const nominalDiameter = parseInt(selectedValue, 10);
                              if (Number.isNaN(nominalDiameter)) return;

                              let matchedSchedule = specs.scheduleNumber;
                              let matchedWT = specs.wallThicknessMm;

                              if (
                                effectiveStandard === "SABS719" &&
                                globalSpecs?.workingPressureBar
                              ) {
                                const rawSteelSpecificationId8 = specs.steelSpecificationId;
                                const effectiveSpecId2 =
                                  rawSteelSpecificationId8 || globalSpecs?.steelSpecificationId;
                                const availableSchedules = scheduleListForSpec(
                                  nominalDiameter,
                                  effectiveSpecId2,
                                );
                                if (availableSchedules.length > 0) {
                                  const minWT = getMinWallThicknessForNB(
                                    nominalDiameter,
                                    globalSpecs.workingPressureBar,
                                  );
                                  const sorted = [...availableSchedules].sort(
                                    (a: ScheduleItem, b: ScheduleItem) => {
                                      const rawWallThicknessMm6 = a.wallThicknessMm;
                                      const rawWallThicknessMm7 = b.wallThicknessMm;
                                      return (
                                        (rawWallThicknessMm6 || 0) - (rawWallThicknessMm7 || 0)
                                      );
                                    },
                                  );
                                  const suitable = sorted.find((s: ScheduleItem) => {
                                    const rawWallThicknessMm8 = s.wallThicknessMm;
                                    return (rawWallThicknessMm8 || 0) >= minWT;
                                  });
                                  if (suitable) {
                                    matchedSchedule = suitable.scheduleDesignation;
                                    matchedWT = suitable.wallThicknessMm;
                                  } else if (sorted.length > 0) {
                                    const thickest = sorted[sorted.length - 1];
                                    matchedSchedule = thickest.scheduleDesignation;
                                    matchedWT = thickest.wallThicknessMm;
                                  }
                                }
                              }

                              const rawFittingType10 = specs.fittingType;

                              const isReducingTeeType = [
                                "SHORT_REDUCING_TEE",
                                "GUSSET_REDUCING_TEE",
                              ].includes(rawFittingType10 || "");
                              const currentBranchNB = specs.branchNominalDiameterMm;
                              const shouldClearBranch =
                                isReducingTeeType &&
                                currentBranchNB &&
                                currentBranchNB >= nominalDiameter;

                              const rawFittingType11 = specs.fittingType;

                              const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                                rawFittingType11 || "",
                              );
                              const rawSteelSpecificationId9 = specs.steelSpecificationId;
                              const steelSpecId =
                                rawSteelSpecificationId9 || globalSpecs?.steelSpecificationId;
                              const steelSpecName = masterData?.steelSpecs?.find(
                                (s: { id: number }) => s.id === steelSpecId,
                              )?.steelSpecName;
                              const reducerLength = isReducerType
                                ? standardReducerLengthForNb(
                                    nominalDiameter,
                                    steelSpecId,
                                    steelSpecName,
                                  )
                                : undefined;

                              const newSpecs = {
                                ...entry.specs,
                                nominalDiameterMm: nominalDiameter,
                                scheduleNumber: matchedSchedule,
                                wallThicknessMm: matchedWT,
                                branchNominalDiameterMm: shouldClearBranch
                                  ? undefined
                                  : specs.branchNominalDiameterMm,
                                ...(isReducerType && reducerLength
                                  ? {
                                      reducerLengthMm: reducerLength,
                                      reducerLengthMmAuto: reducerLength,
                                      smallNominalDiameterMm: undefined,
                                    }
                                  : {}),
                              };
                              const immediateEntry = { ...entry, specs: newSpecs };
                              immediateEntry.description = generateItemDescription(immediateEntry);
                              onUpdateEntry(entry.id, immediateEntry);

                              const fittingType = specs.fittingType;
                              const angleRange = specs.angleRange;
                              const pipeLengthAOverride = specs.pipeLengthAOverride;
                              const pipeLengthBOverride = specs.pipeLengthBOverride;

                              if (fittingType && nominalDiameter) {
                                masterDataApi
                                  .getFittingDimensions(
                                    effectiveStandard as "SABS62" | "SABS719",
                                    fittingType,
                                    nominalDiameter,
                                    angleRange,
                                  )
                                  .then((dims) => {
                                    if (dims) {
                                      const pipeUpdates: Record<string, unknown> = {};
                                      const isEqualTee = [
                                        "SHORT_TEE",
                                        "GUSSET_TEE",
                                        "EQUAL_TEE",
                                      ].includes(fittingType);
                                      let pipeLengthA: number | null = null;
                                      let pipeLengthB: number | null = null;

                                      if (effectiveStandard === "SABS62") {
                                        const centreToFace = dims.centreToFaceCMm
                                          ? Number(dims.centreToFaceCMm)
                                          : null;
                                        if (isEqualTee && centreToFace) {
                                          pipeLengthA = centreToFace * 2;
                                          pipeLengthB = centreToFace;
                                        } else if (centreToFace) {
                                          pipeLengthA = centreToFace;
                                          pipeLengthB = centreToFace;
                                        }
                                      } else {
                                        const dimA = dims.dimensionAMm
                                          ? Number(dims.dimensionAMm)
                                          : null;
                                        const dimB = dims.dimensionBMm
                                          ? Number(dims.dimensionBMm)
                                          : null;
                                        pipeLengthA = dimA;
                                        pipeLengthB = dimB;
                                      }

                                      if (pipeLengthA && !pipeLengthAOverride) {
                                        pipeUpdates.pipeLengthAMm = pipeLengthA;
                                        pipeUpdates.pipeLengthAMmAuto = pipeLengthA;
                                      }
                                      if (pipeLengthB && !pipeLengthBOverride) {
                                        pipeUpdates.pipeLengthBMm = pipeLengthB;
                                        pipeUpdates.pipeLengthBMmAuto = pipeLengthB;
                                      }
                                      if (keys(pipeUpdates).length > 0) {
                                        onUpdateEntry(entry.id, { specs: pipeUpdates });
                                      }
                                    }
                                  })
                                  .catch((err) => {
                                    log.debug("Could not fetch fitting dimensions:", err);
                                  });
                              }

                              debouncedCalculate();
                            }}
                            options={options}
                            placeholder="Select diameter..."
                          />
                        );
                      })()}
                      {(() => {
                        const rawSteelSpecificationId10 = specs.steelSpecificationId;
                        const isSABS719 =
                          (rawSteelSpecificationId10 || globalSpecs?.steelSpecificationId) === 8;
                        const rawFittingStandard4 = specs.fittingStandard;
                        const eff = rawFittingStandard4 || (isSABS719 ? "SABS719" : "SABS62");
                        const sizesByStd: Record<string, number[]> = {
                          SABS62: [...SABS62_FITTING_SIZES],
                          SABS719: [...SABS719_FITTING_SIZES],
                          ASME_B16_9: [...ansiSizes],
                          ASME_B16_11: [...forgedSizes],
                          BS_143: [...malleableSizes],
                        };
                        const rawEff = sizesByStd[eff];
                        const nbSizes = rawEff || [...SABS62_FITTING_SIZES];
                        return (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {nbSizes.length} sizes available ({eff})
                          </p>
                        );
                      })()}
                      {errors[`fitting_${index}_nb`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                          {errors[`fitting_${index}_nb`]}
                        </p>
                      )}
                    </div>
                  );
                })()}

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
                            (s) =>
                              !specs.forgedPressureClass ||
                              s.pressureClass === specs.forgedPressureClass,
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
                      value={
                        specs.malleablePressureClass ? String(specs.malleablePressureClass) : ""
                      }
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
                            specs.smallNominalDiameterMm
                              ? String(entry.specs.smallNominalDiameterMm)
                              : ""
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
                {(() => {
                  const rawSteelSpecificationId14 = specs.steelSpecificationId;
                  const effectiveSpecId =
                    rawSteelSpecificationId14 || globalSpecs?.steelSpecificationId;

                  const rawSteelSpecName4 = masterData.steelSpecs?.find(
                    (s: SteelSpecItem) => s.id === effectiveSpecId,
                  )?.steelSpecName;

                  const steelSpecName = rawSteelSpecName4 || "";
                  const rawNominalDiameterMm5 = specs.nominalDiameterMm;
                  const nbValue = rawNominalDiameterMm5 || 0;

                  const isSABS719Steel =
                    steelSpecName.includes("SABS 719") ||
                    steelSpecName.includes("SANS 719") ||
                    effectiveSpecId === 8;
                  const rawFittingStandard5 = specs.fittingStandard;
                  const fittingStandard =
                    rawFittingStandard5 || (isSABS719Steel ? "SABS719" : "SABS62");
                  const isSABS62Fitting = fittingStandard === "SABS62";

                  if (isSABS62Fitting) {
                    const selectId = `fitting-sabs62-grade-${entry.id}`;
                    const rawScheduleNumber = specs.scheduleNumber;
                    const currentGrade = rawScheduleNumber || "MEDIUM";
                    const isHeavy = currentGrade === "HEAVY";

                    const mediumSchedules = scheduleListForSpec(nbValue, 7, "SABS 62 Medium");
                    const heavySchedules = scheduleListForSpec(nbValue, 7, "SABS 62 Heavy");
                    const rawWallThicknessMm9 = mediumSchedules[0]?.wallThicknessMm;
                    const mediumWT = rawWallThicknessMm9 || 0;
                    const rawWallThicknessMm10 = heavySchedules[0]?.wallThicknessMm;
                    const heavyWT = rawWallThicknessMm10 || 0;

                    const options = [
                      { value: "MEDIUM", label: `MEDIUM (${mediumWT}mm)` },
                      { value: "HEAVY", label: `HEAVY (${heavyWT}mm)` },
                    ];

                    return (
                      <div>
                        <label
                          htmlFor={selectId}
                          className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Wall Thickness *
                          <span className="text-xs text-gray-500 ml-1 font-normal">(SABS62)</span>
                        </label>
                        <Select
                          id={selectId}
                          value={currentGrade}
                          onChange={(grade) => {
                            if (!grade) return;
                            const schedules = scheduleListForSpec(
                              nbValue,
                              7,
                              grade === "HEAVY" ? "SABS 62 Heavy" : "SABS 62 Medium",
                            );
                            const selectedSchedule = schedules[0];
                            const rawWallThicknessMm11 = selectedSchedule?.wallThicknessMm;
                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                scheduleNumber: grade,
                                wallThicknessMm: rawWallThicknessMm11 || null,
                              },
                            });
                          }}
                          options={options}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                          WT: {isHeavy ? heavyWT : mediumWT}mm
                        </p>
                      </div>
                    );
                  }

                  const selectId = `fitting-schedule-spec-${entry.id}`;
                  const allSchedules = scheduleListForSpec(nbValue, effectiveSpecId, steelSpecName);

                  if (globalSpecs?.workingPressureBar && specs.nominalDiameterMm) {
                    const rawWorkingPressureBar2 = globalSpecs?.workingPressureBar;
                    const minWT = getMinWallThicknessForNB(nbValue, rawWorkingPressureBar2 || 0);
                    const eligibleSchedules = allSchedules
                      .filter((dim: ScheduleItem) => {
                        const rawWallThicknessMm12 = dim.wallThicknessMm;
                        return (rawWallThicknessMm12 || 0) >= minWT;
                      })
                      .sort((a: ScheduleItem, b: ScheduleItem) => {
                        const rawWallThicknessMm13 = a.wallThicknessMm;
                        const rawWallThicknessMm14 = b.wallThicknessMm;
                        return (rawWallThicknessMm13 || 0) - (rawWallThicknessMm14 || 0);
                      });

                    const options = eligibleSchedules.map((dim: ScheduleItem, idx: number) => {
                      const rawScheduleDesignation = dim.scheduleDesignation;
                      const scheduleValue =
                        rawScheduleDesignation || dim.scheduleNumber?.toString() || "Unknown";
                      const rawWallThicknessMm15 = dim.wallThicknessMm;
                      const wt = rawWallThicknessMm15 || 0;
                      const isRecommended = idx === 0;
                      const label = isRecommended
                        ? `★ ${scheduleValue} (${wt}mm)`
                        : `${scheduleValue} (${wt}mm)`;
                      return { value: scheduleValue, label };
                    });

                    const rawScheduleNumber2 = specs.scheduleNumber;

                    return (
                      <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2">
                        <label className="block text-xs font-semibold text-green-900 mb-1">
                          Schedule / W/T *
                          <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">
                            (Auto)
                          </span>
                          <span
                            className="ml-1 text-gray-400 font-normal cursor-help"
                            title="★ = Minimum schedule meeting pressure requirements. Auto-selected based on ASME B31.3 when working pressure is set."
                          >
                            ?
                          </span>
                        </label>
                        <Select
                          id={selectId}
                          value={rawScheduleNumber2 || ""}
                          onChange={(schedule) => {
                            if (!schedule) return;
                            const selectedDim = allSchedules.find((dim: ScheduleItem) => {
                              const rawScheduleDesignation2 = dim.scheduleDesignation;

                              return (
                                (rawScheduleDesignation2 || dim.scheduleNumber?.toString()) ===
                                schedule
                              );
                            });
                            const rawWallThicknessMm16 = selectedDim?.wallThicknessMm;
                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                scheduleNumber: schedule,
                                wallThicknessMm: rawWallThicknessMm16 || specs.wallThicknessMm,
                              },
                            });
                            debouncedCalculate();
                          }}
                          options={options}
                          placeholder="Select schedule..."
                        />
                        {specs.wallThicknessMm && (
                          <p className="text-xs text-green-700 mt-1">
                            WT: {entry.specs.wallThicknessMm}mm
                          </p>
                        )}
                        {errors[`fitting_${index}_schedule`] && (
                          <p role="alert" className="mt-1 text-xs text-red-600">
                            {errors[`fitting_${index}_schedule`]}
                          </p>
                        )}
                      </div>
                    );
                  }

                  const manualOptions =
                    allSchedules.length > 0
                      ? allSchedules.map((dim: ScheduleItem) => {
                          const rawScheduleDesignation3 = dim.scheduleDesignation;
                          const rawScheduleDesignation4 = dim.scheduleDesignation;

                          return {
                            value: rawScheduleDesignation3 || dim.scheduleNumber?.toString() || "",
                            label: `${rawScheduleDesignation4 || dim.scheduleNumber?.toString() || ""} (${dim.wallThicknessMm}mm)`,
                          };
                        })
                      : [
                          { value: "10", label: "Sch 10" },
                          { value: "40", label: "Sch 40" },
                          { value: "80", label: "Sch 80" },
                          { value: "160", label: "Sch 160" },
                        ];

                  const rawScheduleNumber3 = specs.scheduleNumber;

                  return (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Schedule / W/T *
                        <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">
                          (Manual)
                        </span>
                        <span
                          className="ml-1 text-gray-400 font-normal cursor-help"
                          title="Manual selection when working pressure not set. Higher schedules provide thicker walls and greater pressure capacity."
                        >
                          ?
                        </span>
                      </label>
                      <Select
                        id={selectId}
                        value={rawScheduleNumber3 || ""}
                        onChange={(scheduleNumber) => {
                          if (!scheduleNumber) return;
                          const schedules = scheduleListForSpec(
                            nbValue,
                            effectiveSpecId,
                            steelSpecName,
                          );
                          const matchingSchedule = schedules.find((s: ScheduleItem) => {
                            const rawScheduleDesignation5 = s.scheduleDesignation;

                            return (
                              (rawScheduleDesignation5 || s.scheduleNumber?.toString()) ===
                              scheduleNumber
                            );
                          });
                          const wallThickness = matchingSchedule?.wallThicknessMm;

                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              scheduleNumber,
                              wallThicknessMm: wallThickness,
                            },
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          debouncedCalculate();
                        }}
                        options={manualOptions}
                        placeholder="Select Schedule"
                      />
                      {specs.wallThicknessMm && (
                        <p className="text-xs text-gray-600 mt-1">
                          WT: {entry.specs.wallThicknessMm}mm
                        </p>
                      )}
                      {errors[`fitting_${index}_schedule`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                          {errors[`fitting_${index}_schedule`]}
                        </p>
                      )}
                    </div>
                  );
                })()}

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
                    const steelSpecId =
                      rawSteelSpecificationId15 || globalSpecs?.steelSpecificationId;
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
                const selectedStandard = masterData.flangeStandards?.find(
                  (fs: FlangeStandardItem) => {
                    const rawFlangeStandardId2 = specs.flangeStandardId;
                    return fs.id === (rawFlangeStandardId2 || globalSpecs?.flangeStandardId);
                  },
                );
                const isSabs1123 =
                  selectedStandard?.code?.toUpperCase().includes("SABS") &&
                  selectedStandard?.code?.includes("1123");
                const isBs4504 =
                  selectedStandard?.code?.toUpperCase().includes("BS") &&
                  selectedStandard?.code?.includes("4504");
                const hasThreeDropdowns = isSabs1123 || isBs4504;

                const rawFlangeStandardId3 = specs.flangeStandardId;

                const effectiveStandardId = rawFlangeStandardId3 || globalSpecs?.flangeStandardId;
                const rawFlangeTypeCode2 = specs.flangeTypeCode;
                const effectiveTypeCode = rawFlangeTypeCode2 || globalSpecs?.flangeTypeCode;
                const normalizedTypeCode = effectiveTypeCode?.replace(/^\//, "") || "";

                const globalClass = masterData.pressureClasses?.find(
                  (p: PressureClassItem) => p.id === globalSpecs?.flangePressureClassId,
                );
                const globalBasePressure = globalClass?.designation?.replace(/\/\d+$/, "") || "";
                const targetDesignationForGlobal =
                  normalizedTypeCode && globalBasePressure
                    ? `${globalBasePressure}/${normalizedTypeCode}`
                    : null;
                const matchingClassForGlobal = targetDesignationForGlobal
                  ? masterData.pressureClasses?.find(
                      (pc: PressureClassItem) => pc.designation === targetDesignationForGlobal,
                    )
                  : null;
                const rawFlangePressureClassId2 = specs.flangePressureClassId;
                const effectiveClassId =
                  rawFlangePressureClassId2 ||
                  matchingClassForGlobal?.id ||
                  globalSpecs?.flangePressureClassId;

                const isStandardFromGlobal =
                  globalSpecs?.flangeStandardId &&
                  effectiveStandardId === globalSpecs?.flangeStandardId;
                const isStandardOverride =
                  globalSpecs?.flangeStandardId &&
                  effectiveStandardId !== globalSpecs?.flangeStandardId;
                const effectiveClass = masterData.pressureClasses?.find(
                  (p: PressureClassItem) => p.id === effectiveClassId,
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
                  globalSpecs?.flangeTypeCode && effectiveTypeCode === globalSpecs?.flangeTypeCode;
                const isTypeOverride =
                  globalSpecs?.flangeTypeCode && effectiveTypeCode !== globalSpecs?.flangeTypeCode;

                const rawWorkingPressureBar3 = specs.workingPressureBar;

                const workingPressureBar =
                  rawWorkingPressureBar3 || globalSpecs?.workingPressureBar || 0;
                const selectedPressureClass = masterData.pressureClasses?.find(
                  (pc: PressureClassItem) => pc.id === effectiveClassId,
                );
                const pressureClassValidation = validatePressureClass(
                  selectedStandard?.code,
                  selectedPressureClass?.designation,
                  workingPressureBar,
                );
                const isPressureClassUnsuitable = pressureClassValidation.isUnsuitable;

                const globalSelectClass =
                  "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-green-400";
                const overrideSelectClass =
                  "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-orange-500 dark:border-orange-400";
                const unsuitableSelectClass =
                  "w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400";
                const defaultSelectClass =
                  "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800";

                const rawPipeEndConfiguration2 = specs.pipeEndConfiguration;

                // Get flange configuration for blank flange options
                const fittingEndConfig = rawPipeEndConfiguration2 || "PE";
                const fittingFlangeConfig = getFittingFlangeConfig(
                  fittingEndConfig,
                  specs.foePosition,
                );
                const reducerFlangeConfigVal = getReducerFlangeConfig(fittingEndConfig);
                const rawHasLargeEnd = reducerFlangeConfigVal.hasLargeEnd;
                const rawHasInlet = fittingFlangeConfig.hasInlet;
                const hasFlangesSelected = isReducer
                  ? rawHasLargeEnd || reducerFlangeConfigVal.hasSmallEnd
                  : rawHasInlet || fittingFlangeConfig.hasOutlet || fittingFlangeConfig.hasBranch;
                const availableBlankPositions = isReducer
                  ? [
                      {
                        key: "large",
                        label: "Large",
                        hasFlange: reducerFlangeConfigVal.hasLargeEnd,
                      },
                      {
                        key: "small",
                        label: "Small",
                        hasFlange: reducerFlangeConfigVal.hasSmallEnd,
                      },
                    ].filter((p) => p.hasFlange)
                  : [
                      { key: "inlet", label: "Inlet", hasFlange: fittingFlangeConfig.hasInlet },
                      { key: "outlet", label: "Outlet", hasFlange: fittingFlangeConfig.hasOutlet },
                      { key: "branch", label: "Branch", hasFlange: fittingFlangeConfig.hasBranch },
                    ].filter((p) => p.hasFlange);
                const rawBlankFlangePositions = specs.blankFlangePositions;
                const currentBlankPositions = rawBlankFlangePositions || [];

                const rawFlangeStandardId4 = specs.flangeStandardId;
                const rawFlangePressureClassId3 = specs.flangePressureClassId;
                const rawFlangePressureClassId4 = specs.flangePressureClassId;
                const rawFlangeTypeCode3 = specs.flangeTypeCode;
                const rawPipeEndConfiguration3 = specs.pipeEndConfiguration;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Standard
                        {isStandardFromGlobal && (
                          <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
                        )}
                        {isStandardOverride && (
                          <span className="ml-1 text-orange-600 font-normal">(Override)</span>
                        )}
                      </label>
                      <select
                        value={rawFlangeStandardId4 || globalSpecs?.flangeStandardId || ""}
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
                        className={
                          isStandardFromGlobal
                            ? globalSelectClass
                            : isStandardOverride
                              ? overrideSelectClass
                              : defaultSelectClass
                        }
                      >
                        <option value="">Select Standard...</option>
                        {masterData.flangeStandards?.map((standard: FlangeStandardItem) => (
                          <option key={standard.id} value={standard.id}>
                            {standard.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Pressure Class
                        {isPressureClassUnsuitable && (
                          <span className="ml-1 text-red-600 font-bold">(NOT SUITABLE)</span>
                        )}
                        {!isPressureClassUnsuitable && isClassFromGlobal && (
                          <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
                        )}
                        {!isPressureClassUnsuitable && isClassOverride && (
                          <span className="ml-1 text-orange-600 font-normal">(Override)</span>
                        )}
                      </label>
                      {hasThreeDropdowns ? (
                        <select
                          value={rawFlangePressureClassId3 || effectiveClassId || ""}
                          onChange={(e) =>
                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                flangePressureClassId: parseInt(e.target.value, 10) || undefined,
                              },
                            })
                          }
                          className={
                            isPressureClassUnsuitable
                              ? unsuitableSelectClass
                              : isClassFromGlobal
                                ? globalSelectClass
                                : isClassOverride
                                  ? overrideSelectClass
                                  : defaultSelectClass
                          }
                        >
                          <option value="">Select Class...</option>
                          {(isSabs1123 ? SABS_1123_PRESSURE_CLASSES : BS_4504_PRESSURE_CLASSES).map(
                            (pc) => {
                              const pcValue = String(pc.value);
                              const equivalentValue = pcValue === "64" ? "63" : pcValue;
                              const targetDesignation = normalizedTypeCode
                                ? `${pcValue}/${normalizedTypeCode}`
                                : null;
                              const matchingPc = masterData.pressureClasses?.find(
                                (mpc: PressureClassItem) => {
                                  if (targetDesignation && mpc.designation === targetDesignation)
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
                            },
                          )}
                        </select>
                      ) : (
                        <select
                          value={rawFlangePressureClassId4 || effectiveClassId || ""}
                          onChange={(e) =>
                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                flangePressureClassId: parseInt(e.target.value, 10) || undefined,
                              },
                            })
                          }
                          className={
                            isPressureClassUnsuitable
                              ? unsuitableSelectClass
                              : isClassFromGlobal
                                ? globalSelectClass
                                : isClassOverride
                                  ? overrideSelectClass
                                  : defaultSelectClass
                          }
                        >
                          <option value="">Select Class...</option>
                          {(() => {
                            const rawFlangeStandardId5 = specs.flangeStandardId;
                            const stdId = rawFlangeStandardId5 || globalSpecs?.flangeStandardId;
                            const rawStdId = pressureClassesByStandard[stdId];
                            const rawPressureClasses = masterData.pressureClasses;
                            const filtered = stdId ? rawStdId || [] : rawPressureClasses || [];
                            return filtered.map((pressureClass: PressureClassItem) => (
                              <option key={pressureClass.id} value={pressureClass.id}>
                                {pressureClass.designation?.replace(/\/\d+$/, "") ||
                                  pressureClass.designation}
                              </option>
                            ));
                          })()}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Flange Type
                        {isTypeFromGlobal && hasThreeDropdowns && (
                          <span className="ml-1 text-green-600 font-normal">(From Specs Page)</span>
                        )}
                        {isTypeOverride && hasThreeDropdowns && (
                          <span className="ml-1 text-orange-600 font-normal">(Override)</span>
                        )}
                      </label>
                      {hasThreeDropdowns ? (
                        <select
                          value={rawFlangeTypeCode3 || globalSpecs?.flangeTypeCode || ""}
                          onChange={(e) => {
                            const rawValue5 = e.target.value;

                            return onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                flangeTypeCode: rawValue5 || undefined,
                              },
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
                          <option value="">Select Type...</option>
                          {(isSabs1123
                            ? flangeTypesForStandardCode(allFlangeTypes, "SABS 1123") || []
                            : flangeTypesForStandardCode(allFlangeTypes, "BS 4504") || []
                          ).map((ft) => (
                            <option key={ft.code} value={ft.code} title={ft.description}>
                              {ft.name} ({ft.code})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          disabled
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-100 text-gray-500"
                        >
                          <option>N/A for this standard</option>
                        </select>
                      )}
                    </div>
                    {/* 4th Column: Flange Config & Blank Flanges */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-amber-900">
                          Flange Config *
                        </label>
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
                          const rawFlangeTypeCode4 = globalSpecs?.flangeTypeCode;
                          const effectiveFlangeTypeCode =
                            rawFlangeTypeCode4 || recommendedFlangeTypeCode(newConfig);
                          const rawFlangeStandardId6 = specs.flangeStandardId;
                          const flangeStandardIdLocal =
                            rawFlangeStandardId6 || globalSpecs?.flangeStandardId;
                          const flangeStandardLocal = masterData.flangeStandards?.find(
                            (s: FlangeStandardItem) => s.id === flangeStandardIdLocal,
                          );
                          const rawCode = flangeStandardLocal?.code;
                          const flangeCodeLocal = rawCode || "";
                          const rawWorkingPressureBar4 = specs.workingPressureBar;
                          const workingPressureLocal =
                            rawWorkingPressureBar4 || globalSpecs?.workingPressureBar || 0;
                          const rawFlangeStandardIdLocal =
                            pressureClassesByStandard[flangeStandardIdLocal];
                          let availableClasses = flangeStandardIdLocal
                            ? rawFlangeStandardIdLocal || []
                            : [];
                          if (availableClasses.length === 0) {
                            availableClasses =
                              masterData.pressureClasses?.filter(
                                (pc: PressureClassItem) =>
                                  pc.flangeStandardId === flangeStandardIdLocal ||
                                  pc.standardId === flangeStandardIdLocal,
                              ) || [];
                          }
                          const rawFlangePressureClassId5 = specs.flangePressureClassId;
                          const newPressureClassId =
                            workingPressureLocal > 0 && availableClasses.length > 0
                              ? recommendedPressureClassId(
                                  workingPressureLocal,
                                  availableClasses,
                                  flangeCodeLocal,
                                  effectiveFlangeTypeCode,
                                )
                              : rawFlangePressureClassId5 || globalSpecs?.flangePressureClassId;
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
                        {(isReducer || isOffsetBend
                          ? REDUCER_END_OPTIONS
                          : FITTING_END_OPTIONS
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const storedConfig = specs.pipeEndConfiguration;
                        const validOptions =
                          isReducer || isOffsetBend ? REDUCER_END_OPTIONS : FITTING_END_OPTIONS;
                        const isValidConfig = validOptions.some(
                          (opt) => opt.value === storedConfig,
                        );
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
                              <label
                                key={position}
                                className="flex items-center gap-1.5 cursor-pointer"
                              >
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
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Quantity *
                  </label>
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
                  const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                    fittingType || "",
                  );
                  const isOffsetBendType = fittingType === "OFFSET_BEND";
                  if (isReducerType || isOffsetBendType) return null;

                  const isLateral = fittingType === "LATERAL" || fittingType === "Y_PIECE";
                  const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(
                    fittingType || "",
                  );
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
                              (rawSteelSpecificationId16 || globalSpecs?.steelSpecificationId) ===
                              8;
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
                          <span className="text-orange-600 text-xs ml-1 font-normal">
                            (Override)
                          </span>
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
                  const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                    fittingType || "",
                  );
                  const isOffsetBendType = fittingType === "OFFSET_BEND";
                  if (isReducerType || isOffsetBendType) return null;

                  const isLateral = fittingType === "LATERAL";
                  const isYPiece = fittingType === "Y_PIECE";
                  const isEqualTee = ["SHORT_TEE", "GUSSET_TEE", "EQUAL_TEE"].includes(
                    fittingType || "",
                  );
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
                            <span className="text-orange-600 text-xs ml-1 font-normal">
                              (Override)
                            </span>
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
                          <span className="text-orange-600 text-xs ml-1 font-normal">
                            (Override)
                          </span>
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
                              <span className="text-orange-600 text-xs ml-1 font-normal">
                                (Override)
                              </span>
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
                      Tee Steel *
                      <span className="text-blue-600 text-xs ml-1 font-normal">(Branch)</span>
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
                            isUsingMainSpec
                              ? "border-2 border-green-500"
                              : "border-2 border-orange-500"
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
                            specs.teeNominalDiameterMm
                              ? String(entry.specs.teeNominalDiameterMm)
                              : ""
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
                        specs.reducerLengthMmAuto
                          ? `e.g., ${entry.specs.reducerLengthMmAuto}`
                          : "Length"
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
                            reducerStubNbMm: e.target.checked
                              ? rawReducerStubNbMm || 50
                              : undefined,
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
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Stub Steel
                    </label>
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
                            isUsingMainSpec
                              ? "border-2 border-green-500"
                              : "border-2 border-orange-500"
                          }
                          options={[]}
                          groupedOptions={groupedSteelOptions}
                          placeholder="Select..."
                        />
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 mb-1">
                      Stub NB (mm)
                    </label>
                    {(() => {
                      const rawSmallNominalDiameterMm = specs.smallNominalDiameterMm;
                      const smallNB = rawSmallNominalDiameterMm || 0;
                      const maxStubNB = smallNB - 50;
                      const rawReducerStubSteelSpecId2 = specs.reducerStubSteelSpecId;
                      const stubSteelSpecId =
                        rawReducerStubSteelSpecId2 ||
                        specs.steelSpecificationId ||
                        globalSpecs?.steelSpecificationId;
                      const stubSteelSpec = masterData?.steelSpecs?.find(
                        (s: SteelSpecItem) => s.id === stubSteelSpecId,
                      );
                      const isSABS719Stub =
                        stubSteelSpec?.steelSpecName?.includes("SABS 719") ||
                        stubSteelSpec?.steelSpecName?.includes("SANS 719");
                      const minStubNB = isSABS719Stub ? 200 : 15;
                      const allStubSizes = [
                        15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
                      ];
                      const stubSizes = allStubSizes.filter(
                        (nb) => nb >= minStubNB && nb <= maxStubNB,
                      );
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
                      value={
                        specs.reducerLengthMm ? Math.round(entry.specs.reducerLengthMm / 2) : ""
                      }
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
                  <p className="col-span-4 text-xs text-blue-600 mt-1">
                    Stub flanged same as reducer
                  </p>
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
                        <div
                          key={stubIndex}
                          className="bg-white border border-orange-200 rounded-md p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-orange-800">
                              Stub {stubIndex + 1}
                            </p>
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
                                    stubLengthMm: e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
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
                            {(stub.endConfiguration === "flanged" ||
                              stub.endConfiguration === "rf") && (
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
                                  {masterData.flangeStandards?.map(
                                    (standard: FlangeStandardItem) => (
                                      <option key={standard.id} value={standard.id}>
                                        {standard.code}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                            )}

                            {/* Pressure Class - Only show if flanged or rf */}
                            {(stub.endConfiguration === "flanged" ||
                              stub.endConfiguration === "rf") && (
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
                                      flangePressureClassId:
                                        parseInt(e.target.value, 10) || undefined,
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
                                    const filtered = stdId
                                      ? rawStdId2 || []
                                      : rawPressureClasses2 || [];
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
                            {(stub.endConfiguration === "flanged" ||
                              stub.endConfiguration === "rf") &&
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
                                        <option
                                          key={ft.code}
                                          value={ft.code}
                                          title={ft.description}
                                        >
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

            {/* ROW 4: Additional Specs section */}
            <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5 mb-3">
              Additional Specs
            </h4>
            <div className="space-y-3">
              {/* Branch Nominal Diameter - For Reducing Tees */}
              {(specs.fittingType === "SHORT_REDUCING_TEE" ||
                specs.fittingType === "GUSSET_REDUCING_TEE") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Branch Nominal Diameter (mm) *
                    <span className="text-blue-600 text-xs ml-2">(Tee Outlet Size)</span>
                  </label>
                  {(() => {
                    const selectId = `fitting-branch-nb-${entry.id}`;
                    const rawNominalDiameterMm7 = specs.nominalDiameterMm;
                    const mainNB = rawNominalDiameterMm7 || 0;
                    const sizes = [...SABS719_FITTING_SIZES].filter((nb) => nb < mainNB);
                    const options = sizes.map((nb: number) => ({
                      value: String(nb),
                      label: `${nb}mm`,
                    }));

                    return (
                      <Select
                        id={selectId}
                        value={
                          specs.branchNominalDiameterMm
                            ? String(entry.specs.branchNominalDiameterMm)
                            : ""
                        }
                        onChange={(value) => {
                          if (!value) return;
                          const branchDiameter = Number(value);
                          if (branchDiameter >= mainNB) return;
                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              branchNominalDiameterMm: branchDiameter,
                            },
                          });
                          debouncedCalculate();
                        }}
                        options={options}
                        placeholder="Select branch diameter..."
                      />
                    );
                  })()}
                  {errors[`fitting_${index}_branchNb`] && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {errors[`fitting_${index}_branchNb`]}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Branch/outlet size must be smaller than main pipe (
                    {rawNominalDiameterMm8 || "--"}mm)
                  </p>
                </div>
              )}

              {/* Warning when standard dimensions not available */}
              {dimensionsUnavailable && isTeeType && (
                <div className="bg-amber-50 border border-amber-300 rounded-md p-2 text-amber-800 text-xs">
                  <strong>Warning:</strong> Standard dimensions not available for {fittingNb}mm{" "}
                  {fittingType?.replace(/_/g, " ")}. Please enter pipe lengths manually.
                </div>
              )}

              {/* Closure Length Field - Only shown when L/F configuration is selected */}
              {hasLooseFlange(rawPipeEndConfiguration4 || "") && (
                <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-md border border-purple-200 dark:border-purple-700">
                  <ClosureLengthSelector
                    nominalBore={rawNominalDiameterMm9 || 100}
                    currentValue={rawClosureLengthMm || null}
                    wallThickness={rawWallThicknessMm17 || entry.calculation?.wallThicknessMm || 5}
                    onUpdate={(closureLength) =>
                      onUpdateEntry(entry.id, {
                        specs: { ...entry.specs, closureLengthMm: closureLength },
                      })
                    }
                    error={errors[`fitting_${index}_closureLength`]}
                    variant="compact"
                  />
                </div>
              )}
            </div>

            {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

            {/* Smart Notes Dropdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
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

            {/* Calculation Error Display */}
            {entry.calculationError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
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

            {/* Calculation Results - Compact Layout matching Bend style */}
            {entry.calculation && (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 border-b-2 border-green-500 pb-1.5 mb-3">
                  Calculation Results
                </h4>
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 rounded-md">
                  {(() => {
                    const rawFittingType12 = specs.fittingType;
                    const fittingType = rawFittingType12 || "Tee";
                    const rawNominalDiameterMm10 = specs.nominalDiameterMm;
                    const nominalBore = rawNominalDiameterMm10 || specs.nominalBoreMm || 0;

                    const isReducerCalc = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(
                      fittingType,
                    );
                    if (isReducerCalc) {
                      const largeNB = nominalBore;
                      const rawSmallNominalDiameterMm2 = specs.smallNominalDiameterMm;
                      const smallNB = rawSmallNominalDiameterMm2 || largeNB / 2;
                      const rawReducerLengthMm2 = specs.reducerLengthMm;
                      const reducerLengthMm = rawReducerLengthMm2 || 280;
                      const rawQuantityValue3 = specs.quantityValue;
                      const quantity = rawQuantityValue3 || 1;
                      const rawHasReducerStub2 = specs.hasReducerStub;
                      const hasStub = rawHasReducerStub2 || false;
                      const rawReducerStubNbMm3 = specs.reducerStubNbMm;
                      const stubNB = rawReducerStubNbMm3 || 50;
                      const stubLocationMm = reducerLengthMm / 2;

                      const rawSteelSpecificationId20 = specs.steelSpecificationId;

                      const steelSpecId =
                        rawSteelSpecificationId20 || globalSpecs?.steelSpecificationId;
                      const steelSpec = masterData?.steelSpecs?.find(
                        (s: SteelSpecItem) => s.id === steelSpecId,
                      );
                      const rawSteelSpecName5 = steelSpec?.steelSpecName;
                      const steelSpecName = rawSteelSpecName5 || "";

                      const rawFlangeStandardId8 = specs.flangeStandardId;

                      const flangeStandardId =
                        rawFlangeStandardId8 || globalSpecs?.flangeStandardId;
                      const rawFlangePressureClassId7 = specs.flangePressureClassId;
                      const flangePressureClassId =
                        rawFlangePressureClassId7 || globalSpecs?.flangePressureClassId;
                      const flangeStandard = masterData.flangeStandards?.find(
                        (s: FlangeStandardItem) => s.id === flangeStandardId,
                      );
                      const rawCode2 = flangeStandard?.code;
                      const flangeStandardCode = rawCode2 || "";
                      const pressureClass = masterData.pressureClasses?.find(
                        (p: PressureClassItem) => p.id === flangePressureClassId,
                      );
                      const rawDesignation = pressureClass?.designation;
                      const pressureClassDesignation = rawDesignation || "";
                      const rawFlangeTypeCode6 = specs.flangeTypeCode;
                      const flangeTypeCode = rawFlangeTypeCode6 || globalSpecs?.flangeTypeCode;

                      const rawPipeEndConfiguration5 = specs.pipeEndConfiguration;

                      const endConfig = rawPipeEndConfiguration5 || "PE";
                      const hasLargeFlange =
                        endConfig === "FBE" ||
                        endConfig === "FOE" ||
                        endConfig === "2X_RF" ||
                        endConfig === "2X_LF" ||
                        endConfig === "FOE_RF" ||
                        endConfig === "FOE_LF" ||
                        endConfig === "RF_LF";
                      const hasSmallFlange =
                        endConfig === "FBE" ||
                        endConfig === "2X_RF" ||
                        endConfig === "2X_LF" ||
                        endConfig === "FOE_RF" ||
                        endConfig === "FOE_LF" ||
                        endConfig === "RF_LF";

                      const rawLargeNB = nbToOdMap[largeNB];

                      const largeOD = rawLargeNB || largeNB * 1.05;
                      const rawSmallNB = nbToOdMap[smallNB];
                      const smallOD = rawSmallNB || smallNB * 1.05;
                      const rawWallThicknessMm18 = entry.calculation?.wallThicknessMm;
                      const wallThickness = rawWallThicknessMm18 || 6;

                      const avgOD = (largeOD + smallOD) / 2;
                      const reducerLengthM = reducerLengthMm / 1000;
                      const reducerPipeWeight =
                        calculatePipeWeightPerMeter(avgOD, wallThickness) * reducerLengthM;

                      const largeFlangeWeight =
                        hasLargeFlange && pressureClassDesignation
                          ? flangeWeight(
                              allWeights,
                              largeNB,
                              pressureClassDesignation,
                              flangeStandardCode,
                              flangeTypeCode,
                            )
                          : 0;
                      const smallFlangeWeight =
                        hasSmallFlange && pressureClassDesignation
                          ? flangeWeight(
                              allWeights,
                              smallNB,
                              pressureClassDesignation,
                              flangeStandardCode,
                              flangeTypeCode,
                            )
                          : 0;
                      const numFlanges = (hasLargeFlange ? 1 : 0) + (hasSmallFlange ? 1 : 0);

                      const rawStubNB = nbToOdMap[stubNB];

                      const stubOD = hasStub ? rawStubNB || stubNB * 1.05 : 0;
                      const rawStubNB2 = FITTING_CLASS_WALL_THICKNESS["STD"][stubNB];
                      const stubWT = hasStub ? rawStubNB2 || wallThickness : 0;
                      const stubLengthMm = 150;
                      const stubPipeWeight = hasStub
                        ? calculatePipeWeightPerMeter(stubOD, stubWT) * (stubLengthMm / 1000)
                        : 0;
                      const stubFlangeWeight = hasStub
                        ? flangeWeight(
                            allWeights,
                            stubNB,
                            pressureClassDesignation,
                            flangeStandardCode,
                            flangeTypeCode,
                          )
                        : 0;

                      const totalWeight =
                        (reducerPipeWeight +
                          largeFlangeWeight +
                          smallFlangeWeight +
                          stubPipeWeight +
                          stubFlangeWeight) *
                        quantity;

                      const largeCircMm = Math.PI * largeOD;
                      const smallCircMm = Math.PI * smallOD;
                      const stubCircMm = hasStub ? Math.PI * stubOD : 0;
                      const STEINMETZ_FACTOR = 2.7;

                      const largeEndWeldMm = hasLargeFlange ? 2 * largeCircMm : largeCircMm;
                      const smallEndWeldMm = hasSmallFlange ? 2 * smallCircMm : smallCircMm;
                      const stubJunctionWeldMm = hasStub ? STEINMETZ_FACTOR * stubOD : 0;
                      const stubFlangeWeldMm = hasStub ? 2 * stubCircMm : 0;
                      const totalWeldMm =
                        largeEndWeldMm + smallEndWeldMm + stubJunctionWeldMm + stubFlangeWeldMm;

                      return (
                        <div
                          className="grid gap-3"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
                        >
                          <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                            <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
                            <p className="text-lg font-bold text-blue-900">
                              {quantity} ×{" "}
                              {fittingType === "CON_REDUCER" ? "Concentric" : "Eccentric"}
                            </p>
                            <div className="mt-1 space-y-0.5 text-xs text-blue-700">
                              <p>Large: {largeNB}NB</p>
                              <p>Small: {smallNB}NB</p>
                              <p>Length: {reducerLengthMm}mm</p>
                              {hasStub && (
                                <p className="text-orange-700">
                                  Stub: {stubNB}NB @ {stubLocationMm}mm
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Weight Breakdown
                            </p>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                              {totalWeight.toFixed(2)}kg
                            </p>
                            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                              <p>Reducer: {(reducerPipeWeight * quantity).toFixed(2)}kg</p>
                              {hasLargeFlange && largeFlangeWeight > 0 && (
                                <p>
                                  {largeNB}NB Flange: {(largeFlangeWeight * quantity).toFixed(2)}kg
                                </p>
                              )}
                              {hasSmallFlange && smallFlangeWeight > 0 && (
                                <p>
                                  {smallNB}NB Flange: {(smallFlangeWeight * quantity).toFixed(2)}kg
                                </p>
                              )}
                              {hasStub && stubPipeWeight > 0 && (
                                <p className="text-orange-600">
                                  Stub Pipe: {(stubPipeWeight * quantity).toFixed(2)}kg
                                </p>
                              )}
                              {hasStub && stubFlangeWeight > 0 && (
                                <p className="text-orange-600">
                                  Stub Flange: {(stubFlangeWeight * quantity).toFixed(2)}kg
                                </p>
                              )}
                            </div>
                          </div>

                          {numFlanges + (hasStub ? 1 : 0) > 0 && (
                            <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                              <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-amber-900">
                                {numFlanges + (hasStub ? 1 : 0)}
                              </p>
                              <div className="mt-1 text-xs text-amber-700">
                                {hasLargeFlange && <p>1 × {largeNB}NB (Large)</p>}
                                {hasSmallFlange && <p>1 × {smallNB}NB (Small)</p>}
                                {hasStub && (
                                  <p className="text-orange-700">1 × {stubNB}NB (Stub)</p>
                                )}
                              </div>
                              {pressureClassDesignation && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  {pressureClassDesignation}
                                </p>
                              )}
                            </div>
                          )}

                          <WeldSummaryCard totalLinearMm={totalWeldMm}>
                            <p>Large End: {largeEndWeldMm.toFixed(0)}mm</p>
                            <p>Small End: {smallEndWeldMm.toFixed(0)}mm</p>
                            {hasStub && stubJunctionWeldMm > 0 && (
                              <p className="text-orange-600">
                                Stub Junction: {stubJunctionWeldMm.toFixed(0)}mm
                              </p>
                            )}
                            {hasStub && stubFlangeWeldMm > 0 && (
                              <p className="text-orange-600">
                                Stub Flange: {stubFlangeWeldMm.toFixed(0)}mm
                              </p>
                            )}
                          </WeldSummaryCard>
                        </div>
                      );
                    }

                    const isOffsetBendCalc = fittingType === "OFFSET_BEND";
                    if (isOffsetBendCalc) {
                      const rawOffsetLengthA2 = specs.offsetLengthA;
                      const lengthA = rawOffsetLengthA2 || 0;
                      const rawOffsetLengthB2 = specs.offsetLengthB;
                      const lengthB = rawOffsetLengthB2 || 0;
                      const rawOffsetLengthC2 = specs.offsetLengthC;
                      const lengthC = rawOffsetLengthC2 || 0;
                      const rawOffsetAngleDegrees2 = specs.offsetAngleDegrees;
                      const offsetAngle = rawOffsetAngleDegrees2 || 45;
                      const rawQuantityValue4 = specs.quantityValue;
                      const quantity = rawQuantityValue4 || 1;

                      const rawSteelSpecificationId21 = specs.steelSpecificationId;

                      const steelSpecId =
                        rawSteelSpecificationId21 || globalSpecs?.steelSpecificationId;
                      const steelSpec = masterData?.steelSpecs?.find(
                        (s: SteelSpecItem) => s.id === steelSpecId,
                      );
                      const rawSteelSpecName6 = steelSpec?.steelSpecName;
                      const steelSpecName = rawSteelSpecName6 || "";

                      const rawFlangeStandardId9 = specs.flangeStandardId;

                      const flangeStandardId =
                        rawFlangeStandardId9 || globalSpecs?.flangeStandardId;
                      const rawFlangePressureClassId8 = specs.flangePressureClassId;
                      const flangePressureClassId =
                        rawFlangePressureClassId8 || globalSpecs?.flangePressureClassId;
                      const flangeStandard = masterData.flangeStandards?.find(
                        (s: FlangeStandardItem) => s.id === flangeStandardId,
                      );
                      const rawCode3 = flangeStandard?.code;
                      const flangeStandardCode = rawCode3 || "";
                      const pressureClass = masterData.pressureClasses?.find(
                        (p: PressureClassItem) => p.id === flangePressureClassId,
                      );
                      const rawDesignation2 = pressureClass?.designation;
                      const pressureClassDesignation = rawDesignation2 || "";
                      const rawFlangeTypeCode7 = specs.flangeTypeCode;
                      const flangeTypeCode = rawFlangeTypeCode7 || globalSpecs?.flangeTypeCode;

                      const rawPipeEndConfiguration6 = specs.pipeEndConfiguration;

                      const endConfig = rawPipeEndConfiguration6 || "PE";
                      const hasStartFlange =
                        endConfig === "FBE" ||
                        endConfig === "FOE" ||
                        endConfig === "2X_RF" ||
                        endConfig === "2X_LF";
                      const hasEndFlange =
                        endConfig === "FBE" || endConfig === "2X_RF" || endConfig === "2X_LF";

                      const rawNominalBore = nbToOdMap[nominalBore];

                      const pipeOD = rawNominalBore || nominalBore * 1.05;
                      const rawWallThicknessMm19 = entry.calculation?.wallThicknessMm;
                      const wallThickness = rawWallThicknessMm19 || 6;

                      const totalPipeLengthMm = lengthA + lengthB + lengthC;
                      const totalPipeLengthM = totalPipeLengthMm / 1000;
                      const pipeWeight =
                        calculatePipeWeightPerMeter(pipeOD, wallThickness) * totalPipeLengthM;

                      const flangeWeightKg = pressureClassDesignation
                        ? flangeWeight(
                            allWeights,
                            nominalBore,
                            pressureClassDesignation,
                            flangeStandardCode,
                            flangeTypeCode,
                          )
                        : 0;
                      const numFlanges = (hasStartFlange ? 1 : 0) + (hasEndFlange ? 1 : 0);
                      const totalFlangeWeight = flangeWeightKg * numFlanges;

                      const totalWeight = (pipeWeight + totalFlangeWeight) * quantity;

                      const pipeCircMm = Math.PI * pipeOD;

                      const numMitreWelds = 2;
                      const mitreWeldMm = numMitreWelds * pipeCircMm;
                      const flangeWeldMm = numFlanges * 2 * pipeCircMm;
                      const totalWeldMm = mitreWeldMm + flangeWeldMm;

                      const angleRad = (offsetAngle * Math.PI) / 180;
                      const offsetHeight = Math.round(lengthB * Math.sin(angleRad));

                      return (
                        <div
                          className="grid gap-3"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
                        >
                          <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                            <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
                            <p className="text-lg font-bold text-blue-900">
                              {quantity} × Offset Bend
                            </p>
                            <div className="mt-1 space-y-0.5 text-xs text-blue-700">
                              <p>NB: {nominalBore}mm</p>
                              <p>
                                A: {lengthA}mm | B: {lengthB}mm | C: {lengthC}mm
                              </p>
                              <p>Total Length: {totalPipeLengthMm}mm</p>
                              <p className="text-purple-700">
                                Angle: {offsetAngle}° | Offset: {offsetHeight}mm
                              </p>
                            </div>
                          </div>

                          <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Weight Breakdown
                            </p>
                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                              {totalWeight.toFixed(2)}kg
                            </p>
                            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                              <p>Pipe: {(pipeWeight * quantity).toFixed(2)}kg</p>
                              {numFlanges > 0 && totalFlangeWeight > 0 && (
                                <p>
                                  Flanges ({numFlanges}):{" "}
                                  {(totalFlangeWeight * quantity).toFixed(2)}kg
                                </p>
                              )}
                            </div>
                          </div>

                          {numFlanges > 0 && (
                            <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                              <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-amber-900">{numFlanges}</p>
                              <div className="mt-1 text-xs text-amber-700">
                                <p>
                                  {numFlanges} × {nominalBore}NB
                                </p>
                              </div>
                              {pressureClassDesignation && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  {pressureClassDesignation}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded text-center">
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              Weld Summary
                            </p>
                            <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                              {(totalWeldMm / 1000).toFixed(2)} l/m
                            </p>
                            <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                              <p>
                                Mitre ({numMitreWelds}): {mitreWeldMm.toFixed(0)}mm
                              </p>
                              {numFlanges > 0 && (
                                <p>
                                  Flange ({numFlanges * 2}): {flangeWeldMm.toFixed(0)}mm
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isUnequalTeeCalc = ["UNEQUAL_SHORT_TEE", "UNEQUAL_GUSSET_TEE"].includes(
                      fittingType,
                    );
                    const isGussetTee = [
                      "GUSSET_TEE",
                      "UNEQUAL_GUSSET_TEE",
                      "GUSSET_REDUCING_TEE",
                      "GUSSETTED_TEE",
                    ].includes(fittingType);
                    const rawBranchNominalDiameterMm = specs.branchNominalDiameterMm;
                    // For unequal tees, use teeNominalDiameterMm; for reducing tees, use branchNominalDiameterMm
                    const branchNB =
                      rawBranchNominalDiameterMm ||
                      specs.branchNominalBoreMm ||
                      specs.teeNominalDiameterMm ||
                      nominalBore;
                    const rawPipeLengthAMm3 = specs.pipeLengthAMm;
                    const pipeALength = rawPipeLengthAMm3 || 0;
                    const rawPipeLengthBMm4 = specs.pipeLengthBMm;
                    const pipeBLength = rawPipeLengthBMm4 || 0;
                    const rawTeeHeightMm = specs.teeHeightMm;
                    const teeHeight = rawTeeHeightMm || 0;
                    const rawQuantityValue5 = specs.quantityValue;
                    const quantity = rawQuantityValue5 || 1;

                    const rawPipeEndConfiguration7 = specs.pipeEndConfiguration;

                    const flangeConfig = getFittingFlangeConfig(
                      rawPipeEndConfiguration7 || "PE",
                      specs.foePosition,
                    );
                    const numFlanges =
                      (flangeConfig.hasInlet ? 1 : 0) +
                      (flangeConfig.hasOutlet ? 1 : 0) +
                      (flangeConfig.hasBranch ? 1 : 0);

                    const rawScheduleNumber5 = specs.scheduleNumber;

                    const schedule = rawScheduleNumber5 || "";
                    const pipeWallThickness = entry.calculation?.wallThicknessMm;

                    const rawSteelSpecificationId22 = specs.steelSpecificationId;

                    const steelSpecId =
                      rawSteelSpecificationId22 || globalSpecs?.steelSpecificationId;
                    const steelSpec = masterData?.steelSpecs?.find(
                      (s: SteelSpecItem) => s.id === steelSpecId,
                    );
                    const rawSteelSpecName7 = steelSpec?.steelSpecName;
                    const steelSpecName = rawSteelSpecName7 || "";
                    const isSABS719 =
                      steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");

                    const fittingClass = scheduleToFittingClass(schedule);
                    const fittingClassWt = fittingClass
                      ? FITTING_CLASS_WALL_THICKNESS[fittingClass]
                      : undefined;

                    const rawNominalBore2 = fittingClassWt?.[nominalBore];

                    const fittingRawThickness =
                      isSABS719 || !fittingClass
                        ? pipeWallThickness || 6
                        : rawNominalBore2 || pipeWallThickness || 6;
                    const fittingWeldThickness = roundToWeldIncrement(fittingRawThickness);
                    const rawBranchNB = fittingClassWt?.[branchNB];
                    const branchRawThickness =
                      isSABS719 || !fittingClass
                        ? pipeWallThickness || 6
                        : rawBranchNB || pipeWallThickness || 6;
                    const branchWeldThickness = roundToWeldIncrement(branchRawThickness);

                    const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
                    const rawNominalBore3 = nbToOdMap[nominalBore];

                    const mainOdMm =
                      rawOutsideDiameterMm ||
                      (nominalBore ? rawNominalBore3 || nominalBore * 1.05 : 0);
                    const rawBranchNB2 = nbToOdMap[branchNB];
                    const branchOdMm = branchNB ? rawBranchNB2 || branchNB * 1.05 : 0;
                    const rawPipeEndConfiguration8 = specs.pipeEndConfiguration;
                    const flangeConfigCalc = getFittingFlangeConfig(
                      rawPipeEndConfiguration8 || "PE",
                      specs.foePosition,
                    );
                    const mainFlangeWeldCount =
                      (flangeConfigCalc.hasInlet && flangeConfigCalc.inletType !== "loose"
                        ? 1
                        : 0) +
                      (flangeConfigCalc.hasOutlet && flangeConfigCalc.outletType !== "loose"
                        ? 1
                        : 0);
                    const branchFlangeWeldCount =
                      flangeConfigCalc.hasBranch && flangeConfigCalc.branchType !== "loose" ? 1 : 0;
                    const gussetSectionMm = isGussetTee
                      ? getGussetSection(nominalBore) || entry.calculation?.gussetSectionMm || 0
                      : 0;
                    const gussetAreaMm2 = 0.5 * gussetSectionMm * gussetSectionMm;
                    const gussetVolumeDm3 = (gussetAreaMm2 * (pipeWallThickness || 0)) / 1e6;
                    const singleGussetWeight = gussetVolumeDm3 * 7.85;
                    const calculatedGussetWeight = 2 * singleGussetWeight * quantity;
                    const rawGussetWeight = entry.calculation?.gussetWeight;
                    const gussetWeight = isGussetTee
                      ? rawGussetWeight || calculatedGussetWeight
                      : 0;
                    const fittingWeldVolume =
                      mainOdMm && pipeWallThickness
                        ? calculateFittingWeldVolume({
                            mainOdMm,
                            mainWallThicknessMm: pipeWallThickness,
                            branchOdMm: branchOdMm || undefined,
                            branchWallThicknessMm: pipeWallThickness,
                            numberOfMainFlangeWelds: mainFlangeWeldCount,
                            numberOfBranchFlangeWelds: branchFlangeWeldCount,
                            hasTeeJunctionWeld: true,
                            gussetSectionMm: gussetSectionMm > 0 ? gussetSectionMm : undefined,
                            gussetWallThicknessMm:
                              gussetSectionMm > 0 ? pipeWallThickness : undefined,
                          })
                        : null;

                    const rotatingFlangeCount =
                      (flangeConfig.inletType === "rotating" ? 1 : 0) +
                      (flangeConfig.outletType === "rotating" ? 1 : 0) +
                      (flangeConfig.branchType === "rotating" ? 1 : 0);

                    const mainRingWeight =
                      flangeConfig.inletType === "rotating" ||
                      flangeConfig.outletType === "rotating"
                        ? retainingRingWeightLookup(
                            allRetainingRings,
                            nominalBore,
                            entry.calculation?.outsideDiameterMm,
                            nbToOdMap,
                          )
                        : 0;
                    const branchRingWeight =
                      flangeConfig.branchType === "rotating"
                        ? retainingRingWeightLookup(
                            allRetainingRings,
                            branchNB,
                            undefined,
                            nbToOdMap,
                          )
                        : 0;

                    const mainRingsCount =
                      (flangeConfig.inletType === "rotating" ? 1 : 0) +
                      (flangeConfig.outletType === "rotating" ? 1 : 0);
                    const totalRingWeight =
                      mainRingsCount * mainRingWeight +
                      (flangeConfig.branchType === "rotating" ? branchRingWeight : 0);

                    const { flangeStandardCode, pressureClassDesignation, flangeTypeCode } =
                      resolveFlangeConfig(specs, globalSpecs, masterData);

                    const mainFlangeWeightPerUnit = flangeWeightOr(
                      allWeights,
                      nominalBore,
                      pressureClassDesignation,
                      flangeStandardCode,
                      flangeTypeCode,
                    );
                    const branchFlangeWeightPerUnit = flangeWeightOr(
                      allWeights,
                      branchNB,
                      pressureClassDesignation,
                      flangeStandardCode,
                      flangeTypeCode,
                    );

                    const mainFlangeCount =
                      (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
                    const branchFlangeCount = flangeConfig.hasBranch ? 1 : 0;
                    const dynamicTotalFlangeWeight =
                      mainFlangeCount * mainFlangeWeightPerUnit +
                      branchFlangeCount * branchFlangeWeightPerUnit;

                    const rawBlankFlangePositions2 = specs.blankFlangePositions;

                    const blankPositions = rawBlankFlangePositions2 || [];
                    const blankFlangeCount = blankPositions.length;
                    const blankWeightPerUnit = calculateBlankFlangeWeight(
                      allWeights,
                      nominalBore,
                      pressureClassDesignation,
                      flangeStandardCode,
                    );
                    const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                    const fittingEndOption = FITTING_END_OPTIONS.find(
                      (o) => o.value === entry.specs.pipeEndConfiguration,
                    );
                    const rawPipeEndConfiguration9 = entry.specs.pipeEndConfiguration;
                    const hasLooseFlangeConfig = hasLooseFlange(rawPipeEndConfiguration9 || "");
                    const tackWeldEnds = hasLooseFlangeConfig ? 1 : 0;
                    const tackWeldTotalWeight =
                      nominalBore && tackWeldEnds > 0
                        ? getTackWeldWeight(nominalBore, tackWeldEnds)
                        : 0;

                    const rawClosureLengthMm2 = specs.closureLengthMm;

                    const closureLengthMm = rawClosureLengthMm2 || 0;
                    const rawWallThicknessMm20 = specs.wallThicknessMm;
                    const closureWallThickness =
                      rawWallThicknessMm20 ||
                      entry.calculation?.wallThicknessMm ||
                      pipeWallThickness ||
                      5;
                    const closureTotalWeight =
                      nominalBore && closureLengthMm > 0 && closureWallThickness > 0
                        ? getClosureWeight(
                            nominalBore,
                            closureLengthMm,
                            closureWallThickness,
                            nbToOdMap,
                          )
                        : 0;

                    const rawStubs14 = specs.stubs;

                    const stubsData = (rawStubs14 || []).map((stub: any) => {
                      const rawNominalBoreMm2 = stub.nominalBoreMm;
                      const stubNB = rawNominalBoreMm2 || 50;
                      const rawStubNB3 = nbToOdMap[stubNB];
                      const stubOdMm = rawStubNB3 || stubNB * 1.05;
                      const rawStubNB4 = FITTING_CLASS_WALL_THICKNESS["STD"][stubNB];
                      const stubWallThickness = rawStubNB4 || pipeWallThickness || 5;
                      const rawStubLengthMm2 = stub.stubLengthMm;
                      const stubLengthMm = rawStubLengthMm2 || 150;
                      const stubLengthM = stubLengthMm / 1000;
                      const stubPipeWeight =
                        calculatePipeWeightPerMeter(stubOdMm, stubWallThickness) * stubLengthM;
                      const stubHasFlange =
                        stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";
                      const stubFlangeWeight = stubHasFlange
                        ? flangeWeight(
                            allWeights,
                            stubNB,
                            pressureClassDesignation,
                            flangeStandardCode,
                            flangeTypeCode,
                          )
                        : 0;
                      const stubBlankWeight =
                        stubHasFlange && stub.hasBlankFlange
                          ? calculateBlankFlangeWeight(
                              allWeights,
                              stubNB,
                              pressureClassDesignation,
                              flangeStandardCode,
                            )
                          : 0;
                      const stubCircMm = Math.PI * stubOdMm;
                      const STEINMETZ_FACTOR = 2.7;
                      const stubToMainWeldMm = STEINMETZ_FACTOR * stubOdMm;
                      const stubFlangeWeldMm = stubHasFlange ? 2 * stubCircMm : 0;
                      const rawHasBlankFlange2 = stub.hasBlankFlange;
                      return {
                        stubNB,
                        stubLengthMm,
                        stubOdMm,
                        stubPipeWeight,
                        stubFlangeWeight,
                        stubBlankWeight,
                        stubHasFlange,
                        hasBlankFlange: rawHasBlankFlange2 || false,
                        stubToMainWeldMm,
                        stubFlangeWeldMm,
                        stubCircMm,
                      };
                    });

                    const totalStubPipeWeight = stubsData.reduce(
                      (sum: number, s: StubCalcData) => sum + s.stubPipeWeight,
                      0,
                    );
                    const totalStubFlangeWeight = stubsData.reduce(
                      (sum: number, s: StubCalcData) => sum + s.stubFlangeWeight,
                      0,
                    );
                    const totalStubBlankWeight = stubsData.reduce(
                      (sum: number, s: StubCalcData) => sum + s.stubBlankWeight,
                      0,
                    );
                    const stubFlangeCount = stubsData.filter(
                      (s: StubCalcData) => s.stubHasFlange,
                    ).length;
                    const stubBlankCount = stubsData.filter(
                      (s: StubCalcData) => s.stubHasFlange && s.hasBlankFlange,
                    ).length;
                    const totalStubToMainWeldMm = stubsData.reduce(
                      (sum: number, s: StubCalcData) => sum + s.stubToMainWeldMm,
                      0,
                    );
                    const totalStubFlangeWeldMm = stubsData.reduce(
                      (sum: number, s: StubCalcData) => sum + s.stubFlangeWeldMm,
                      0,
                    );

                    const rawFittingWeight = entry.calculation.fittingWeight;
                    const rawPipeWeight = entry.calculation.pipeWeight;

                    const baseWeight =
                      (rawFittingWeight || 0) +
                      (rawPipeWeight || 0) +
                      dynamicTotalFlangeWeight +
                      gussetWeight;

                    const totalWeight =
                      baseWeight +
                      totalRingWeight +
                      totalBlankFlangeWeight +
                      tackWeldTotalWeight +
                      closureTotalWeight +
                      totalStubPipeWeight +
                      totalStubFlangeWeight +
                      totalStubBlankWeight;

                    return (
                      <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
                      >
                        {/* Qty & Dimensions - Blue for lengths */}
                        <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                          <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
                          <p className="text-lg font-bold text-blue-900">
                            {quantity} × {fittingType.replace(/_/g, " ")}
                          </p>
                          <div className="mt-1 space-y-0.5 text-xs text-blue-700">
                            <p>Main: {nominalBore}NB</p>
                            {branchNB !== nominalBore && (
                              <p>
                                {isUnequalTeeCalc ? "Tee" : "Branch"}: {branchNB}NB
                              </p>
                            )}
                            {pipeALength > 0 && <p>Pipe A: {pipeALength}mm</p>}
                            {pipeBLength > 0 && <p>Pipe B: {pipeBLength}mm</p>}
                            {teeHeight > 0 && <p>Height: {teeHeight}mm</p>}
                            {stubsData.map((stub: StubCalcData, idx: number) => (
                              <p key={idx} className="text-orange-700">
                                Stub {idx + 1}: {stub.stubLengthMm}mm @ {stub.stubNB}NB
                              </p>
                            ))}
                          </div>
                        </div>
                        {/* Weight Breakdown - Combined total weight with breakdown */}
                        {(() => {
                          const rawPipeWeight2 = entry.calculation.pipeWeight;
                          const totalPipeWeight = rawPipeWeight2 || 0;
                          const totalPipeLength = pipeALength + pipeBLength;
                          const pipeAWeight =
                            totalPipeLength > 0
                              ? (totalPipeWeight * pipeALength) / totalPipeLength
                              : 0;
                          const pipeBWeight =
                            totalPipeLength > 0
                              ? (totalPipeWeight * pipeBLength) / totalPipeLength
                              : 0;

                          const mainFlangeCount =
                            (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
                          const branchFlangeCountCalc = flangeConfig.hasBranch ? 1 : 0;
                          const allSameNB = branchNB === nominalBore;

                          const rawFittingWeight2 = entry.calculation.fittingWeight;

                          return (
                            <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                Weight Breakdown
                              </p>
                              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                {totalWeight.toFixed(2)}kg
                              </p>
                              <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                                {(rawFittingWeight2 || 0) > 0 && (
                                  <p>Tee Fitting: {entry.calculation.fittingWeight.toFixed(2)}kg</p>
                                )}
                                {pipeAWeight > 0 && (
                                  <p>
                                    Pipe A {nominalBore}NB ({pipeALength}mm):{" "}
                                    {pipeAWeight.toFixed(2)}kg
                                  </p>
                                )}
                                {pipeBWeight > 0 && (
                                  <p>
                                    Pipe B {branchNB}NB ({pipeBLength}mm): {pipeBWeight.toFixed(2)}
                                    kg
                                  </p>
                                )}
                                {allSameNB && numFlanges > 0 && mainFlangeWeightPerUnit > 0 && (
                                  <p>
                                    {numFlanges} × {nominalBore}NB Flange @{" "}
                                    {mainFlangeWeightPerUnit.toFixed(2)}kg
                                  </p>
                                )}
                                {!allSameNB &&
                                  mainFlangeCount > 0 &&
                                  mainFlangeWeightPerUnit > 0 && (
                                    <p>
                                      {mainFlangeCount} × {nominalBore}NB Flange @{" "}
                                      {mainFlangeWeightPerUnit.toFixed(2)}kg
                                    </p>
                                  )}
                                {!allSameNB &&
                                  branchFlangeCountCalc > 0 &&
                                  branchFlangeWeightPerUnit > 0 && (
                                    <p>
                                      1 × {branchNB}NB Flange @{" "}
                                      {branchFlangeWeightPerUnit.toFixed(2)}
                                      kg
                                    </p>
                                  )}
                                {totalRingWeight > 0 && (
                                  <p>R/F Rings: {totalRingWeight.toFixed(2)}kg</p>
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
                                {isGussetTee && gussetWeight > 0 && (
                                  <>
                                    <p className="font-medium mt-1">
                                      2 × Gusset ({getGussetSection(nominalBore)}mm):{" "}
                                      {gussetWeight.toFixed(2)}kg
                                    </p>
                                    <p className="text-[10px]">
                                      ({(gussetWeight / 2).toFixed(2)}kg each)
                                    </p>
                                  </>
                                )}
                                {stubsData
                                  .filter((s: StubCalcData) => s.stubPipeWeight > 0)
                                  .map((stub: StubCalcData, idx: number) => (
                                    <p key={`stub-pipe-${idx}`} className="text-orange-600">
                                      Stub {stub.stubNB}NB Pipe: {stub.stubPipeWeight.toFixed(2)}kg
                                    </p>
                                  ))}
                                {stubsData
                                  .filter((s: StubCalcData) => s.stubHasFlange)
                                  .map((stub: StubCalcData, idx: number) => (
                                    <p key={`stub-flange-${idx}`} className="text-orange-600">
                                      Stub {stub.stubNB}NB Flange:{" "}
                                      {stub.stubFlangeWeight.toFixed(2)}kg
                                    </p>
                                  ))}
                                {stubsData
                                  .filter((s: StubCalcData) => s.stubBlankWeight > 0)
                                  .map((stub: StubCalcData, idx: number) => (
                                    <p key={`stub-blank-${idx}`} className="text-orange-600">
                                      Stub {stub.stubNB}NB Blank: {stub.stubBlankWeight.toFixed(2)}
                                      kg
                                    </p>
                                  ))}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Flanges - Amber for flange info - only show if flanges exist */}
                        {(() => {
                          const mainFlangeCountDisplay =
                            (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
                          const branchFlangeCountDisplay = flangeConfig.hasBranch ? 1 : 0;
                          const allSameNBDisplay = branchNB === nominalBore;
                          const baseFlangeCount = mainFlangeCountDisplay + branchFlangeCountDisplay;
                          const totalFlangeCountWithStubs = baseFlangeCount + stubFlangeCount;
                          const totalFlangeWeightWithStubs =
                            dynamicTotalFlangeWeight + totalStubFlangeWeight;

                          if (totalFlangeCountWithStubs === 0) return null;

                          const stubFlangesByNB = stubsData
                            .filter((s: StubCalcData) => s.stubHasFlange)
                            .reduce((acc: Record<number, number>, s: StubCalcData) => {
                              const rawStubNB5 = acc[s.stubNB];
                              acc[s.stubNB] = (rawStubNB5 || 0) + 1;
                              return acc;
                            }, {});

                          return (
                            <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                              <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-amber-900">
                                {totalFlangeCountWithStubs}
                              </p>
                              <div className="mt-1 text-xs text-amber-700">
                                {allSameNBDisplay && baseFlangeCount > 0 && (
                                  <p>
                                    {baseFlangeCount} × {nominalBore}NB Flange
                                  </p>
                                )}
                                {!allSameNBDisplay && mainFlangeCountDisplay > 0 && (
                                  <p>
                                    {mainFlangeCountDisplay} × {nominalBore}NB Flange
                                  </p>
                                )}
                                {!allSameNBDisplay && branchFlangeCountDisplay > 0 && (
                                  <p>
                                    1 × {branchNB}NB {isUnequalTeeCalc ? "Tee " : ""}Flange
                                  </p>
                                )}
                                {entries(stubFlangesByNB).map(([nb, count]) => (
                                  <p key={nb} className="text-orange-700">
                                    {count as number} × {nb}NB Stub Flange
                                  </p>
                                ))}
                              </div>
                              {pressureClassDesignation && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  {pressureClassDesignation}
                                </p>
                              )}
                              {totalFlangeWeightWithStubs > 0 && (
                                <p className="text-xs text-amber-500 mt-1 font-semibold">
                                  {totalFlangeWeightWithStubs.toFixed(2)}kg total
                                </p>
                              )}
                            </div>
                          );
                        })()}
                        {/* Weld Summary with Volume - Combined */}
                        {(() => {
                          const STEINMETZ_FACTOR = 2.7;
                          const mainCircMm = Math.PI * mainOdMm;
                          const totalFlangeWeldMm = numFlanges * 2 * mainCircMm;
                          const effectiveGussetSection =
                            getGussetSection(nominalBore) ||
                            entry.calculation?.gussetSectionMm ||
                            0;
                          const calculatedGussetWeldLengthMm =
                            effectiveGussetSection > 0
                              ? 2 *
                                (effectiveGussetSection * Math.SQRT2 + 2 * effectiveGussetSection)
                              : 0;
                          const rawGussetWeldLengthMm = fittingWeldVolume?.gussetWeldLengthMm;
                          const gussetWeldLengthMm = isGussetTee
                            ? rawGussetWeldLengthMm || calculatedGussetWeldLengthMm
                            : 0;
                          const teeJunctionWeldMm =
                            !isGussetTee && branchOdMm > 0 ? STEINMETZ_FACTOR * branchOdMm : 0;
                          const totalWeldLinearMm =
                            teeJunctionWeldMm +
                            totalFlangeWeldMm +
                            gussetWeldLengthMm +
                            totalStubToMainWeldMm +
                            totalStubFlangeWeldMm;

                          if (totalWeldLinearMm === 0 && !fittingWeldVolume) return null;

                          const isLateralFitting = ["LATERAL", "REDUCING_LATERAL"].includes(
                            fittingType,
                          );
                          const angleRange = specs.angleRange as string | undefined;
                          const isAngle45OrAbove = angleRange === "60-90" || angleRange === "45-59";
                          const junctionWeldLabel = isLateralFitting
                            ? isAngle45OrAbove
                              ? "Lat Weld 45+"
                              : "Lat Weld <45"
                            : "Tee Junction";

                          return (
                            <WeldSummaryCard
                              totalVolumeCm3={
                                fittingWeldVolume
                                  ? fittingWeldVolume.totalVolumeCm3 * quantity
                                  : undefined
                              }
                            >
                              {!isGussetTee && teeJunctionWeldMm > 0 && (
                                <p>
                                  {junctionWeldLabel}: {teeJunctionWeldMm.toFixed(0)}mm @{" "}
                                  {branchWeldThickness?.toFixed(1)}mm
                                </p>
                              )}
                              {isGussetTee && gussetWeldLengthMm > 0 && (
                                <p>
                                  2 × Gusset ({effectiveGussetSection.toFixed(0)}mm):{" "}
                                  {gussetWeldLengthMm.toFixed(0)}mm @{" "}
                                  {fittingWeldThickness?.toFixed(1)}mm
                                </p>
                              )}
                              {numFlanges > 0 && (
                                <p>
                                  {numFlanges} × Flange (2×{mainCircMm.toFixed(0)}mm) @{" "}
                                  {fittingWeldThickness?.toFixed(1)}mm
                                </p>
                              )}
                              {totalStubToMainWeldMm > 0 && (
                                <p className="text-orange-600">
                                  Stub Junction ({stubsData.length}×):{" "}
                                  {totalStubToMainWeldMm.toFixed(0)}mm
                                </p>
                              )}
                              {totalStubFlangeWeldMm > 0 && (
                                <p className="text-orange-600">
                                  Stub Flanges ({stubFlangeCount}×2):{" "}
                                  {totalStubFlangeWeldMm.toFixed(0)}mm
                                </p>
                              )}
                              {totalWeldLinearMm > 0 && (
                                <p className="font-medium mt-1">
                                  {(totalWeldLinearMm / 1000).toFixed(2)} l/m total
                                </p>
                              )}
                            </WeldSummaryCard>
                          );
                        })()}
                        {/* Surface Area - Indigo/Cyan - Only show when Surface Protection is selected */}
                        {requiredProducts.includes("surface_protection") &&
                          mainOdMm &&
                          pipeWallThickness &&
                          (() => {
                            const totalLengthMm =
                              (pipeALength || 0) + (pipeBLength || 0) + (teeHeight || 0);
                            const pipeLengthM = totalLengthMm / 1000;
                            const insideDiameterMm = mainOdMm - 2 * pipeWallThickness;
                            const surfaceArea = calculateComprehensiveSurfaceArea({
                              outsideDiameterMm: mainOdMm,
                              insideDiameterMm,
                              pipeLengthM,
                              numberOfFlanges: numFlanges,
                              dn: nominalBore,
                              pressureClass: pressureClassDesignation,
                            });
                            return (
                              <SurfaceAreaDisplay
                                externalTotal={surfaceArea.totalExternalAreaM2 * quantity}
                                internalTotal={surfaceArea.totalInternalAreaM2 * quantity}
                                externalBreakdown={[
                                  {
                                    label: "Pipe",
                                    value: surfaceArea.externalPipeAreaM2 * quantity,
                                  },
                                  {
                                    label: "Flanges",
                                    value: surfaceArea.externalFlangeBackAreaM2 * quantity,
                                  },
                                ]}
                                internalBreakdown={[
                                  {
                                    label: "Pipe",
                                    value: surfaceArea.internalPipeAreaM2 * quantity,
                                  },
                                  {
                                    label: "Flanges",
                                    value: surfaceArea.internalFlangeFaceAreaM2 * quantity,
                                  },
                                ]}
                              />
                            );
                          })()}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        }
        previewContent={(() => {
          if (isUnregisteredCustomer && onShowRestrictionPopup) {
            return (
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
            );
          }

          const rawFittingType13 = specs.fittingType;

          const fittingType = rawFittingType13 || "";
          const isTeeType = [
            "SHORT_TEE",
            "GUSSET_TEE",
            "UNEQUAL_SHORT_TEE",
            "UNEQUAL_GUSSET_TEE",
            "SHORT_REDUCING_TEE",
            "GUSSET_REDUCING_TEE",
            "EQUAL_TEE",
            "UNEQUAL_TEE",
            "SWEEP_TEE",
            "GUSSETTED_TEE",
          ].includes(fittingType);

          const isLateralType = ["LATERAL", "REDUCING_LATERAL"].includes(fittingType);
          const isReducerType = ["CON_REDUCER", "ECCENTRIC_REDUCER"].includes(fittingType);
          const isOffsetBendType = fittingType === "OFFSET_BEND";

          if (isTeeType && !Tee3DPreview) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                3D preview hidden. Use the toggle above to show drawings.
              </div>
            );
          }

          if (isLateralType && !Lateral3DPreview) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                3D preview hidden. Use the toggle above to show drawings.
              </div>
            );
          }

          if (isReducerType && !Reducer3DPreview) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                3D preview hidden. Use the toggle above to show drawings.
              </div>
            );
          }

          if (isOffsetBendType && !OffsetBend3DPreview) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                3D preview hidden. Use the toggle above to show drawings.
              </div>
            );
          }

          if (!isTeeType && !isLateralType && !isReducerType && !isOffsetBendType) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                3D preview is only available for tee, lateral, reducer, and offset bend fittings
              </div>
            );
          }

          if (!specs.nominalDiameterMm) {
            return (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                Select nominal bore to see 3D preview
              </div>
            );
          }

          const teeType = [
            "GUSSET_TEE",
            "UNEQUAL_GUSSET_TEE",
            "GUSSET_REDUCING_TEE",
            "GUSSETTED_TEE",
          ].includes(fittingType)
            ? ("gusset" as const)
            : ("short" as const);

          const rawNominalDiameterMm11 = specs.nominalDiameterMm;

          const nominalBore = rawNominalDiameterMm11 || 500;
          const branchNominalBore = specs.branchNominalDiameterMm;
          const rawWallThicknessMm21 = specs.wallThicknessMm;
          const wallThickness = rawWallThicknessMm21 || entry.calculation?.wallThicknessMm || 8;
          const outerDiameter = entry.calculation?.outsideDiameterMm;

          const steelSpec = masterData.steelSpecs?.find((s: SteelSpecItem) => {
            const rawSteelSpecificationId23 = specs.steelSpecificationId;
            return s.id === (rawSteelSpecificationId23 || globalSpecs?.steelSpecificationId);
          });

          const rawFlangeStandardId10 = specs.flangeStandardId;

          const flangeStandardId = rawFlangeStandardId10 || globalSpecs?.flangeStandardId;
          const rawFlangePressureClassId9 = specs.flangePressureClassId;
          const flangePressureClassId =
            rawFlangePressureClassId9 || globalSpecs?.flangePressureClassId;
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
          const rawDesignation3 = pressureClass?.designation;
          const pressureClassDesignation = rawDesignation3 || "";

          const teeNominalBore = specs.teeNominalDiameterMm;

          if (isLateralType && Lateral3DPreview) {
            const angleRange = specs.angleRange as "60-90" | "45-59" | "30-44" | undefined;
            const defaultAngles: Record<string, number> = {
              "60-90": 60,
              "45-59": 45,
              "30-44": 30,
            };
            const rawAngleRange2 = angleRange ? defaultAngles[angleRange] : undefined;
            const angleDegrees = angleRange ? rawAngleRange2 || 60 : 60;
            const rawStubs15 = specs.stubs;
            const stubsForPreview = (rawStubs15 || []).map((stub: any) => {
              const locationMap: Record<string, "branch" | "mainA" | "mainB"> = {
                inlet: "mainA",
                outlet: "mainB",
                mainA: "mainA",
                mainB: "mainB",
                branch: "branch",
              };
              const rawOutletLocation2 = locationMap[stub.outletLocation];
              const rawNominalBoreMm3 = stub.nominalBoreMm;
              const rawDistanceFromOutletMm2 = stub.distanceFromOutletMm;
              const rawStubLengthMm3 = stub.stubLengthMm;
              const rawPositionDegrees2 = stub.positionDegrees;
              const rawEndConfiguration2 = stub.endConfiguration;
              const rawHasBlankFlange3 = stub.hasBlankFlange;
              return {
                outletLocation: rawOutletLocation2 || "branch",
                steelSpecId: stub.steelSpecId,
                nominalBoreMm: rawNominalBoreMm3 || 50,
                distanceFromOutletMm: rawDistanceFromOutletMm2 || 100,
                stubLengthMm: rawStubLengthMm3 || 150,
                positionDegrees: rawPositionDegrees2 || 0,
                endConfiguration: rawEndConfiguration2 || "plain",
                hasBlankFlange: rawHasBlankFlange3 || false,
              };
            });
            const rawPipeEndConfiguration10 = specs.pipeEndConfiguration;
            const lateralFlangeConfig = getFittingFlangeConfig(
              rawPipeEndConfiguration10 || "",
              specs.foePosition,
            );
            const rawBlankFlangePositions3 = specs.blankFlangePositions;
            const blankPositions = rawBlankFlangePositions3 || [];
            const rawClosureLengthMm3 = specs.closureLengthMm;
            return (
              <Lateral3DPreview
                nominalBore={nominalBore}
                outerDiameter={outerDiameter}
                wallThickness={wallThickness}
                angleDegrees={angleDegrees}
                angleRange={angleRange}
                hasInletFlange={lateralFlangeConfig.hasInlet}
                hasOutletFlange={lateralFlangeConfig.hasOutlet}
                hasBranchFlange={lateralFlangeConfig.hasBranch}
                inletFlangeType={lateralFlangeConfig.inletType}
                outletFlangeType={lateralFlangeConfig.outletType}
                branchFlangeType={lateralFlangeConfig.branchType}
                hasBlankInlet={blankPositions.includes("inlet")}
                hasBlankOutlet={blankPositions.includes("outlet")}
                hasBlankBranch={blankPositions.includes("branch")}
                closureLengthMm={rawClosureLengthMm3 || 150}
                stubs={stubsForPreview}
              />
            );
          }

          if (isReducerType && Reducer3DPreview) {
            const rawSmallNominalDiameterMm3 = specs.smallNominalDiameterMm;
            const smallNominalBore = rawSmallNominalDiameterMm3 || nominalBore / 2;
            const rawReducerLengthMm3 = specs.reducerLengthMm;
            const reducerLength = rawReducerLengthMm3 || 280;
            const reducerType = fittingType === "CON_REDUCER" ? "CONCENTRIC" : "ECCENTRIC";
            const rawHasReducerStub3 = specs.hasReducerStub;
            const hasStub = rawHasReducerStub3 || false;
            const rawReducerStubNbMm4 = specs.reducerStubNbMm;
            const stubNb = rawReducerStubNbMm4 || 50;
            const stubLocation = reducerLength ? Math.round(reducerLength / 2) : undefined;

            const rawPipeEndConfiguration11 = specs.pipeEndConfiguration;

            const endConfig = rawPipeEndConfiguration11 || "PE";
            const hasLargeFlange =
              endConfig === "FBE" ||
              endConfig === "FOE" ||
              endConfig === "2X_RF" ||
              endConfig === "2X_LF" ||
              endConfig === "FOE_RF" ||
              endConfig === "FOE_LF" ||
              endConfig === "RF_LF";
            const hasSmallFlange =
              endConfig === "FBE" ||
              endConfig === "2X_RF" ||
              endConfig === "2X_LF" ||
              endConfig === "FOE_RF" ||
              endConfig === "FOE_LF" ||
              endConfig === "RF_LF";
            const largeEndFlangeType =
              endConfig === "2X_RF" || endConfig === "FOE_RF" || endConfig === "RF_LF"
                ? "rotating"
                : endConfig === "2X_LF" || endConfig === "FOE_LF"
                  ? "loose"
                  : "fixed";
            const smallEndFlangeType =
              endConfig === "2X_RF" || endConfig === "FOE_RF"
                ? "rotating"
                : endConfig === "2X_LF" || endConfig === "FOE_LF" || endConfig === "RF_LF"
                  ? "loose"
                  : "fixed";

            const rawBlankFlangePositions4 = specs.blankFlangePositions;

            const blankPositions = rawBlankFlangePositions4 || [];
            const rawReducerStubAngleDegrees2 = specs.reducerStubAngleDegrees;
            const rawClosureLengthMm4 = specs.closureLengthMm;
            return (
              <Reducer3DPreview
                key={`reducer-${entry.id}-${reducerType}`}
                largeNominalBore={nominalBore}
                smallNominalBore={smallNominalBore}
                lengthMm={reducerLength}
                wallThickness={wallThickness}
                reducerType={reducerType}
                hasLargeEndFlange={hasLargeFlange}
                hasSmallEndFlange={hasSmallFlange}
                largeEndFlangeType={largeEndFlangeType}
                smallEndFlangeType={smallEndFlangeType}
                hasBlankLargeEnd={blankPositions.includes("large")}
                hasBlankSmallEnd={blankPositions.includes("small")}
                hasCenterStub={hasStub}
                stubNominalBore={stubNb}
                stubLocationMm={stubLocation}
                stubAngleDegrees={rawReducerStubAngleDegrees2 || 0}
                closureLengthMm={rawClosureLengthMm4 || 150}
              />
            );
          }

          if (isOffsetBendType && OffsetBend3DPreview) {
            const rawOffsetLengthA3 = specs.offsetLengthA;
            const lengthA = rawOffsetLengthA3 || 300;
            const rawOffsetLengthB3 = specs.offsetLengthB;
            const lengthB = rawOffsetLengthB3 || 200;
            const rawOffsetLengthC3 = specs.offsetLengthC;
            const lengthC = rawOffsetLengthC3 || 300;
            const rawOffsetAngleDegrees3 = specs.offsetAngleDegrees;
            const offsetAngle = rawOffsetAngleDegrees3 || 45;

            const rawPipeEndConfiguration12 = specs.pipeEndConfiguration;

            const endConfig = rawPipeEndConfiguration12 || "PE";
            const hasStartFlange =
              endConfig === "FBE" ||
              endConfig === "FOE" ||
              endConfig === "2X_RF" ||
              endConfig === "2X_LF";
            const hasEndFlange =
              endConfig === "FBE" || endConfig === "2X_RF" || endConfig === "2X_LF";

            const offsetStartFlangeType =
              endConfig === "2X_RF" ? "rotating" : endConfig === "2X_LF" ? "loose" : "fixed";
            const offsetEndFlangeType =
              endConfig === "2X_RF" ? "rotating" : endConfig === "2X_LF" ? "loose" : "fixed";

            const rawClosureLengthMm5 = specs.closureLengthMm;

            return (
              <OffsetBend3DPreview
                key={`offset-bend-${entry.id}`}
                nominalBore={nominalBore}
                outerDiameter={outerDiameter}
                wallThickness={wallThickness}
                lengthA={lengthA}
                lengthB={lengthB}
                lengthC={lengthC}
                offsetAngleDegrees={offsetAngle}
                hasStartFlange={hasStartFlange}
                hasEndFlange={hasEndFlange}
                startFlangeType={offsetStartFlangeType}
                endFlangeType={offsetEndFlangeType}
                closureLengthMm={rawClosureLengthMm5 || 150}
              />
            );
          }

          if (!Tee3DPreview) {
            return null;
          }

          const rawPipeEndConfiguration13 = specs.pipeEndConfiguration;
          const rawPipeEndConfiguration14 = specs.pipeEndConfiguration;
          const rawPipeEndConfiguration15 = specs.pipeEndConfiguration;
          const rawPipeEndConfiguration16 = specs.pipeEndConfiguration;
          const rawPipeEndConfiguration17 = specs.pipeEndConfiguration;
          const rawPipeEndConfiguration18 = specs.pipeEndConfiguration;
          const rawClosureLengthMm6 = specs.closureLengthMm;

          return (
            <Tee3DPreview
              nominalBore={nominalBore}
              branchNominalBore={branchNominalBore}
              teeNominalBore={teeNominalBore}
              outerDiameter={outerDiameter}
              wallThickness={wallThickness}
              teeType={teeType}
              runLength={specs.pipeLengthAMm}
              branchPositionMm={specs.stubLocation}
              materialName={steelSpec?.steelSpecName}
              hasInletFlange={
                getFittingFlangeConfig(rawPipeEndConfiguration13 || "", specs.foePosition).hasInlet
              }
              hasOutletFlange={
                getFittingFlangeConfig(rawPipeEndConfiguration14 || "", specs.foePosition).hasOutlet
              }
              hasBranchFlange={
                getFittingFlangeConfig(rawPipeEndConfiguration15 || "", specs.foePosition).hasBranch
              }
              inletFlangeType={
                getFittingFlangeConfig(rawPipeEndConfiguration16 || "", specs.foePosition).inletType
              }
              outletFlangeType={
                getFittingFlangeConfig(rawPipeEndConfiguration17 || "", specs.foePosition)
                  .outletType
              }
              branchFlangeType={
                getFittingFlangeConfig(rawPipeEndConfiguration18 || "", specs.foePosition)
                  .branchType
              }
              closureLengthMm={rawClosureLengthMm6 || 150}
              addBlankFlange={specs.addBlankFlange}
              blankFlangeCount={specs.blankFlangeCount}
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
            />
          );
        })()}
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
    </>
  );
}

const FittingForm = memo(FittingFormComponent);
export default FittingForm;
