"use client";

import { memo } from "react";
import { SpigotConfigurationSection } from "@/app/components/rfq/sections/SpigotConfigurationSection";
import { ClosureLengthSelector } from "@/app/components/rfq/selectors/ClosureLengthSelector";
import { MaterialSuitabilityWarning } from "@/app/components/rfq/warnings/MaterialSuitabilityWarning";
import { Select } from "@/app/components/ui/Select";
import {
  DEFAULT_PIPE_LENGTH_M,
  FITTING_CLASS_WALL_THICKNESS,
  weldCountPerPipe as getWeldCountPerPipe,
  hasLooseFlange,
  isSabs62Spec,
  isSabs719Spec,
  PUDDLE_PIPE_LENGTHS_M,
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  STANDARD_PIPE_LENGTHS_M,
  scheduleListForSpec,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
} from "@/app/lib/config/rfq";
import { fetchFlangeSpecsStatic } from "@/app/lib/hooks/useFlangeSpecs";
import { calculateMinWallThickness } from "@/app/lib/utils/pipeCalculations";
import {
  combineClassWithFlangeType,
  scheduleToFittingClass,
} from "@/app/lib/utils/rfqFlangeCalculations";
import { roundToWeldIncrement } from "@/app/lib/utils/weldThicknessLookup";
import { PipeEndConfigSection } from "../sections/PipeEndConfigSection";
import { PipeSteelSpecSelect } from "../sections/PipeSteelSpecSelect";
import { PslCvnNaceSection } from "../sections/PslCvnNaceSection";
import { SpigotFlangeSection } from "../sections/SpigotFlangeSection";
import { type PressureClassItem, type SteelSpecItem } from "../shared";
import type { StraightPipeFormLogic } from "./useStraightPipeFormLogic";

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

