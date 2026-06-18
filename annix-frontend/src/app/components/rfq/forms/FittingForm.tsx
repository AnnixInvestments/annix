"use client";

import { memo } from "react";
import { WorkingConditionsSection } from "@/app/components/rfq/sections/WorkingConditionsSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/warnings/MaterialSuitabilityWarning";
import { Select } from "@/app/components/ui/Select";
import {
  fittingFlangeConfig as getFittingFlangeConfig,
  hasLooseFlange,
  SABS719_FITTING_SIZES,
  scheduleListForSpec,
} from "@/app/lib/config/rfq";
import { getMinWallThicknessForNB } from "@/app/lib/utils/pipeCalculations";
import { isApi5LSpec } from "@/app/lib/utils/steelSpecGroups";
import { FittingFormSpecsSection } from "./fitting/FittingFormSpecsSection";
import { type FittingFormProps, useFittingFormLogic } from "./fitting/useFittingFormLogic";
import { FittingCalcResults } from "./sections/FittingCalcResults";
import { PslCvnNaceSection } from "./sections/PslCvnNaceSection";
import { RfqItemActionsButtons } from "./sections/RfqItemActionsButtons";
import {
  type FlangeStandardItem,
  type PressureClassItem,
  type ScheduleItem,
  type SteelSpecItem,
} from "./shared";

export type { FittingFormProps } from "./fitting/useFittingFormLogic";

function FittingFormComponent(props: FittingFormProps) {
  const logic = useFittingFormLogic(props);
  const {
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
  } = logic;

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
              steelSpecName={selectedSteelSpecName}
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
            <PslCvnNaceSection
              steelSpecName={selectedSteelSpecName}
              entryId={entry.id}
              specs={specs}
              onUpdateSpecs={(updates) =>
                onUpdateEntry(entry.id, { specs: { ...entry.specs, ...updates } })
              }
            />

            <FittingFormSpecsSection logic={logic} />

            {/* ROW 4: Additional Specs section */}
            <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5 mb-3">
              Additional Specs
            </h4>
            <div className="space-y-3">
              {/* Branch Nominal Diameter - For Reducing Tees and Reducing Laterals */}
              {(specs.fittingType === "SHORT_REDUCING_TEE" ||
                specs.fittingType === "GUSSET_REDUCING_TEE" ||
                specs.fittingType === "REDUCING_LATERAL") && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Branch Nominal Diameter (mm) *
                    <span className="text-blue-600 text-xs ml-2">
                      {isLateral ? "(Lateral Branch Size)" : "(Tee Outlet Size)"}
                    </span>
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
                    wallThickness={rawWallThicknessMm17 || rawCalcWallThickness17 || 5}
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
              <FittingCalcResults
                specs={specs}
                entry={entry}
                globalSpecs={globalSpecs}
                masterData={masterData}
                nbToOdMap={nbToOdMap}
                allWeights={allWeights}
                allRetainingRings={allRetainingRings}
                flangeResolution={{
                  flangeStandardCode: resolvedFlangeStandardCode,
                  pressureClassDesignation: resolvedPressureClassDesignation,
                  flangeTypeCode: resolvedFlangeTypeCode,
                }}
                requiredProducts={requiredProducts}
              />
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
          const rawCalcWallThickness21 = entry.calculation?.wallThicknessMm;
          const wallThickness = rawWallThicknessMm21 || rawCalcWallThickness21 || 8;
          const outerDiameter = entry.calculation?.outsideDiameterMm;

          const rawSteelSpecsList = masterData.steelSpecs;
          const rawSpecsSteelSpecId2 = specs.steelSpecificationId;
          const rawGlobalSteelSpecId2 = globalSpecs?.steelSpecificationId;
          const steelSpec = rawSteelSpecsList?.find((s: SteelSpecItem) => {
            return s.id === (rawSpecsSteelSpecId2 || rawGlobalSteelSpecId2);
          });

          const rawFlangeStandardId10 = specs.flangeStandardId;
          const rawGlobalFlangeStandardId3 = globalSpecs?.flangeStandardId;
          const flangeStandardId = rawFlangeStandardId10 || rawGlobalFlangeStandardId3;
          const rawFlangePressureClassId9 = specs.flangePressureClassId;
          const rawGlobalFlangePressureClassId3 = globalSpecs?.flangePressureClassId;
          const flangePressureClassId =
            rawFlangePressureClassId9 || rawGlobalFlangePressureClassId3;
          const rawFlangeStandardsList = masterData.flangeStandards;
          const flangeStandard = rawFlangeStandardsList?.find(
            (s: FlangeStandardItem) => s.id === flangeStandardId,
          );
          const rawPressureClassesList = masterData.pressureClasses;
          const pressureClass = rawPressureClassesList?.find(
            (p: PressureClassItem) => p.id === flangePressureClassId,
          );
          const rawFlangeTypeCode8 = specs.flangeTypeCode;
          const rawGlobalFlangeTypeCode3 = globalSpecs?.flangeTypeCode;
          const flangeTypeCode = rawFlangeTypeCode8 || rawGlobalFlangeTypeCode3;
          const rawFlangeStandardCode = flangeStandard?.code;
          const rawFlangeStdCodeFormatted = rawFlangeStandardCode?.replace(/_/g, " ");
          const flangeStandardName =
            rawFlangeStandardCode === "SABS_1123"
              ? "SABS 1123"
              : rawFlangeStandardCode === "BS_4504"
                ? "BS 4504"
                : rawFlangeStdCodeFormatted || "";
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
      <RfqItemActionsButtons
        entry={entry}
        index={index}
        entriesCount={entriesCount}
        copiedItemId={copiedItemId}
        onDuplicateEntry={onDuplicateEntry}
        onCopyEntry={onCopyEntry}
        onRemoveEntry={onRemoveEntry}
        duplicateButtonColorClass="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-300"
      />
    </>
  );
}

const FittingForm = memo(FittingFormComponent);
export default FittingForm;
