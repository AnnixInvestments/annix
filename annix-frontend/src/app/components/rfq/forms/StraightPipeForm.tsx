"use client";

import Link from "next/link";
import React, { memo } from "react";
import {
  formatNotesForDisplay,
  SmartNotesDropdown,
} from "@/app/components/rfq/selectors/SmartNotesDropdown";
import SplitPaneLayout from "@/app/components/rfq/shared/SplitPaneLayout";
import { DEFAULT_PIPE_LENGTH_M } from "@/app/lib/config/rfq";
import type { GlobalSpecs, MasterData } from "@/app/lib/types/rfqTypes";
import { StraightPipeFormFields } from "./pipe/StraightPipeFormFields";
import { useStraightPipeFormLogic } from "./pipe/useStraightPipeFormLogic";
import { PipeWeightWeldSummary } from "./sections/PipeWeightWeldSummary";
import { type FlangeStandardItem, type PressureClassItem, type SteelSpecItem } from "./shared";

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

function StraightPipeFormComponent(props: StraightPipeFormProps) {
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
  const logic = useStraightPipeFormLogic(props);
  const {
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
  } = logic;

  return (
    <>
      <SplitPaneLayout
        entryId={entry.id}
        itemType="straight_pipe"
        showSplitToggle={specs.nominalBoreMm}
        formContent={<StraightPipeFormFields logic={logic} />}
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
                    closureLengthMm={rawClosureLengthMm}
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
