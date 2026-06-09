"use client";

import Link from "next/link";
import { memo } from "react";
import { WorkingConditionsSection } from "@/app/components/rfq/sections/WorkingConditionsSection";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/warnings/MaterialSuitabilityWarning";
import { Select } from "@/app/components/ui/Select";
import { log } from "@/app/lib/logger";
import { BendFormSpecsSection } from "./bend/BendFormSpecsSection";
import { type BendFormProps, useBendFormLogic } from "./bend/useBendFormLogic";
import { BendWeightWeldSummary } from "./sections/BendWeightWeldSummary";
import { PslCvnNaceSection } from "./sections/PslCvnNaceSection";
import { RfqItemActionsButtons } from "./sections/RfqItemActionsButtons";
import { type FlangeStandardItem, type PressureClassItem, type SteelSpecItem } from "./shared";

export type { BendFormProps } from "./bend/useBendFormLogic";

function BendFormComponent(props: BendFormProps) {
  const logic = useBendFormLogic(props);
  const {
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
  } = logic;

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="bend"
        showSplitToggle={specs.nominalBoreMm && specs.bendDegrees}
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
                    {entry.materialType === "hdpe" ? "HDPE Bend" : "PVC Bend"}
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
                htmlFor={`bend-description-${entry.id}`}
                className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
              >
                Item Description *
              </label>
              <textarea
                id={`bend-description-${entry.id}`}
                value={rawDescription || ""}
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
              workingPressureBar={specs.workingPressureBar}
              workingTemperatureC={specs.workingTemperatureC}
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
                      value={rawBendItemType2 || "BEND"}
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
                      const rawSteelSpecificationId3 = specs.steelSpecificationId;
                      const effectiveSpecId = rawSteelSpecificationId3 || globalSpecId;
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

                      const rawWorkingPressureBar = specs.workingPressureBar;

                      const effectivePressure =
                        rawWorkingPressureBar || globalSpecs?.workingPressureBar;
                      const rawWorkingTemperatureC = specs.workingTemperatureC;
                      const effectiveTemp =
                        rawWorkingTemperatureC || globalSpecs?.workingTemperatureC;
                      const selectedSpec = masterData.steelSpecs?.find(
                        (s: SteelSpecItem) => s.id === effectiveSpecId,
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
              steelSpecName={selectedSteelSpecName}
              effectivePressure={rawWorkingPressureBar2 || globalSpecs?.workingPressureBar}
              effectiveTemperature={rawWorkingTemperatureC2 || globalSpecs?.workingTemperatureC}
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

            <BendFormSpecsSection logic={logic} />

            {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

            <RfqItemActionsButtons
              entry={entry}
              index={index}
              entriesCount={entriesCount}
              copiedItemId={copiedItemId}
              onDuplicateEntry={onDuplicateEntry}
              onCopyEntry={onCopyEntry}
              onRemoveEntry={onRemoveEntry}
            />
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
                const canRenderPreview = specs.nominalBoreMm && specs.bendDegrees;
                log.info(
                  `🎨 BendForm preview check - entry.id: ${entry.id}, nominalBoreMm: ${specs.nominalBoreMm}, bendDegrees: ${specs.bendDegrees}, canRender: ${!!canRenderPreview}`,
                );
                if (!canRenderPreview) {
                  return (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center text-blue-700 text-sm font-medium">
                      Select nominal bore and bend angle to see 3D preview
                    </div>
                  );
                }
                const rawFlangeStandardId7 = specs.flangeStandardId;
                const flangeStandardId = rawFlangeStandardId7 || globalSpecs?.flangeStandardId;
                const rawFlangePressureClassId5 = specs.flangePressureClassId;
                const flangePressureClassId =
                  rawFlangePressureClassId5 || globalSpecs?.flangePressureClassId;
                const flangeStandard = masterData.flangeStandards?.find(
                  (s: FlangeStandardItem) => s.id === flangeStandardId,
                );
                const pressureClass = masterData.pressureClasses?.find(
                  (p: PressureClassItem) => p.id === flangePressureClassId,
                );
                const rawFlangeTypeCode7 = specs.flangeTypeCode;
                const flangeTypeCode = rawFlangeTypeCode7 || globalSpecs?.flangeTypeCode;
                const flangeStandardName =
                  flangeStandard?.code === "SABS_1123"
                    ? "SABS 1123"
                    : flangeStandard?.code === "BS_4504"
                      ? "BS 4504"
                      : flangeStandard?.code?.replace(/_/g, " ") || "";
                const rawDesignation = pressureClass?.designation;
                const pressureClassDesignation = rawDesignation || "";

                const rawSteelSpecName14 = masterData.steelSpecs?.find((s: SteelSpecItem) => {
                  const rawSteelSpecificationId17 = specs.steelSpecificationId;
                  return s.id === (rawSteelSpecificationId17 || globalSpecs?.steelSpecificationId);
                })?.steelSpecName;

                const steelSpecName = rawSteelSpecName14 || "";
                const previewIsSABS719 =
                  steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
                const rawOutsideDiameterMm = entry.calculation?.outsideDiameterMm;
                const rawWallThicknessMm7 = specs.wallThicknessMm;
                const rawBendType2 = entry.specs.bendType;
                const rawItem04 = specs.tangentLengths?.[0];
                const rawItem13 = specs.tangentLengths?.[1];
                const rawNumberOfStubs11 = specs.numberOfStubs;
                const rawBendEndConfiguration5 = specs.bendEndConfiguration;
                const rawClosureLengthMm2 = specs.closureLengthMm;
                const nbOdLookup = nbToOdMap[entry.specs.nominalBoreMm];
                const calcWallThickness2 = entry.calculation?.wallThicknessMm;
                return (
                  <div data-nix-target="bend-3d-preview" className="h-full">
                    <Bend3DPreview
                      nominalBore={entry.specs.nominalBoreMm}
                      outerDiameter={
                        rawOutsideDiameterMm || nbOdLookup || entry.specs.nominalBoreMm * 1.05
                      }
                      wallThickness={rawWallThicknessMm7 || calcWallThickness2 || 5}
                      bendAngle={entry.specs.bendDegrees}
                      bendType={rawBendType2 || "1.5D"}
                      tangent1={rawItem04 || 0}
                      tangent2={rawItem13 || 0}
                      schedule={entry.specs.scheduleNumber}
                      materialName={steelSpecName}
                      numberOfSegments={specs.numberOfSegments}
                      isSegmented={
                        specs.bendStyle === "segmented" || (!specs.bendStyle && previewIsSABS719)
                      }
                      stubs={specs.stubs}
                      numberOfStubs={rawNumberOfStubs11 || 0}
                      flangeConfig={rawBendEndConfiguration5 || "PE"}
                      closureLengthMm={rawClosureLengthMm2 || 0}
                      addBlankFlange={specs.addBlankFlange}
                      blankFlangePositions={specs.blankFlangePositions}
                      savedCameraPosition={specs.savedCameraPosition}
                      savedCameraTarget={specs.savedCameraTarget}
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
                      centerToFaceMm={specs.centerToFaceMm}
                      bendRadiusMm={specs.bendRadiusMm}
                      bendItemType={specs.bendItemType}
                      duckfootBasePlateXMm={specs.duckfootBasePlateXMm}
                      duckfootBasePlateYMm={specs.duckfootBasePlateYMm}
                      duckfootInletCentreHeightMm={specs.duckfootInletCentreHeightMm}
                      duckfootPlateThicknessT1Mm={specs.duckfootPlateThicknessT1Mm}
                      duckfootRibThicknessT2Mm={specs.duckfootRibThicknessT2Mm}
                      duckfootGussetPointDDegrees={specs.duckfootGussetPointDDegrees}
                      duckfootGussetPointCDegrees={specs.duckfootGussetPointCDegrees}
                      duckfootGussetCount={specs.duckfootGussetCount}
                      duckfootGussetPlacement={specs.duckfootGussetPlacement}
                      duckfootGussetThicknessMm={specs.duckfootGussetThicknessMm}
                      sweepTeePipeALengthMm={specs.sweepTeePipeALengthMm}
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
                <BendWeightWeldSummary
                  bendCalcs={bendCalcs}
                  specs={specs}
                  entry={entry}
                  flangeResolution={flangeResolution}
                  allWeights={allWeights}
                  nbToOdMap={nbToOdMap}
                  requiredProducts={requiredProducts}
                  flangeSpecs={flangeSpecs}
                />
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
