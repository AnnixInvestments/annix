'use client';

import React, { useState, useEffect } from 'react';
import { Select } from '@/app/components/ui/Select';
import { fetchFlangeSpecsStatic, FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { getPipeEndConfigurationDetails } from '@/app/lib/utils/systemUtils';
import { log } from '@/app/lib/logger';
import {
  PIPE_END_OPTIONS,
  BEND_END_OPTIONS,
  getScheduleListForSpec,
  NB_TO_OD_LOOKUP,
  weldCountPerPipe as getWeldCountPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  hasLooseFlange,
  retainingRingWeight,
  SABS_1123_FLANGE_TYPES,
  SABS_1123_PRESSURE_CLASSES,
  BS_4504_FLANGE_TYPES,
  BS_4504_PRESSURE_CLASSES,
  flangeWeight as getFlangeWeight,
  blankFlangeWeight as getBlankFlangeWeight,
  sansBlankFlangeWeight,
  tackWeldWeight as getTackWeldWeight,
  closureWeight as getClosureWeight,
  FITTING_CLASS_WALL_THICKNESS,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
  STANDARD_PIPE_LENGTHS_M,
  DEFAULT_PIPE_LENGTH_M,
  PRESSURE_CALC_JOINT_EFFICIENCY,
  PRESSURE_CALC_CORROSION_ALLOWANCE,
  PRESSURE_CALC_SAFETY_FACTOR,
} from '@/app/lib/config/rfq';
import {
  calculateMinWallThickness,
  findRecommendedSchedule,
  validateScheduleForPressure,
  calculateTotalSurfaceArea,
  calculateInsideDiameter,
  calculateFlangeWeldVolume,
} from '@/app/lib/utils/pipeCalculations';
import { recommendWallThicknessCarbonPipe, roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { groupSteelSpecifications } from '@/app/lib/utils/steelSpecGroups';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';
import { MaterialSuitabilityWarning } from '@/app/components/rfq/MaterialSuitabilityWarning';
import { ClosureLengthSelector } from '@/app/components/rfq/ClosureLengthSelector';

const formatWeight = (weight: number | undefined) => {
  if (weight === undefined || weight === null || isNaN(weight)) return 'Not calculated';
  return `${weight.toFixed(2)} kg`;
};

const calculateQuantities = (entry: any, field: string, value: number) => {
  const pipeLength = entry.specs?.individualPipeLength || DEFAULT_PIPE_LENGTH_M;

  if (field === 'totalLength') {
    const quantity = Math.ceil(value / pipeLength);
    return {
      ...entry,
      specs: {
        ...entry.specs,
        quantityValue: value,
        quantityType: 'total_length'
      },
      calculatedPipes: quantity
    };
  } else if (field === 'numberOfPipes') {
    return {
      ...entry,
      specs: {
        ...entry.specs,
        quantityValue: value,
        quantityType: 'number_of_pipes'
      },
      calculatedPipes: value
    };
  }
  return entry;
};

export interface StraightPipeFormProps {
  entry: any;
  index: number;
  entries: any[];
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onDuplicateEntry?: (entry: any, index: number) => void;
  onCopyEntry?: (entry: any) => void;
  copiedItemId?: string | null;
  onCalculate?: (id: string) => void;
  openSelects: Record<string, boolean>;
  openSelect: (id: string) => void;
  closeSelect: (id: string) => void;
  focusAndOpenSelect: (id: string, retryCount?: number) => void;
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
}

export default function StraightPipeForm({
  entry,
  index,
  entries,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
  onCopyEntry,
  copiedItemId,
  onCalculate,
  openSelects,
  openSelect,
  closeSelect,
  focusAndOpenSelect,
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
}: StraightPipeFormProps) {
  const showSurfaceProtection = requiredProducts.includes('surface_protection');

  const [flangeSpecs, setFlangeSpecs] = useState<FlangeSpecData | null>(null);

  const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
  const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
  const nominalBoreMm = entry.specs?.nominalBoreMm;
  const pipeEndConfiguration = entry.specs?.pipeEndConfiguration || 'PE';
  const hasFlanges = pipeEndConfiguration !== 'PE';

  useEffect(() => {
    const fetchSpecs = async () => {
      if (!hasFlanges || !nominalBoreMm || !flangeStandardId || !flangePressureClassId) {
        setFlangeSpecs(null);
        return;
      }

      const flangeType = masterData?.flangeTypes?.find((ft: any) => ft.code === flangeTypeCode);
      const flangeTypeId = flangeType?.id;

      const specs = await fetchFlangeSpecsStatic(
        nominalBoreMm,
        flangeStandardId,
        flangePressureClassId,
        flangeTypeId
      );
      setFlangeSpecs(specs);
    };

    fetchSpecs();
  }, [hasFlanges, nominalBoreMm, flangeStandardId, flangePressureClassId, flangeTypeCode, masterData?.flangeTypes]);

  return (
    <>
              <SplitPaneLayout
                entryId={entry.id}
                itemType="straight_pipe"
                showSplitToggle={entry.specs?.nominalBoreMm}
                formContent={
                  <>
                {/* Item Description - Single Field */}
                <div>
                  <label htmlFor={`pipe-description-${entry.id}`} className="block text-xs font-semibold text-gray-900 mb-1">
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
                        onClick={() => onUpdateEntry(entry.id, { description: generateItemDescription(entry) })}
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
                      {(!entry.specs?.workingPressureBar && !entry.specs?.workingTemperatureC) && (
                        <span className="ml-2 text-xs font-normal text-blue-600">(From Global Spec)</span>
                      )}
                      {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
                        <span className="ml-2 text-xs font-normal text-blue-600">(Override)</span>
                      )}
                    </h4>
                    {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
                      <button
                        type="button"
                        onClick={() => onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, workingPressureBar: undefined, workingTemperatureC: undefined }
                        })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Reset to Global
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`pipe-pressure-${entry.id}`} className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Pressure (bar)
                        <span id={`pipe-pressure-help-${entry.id}`} className="ml-1 text-gray-400 font-normal cursor-help" title="Design pressure for the piping system. Affects minimum wall thickness and recommended flange pressure class.">?</span>
                      </label>
                      <select
                        id={`pipe-pressure-${entry.id}`}
                        aria-describedby={`pipe-pressure-help-${entry.id}`}
                        value={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined;
                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                          const flangeCode = flangeStandard?.code || '';
                          const isSabs1123 = flangeCode.includes('SABS 1123') || flangeCode.includes('SANS 1123');
                          const isBs4504 = flangeCode.includes('BS 4504');

                          if (flangeStandardId && !pressureClassesByStandard[flangeStandardId]) {
                            getFilteredPressureClasses(flangeStandardId);
                          }

                          let availableClasses = flangeStandardId ? (pressureClassesByStandard[flangeStandardId] || []) : [];
                          if (availableClasses.length === 0) {
                            availableClasses = masterData.pressureClasses?.filter((pc: any) =>
                              pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId
                            ) || [];
                          }

                          let recommendedPressureClassId = entry.specs?.flangePressureClassId;
                          const requiredKpa = value ? value * 100 : 0;

                          if (value && availableClasses.length > 0) {
                            const classesWithRating = availableClasses.map((pc: any) => {
                              const designation = pc.designation || '';
                              let barRating = 0;
                              const pnMatch = designation.match(/PN\s*(\d+)/i);
                              if (pnMatch) {
                                barRating = parseInt(pnMatch[1]);
                              } else if (isSabs1123) {
                                const kpaMatch = designation.match(/^(\d+)/);
                                if (kpaMatch) {
                                  barRating = parseInt(kpaMatch[1]) / 100;
                                }
                              } else if (isBs4504) {
                                const numMatch = designation.match(/^(\d+)/);
                                if (numMatch) {
                                  barRating = parseInt(numMatch[1]);
                                }
                              } else {
                                const numMatch = designation.match(/^(\d+)/);
                                if (numMatch) {
                                  const num = parseInt(numMatch[1]);
                                  barRating = num >= 500 ? num / 100 : num;
                                }
                              }
                              return { ...pc, barRating };
                            }).filter((pc: any) => pc.barRating > 0);

                            classesWithRating.sort((a: any, b: any) => a.barRating - b.barRating);

                            const suitableClass = classesWithRating.find((pc: any) => pc.barRating >= value);
                            if (suitableClass) {
                              recommendedPressureClassId = suitableClass.id;
                              log.debug(`Auto-selecting pressure class: ${suitableClass.designation} (${suitableClass.barRating} bar) for ${value} bar`);
                            }
                          }

                          const endConfig = entry.specs?.pipeEndConfiguration || 'PE';
                          const effectiveFlangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode || recommendedFlangeTypeCode(endConfig);

                          onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              workingPressureBar: value,
                              flangePressureClassId: recommendedPressureClassId,
                              flangeTypeCode: effectiveFlangeTypeCode
                            }
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      >
                        <option value="">Select pressure...</option>
                        {WORKING_PRESSURE_BAR.map((pressure) => (
                          <option key={pressure} value={pressure}>{pressure} bar</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`pipe-temp-${entry.id}`} className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Temperature (°C)
                        <span id={`pipe-temp-help-${entry.id}`} className="ml-1 text-gray-400 font-normal cursor-help" title="Operating temperature of the system. Affects material suitability and de-rating factors.">?</span>
                      </label>
                      <select
                        id={`pipe-temp-${entry.id}`}
                        aria-describedby={`pipe-temp-help-${entry.id}`}
                        value={entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC || ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingTemperatureC: value }
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                      >
                        <option value="">Select temperature...</option>
                        {WORKING_TEMPERATURE_CELSIUS.map((temp) => (
                          <option key={temp} value={temp}>{temp}°C</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`pipe-nb-pressure-${entry.id}`} className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Bore (mm) *
                      </label>
                      {(() => {
                        const selectId = `pipe-nb-pressure-${entry.id}`;
                        const options = nominalBores.map((nb: number) => ({
                          value: String(nb),
                          label: `${nb}NB`
                        }));

                        const handleNominalBoreChange = (value: string) => {
                          const nominalBore = Number(value);
                          if (!nominalBore) return;

                          log.debug(`[NB onChange] Selected NB: ${nominalBore}mm`);

                          const steelSpecId = entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
                          const pressure = globalSpecs?.workingPressureBar || 0;
                          const temperature = globalSpecs?.workingTemperatureC || 20;

                          const nbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId);
                          log.debug(`[NB onChange] Using ${schedules.length} fallback schedules for ${nominalBore}mm`);

                          if (schedules.length > 0) {
                            setAvailableSchedulesMap((prev: Record<string, any[]>) => ({
                              ...prev,
                              [entry.id]: schedules
                            }));
                            log.debug(`[NB onChange] Set availableSchedulesMap for entry ${entry.id} with ${schedules.length} schedules`);
                          }

                          let matchedSchedule: string | null = null;
                          let matchedWT = 0;
                          let minWT = 0;

                          if (schedules.length > 0) {
                            if (pressure > 0) {
                              const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                              const materialCode = steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B';
                              minWT = calculateMinWallThickness(od, pressure, materialCode, temperature, PRESSURE_CALC_JOINT_EFFICIENCY, PRESSURE_CALC_CORROSION_ALLOWANCE, PRESSURE_CALC_SAFETY_FACTOR);
                              log.debug(`[NB onChange] ASME B31.3 calc minWT: ${minWT.toFixed(2)}mm for ${pressure} bar @ ${temperature}°C, OD=${od}mm`);

                              const recommendation = findRecommendedSchedule(schedules, od, pressure, materialCode, temperature, PRESSURE_CALC_SAFETY_FACTOR);

                              if (recommendation.schedule) {
                                matchedSchedule = recommendation.schedule.scheduleDesignation;
                                matchedWT = recommendation.schedule.wallThicknessMm;
                                const maxPressure = recommendation.validation?.maxAllowablePressure || 0;
                                const margin = recommendation.validation?.safetyMargin || 0;
                                log.debug(`[NB onChange] ASME B31.3 recommended: ${matchedSchedule} (${matchedWT}mm), max ${maxPressure.toFixed(1)} bar, ${margin.toFixed(1)}x margin`);
                              } else {
                                const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                                matchedSchedule = sorted[0].scheduleDesignation;
                                matchedWT = sorted[0].wallThicknessMm;
                                const validation = validateScheduleForPressure(od, matchedWT, pressure, materialCode, temperature);
                                log.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm). ${validation.message}`);
                              }
                            } else {
                              const sorted = [...schedules].sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);
                              matchedSchedule = sorted[0].scheduleDesignation;
                              matchedWT = sorted[0].wallThicknessMm;
                              log.debug(`[NB onChange] No pressure set, using lightest schedule: ${matchedSchedule}`);
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
                            }
                          };

                          updatedEntry.description = generateItemDescription(updatedEntry);
                          log.debug(`[NB onChange] Updating entry ${entry.id} with schedule: ${matchedSchedule}, WT: ${matchedWT}mm`);
                          onUpdateEntry(entry.id, updatedEntry);
                          fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
                        };

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs.nominalBoreMm ? String(entry.specs.nominalBoreMm) : ''}
                            onChange={handleNominalBoreChange}
                            options={options}
                            placeholder={isLoadingNominalBores ? 'Loading...' : 'Select NB'}
                            disabled={isLoadingNominalBores}
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                            aria-required={true}
                            aria-invalid={!!errors[`pipe_${index}_nb`]}
                          />
                        );
                      })()}
                      {errors[`pipe_${index}_nb`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_nb`]}</p>
                      )}
                    </div>
                  </div>
                  <MaterialSuitabilityWarning
                    color="blue"
                    steelSpecName={(() => {
                      const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      return masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName || '';
                    })()}
                    effectivePressure={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar}
                    effectiveTemperature={entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC}
                    allSteelSpecs={masterData.steelSpecs || []}
                    onSelectSpec={(spec) => onUpdateEntry(entry.id, { specs: { ...entry.specs, steelSpecificationId: spec.id } })}
                  />
                </div>

                {/* Material & Dimensions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2">Material & Dimensions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Steel Specification */}
                    <div>
                      {(() => {
                        const globalSpecId = globalSpecs?.steelSpecificationId;
                        const effectiveSpecId = entry.specs?.steelSpecificationId || globalSpecId;
                        const isSteelFromGlobal = globalSpecId && effectiveSpecId === globalSpecId;
                        const isSteelOverride = globalSpecId && effectiveSpecId !== globalSpecId;
                        const selectId = `pipe-steel-spec-${entry.id}`;
                        const groupedOptions = masterData.steelSpecs
                          ? groupSteelSpecifications(masterData.steelSpecs)
                          : [];
                        const globalSelectClass = 'w-full border-2 border-green-500 dark:border-lime-400 rounded';
                        const overrideSelectClass = 'w-full border-2 border-red-500 dark:border-red-400 rounded';
                        const defaultSelectClass = 'w-full';

                        return (
                          <>
                            <label htmlFor={selectId} className="block text-xs font-semibold text-gray-900 mb-1">
                              Steel Specification *
                              {isSteelFromGlobal && <span className="text-green-600 text-xs ml-1 font-normal">(Global)</span>}
                              {isSteelOverride && <span className="text-red-600 text-xs ml-1 font-normal">(Override)</span>}
                            </label>
                            <Select
                              id={selectId}
                              value={String(effectiveSpecId || '')}
                              className={isSteelFromGlobal ? globalSelectClass : isSteelOverride ? overrideSelectClass : defaultSelectClass}
                              onChange={(value) => {
                              const specId = value ? Number(value) : undefined;
                              const nominalBore = entry.specs?.nominalBoreMm;

                              if (!specId || !nominalBore) {
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    steelSpecificationId: specId
                                  }
                                });
                                if (specId && !nominalBore) {
                                  setTimeout(() => focusAndOpenSelect(`pipe-nb-${entry.id}`), 100);
                                }
                                return;
                              }

                              const schedules = getScheduleListForSpec(nominalBore, specId);
                              const pressure = globalSpecs?.workingPressureBar || 0;
                              const temperature = globalSpecs?.workingTemperatureC || 20;

                              let matchedSchedule: string | undefined;
                              let matchedWT: number | undefined;

                              if (pressure > 0 && schedules.length > 0) {
                                const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                                const minWT = calculateMinWallThickness(od, pressure, temperature);

                                const eligibleSchedules = schedules
                                  .filter((s: any) => (s.wallThicknessMm || 0) >= minWT)
                                  .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));

                                if (eligibleSchedules.length > 0) {
                                  matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                  matchedWT = eligibleSchedules[0].wallThicknessMm;
                                } else if (schedules.length > 0) {
                                  const sorted = [...schedules].sort((a: any, b: any) => (b.wallThicknessMm || 0) - (a.wallThicknessMm || 0));
                                  matchedSchedule = sorted[0].scheduleDesignation;
                                  matchedWT = sorted[0].wallThicknessMm;
                                }
                              } else if (schedules.length > 0) {
                                const sch40 = schedules.find((s: any) => s.scheduleDesignation === '40' || s.scheduleDesignation === 'Sch 40');
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
                                  wallThicknessMm: matchedWT
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                            }}
                              options={[]}
                              groupedOptions={groupedOptions}
                              placeholder="Select steel spec..."
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                              aria-required={true}
                              aria-invalid={!!errors[`pipe_${index}_steel_spec`]}
                            />
                            {errors[`pipe_${index}_steel_spec`] && (
                              <p role="alert" className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_steel_spec`]}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Schedule */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Schedule
                        <span className="ml-1 text-gray-400 font-normal cursor-help" title="★ = Minimum schedule meeting ASME B31.3 pressure requirements with 1.2x safety margin. Higher schedules provide thicker walls and greater pressure capacity.">?</span>
                        {entry.specs?.scheduleNumber && (
                          <span className="ml-1 text-green-600 text-xs">({entry.specs.wallThicknessMm?.toFixed(2)}mm)</span>
                        )}
                      </label>
                      <select
                        value={entry.specs?.scheduleNumber || ''}
                        onChange={(e) => {
                          const newSchedule = e.target.value;
                          const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const fallbackSchedules = getScheduleListForSpec(entry.specs?.nominalBoreMm, fallbackEffectiveSpecId);
                          const mapSchedules = availableSchedulesMap[entry.id] || [];
                          const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                          const selectedDimension = availableSchedules.find((dim: any) => {
                            const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                            return schedName === newSchedule;
                          });
                          const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;
                          const updatedEntry: any = {
                            specs: {
                              ...entry.specs,
                              scheduleNumber: newSchedule,
                              wallThicknessMm: autoWallThickness || entry.specs?.wallThicknessMm
                            },
                            isScheduleOverridden: newSchedule !== entry.minimumSchedule
                          };
                          updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                          onUpdateEntry(entry.id, updatedEntry);
                        }}
                        disabled={!entry.specs?.nominalBoreMm}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        {!entry.specs?.nominalBoreMm ? (
                          <option value="">Select NB first</option>
                        ) : (
                          <>
                            <option value="">Select schedule...</option>
                            {(() => {
                              const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                              const fallbackSchedules = getScheduleListForSpec(entry.specs?.nominalBoreMm, fallbackEffectiveSpecId);
                              const mapSchedules = availableSchedulesMap[entry.id] || [];
                              const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                              const effectivePressure = entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                              const effectiveTemp = entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;
                              const nominalBore = entry.specs?.nominalBoreMm;
                              const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                              const materialCode = fallbackEffectiveSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B';
                              const minimumWT = effectivePressure > 0
                                ? calculateMinWallThickness(od, effectivePressure, materialCode, effectiveTemp, 1.0, 0, 1.2)
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
                              const recommendedSchedule = eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;
                              if (eligibleSchedules.length === 0 && effectivePressure > 0) {
                                return <option disabled>No schedules meet {minimumWT.toFixed(2)}mm min WT</option>;
                              }
                              if (allSchedules.length === 0) {
                                return <option disabled>No schedules available</option>;
                              }
                              return eligibleSchedules.map((dim: any) => {
                                const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                                const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                const isRecommended = recommendedSchedule && dim.id === recommendedSchedule.id;
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
                        const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                        const allSchedules = getScheduleListForSpec(entry.specs?.nominalBoreMm, fallbackEffectiveSpecId);
                        const eligibleSchedules = allSchedules
                          .filter((dim: any) => (dim.wallThicknessMm || 0) >= minimumWT)
                          .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));
                        const recommendedSchedule = eligibleSchedules[0];

                        return (
                          <div className="mt-1.5 p-2 bg-red-50 border border-red-300 rounded">
                            <div className="flex items-start gap-1.5">
                              <span className="text-red-600 text-sm">⚠</span>
                              <div className="text-xs flex-1">
                                <p className="font-semibold text-red-700">
                                  Schedule does not meet pressure requirements
                                </p>
                                <p className="text-red-600 mt-0.5">
                                  Selected: {selectedWT.toFixed(2)}mm | Required: {minimumWT.toFixed(2)}mm (short by {shortfall.toFixed(2)}mm)
                                </p>
                                {recommendedSchedule && (
                                  <div className="mt-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const schedValue = recommendedSchedule.scheduleDesignation;
                                        const updatedEntry: any = {
                                          specs: {
                                            ...entry.specs,
                                            scheduleNumber: schedValue,
                                            wallThicknessMm: recommendedSchedule.wallThicknessMm
                                          },
                                          isScheduleOverridden: false
                                        };
                                        updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                                        onUpdateEntry(entry.id, updatedEntry);
                                      }}
                                      className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 font-medium"
                                    >
                                      Use {recommendedSchedule.scheduleDesignation} ({recommendedSchedule.wallThicknessMm?.toFixed(2)}mm)
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {errors[`pipe_${index}_schedule`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_schedule`]}</p>
                      )}
                    </div>

                    {/* Weld Thickness Display */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Flange Weld WT
                        <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">(Auto)</span>
                        <span className="ml-1 text-gray-400 font-normal cursor-help" title="For ASTM/ASME specs: Uses fitting class wall thickness (STD/XH/XXH based on schedule). For SABS 719: Uses pipe wall thickness. Rounded to nearest 0.5mm for WPS matching.">?</span>
                      </label>
                      {(() => {
                        const weldCount = getWeldCountPerPipe(entry.specs?.pipeEndConfiguration || 'PE');
                        const dn = entry.specs?.nominalBoreMm;
                        const schedule = entry.specs?.scheduleNumber || '';
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
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
                        let fittingClass: 'STD' | 'XH' | 'XXH' | '' = 'STD';
                        const usingPipeThickness = isSABS719 || !dn || dn > 300;

                        if (isSABS719) {
                          effectiveWeldThickness = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : pipeWallThickness;
                        } else {
                          const scheduleUpper = schedule.toUpperCase();
                          const isStdSchedule = scheduleUpper.includes('40') || scheduleUpper === 'STD';
                          const isXhSchedule = scheduleUpper.includes('80') || scheduleUpper === 'XS' || scheduleUpper === 'XH';
                          const isXxhSchedule = scheduleUpper.includes('160') || scheduleUpper === 'XXS' || scheduleUpper === 'XXH';

                          if (isXxhSchedule) {
                            fittingClass = 'XXH';
                          } else if (isXhSchedule) {
                            fittingClass = 'XH';
                          } else if (isStdSchedule) {
                            fittingClass = 'STD';
                          } else {
                            fittingClass = '';
                          }

                          const rawThickness = fittingClass && FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn]
                            ? FITTING_CLASS_WALL_THICKNESS[fittingClass][dn]
                            : pipeWallThickness;
                          effectiveWeldThickness = rawThickness ? roundToWeldIncrement(rawThickness) : rawThickness;
                        }

                        const descText = isSABS719
                          ? `SABS 719 ERW - pipe WT (${schedule || 'WT'})`
                          : !fittingClass || usingPipeThickness
                            ? `Pipe WT (${schedule || 'WT'})`
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
                  {/* Wall Thickness & Schedule Summary */}
                  {entry.specs?.scheduleNumber && (
                    <div className="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-600">Schedule: </span>
                        <span className="font-medium text-gray-900">{entry.specs.scheduleNumber}</span>
                        <span className="text-gray-600 ml-2">| WT: </span>
                        <span className="font-medium text-gray-900">{entry.specs.wallThicknessMm?.toFixed(2)}mm</span>
                        {entry.minimumWallThickness > 0 && (
                          <span className="text-green-600 ml-2">(min: {Number(entry.minimumWallThickness).toFixed(2)}mm)</span>
                        )}
                      </div>
                      {entry.isScheduleOverridden && (
                        <span className="text-blue-600 font-medium">Override</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Flange Specification - Third Box (Amber) */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mt-3">
                  <div className="mb-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-900">
                      Flange Specification
                    </h4>
                  </div>
                  {(() => {
                    const selectedStandard = masterData.flangeStandards?.find(
                      (fs: any) => fs.id === (entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId)
                    );
                    const isSabs1123 = selectedStandard?.code?.toUpperCase().includes('SABS') &&
                                       selectedStandard?.code?.includes('1123');
                    const isBs4504 = selectedStandard?.code?.toUpperCase().includes('BS') &&
                                     selectedStandard?.code?.includes('4504');
                    const showFlangeType = isSabs1123 || isBs4504;

                    const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                    const configUpper = pipeEndConfig.toUpperCase();
                    const hasInletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(configUpper);
                    const hasOutletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(configUpper);
                    const hasFlanges = hasInletFlange || hasOutletFlange;
                    const availableBlankPositions: { key: string; label: string }[] = [
                      ...(hasInletFlange ? [{ key: 'inlet', label: 'End A' }] : []),
                      ...(hasOutletFlange ? [{ key: 'outlet', label: 'End B' }] : []),
                    ];
                    const currentBlankPositions = entry.specs?.blankFlangePositions || [];

                    const effectiveStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                    const effectiveClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                    const effectiveTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                    const isStandardFromGlobal = globalSpecs?.flangeStandardId && effectiveStandardId === globalSpecs?.flangeStandardId;
                    const isStandardOverride = globalSpecs?.flangeStandardId && effectiveStandardId !== globalSpecs?.flangeStandardId;
                    const isClassFromGlobal = globalSpecs?.flangePressureClassId && effectiveClassId === globalSpecs?.flangePressureClassId;
                    const isClassOverride = globalSpecs?.flangePressureClassId && effectiveClassId !== globalSpecs?.flangePressureClassId;
                    const isTypeFromGlobal = globalSpecs?.flangeTypeCode && effectiveTypeCode === globalSpecs?.flangeTypeCode;
                    const isTypeOverride = globalSpecs?.flangeTypeCode && effectiveTypeCode !== globalSpecs?.flangeTypeCode;

                    const globalSelectClass = 'w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400';
                    const overrideSelectClass = 'w-full px-2 py-1.5 border-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400';
                    const defaultSelectClass = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800';

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Flange Standard */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Standard
                              {isStandardFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {isStandardOverride && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="Flange standard determines pressure class options and flange dimensions">?</span>
                            </label>
                            <select
                              value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                              onChange={(e) => {
                                const newFlangeStandardId = e.target.value ? Number(e.target.value) : undefined;
                                const newStandard = masterData.flangeStandards?.find((s: any) => s.id === newFlangeStandardId);
                                const newStandardCode = newStandard?.code || '';

                                const endConfig = entry.specs?.pipeEndConfiguration || 'PE';
                                const effectiveFlangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode || recommendedFlangeTypeCode(endConfig);

                                const workingPressure = entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;

                                let newPressureClassId: number | undefined = undefined;
                                if (newFlangeStandardId && workingPressure > 0) {
                                  let availableClasses = pressureClassesByStandard[newFlangeStandardId] || [];
                                  if (availableClasses.length === 0) {
                                    availableClasses = masterData.pressureClasses?.filter((pc: any) =>
                                      pc.flangeStandardId === newFlangeStandardId || pc.standardId === newFlangeStandardId
                                    ) || [];
                                  }
                                  if (availableClasses.length > 0) {
                                    newPressureClassId = recommendedPressureClassId(workingPressure, availableClasses, newStandardCode) || undefined;
                                  }
                                }

                                const updatedEntry = {
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    flangeStandardId: newFlangeStandardId,
                                    flangeTypeCode: effectiveFlangeTypeCode,
                                    flangePressureClassId: newPressureClassId
                                  }
                                };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    flangeStandardId: newFlangeStandardId,
                                    flangeTypeCode: effectiveFlangeTypeCode,
                                    flangePressureClassId: newPressureClassId
                                  },
                                  description: newDescription
                                });
                                if (newFlangeStandardId && !pressureClassesByStandard[newFlangeStandardId]) {
                                  getFilteredPressureClasses(newFlangeStandardId);
                                }
                              }}
                              className={isStandardFromGlobal ? globalSelectClass : isStandardOverride ? overrideSelectClass : defaultSelectClass}
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
                              {isSabs1123 ? 'Class (kPa)' : 'Class'}
                              {isClassFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {isClassOverride && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="Flange pressure rating. Should match or exceed working pressure. Auto-selected based on working pressure.">?</span>
                            </label>
                            <select
                              value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                              onChange={(e) => {
                                const newFlangePressureClassId = e.target.value ? Number(e.target.value) : undefined;
                                const updatedEntry = { ...entry, specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId } };
                                const newDescription = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId },
                                  description: newDescription
                                });
                              }}
                              className={isClassFromGlobal ? globalSelectClass : isClassOverride ? overrideSelectClass : defaultSelectClass}
                              onFocus={() => {
                                const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                if (stdId && !pressureClassesByStandard[stdId]) {
                                  getFilteredPressureClasses(stdId);
                                }
                              }}
                            >
                              <option value="">Select...</option>
                              {(() => {
                                if (isSabs1123) {
                                  return SABS_1123_PRESSURE_CLASSES.map((pc) => {
                                    const matchingPc = masterData.pressureClasses?.find(
                                      (mpc: any) => mpc.designation?.includes(String(pc.value))
                                    );
                                    return matchingPc ? (
                                      <option key={matchingPc.id} value={matchingPc.id}>
                                        {pc.value}
                                      </option>
                                    ) : null;
                                  });
                                } else if (isBs4504) {
                                  return BS_4504_PRESSURE_CLASSES.map((pc) => {
                                    const matchingPc = masterData.pressureClasses?.find(
                                      (mpc: any) => mpc.designation?.includes(String(pc.value))
                                    );
                                    return matchingPc ? (
                                      <option key={matchingPc.id} value={matchingPc.id}>
                                        {pc.label}
                                      </option>
                                    ) : null;
                                  });
                                } else {
                                  const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                  const filteredClasses = stdId ? pressureClassesByStandard[stdId] : [];
                                  return filteredClasses?.map((pc: any) => (
                                    <option key={pc.id} value={pc.id}>
                                      {pc.designation}
                                    </option>
                                  )) || null;
                                }
                              })()}
                            </select>
                          </div>

                          {/* Flange Type */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Type
                              {isTypeFromGlobal && showFlangeType && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {isTypeOverride && showFlangeType && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                            </label>
                            {showFlangeType ? (
                              <select
                                value={entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode || ''}
                                onChange={(e) => {
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined } };
                                  const newDescription = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined },
                                    description: newDescription
                                  });
                                }}
                                className={isTypeFromGlobal ? globalSelectClass : isTypeOverride ? overrideSelectClass : defaultSelectClass}
                              >
                                <option value="">Select...</option>
                                {(isSabs1123 ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES).map((ft) => (
                                  <option key={ft.code} value={ft.code} title={ft.description}>
                                    {ft.name} ({ft.code})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-700">
                                N/A
                              </div>
                            )}
                          </div>

                          {/* Pipe End Configuration */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-900 mb-1">
                              Config
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="PE = Plain End (no flanges, for butt welding to other pipes). FOE = Flanged One End (connect to equipment/valve). FBE = Flanged Both Ends (spool piece). L/F = Loose Flange (slip-on, easier bolt alignment). R/F = Rotating Flange (backing ring allows rotation for bolt hole alignment).">?</span>
                            </label>
                            <select
                              value={entry.specs.pipeEndConfiguration || 'PE'}
                              onChange={async (e) => {
                                const newConfig = e.target.value as any;
                                let weldDetails = null;
                                try {
                                  weldDetails = await getPipeEndConfigurationDetails(newConfig);
                                } catch (error) {
                                  log.warn('Could not get pipe end configuration details:', error);
                                }

                                const effectiveFlangeTypeCode = globalSpecs?.flangeTypeCode || recommendedFlangeTypeCode(newConfig);

                                const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                                const flangeCode = flangeStandard?.code || '';
                                const isSabs1123 = flangeCode.includes('SABS 1123') || flangeCode.includes('SANS 1123');

                                const workingPressure = entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || 0;
                                let availableClasses = flangeStandardId ? (pressureClassesByStandard[flangeStandardId] || []) : [];
                                if (availableClasses.length === 0) {
                                  availableClasses = masterData.pressureClasses?.filter((pc: any) =>
                                    pc.flangeStandardId === flangeStandardId || pc.standardId === flangeStandardId
                                  ) || [];
                                }
                                const newPressureClassId = workingPressure > 0 && availableClasses.length > 0
                                  ? recommendedPressureClassId(workingPressure, availableClasses, flangeCode)
                                  : (entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId);

                                const updatedEntry: any = {
                                  specs: {
                                    ...entry.specs,
                                    pipeEndConfiguration: newConfig,
                                    blankFlangePositions: [],
                                    addBlankFlange: false,
                                    blankFlangeCount: 0,
                                    flangeTypeCode: effectiveFlangeTypeCode,
                                    ...(newPressureClassId && { flangePressureClassId: newPressureClassId })
                                  },
                                  ...(weldDetails && { weldInfo: weldDetails })
                                };
                                updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-900"
                            >
                              {PIPE_END_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Blank Flange Options - Only show when flanges are selected, aligned right under Config */}
                        {hasFlanges && availableBlankPositions.length > 0 && (
                          <div className="mt-2 flex justify-end">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-900">Blank:</span>
                              <span className="text-gray-400 font-normal cursor-help text-xs" title="Add blank flanges for hydrostatic testing, isolation, or future connections. Select both ends when pipes will be tested individually before installation.">?</span>
                              {availableBlankPositions.map(pos => (
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
                                          blankFlangePositions: newPositions
                                        }
                                      });
                                    }}
                                    className="w-3.5 h-3.5 text-amber-600 border-amber-400 dark:border-amber-600 rounded focus:ring-amber-500"
                                  />
                                  <span className="text-xs text-gray-800 dark:text-gray-900">{pos.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {/* Warning for pressure override */}
                  {(() => {
                    const currentClassId = entry.specs?.flangePressureClassId;
                    const recommendedClassId = globalSpecs?.flangePressureClassId;
                    if (currentClassId && recommendedClassId && currentClassId !== recommendedClassId) {
                      const currentClass = masterData.pressureClasses?.find((p: any) => p.id === currentClassId);
                      const recommendedClass = masterData.pressureClasses?.find((p: any) => p.id === recommendedClassId);
                      return (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:text-red-800">
                          <span className="font-medium">Warning:</span> Using {currentClass?.designation} instead of recommended {recommendedClass?.designation}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

              {/* Closure Length Field - Only shown when L/F configuration is selected */}
              {hasLooseFlange(entry.specs.pipeEndConfiguration || '') && (
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                  <ClosureLengthSelector
                    nominalBore={entry.specs?.nominalBoreMm || 100}
                    currentValue={entry.specs?.closureLengthMm || null}
                    wallThickness={entry.specs?.wallThicknessMm || 5}
                    onUpdate={(closureLength) => onUpdateEntry(entry.id, { specs: { ...entry.specs, closureLengthMm: closureLength } })}
                    error={errors[`pipe_${index}_closure_length`]}
                  />
                </div>
              )}

              {/* Quantity & Lengths - Blue Box */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Pipe Length */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Pipe Length (m)
                    </label>
                    <div className="flex gap-1 mb-1">
                      {STANDARD_PIPE_LENGTHS_M.map((pl) => (
                        <button
                          key={pl.value}
                          type="button"
                          title={pl.description}
                          onClick={() => {
                            const numPipes = entry.specs.quantityType === 'number_of_pipes'
                              ? (entry.specs.quantityValue || 1)
                              : Math.ceil((entry.specs.quantityValue || pl.value) / pl.value);
                            const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pl.value } };
                            const newDescription = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, individualPipeLength: pl.value },
                              calculatedPipes: numPipes,
                              description: newDescription
                            });
                          }}
                          className={`px-1.5 py-0.5 text-xs rounded border ${entry.specs.individualPipeLength && Math.abs(entry.specs.individualPipeLength - pl.value) < 0.001 ? 'bg-blue-200 dark:bg-blue-700 border-blue-400 dark:border-blue-500 font-medium text-blue-900 dark:text-blue-100' : 'bg-white dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/40 border-blue-300 dark:border-blue-600 text-gray-700 dark:text-gray-300'}`}
                        >
                          {pl.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      value={entry.specs.individualPipeLength || ''}
                      onChange={(e) => {
                        const pipeLength = e.target.value ? Number(e.target.value) : undefined;
                        const numPipes = pipeLength && entry.specs.quantityType === 'number_of_pipes'
                          ? (entry.specs.quantityValue || 1)
                          : pipeLength ? Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength) : undefined;
                        const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                        const newDescription = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, individualPipeLength: pipeLength },
                          calculatedPipes: numPipes,
                          description: newDescription
                        });
                      }}
                      className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-blue-900/20"
                      placeholder="Custom length"
                    />
                  </div>

                  {/* Total Length */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Total Line (m)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={
                        entry.specs.quantityType === 'total_length'
                          ? entry.specs.quantityValue || ''
                          : (entry.specs.quantityValue || 1) * (entry.specs.individualPipeLength || 0)
                      }
                      onChange={(e) => {
                        const totalLength = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'totalLength', totalLength);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-blue-900/20 mt-6"
                      placeholder="Total length"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Qty (Each)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={
                        entry.specs.quantityType === 'number_of_pipes'
                          ? (entry.specs.quantityValue ?? '')
                          : entry.specs.individualPipeLength ? Math.ceil((entry.specs.quantityValue || 0) / entry.specs.individualPipeLength) : ''
                      }
                      onChange={(e) => {
                        const numberOfPipes = e.target.value === '' ? 1 : Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'numberOfPipes', numberOfPipes);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-blue-900/20 mt-6"
                      placeholder="Number of pipes"
                      required
                    />
                  </div>
                </div>
              </div>
                  </>
                }
                previewContent={
                  Pipe3DPreview ? (() => {
                    const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                    const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                    const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                    const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                    const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                    const flangeStandardName = flangeStandard?.code === 'SABS_1123' ? 'SABS 1123' : flangeStandard?.code === 'BS_4504' ? 'BS 4504' : flangeStandard?.code?.replace(/_/g, ' ') || '';
                    const pressureClassDesignation = pressureClass?.designation || '';
                    return (
                      <Pipe3DPreview
                        length={entry.specs.individualPipeLength || DEFAULT_PIPE_LENGTH_M}
                        outerDiameter={entry.calculation?.outsideDiameterMm || (entry.specs.nominalBoreMm * 1.1)}
                        wallThickness={entry.calculation?.wallThicknessMm || entry.specs.wallThicknessMm || 5}
                        endConfiguration={entry.specs.pipeEndConfiguration || 'PE'}
                        materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                        nominalBoreMm={entry.specs.nominalBoreMm}
                        pressureClass={globalSpecs?.pressureClassDesignation || 'PN16'}
                        addBlankFlange={entry.specs?.addBlankFlange}
                        blankFlangePositions={entry.specs?.blankFlangePositions}
                        savedCameraPosition={entry.specs?.savedCameraPosition}
                        savedCameraTarget={entry.specs?.savedCameraTarget}
                        onCameraChange={(position: [number, number, number], target: [number, number, number]) => {
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, savedCameraPosition: position, savedCameraTarget: target }
                          });
                        }}
                        selectedNotes={entry.selectedNotes}
                        flangeSpecs={flangeSpecs}
                        flangeStandardName={flangeStandardName}
                        pressureClassDesignation={pressureClassDesignation}
                        flangeTypeCode={flangeTypeCode}
                      />
                    );
                  })() : null
                }
                calcResultsContent={
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                      📊 Calculation Results
                    </h4>

                    {entry.calculation ? (
                      <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                          <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                            <p className="text-xs text-green-800 font-medium">Qty Pipes</p>
                            <p className="text-lg font-bold text-green-900">{entry.calculation.calculatedPipeCount}</p>
                            <p className="text-xs text-green-600">pieces</p>
                          </div>

                          <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                            <p className="text-xs text-blue-800 font-medium">Total Length</p>
                            <p className="text-lg font-bold text-blue-900">{entry.calculation.calculatedTotalLength?.toFixed(1)}m</p>
                          </div>

                          {(() => {
                            const configUpper = (entry.specs.pipeEndConfiguration || 'PE').toUpperCase();
                            const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);
                            const hasLooseFlangeConfig = hasLooseFlange(entry.specs.pipeEndConfiguration || '');

                            let backingRingTotalWeight = 0;
                            if (hasRotatingFlange) {
                              const backingRingCountPerPipe = configUpper === 'FOE_RF' ? 1 : configUpper === '2X_RF' ? 2 : 0;
                              const totalBackingRings = backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);
                              const nb = entry.specs.nominalBoreMm || 100;
                              const ringWeightEach = retainingRingWeight(nb, entry.calculation?.outsideDiameterMm);
                              backingRingTotalWeight = ringWeightEach * totalBackingRings;
                            }

                            const physicalFlanges = getPhysicalFlangeCount(entry.specs.pipeEndConfiguration || 'PE');
                            const totalFlanges = physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                            const nominalBore = entry.specs?.nominalBoreMm;

                            const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                            const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;

                            const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                            const flangeStandardCode = flangeStandard?.code || '';
                            const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                            const pressureClassDesignation = pressureClass?.designation || '';
                            const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                            const flangeWeightPerUnit = nominalBore && pressureClassDesignation
                              ? getFlangeWeight(nominalBore, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
                              : (entry.calculation?.flangeWeightPerUnit || 0);
                            const dynamicTotalFlangeWeight = totalFlanges * flangeWeightPerUnit;

                            const blankPositions = entry.specs?.blankFlangePositions || [];
                            const blankFlangeCount = blankPositions.length * (entry.calculation?.calculatedPipeCount || 0);
                            const isSans1123 = flangeStandardCode.includes('SABS 1123') || flangeStandardCode.includes('SANS 1123');
                            const blankWeightPerUnit = nominalBore && pressureClassDesignation
                              ? (isSans1123 ? sansBlankFlangeWeight(nominalBore, pressureClassDesignation) : getBlankFlangeWeight(nominalBore, pressureClassDesignation))
                              : 0;
                            const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                            const bendEndOption = BEND_END_OPTIONS.find(o => o.value === entry.specs.pipeEndConfiguration);
                            const tackWeldEnds = (bendEndOption as any)?.tackWeldEnds || 0;
                            const tackWeldTotalWeight = nominalBore && tackWeldEnds > 0
                              ? getTackWeldWeight(nominalBore, tackWeldEnds) * (entry.calculation?.calculatedPipeCount || 0)
                              : 0;

                            const closureLengthMm = entry.specs?.closureLengthMm || 0;
                            const wallThickness = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 0;
                            const closureTotalWeight = nominalBore && closureLengthMm > 0 && wallThickness > 0
                              ? getClosureWeight(nominalBore, closureLengthMm, wallThickness) * (entry.calculation?.calculatedPipeCount || 0)
                              : 0;

                            const totalWeight = (entry.calculation.totalPipeWeight || 0)
                              + dynamicTotalFlangeWeight
                              + backingRingTotalWeight
                              + totalBlankFlangeWeight
                              + tackWeldTotalWeight
                              + closureTotalWeight;

                            return (
                              <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                                <p className="text-xs text-green-800 font-medium">Total Weight</p>
                                <p className="text-lg font-bold text-green-900">{formatWeight(totalWeight)}</p>
                                <p className="text-xs text-green-600">
                                  (Pipe: {formatWeight(entry.calculation.totalPipeWeight)})
                                </p>
                                {backingRingTotalWeight > 0 && (
                                  <p className="text-xs text-amber-600">
                                    (incl. {backingRingTotalWeight.toFixed(2)}kg R/F rings)
                                  </p>
                                )}
                                {totalBlankFlangeWeight > 0 && (
                                  <p className="text-xs text-gray-600">
                                    (incl. {totalBlankFlangeWeight.toFixed(2)}kg blanks)
                                  </p>
                                )}
                                {closureTotalWeight > 0 && (
                                  <p className="text-xs text-purple-600">
                                    (incl. {closureTotalWeight.toFixed(2)}kg closures)
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {(() => {
                            const physicalFlanges = getPhysicalFlangeCount(entry.specs.pipeEndConfiguration || 'PE');
                            const totalFlanges = physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                            const nominalBore = entry.specs?.nominalBoreMm;

                            const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                            const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;

                            const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                            const flangeStandardCode = flangeStandard?.code || '';
                            const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                            const pressureClassDesignation = pressureClass?.designation || '';
                            const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                            const flangeWeightPerUnit = nominalBore && pressureClassDesignation
                              ? getFlangeWeight(nominalBore, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
                              : (entry.calculation?.flangeWeightPerUnit || 0);
                            const totalFlangeWeight = totalFlanges * flangeWeightPerUnit;

                            return (
                              <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                                <p className="text-xs text-amber-800 font-medium">Total Flange Weight</p>
                                <p className="text-lg font-bold text-amber-900">{formatWeight(totalFlangeWeight)}</p>
                                <p className="text-xs text-amber-600">
                                  {totalFlanges} flanges × {flangeWeightPerUnit.toFixed(2)}kg
                                </p>
                              </div>
                            );
                          })()}

                          {(() => {
                            const configUpper = (entry.specs.pipeEndConfiguration || 'PE').toUpperCase();
                            const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);
                            if (!hasRotatingFlange) return null;

                            const backingRingCountPerPipe = configUpper === 'FOE_RF' ? 1 : configUpper === '2X_RF' ? 2 : 0;
                            const totalBackingRings = backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);

                            const nb = entry.specs.nominalBoreMm || 100;
                            const ringWeightEach = retainingRingWeight(nb, entry.calculation?.outsideDiameterMm);
                            const totalWeight = ringWeightEach * totalBackingRings;

                            return (
                              <div className="bg-orange-50 p-2 rounded text-center border border-orange-200">
                                <p className="text-xs text-orange-700 font-medium">R/F Retaining Rings</p>
                                <p className="text-lg font-bold text-orange-900">{totalWeight.toFixed(2)} kg</p>
                                <p className="text-xs text-orange-600">
                                  {totalBackingRings} rings × {ringWeightEach.toFixed(2)}kg
                                </p>
                              </div>
                            );
                          })()}

                          <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                            <p className="text-xs text-purple-800 font-medium">Flange Welds</p>
                            <p className="text-lg font-bold text-purple-900">{entry.calculation.numberOfFlangeWelds}</p>
                            <p className="text-xs text-purple-600">{entry.calculation.totalFlangeWeldLength?.toFixed(2)}m</p>
                          </div>

                          {entry.calculation?.numberOfFlangeWelds > 0 && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                            const weldVolume = calculateFlangeWeldVolume({
                              outsideDiameterMm: entry.calculation.outsideDiameterMm,
                              wallThicknessMm: entry.specs.wallThicknessMm,
                              numberOfFlangeWelds: entry.calculation.numberOfFlangeWelds,
                            });
                            const totalPipes = entry.calculation?.calculatedPipeCount || 1;
                            const totalVolumeCm3 = weldVolume.volumeCm3 * totalPipes;
                            return (
                              <div className="bg-fuchsia-50 p-2 rounded text-center border border-fuchsia-200">
                                <p className="text-xs text-fuchsia-700 font-medium">Weld Volume</p>
                                <p className="text-lg font-bold text-fuchsia-900">{totalVolumeCm3.toFixed(1)} cm³</p>
                                <p className="text-xs text-fuchsia-600">{weldVolume.legSizeMm.toFixed(1)}mm leg</p>
                              </div>
                            );
                          })()}

                          {showSurfaceProtection && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                            const pressureClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                            const pressureClassDesignation = pressureClassId
                              ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                              : undefined;
                            return (
                              <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                                <p className="text-xs text-indigo-700 font-medium">External m²</p>
                                <p className="text-lg font-bold text-indigo-900">
                                  {calculateTotalSurfaceArea({
                                    outsideDiameterMm: entry.calculation.outsideDiameterMm,
                                    insideDiameterMm: calculateInsideDiameter(entry.calculation.outsideDiameterMm, entry.specs.wallThicknessMm),
                                    individualPipeLengthM: entry.specs.individualPipeLength || 0,
                                    numberOfPipes: entry.calculation?.calculatedPipeCount || 0,
                                    hasFlangeEnd1: (entry.specs.pipeEndConfiguration || 'PE') !== 'PE',
                                    hasFlangeEnd2: ['FBE', 'FOE_RF', '2X_RF'].includes(entry.specs.pipeEndConfiguration || 'PE'),
                                    dn: entry.specs.nominalBoreMm,
                                    pressureClass: pressureClassDesignation,
                                  }).total.totalExternalAreaM2.toFixed(2)}
                                </p>
                                <p className="text-xs text-indigo-600">coating area</p>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Duplicate
                  </button>
                )}
                {onCopyEntry && (
                  <button
                    onClick={() => onCopyEntry(entry)}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                      copiedItemId === entry.id
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-300'
                    }`}
                    title="Copy item data to clipboard"
                  >
                    {copiedItemId === entry.id ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
                {entries.length > 1 && (
                  <button
                    onClick={() => onRemoveEntry(entry.id)}
                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                  onNotesChange={(notes) => onUpdateEntry(entry.id, {
                    selectedNotes: notes,
                    notes: formatNotesForDisplay(notes)
                  })}
                  placeholder="Select quality/inspection requirements..."
                />
              </div>
              </>
  );
}
