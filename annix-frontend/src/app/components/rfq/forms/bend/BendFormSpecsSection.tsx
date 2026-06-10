"use client";

import { memo } from "react";
import { TangentExtensionsSection } from "@/app/components/rfq/sections/TangentExtensionsSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import { BEND_END_OPTIONS, FITTING_END_OPTIONS, hasLooseFlange } from "@/app/lib/config/rfq";
import { FlangeDropdownTriplet } from "../sections/FlangeDropdownTriplet";
import { BendDuckfootSteelworkSection } from "./BendDuckfootSteelworkSection";
import { BendLayoutSection } from "./BendLayoutSection";
import { BendStubConnectionsSection } from "./BendStubConnectionsSection";
import type { BendFormLogic } from "./useBendFormLogic";

interface BendFormSpecsSectionProps {
  logic: BendFormLogic;
}

const BendFormSpecsSectionInner = (props: BendFormSpecsSectionProps) => {
  const {
    MAX_QUANTITY_UNREGISTERED,
    allFlangeTypes,
    calcWallThicknessMm,
    debouncedCalculate,
    entry,
    errors,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
    groupedSteelOptions,
    handleTangentCountChange,
    handleTangentLengthChange,
    index,
    isUnregisteredCustomer,
    masterData,
    nbToOdMap,
    onUpdateEntry,
    pipeALengthSource,
    pressureClassesByStandard,
    rawBendEndConfiguration4,
    rawClosureLengthMm,
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
    rawTangentLengths2,
    rawWallThicknessMm6,
    setLastFetchedParams,
    setPipeALengthSource,
    setQuantityLimitPopup,
    specs,
    stub0,
    stub1,
  } = props.logic;
  const specsSteelSpecificationId = specs.steelSpecificationId;
  const specsWallThicknessMm = specs.wallThicknessMm;

  return (
    <>
      {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
      <BendLayoutSection logic={props.logic} />

      {/* Flange Configuration Row - 4 columns (matching Pipes form) */}
      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mt-3">
        {(() => {
          const rawBendEndConfiguration2 = specs.bendEndConfiguration;
          const bendEndConfig = rawBendEndConfiguration2 || "PE";
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
          const rawBlankFlangePositions = specs.blankFlangePositions;
          const currentBlankPositions = rawBlankFlangePositions || [];

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
                const rawWorkingPressureBar6 = specs.workingPressureBar;
                const globalWorkingPressureBar = globalSpecs?.workingPressureBar;
                const workingPressureBar = rawWorkingPressureBar6 || globalWorkingPressureBar || 0;
                const rawBendEndConfiguration3 = specs.bendEndConfiguration;
                const rawFlangeStandards = masterData.flangeStandards;
                const rawPressureClasses = masterData.pressureClasses;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                    <FlangeDropdownTriplet
                      flangeStandardId={specs.flangeStandardId}
                      flangePressureClassId={specs.flangePressureClassId}
                      flangeTypeCode={specs.flangeTypeCode}
                      globalFlangeStandardId={globalSpecs?.flangeStandardId}
                      globalFlangePressureClassId={globalSpecs?.flangePressureClassId}
                      globalFlangeTypeCode={globalSpecs?.flangeTypeCode}
                      flangeStandards={rawFlangeStandards || []}
                      pressureClasses={rawPressureClasses || []}
                      pressureClassesByStandard={pressureClassesByStandard}
                      allFlangeTypes={allFlangeTypes}
                      workingPressureBar={workingPressureBar}
                      onStandardChange={(standardId) => {
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            flangeStandardId: standardId,
                            flangePressureClassId: undefined,
                            flangeTypeCode: undefined,
                          },
                        });
                      }}
                      onPressureClassChange={(classId) => {
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            flangePressureClassId: classId,
                          },
                        });
                      }}
                      onFlangeTypeChange={(typeCode) => {
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            flangeTypeCode: typeCode,
                          },
                        });
                      }}
                      onLoadPressureClasses={getFilteredPressureClasses}
                    />
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
                        value={rawBendEndConfiguration3 || "PE"}
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
                        {(specs.bendItemType === "SWEEP_TEE"
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
      {hasLooseFlange(rawBendEndConfiguration4 || "") && (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
          <ClosureLengthSelector
            nominalBore={rawNominalBoreMm3 || 100}
            currentValue={rawClosureLengthMm || null}
            wallThickness={rawWallThicknessMm6 || calcWallThicknessMm || 5}
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
      <BendDuckfootSteelworkSection logic={props.logic} />

      {/* Tangent Extensions Row - hide for Sweep Tees and Duckfoot Bends */}
      {specs.bendItemType !== "SWEEP_TEE" && specs.bendItemType !== "DUCKFOOT_BEND" && (
        <TangentExtensionsSection
          entryId={entry.id}
          numberOfTangents={rawNumberOfTangents || 0}
          tangentLengths={rawTangentLengths2 || []}
          onTangentCountChange={handleTangentCountChange}
          onTangentLengthChange={handleTangentLengthChange}
        />
      )}

      {/* Stub Connections Section - hide for Sweep Tees and Duckfoot Bends */}
      <BendStubConnectionsSection logic={props.logic} />
    </>
  );
};

export const BendFormSpecsSection = memo(BendFormSpecsSectionInner);