const StraightPipeFormFieldsInner = ({ logic }: { logic: StraightPipeFormLogic }) => {
  const {
    MAX_QUANTITY_UNREGISTERED,
    allFlangeTypes,
    availableSchedulesMap,
    entry,
    errors,
    flangePressureClassId,
    generateItemDescription,
    getFilteredPressureClasses,
    globalSpecs,
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
    index,
    isLoadingNominalBores,
    isUnregisteredCustomer,
    masterData,
    nbToOdMap,
    nominalBoreMm,
    nominalBores,
    onUpdateEntry,
    pipeEndConfiguration,
    pressureClassesByStandard,
    qtyEachDisplayValue,
    rawClosureLengthMm,
    rawDescription,
    rawNominalBoreMm,
    rawNumberOfSpigots,
    rawPipeEndConfiguration8,
    rawPipeType,
    rawPuddleFlangeHoleCount,
    rawPuddleFlangeHoleIdMm,
    rawPuddleFlangeLocationMm,
    rawPuddleFlangeOdMm,
    rawPuddleFlangePcdMm,
    rawPuddleFlangeThicknessMm,
    rawScheduleNumber,
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
    setQuantityLimitPopup,
    specs,
    totalLineDisplayValue,
  } = logic;
  const currentPipeType = specs.pipeType;
  return (
    <>
      {/* Material Type Badge for non-steel materials */}
      {entry.materialType && entry.materialType !== "steel" && (
        <div className="mb-3 p-3 bg-gray-100 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-bold ${
                entry.materialType === "hdpe" ? "bg-gray-900 text-white" : "bg-blue-400 text-white"
              }`}
            >
              {entry.materialType === "hdpe" ? "HDPE" : "PVC"}
            </span>
            <span className="text-sm text-gray-600">
              {entry.materialType === "hdpe" ? "HDPE Straight Pipe" : "PVC Straight Pipe"}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Detailed {entry.materialType.toUpperCase()} specifications will use the global settings
            configured in Step 2. Item-specific overrides coming soon.
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
              <span className="ml-2 text-xs font-normal text-blue-600">(From Specs Page)</span>
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
                handleWorkingPressureChange(e.target.value ? Number(e.target.value) : undefined)
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
            const effectiveSpecId = rawSteelSpecificationId7 || globalSpecs?.steelSpecificationId;

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
                      fallbackEffectiveSpecId === 1 ? "ASTM_A53_Grade_B" : "ASTM_A106_Grade_B";
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
                        const rawWallThicknessMm7Alt = dim.wall_thickness_mm;
                        const wt = rawWallThicknessMm7 || rawWallThicknessMm7Alt || 0;
                        return wt >= minimumWT;
                      })
                      .sort((a: any, b: any) => {
                        const rawWallThicknessMm8 = a.wallThicknessMm;
                        const rawWallThicknessMm8Alt = a.wall_thickness_mm;
                        const wtA = rawWallThicknessMm8 || rawWallThicknessMm8Alt || 0;
                        const rawWallThicknessMm9 = b.wallThicknessMm;
                        const rawWallThicknessMm9Alt = b.wall_thickness_mm;
                        const wtB = rawWallThicknessMm9 || rawWallThicknessMm9Alt || 0;
                        return wtA - wtB;
                      });
                    const recommendedSchedule =
                      eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;
                    if (eligibleSchedules.length === 0 && effectivePressure > 0) {
                      return (
                        <option disabled>No schedules meet {minimumWT.toFixed(2)}mm min WT</option>
                      );
                    }
                    if (allSchedules.length === 0) {
                      return <option disabled>No schedules available</option>;
                    }
                    return eligibleSchedules.map((dim: any) => {
                      const rawScheduleDesignation2 = dim.scheduleDesignation;
                      const rawScheduleDesignation3 = dim.schedule_designation;
                      const rawScheduleNumberStr = dim.scheduleNumber?.toString();
                      const rawScheduleNumberStr2 = dim.schedule_number?.toString();
                      const scheduleValue =
                        rawScheduleDesignation2 ||
                        rawScheduleDesignation3 ||
                        rawScheduleNumberStr ||
                        rawScheduleNumberStr2 ||
                        "Unknown";
                      const rawWallThicknessMm10 = dim.wallThicknessMm;
                      const rawWallThicknessMm10Alt = dim.wall_thickness_mm;
                      const wt = rawWallThicknessMm10 || rawWallThicknessMm10Alt || 0;
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
                const updatedSpecs: any = {
                  ...entry.specs,
                  pipeType: newPipeType,
                };
                // A puddle pipe is always FOE: one end flange (pipe-sized)
                // plus a puddle flange along the barrel — never FBE.
                if (newPipeType === "puddle") {
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
              const steelSpecId = rawSteelSpecificationId10 || globalSpecs?.steelSpecificationId;
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
      {(!currentPipeType ||
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
              if (currentClassId && recommendedClassId && currentClassId !== recommendedClassId) {
                const currentClass = masterData.pressureClasses?.find(
                  (p: PressureClassItem) => p.id === currentClassId,
                );
                const recommendedClass = masterData.pressureClasses?.find(
                  (p: PressureClassItem) => p.id === recommendedClassId,
                );
                const currentBasePressure = currentClass?.designation?.replace(/\/\d+$/, "") || "";
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
            {specs.pipeType === "spigot" && specs.numberOfSpigots && specs.numberOfSpigots >= 2 && (
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
                <h5 className="text-xs font-semibold text-amber-700 mb-1">Puddle Flange Dims</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                  {/* Size (NB) quick-fill — looks up the flange table for the
                      item's standard/class and fills the dim fields; fields
                      stay editable for custom plates. */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Size (NB)
                    </label>
                    <Select
                      id={`puddle-nb-${entry.id}`}
                      value={specs.puddleFlangeNbMm ? String(specs.puddleFlangeNbMm) : ""}
                      onChange={async (value) => {
                        const nb = parseInt(value, 10);
                        if (!nb) {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, puddleFlangeNbMm: null },
                          });
                          return;
                        }
                        const rawSpecsStdId = specs.flangeStandardId;
                        const gsStdId = globalSpecs?.flangeStandardId;
                        const stdId = rawSpecsStdId || gsStdId;
                        const rawSpecsPcId = specs.flangePressureClassId;
                        const gsPcId = globalSpecs?.flangePressureClassId;
                        const pcId = rawSpecsPcId || gsPcId;
                        const rawSpecsTypeCode = specs.flangeTypeCode;
                        const gsTypeCode = globalSpecs?.flangeTypeCode;
                        const typeCode = rawSpecsTypeCode || gsTypeCode;
                        const stored = masterData.pressureClasses?.find(
                          (p: PressureClassItem) => p.id === pcId,
                        );
                        const std = masterData.flangeStandards?.find((s: any) => s.id === stdId);
                        const storedDesignation = stored?.designation;
                        const stdCode = std?.code;
                        const combined = combineClassWithFlangeType(
                          storedDesignation ? storedDesignation : "",
                          typeCode,
                          stdCode,
                        );
                        const normalizedPc =
                          combined && combined !== storedDesignation
                            ? masterData.pressureClasses?.find(
                                (p: PressureClassItem) => p.designation === combined,
                              )
                            : null;
                        const normalizedPcId = normalizedPc?.id;
                        const lookupPcId = normalizedPcId ? normalizedPcId : pcId;
                        const flangeType = masterData.flangeTypes?.find(
                          (ft: any) => ft.code === typeCode,
                        );
                        const dims =
                          stdId && lookupPcId
                            ? await fetchFlangeSpecsStatic(nb, stdId, lookupPcId, flangeType?.id)
                            : null;
                        const updatedSpecs: any = {
                          ...entry.specs,
                          puddleFlangeNbMm: nb,
                        };
                        // Only auto-fill from a sane row — some master-data
                        // rows are corrupt (PCD >= OD), and quoting those
                        // would be worse than leaving the fields manual.
                        const dimsOdMm = dims?.flangeOdMm;
                        const dimsPcdMm = dims?.flangePcdMm;
                        const dimsAreSane =
                          !!dims && !!dimsOdMm && !!dimsPcdMm && dimsPcdMm < dimsOdMm;
                        if (dims && dimsAreSane) {
                          updatedSpecs.puddleFlangeOdMm = Math.round(dims.flangeOdMm);
                          updatedSpecs.puddleFlangePcdMm = Math.round(dims.flangePcdMm);
                          updatedSpecs.puddleFlangeHoleCount = dims.flangeNumHoles;
                          updatedSpecs.puddleFlangeHoleIdMm = Math.round(
                            dims.flangeBoltHoleDiameterMm,
                          );
                          updatedSpecs.puddleFlangeThicknessMm = Math.round(dims.flangeThicknessMm);
                        }
                        onUpdateEntry(entry.id, { specs: updatedSpecs });
                      }}
                      options={[
                        { value: "", label: "Custom..." },
                        // A puddle flange is never smaller than the pipe's
                        // own flange — offer the pipe NB and up only.
                        ...nominalBores
                          .filter((nb: number) => !nominalBoreMm || nb >= nominalBoreMm)
                          .map((nb: number) => ({
                            value: String(nb),
                            label: `${nb} NB`,
                          })),
                      ]}
                      className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs"
                    />
                    {!!specs.puddleFlangeNbMm && !rawPuddleFlangeOdMm && (
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        No table data for this size — enter dims manually
                      </p>
                    )}
                  </div>

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
                const isMissingForPreview = specs.nominalBoreMm && !specs.individualPipeLength;
                const rawIndividualPipeLength3 = entry.specs.individualPipeLength;
                return (
                  <div
                    data-nix-target="pipe-length-input"
                    className={
                      isMissingForPreview ? "ring-2 ring-red-500 rounded-md p-1 bg-red-50" : ""
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <label
                        className={`text-xs font-semibold ${isMissingForPreview ? "text-red-700" : "text-gray-900 dark:text-gray-100"}`}
                      >
                        Pipe Length (m){" "}
                        {isMissingForPreview && (
                          <span className="text-red-600 font-bold">⚠ Required for preview</span>
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
                        const pipeLength = e.target.value ? Number(e.target.value) : undefined;
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
                      const updatedEntry = calculateQuantities(entry, "totalLength", totalLength);
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
                    const updatedEntry = calculateQuantities(entry, "numberOfPipes", numberOfPipes);
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
  );
};

export const StraightPipeFormFields = memo(StraightPipeFormFieldsInner);
