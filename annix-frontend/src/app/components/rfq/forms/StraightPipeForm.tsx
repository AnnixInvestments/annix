'use client';

import React from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { getPipeEndConfigurationDetails } from '@/app/lib/utils/systemUtils';
import { log } from '@/app/lib/logger';
import {
  PIPE_END_OPTIONS,
  getScheduleListForSpec,
  NB_TO_OD_LOOKUP,
  weldCountPerPipe as getWeldCountPerPipe,
  physicalFlangeCount as getPhysicalFlangeCount,
  hasLooseFlange,
  retainingRingWeight,
  SABS_1123_FLANGE_TYPES,
  SABS_1123_PRESSURE_CLASSES,
} from '@/app/lib/config/rfq';
import {
  calculateMinWallThickness,
  findRecommendedSchedule,
  validateScheduleForPressure,
  calculateTotalSurfaceArea,
  calculateInsideDiameter,
} from '@/app/lib/utils/pipeCalculations';
import { recommendWallThicknessCarbonPipe, roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { groupSteelSpecifications } from '@/app/lib/utils/steelSpecGroups';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';

const formatWeight = (weight: number | undefined) => {
  if (weight === undefined) return 'Not calculated';
  return `${weight.toFixed(2)} kg`;
};

const calculateQuantities = (entry: any, field: string, value: number) => {
  const pipeLength = entry.specs?.individualPipeLength || 12.192;

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
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || generateItemDescription(entry)}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    rows={2}
                    placeholder="Enter item description..."
                    required
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Column 1 - Specifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-blue-500 pb-1.5">
                    Pipe Specifications
                  </h4>

                  {/* Steel Specification - Auto from Global but can be overridden */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Steel Specification *
                      {(() => {
                        const globalSpecId = globalSpecs?.steelSpecificationId;
                        const entrySpecId = entry.specs?.steelSpecificationId;
                        if (globalSpecId && (!entrySpecId || entrySpecId === globalSpecId)) {
                          return <span className="text-green-600 text-xs ml-2 font-normal">(From Global Spec)</span>;
                        }
                        if (entrySpecId && entrySpecId !== globalSpecId) {
                          return <span className="text-blue-600 text-xs ml-2 font-normal">(Override)</span>;
                        }
                        return null;
                      })()}
                    </label>
                    <div className="flex gap-2">
                      {(() => {
                        const selectId = `pipe-steel-spec-${entry.id}`;
                        const groupedOptions = masterData.steelSpecs
                          ? groupSteelSpecifications(masterData.steelSpecs)
                          : [];

                        return (
                          <Select
                            id={selectId}
                            value={String(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || '')}
                            onChange={(value) => {
                              const specId = value ? Number(value) : undefined;
                              onUpdateEntry(entry.id, {
                                specs: {
                                  ...entry.specs,
                                  steelSpecificationId: specId
                                }
                              });
                              if (specId && !entry.specs?.nominalBoreMm) {
                                setTimeout(() => focusAndOpenSelect(`pipe-nb-${entry.id}`), 100);
                              }
                            }}
                            options={[]}
                            groupedOptions={groupedOptions}
                            placeholder="Select steel spec..."
                            className="flex-1"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                      {entry.specs?.steelSpecificationId && entry.specs?.steelSpecificationId !== globalSpecs?.steelSpecificationId && (
                        <button
                          type="button"
                          onClick={() => onUpdateEntry(entry.id, {
                            specs: {
                              ...entry.specs,
                              steelSpecificationId: undefined
                            }
                          })}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {(() => {
                        const specId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const spec = masterData.steelSpecs?.find((s: any) => s.id === specId);
                        return spec ? `Material: ${spec.steelSpecName}` : 'Select a steel specification';
                      })()}
                    </p>
                  </div>

                  {/* Nominal Bore */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Nominal Bore (mm) *
                    </label>
                    {(() => {
                      const selectId = `pipe-nb-${entry.id}`;
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
                            minWT = calculateMinWallThickness(od, pressure, materialCode, temperature, 1.0, 0, 1.2);
                            log.debug(`[NB onChange] ASME B31.3 calc minWT: ${minWT.toFixed(2)}mm for ${pressure} bar @ ${temperature}°C, OD=${od}mm`);

                            const recommendation = findRecommendedSchedule(schedules, od, pressure, materialCode, temperature, 1.2);

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
                              console.warn(`[NB onChange] No schedule meets ${minWT.toFixed(2)}mm minWT, using thickest: ${matchedSchedule} (${matchedWT}mm). ${validation.message}`);
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
                          placeholder={isLoadingNominalBores ? 'Loading available sizes...' : 'Please Select NB'}
                          disabled={isLoadingNominalBores}
                          open={openSelects[selectId] || false}
                          onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                        />
                      );
                    })()}
                    {globalSpecs?.steelSpecificationId && nominalBores.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {nominalBores.length} sizes available for selected steel specification
                      </p>
                    )}
                    {errors[`pipe_${index}_nb`] && (
                      <p className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_nb`]}</p>
                    )}
                  </div>

                  {/* Schedule/Wall Thickness - Auto/Manual with Upgrade Option */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Schedule/Wall Thickness
                      {globalSpecs?.workingPressureBar ? (
                        <span className="text-green-600 text-xs ml-2">(Automated)</span>
                      ) : (
                        <span className="text-orange-600 text-xs ml-2">(Manual Selection Required)</span>
                      )}
                      {entry.isScheduleOverridden && (
                        <span className="text-blue-600 text-xs ml-2 font-bold">(User Override)</span>
                      )}
                    </label>

                    {globalSpecs?.workingPressureBar && entry.specs.nominalBoreMm ? (
                      <>
                        <div className="bg-green-50 p-2 rounded-md space-y-2">
                          <p className="text-green-800 font-medium text-xs mb-2">
                            Auto-calculated based on {globalSpecs.workingPressureBar} bar and {entry.specs.nominalBoreMm}NB
                          </p>

                          {/* Schedule Dropdown with Recommended + Upgrades */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">
                              Schedule *
                            </label>
                            <select
                              value={entry.specs.scheduleNumber || ''}
                              onChange={async (e) => {
                                const newSchedule = e.target.value;

                                // Find the selected dimension to get wall thickness
                                // Handle both camelCase and snake_case property names
                                const availableSchedules = availableSchedulesMap[entry.id] || [];
                                const selectedDimension = availableSchedules.find((dim: any) => {
                                  const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                                  return schedName === newSchedule;
                                });

                                // Use wall thickness from API data (handle both naming conventions)
                                const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                                const updatedEntry: any = {
                                  specs: {
                                    ...entry.specs,
                                    scheduleNumber: newSchedule,
                                    wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                                  },
                                  isScheduleOverridden: newSchedule !== entry.minimumSchedule
                                };

                                // Auto-update description
                                updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              className="w-full px-2 py-1.5 text-black border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select schedule...</option>
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES to ensure consistent schedule names
                                // API data may have different designations (e.g. "5S" for stainless) that break calculations
                                const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                // Only use API data if no fallback exists
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;

                                // Filter to only show schedules >= minimum wall thickness, sorted by wall thickness
                                // Handle both camelCase and snake_case property names
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

                                // Find the recommended schedule (closest to minimum wall thickness)
                                const recommendedSchedule = eligibleSchedules.length > 0 ? eligibleSchedules[0] : null;

                                if (eligibleSchedules.length === 0) {
                                  return null; // Will show "No schedules available" below
                                }

                                return eligibleSchedules.map((dim: any) => {
                                  const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  const isRecommended = recommendedSchedule && dim.id === recommendedSchedule.id;
                                  const label = isRecommended
                                    ? `★ ${scheduleValue} (${wt}mm) - RECOMMENDED`
                                    : `${scheduleValue} (${wt}mm)`;
                                  return (
                                    <option key={dim.id} value={scheduleValue}>
                                      {label}
                                    </option>
                                  );
                                });
                              })()}
                              {(() => {
                                // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                                const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                                const mapSchedules = availableSchedulesMap[entry.id] || [];
                                const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                                const minimumWT = entry.minimumWallThickness || 0;
                                const eligibleSchedules = allSchedules.filter((dim: any) => {
                                  const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                                  return wt >= minimumWT;
                                });
                                if (eligibleSchedules.length === 0) {
                                  return <option disabled>No schedules available - select nominal bore first</option>;
                                }
                                return null;
                              })()}
                            </select>
                            {entry.minimumSchedule && entry.minimumWallThickness && (
                              <p className="text-xs text-green-700 mt-1">
                                ASME B31.3 min WT: {Number(entry.minimumWallThickness).toFixed(2)}mm (schedule {entry.minimumSchedule} selected: {entry.specs.wallThicknessMm?.toFixed(2)}mm)
                              </p>
                            )}
                          </div>

                          {/* Wall Thickness (Read-only, derived from schedule) */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Wall Thickness (mm)
                            </label>
                            <input
                              type="text"
                              value={entry.specs.wallThicknessMm ? `${entry.specs.wallThicknessMm}mm` : 'Select schedule above'}
                              readOnly
                              className="w-full px-2 py-1.5 text-black bg-gray-100 border border-gray-300 rounded-md text-xs"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <select
                          value={entry.specs.scheduleNumber || ''}
                          onChange={(e) => {
                            const newSchedule = e.target.value;

                            // Find the selected dimension to get wall thickness
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const availableSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                            const selectedDimension = availableSchedules.find((dim: any) => {
                              const schedName = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString();
                              return schedName === newSchedule;
                            });

                            // Use wall thickness from data (handle both naming conventions)
                            const autoWallThickness = selectedDimension?.wallThicknessMm || selectedDimension?.wall_thickness_mm || null;

                            const updatedEntry: any = {
                              specs: {
                                ...entry.specs,
                                scheduleNumber: newSchedule,
                                wallThicknessMm: autoWallThickness || entry.specs.wallThicknessMm
                              }
                            };

                            // Auto-update description
                            updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                            onUpdateEntry(entry.id, updatedEntry);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="">Select schedule...</option>
                          {(() => {
                            // ALWAYS prefer FALLBACK_PIPE_SCHEDULES for consistent schedule names
                            const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const fallbackSchedules = getScheduleListForSpec(entry.specs.nominalBoreMm, fallbackEffectiveSpecId);
                            const mapSchedules = availableSchedulesMap[entry.id] || [];
                            const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;

                            if (allSchedules.length === 0) {
                              return <option disabled>No schedules available - select nominal bore first</option>;
                            }

                            return allSchedules.map((dim: any) => {
                              const scheduleValue = dim.scheduleDesignation || dim.schedule_designation || dim.scheduleNumber?.toString() || dim.schedule_number?.toString() || 'Unknown';
                              const wt = dim.wallThicknessMm || dim.wall_thickness_mm || 0;
                              const label = `${scheduleValue} (${wt}mm)`;
                              return (
                                <option key={dim.id} value={scheduleValue}>
                                  {label}
                                </option>
                              );
                            });
                          })()}
                        </select>
                        <p className="mt-0.5 text-xs text-gray-700">
                          Select a schedule from available options for the selected nominal bore and steel specification.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Column 2 - Configuration */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                    Configuration
                  </h4>

                  {/* Pipe End Configuration - NEW FIELD */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Pipe End Configuration *
                    </label>
                    <select
                      value={entry.specs.pipeEndConfiguration || 'PE'}
                      onChange={async (e) => {
                        const newConfig = e.target.value as any;
                        
                        // Get weld details for this configuration
                        let weldDetails = null;
                        try {
                          weldDetails = await getPipeEndConfigurationDetails(newConfig);
                        } catch (error) {
                          console.warn('Could not get pipe end configuration details:', error);
                        }
                        
                        const updatedEntry: any = {
                          specs: { ...entry.specs, pipeEndConfiguration: newConfig },
                          // Store weld count information if available
                          ...(weldDetails && { weldInfo: weldDetails })
                        };
                        
                        // Auto-update description
                        updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });
                        
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      required
                    >
                      {PIPE_END_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-0.5 text-xs text-gray-700">
                      Select how the pipe ends should be configured
                      {/* Show weld count based on selected configuration */}
                      {entry.specs.pipeEndConfiguration && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • {getWeldCountPerPipe(entry.specs.pipeEndConfiguration)} weld{getWeldCountPerPipe(entry.specs.pipeEndConfiguration) !== 1 ? 's' : ''} per pipe
                        </span>
                      )}
                    </p>
                    {/* Weld Thickness Display - from fitting wall thickness tables (ASME B31.1) or pipe WT for SABS 719 */}
                    {(() => {
                      const weldCount = getWeldCountPerPipe(entry.specs.pipeEndConfiguration || 'PE');
                      const dn = entry.specs.nominalBoreMm;
                      const schedule = entry.specs.scheduleNumber || '';
                      const steelSpecId = entry.specs.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      const isSABS719 = steelSpecId === 8; // SABS 719 ERW uses WT schedules

                      // Carbon Steel Weld Fittings wall thickness lookup (WPB Grade, ASME B31.1)
                      // Only used for ASTM/ASME pipes, not SABS 719
                      const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                        'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                        'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                        'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                      };

                      // Show weld thickness if pipe has welds and DN is set
                      if (weldCount === 0) {
                        return null; // No welds for PE configuration
                      }

                      if (!dn) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Select Nominal Bore to see recommended weld thickness
                            </p>
                          </div>
                        );
                      }

                      // For SABS 719, always use the actual pipe wall thickness (WT schedules)
                      // SABS 719 specifies wall thickness directly (WT6 = 6mm, WT8 = 8mm, etc.)
                      const pipeWallThickness = entry.specs.wallThicknessMm;

                      let effectiveWeldThickness: number | null = null;
                      let usingPipeThickness = false;
                      let fittingClass = 'STD';

                      if (isSABS719) {
                        // SABS 719: Round pipe WT to 1.5mm weld increments
                        effectiveWeldThickness = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : pipeWallThickness;
                        usingPipeThickness = true;
                      } else {
                        // ASTM/ASME: Look up from fitting class tables
                        const scheduleUpper = schedule.toUpperCase();
                        fittingClass =
                          scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                            ? 'XXH'
                            : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                              ? 'XH'
                              : 'STD';

                        const weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                        effectiveWeldThickness = weldThickness || pipeWallThickness;
                        usingPipeThickness = !weldThickness && !!pipeWallThickness;
                      }

                      if (!effectiveWeldThickness) {
                        return (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs text-amber-700">
                              Weld thickness data not available for DN {dn}mm - set pipe wall thickness
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className={`mt-2 p-2 ${isSABS719 ? 'bg-amber-50 border border-amber-200' : usingPipeThickness ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'} rounded-md`}>
                          <p className={`text-xs font-bold ${isSABS719 ? 'text-amber-800' : usingPipeThickness ? 'text-blue-800' : 'text-green-800'}`}>
                            Flange Weld Thickness: {effectiveWeldThickness.toFixed(2)} mm
                          </p>
                          <p className={`text-xs ${isSABS719 ? 'text-amber-700' : usingPipeThickness ? 'text-blue-700' : 'text-green-700'}`}>
                            {isSABS719
                              ? `SABS 719 ERW - using pipe wall thickness (${schedule || 'WT'})`
                              : usingPipeThickness
                                ? 'Using pipe wall thickness (no fitting data for this DN)'
                                : `Based on ${fittingClass} fitting class (ASME B31.1)`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            2 welds per flange (inside + outside)
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Closure Length Field - Only shown when L/F configuration is selected */}
                  {hasLooseFlange(entry.specs.pipeEndConfiguration || '') && (
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <label className="block text-xs font-semibold text-blue-900 mb-1">
                        Closure Length (mm) *
                        <span className="text-blue-600 text-xs ml-2">(Site weld extension past L/F)</span>
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.closureLengthMm || ''}
                        onChange={(e) => {
                          const closureLength = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, closureLengthMm: closureLength }
                          });
                        }}
                        placeholder="e.g., 150"
                        min={50}
                        max={500}
                        className="w-full px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                      <p className="mt-0.5 text-xs text-blue-700">
                        Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)
                      </p>
                      {/* Tack Weld Information */}
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
                        <p className="text-xs font-bold text-purple-800">
                          Loose Flange Tack Welds Required:
                        </p>
                        <ul className="text-xs text-purple-700 mt-1 list-disc list-inside">
                          <li>8 tack welds total (~20mm each)</li>
                          <li>4 tack welds on each side of loose flange</li>
                        </ul>
                        <p className="text-xs text-purple-600 mt-1 italic">
                          Tack weld charge applies per L/F end
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Blank Flange Option - Position selector for pipes */}
                  {(() => {
                    const pipeEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                    const configUpper = pipeEndConfig.toUpperCase();
                    // Determine available flange positions based on config
                    const hasInletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);
                    const hasOutletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);

                    const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                      { key: 'inlet', label: 'End A (Inlet)', hasFlange: hasInletFlange },
                      { key: 'outlet', label: 'End B (Outlet)', hasFlange: hasOutletFlange },
                    ].filter(p => p.hasFlange);

                    if (availablePositions.length === 0) return null;

                    const currentPositions = entry.specs?.blankFlangePositions || [];

                    return (
                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Add Blank Flange(s)</span>
                          <span className="text-xs text-amber-600 dark:text-amber-500">({availablePositions.length} positions available)</span>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {availablePositions.map(pos => (
                            <label key={pos.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentPositions.includes(pos.key)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  let newPositions: string[];
                                  if (checked) {
                                    newPositions = [...currentPositions, pos.key];
                                  } else {
                                    newPositions = currentPositions.filter((p: string) => p !== pos.key);
                                  }
                                  onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      addBlankFlange: newPositions.length > 0,
                                      blankFlangeCount: newPositions.length,
                                      blankFlangePositions: newPositions
                                    }
                                  });
                                }}
                                className="w-4 h-4 text-amber-600 border-amber-300 dark:border-amber-600 rounded focus:ring-amber-500"
                              />
                              <span className="text-sm text-amber-800 dark:text-amber-300">{pos.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Flange Specifications */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <label className="block text-xs font-semibold text-gray-900">
                        Flanges
                        {entry.hasFlangeOverride ? (
                          <span className="text-blue-600 text-xs ml-2">(Override Active)</span>
                        ) : globalSpecs?.flangeStandardId ? (
                          <span className="text-green-600 text-xs ml-2">(From Global Specs)</span>
                        ) : (
                          <span className="text-orange-600 text-xs ml-2">(Item Specific)</span>
                        )}
                      </label>
                      {globalSpecs?.flangeStandardId && (
                        <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                          <span className="text-gray-500 italic">(click here to change flanges)</span>
                          <input
                            type="checkbox"
                            checked={entry.hasFlangeOverride || false}
                            onChange={(e) => {
                              const override = e.target.checked;
                              onUpdateEntry(entry.id, {
                                hasFlangeOverride: override,
                                flangeOverrideConfirmed: false,
                                specs: override ? {
                                  ...entry.specs,
                                  // Copy global values to entry specs when enabling override
                                  flangeStandardId: entry.specs.flangeStandardId || globalSpecs?.flangeStandardId,
                                  flangePressureClassId: entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId
                                } : {
                                  ...entry.specs,
                                  flangeStandardId: undefined,
                                  flangePressureClassId: undefined
                                }
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium">Override</span>
                        </label>
                      )}
                    </div>

                    {/* Warning if deviating from recommended pressure class */}
                    {(() => {
                      const currentClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                      const recommendedClassId = globalSpecs?.flangePressureClassId;
                      const isOverride = entry.hasFlangeOverride && currentClassId && recommendedClassId && currentClassId !== recommendedClassId;
                      
                      if (isOverride) {
                        const currentClass = masterData.pressureClasses?.find((p: any) => p.id === currentClassId);
                        const recommendedClass = masterData.pressureClasses?.find((p: any) => p.id === recommendedClassId);
                        return (
                          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <span className="text-red-600 text-base">⚠️</span>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-red-900">Pressure Rating Override</p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  Selected <span className="font-semibold">{currentClass?.designation}</span> instead of recommended{' '}
                                  <span className="font-semibold">{recommendedClass?.designation}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                      <div className="bg-green-50 p-2 rounded-md space-y-2">
                        <p className="text-green-800 text-xs">
                          Using global flange standard from specifications page
                        </p>
                        {/* Display recommended flange specification */}
                        {globalSpecs?.flangePressureClassId && (
                          <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                            <p className="text-blue-800 text-xs font-semibold">
                              Recommended Flange Spec:
                              <span className="ml-1">
                                {(() => {
                                  // Find pressure class designation
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === globalSpecs.flangePressureClassId
                                  );
                                  // Find flange standard code
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === globalSpecs.flangeStandardId
                                  );

                                  if (pressureClass && flangeStandard) {
                                    return `${flangeStandard.code}/${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </p>
                            <p className="text-blue-600 text-xs mt-1">
                              For {entry.specs.workingPressureBar || globalSpecs?.workingPressureBar || 'N/A'} bar working pressure
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Show confirmed override summary when confirmed */}
                        {entry.flangeOverrideConfirmed ? (
                          <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                <span className="text-green-600">✓</span> Item-Specific Flange Confirmed
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: false })}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="bg-white p-2 rounded border border-blue-200">
                              <p className="text-sm font-bold text-blue-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards.find(
                                    (fs: any) => fs.id === entry.specs.flangeStandardId
                                  );
                                  const pressureClass = masterData.pressureClasses.find(
                                    (pc: any) => pc.id === entry.specs.flangePressureClassId
                                  );
                                  if (flangeStandard && pressureClass) {
                                    return `${flangeStandard.code} / ${pressureClass.designation}`;
                                  }
                                  return 'N/A';
                                })()}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                This flange specification is locked for this item only
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const selectedStandard = masterData.flangeStandards?.find(
                                (fs: any) => fs.id === (entry.specs.flangeStandardId || globalSpecs?.flangeStandardId)
                              );
                              const isSabs1123 = selectedStandard?.code?.toUpperCase().includes('SABS') &&
                                                 selectedStandard?.code?.includes('1123');

                              return (
                                <div className={`grid gap-1 ${isSabs1123 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                  <select
                                    value={entry.specs.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                                    onChange={(e) => {
                                      const newFlangeStandardId = e.target.value ? Number(e.target.value) : undefined;
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, flangeStandardId: newFlangeStandardId, flangeTypeCode: undefined, flangePressureClassId: undefined } };
                                      const newDescription = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangeStandardId: newFlangeStandardId, flangeTypeCode: undefined, flangePressureClassId: undefined },
                                        description: newDescription
                                      });
                                      if (newFlangeStandardId && !pressureClassesByStandard[newFlangeStandardId]) {
                                        getFilteredPressureClasses(newFlangeStandardId);
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                    title="Flange Standard"
                                  >
                                    <option value="">Standard...</option>
                                    {masterData.flangeStandards.map((standard: any) => (
                                      <option key={standard.id} value={standard.id}>
                                        {standard.code}
                                      </option>
                                    ))}
                                  </select>

                                  {isSabs1123 ? (
                                    <>
                                      <select
                                        value={entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                        onChange={(e) => {
                                          const newFlangePressureClassId = e.target.value ? Number(e.target.value) : undefined;
                                          const updatedEntry = { ...entry, specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId } };
                                          const newDescription = generateItemDescription(updatedEntry);
                                          onUpdateEntry(entry.id, {
                                            specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId },
                                            description: newDescription
                                          });
                                        }}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        title="Pressure Class (kPa)"
                                      >
                                        <option value="">Class...</option>
                                        {SABS_1123_PRESSURE_CLASSES.map((pc) => {
                                          const matchingPc = masterData.pressureClasses?.find(
                                            (mpc: any) => mpc.designation?.includes(String(pc.value))
                                          );
                                          return matchingPc ? (
                                            <option key={matchingPc.id} value={matchingPc.id}>
                                              {pc.value}
                                            </option>
                                          ) : null;
                                        })}
                                      </select>
                                      <select
                                        value={entry.specs.flangeTypeCode || ''}
                                        onChange={(e) => {
                                          const updatedEntry = { ...entry, specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined } };
                                          const newDescription = generateItemDescription(updatedEntry);
                                          onUpdateEntry(entry.id, {
                                            specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined },
                                            description: newDescription
                                          });
                                        }}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                        title="Flange Type"
                                      >
                                        <option value="">Type...</option>
                                        {SABS_1123_FLANGE_TYPES.map((ft) => (
                                          <option key={ft.code} value={ft.code} title={ft.description}>
                                            {ft.name} ({ft.code})
                                          </option>
                                        ))}
                                      </select>
                                    </>
                                  ) : (
                                    <select
                                      value={entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                      onChange={(e) => {
                                        const newFlangePressureClassId = e.target.value ? Number(e.target.value) : undefined;
                                        const updatedEntry = { ...entry, specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId } };
                                        const newDescription = generateItemDescription(updatedEntry);
                                        onUpdateEntry(entry.id, {
                                          specs: { ...entry.specs, flangePressureClassId: newFlangePressureClassId },
                                          description: newDescription
                                        });
                                      }}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                      title="Pressure Class"
                                      onFocus={() => {
                                        const stdId = entry.specs.flangeStandardId || globalSpecs?.flangeStandardId;
                                        if (stdId && !pressureClassesByStandard[stdId]) {
                                          getFilteredPressureClasses(stdId);
                                        }
                                      }}
                                    >
                                      <option value="">Class...</option>
                                      {(() => {
                                        const stdId = entry.specs.flangeStandardId || globalSpecs?.flangeStandardId;
                                        const filteredClasses = stdId ? pressureClassesByStandard[stdId] : [];
                                        return filteredClasses?.map((pc: any) => (
                                          <option key={pc.id} value={pc.id}>
                                            {pc.designation}
                                          </option>
                                        )) || null;
                                      })()}
                                    </select>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Confirm/Edit Buttons for Override */}
                            {entry.hasFlangeOverride && entry.specs.flangeStandardId && entry.specs.flangePressureClassId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <span>✓</span> Confirm Override
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Reset to global specs
                                    onUpdateEntry(entry.id, {
                                      hasFlangeOverride: false,
                                      flangeOverrideConfirmed: false,
                                      specs: {
                                        ...entry.specs,
                                        flangeStandardId: undefined,
                                        flangePressureClassId: undefined
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                >
                                  Use Global
                                </button>
                              </div>
                            )}

                            {/* Individual Item Flange Specification Display */}
                            {entry.specs.flangeStandardId && entry.specs.flangePressureClassId && !entry.hasFlangeOverride && (
                              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md mt-2">
                                <h5 className="text-sm font-semibold text-blue-800 mb-2">
                                  Item-Specific Flange Specification
                                </h5>
                                <div className="bg-white p-2 rounded border border-blue-200">
                                  <p className="text-sm font-medium text-blue-900">
                                    Selected Specification:
                                    <span className="ml-2 font-bold text-lg text-blue-800">
                                      {(() => {
                                        const flangeStandard = masterData.flangeStandards.find(
                                          (fs: any) => fs.id === entry.specs.flangeStandardId
                                        );
                                        const pressureClass = masterData.pressureClasses.find(
                                          (pc: any) => pc.id === entry.specs.flangePressureClassId
                                        );

                                        if (flangeStandard && pressureClass) {
                                          return `${flangeStandard.code}/${pressureClass.designation}`;
                                        }
                                        return 'N/A';
                                      })()}
                                    </span>
                                  </p>
                                  <div className="text-xs text-blue-600 mt-1 grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="font-medium">Standard:</span> {masterData.flangeStandards.find((fs: any) => fs.id === entry.specs.flangeStandardId)?.code || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Pressure Class:</span> {masterData.pressureClasses.find((pc: any) => pc.id === entry.specs.flangePressureClassId)?.designation || 'N/A'}
                                    </div>
                                  </div>
                                  <p className="text-blue-600 text-xs mt-2">
                                    💡 This item uses individual flange specification (overrides global settings)
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Column 3 - Quantity & Lengths */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 border-b border-purple-500 pb-1.5">
                    Quantity & Lengths
                  </h4>

                  {/* Pipe Lengths */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Length of Each Pipe (m) *
                    </label>
                    <div className="flex gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 6.1;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded border ${entry.specs.individualPipeLength === 6.1 ? 'bg-blue-100 border-blue-300 font-medium text-black' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-black dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600'}`}
                      >
                        6.1m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 9.144;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded border ${entry.specs.individualPipeLength === 9.144 ? 'bg-blue-100 border-blue-300 font-medium text-black' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-black dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600'}`}
                      >
                        9.144m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pipeLength = 12.192;
                          const numPipes = entry.specs.quantityType === 'number_of_pipes'
                            ? (entry.specs.quantityValue || 1)
                            : Math.ceil((entry.specs.quantityValue || pipeLength) / pipeLength);
                          const updatedEntry = { ...entry, specs: { ...entry.specs, individualPipeLength: pipeLength } };
                          const newDescription = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, individualPipeLength: pipeLength },
                            calculatedPipes: numPipes,
                            description: newDescription
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded border ${entry.specs.individualPipeLength === 12.192 ? 'bg-blue-100 border-blue-300 font-medium text-black' : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-black dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600'}`}
                      >
                        12.192m
                      </button>
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
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50"
                      placeholder="Enter custom length"
                    />
                    <p className="mt-0.5 text-xs text-gray-500">
                      Standard: 6.1m, 9.144m, 12.192m
                    </p>
                  </div>

                  {/* Total Length of Line */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Total Length of Line (m) *
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
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50"
                      placeholder="Total pipeline length"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-500">
                      Overall pipeline length required
                    </p>
                  </div>

                  {/* Quantity of Items */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-900 mb-1">
                      Quantity of Items (Each) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={
                        entry.specs.quantityType === 'number_of_pipes'
                          ? entry.specs.quantityValue || 1
                          : entry.specs.individualPipeLength ? Math.ceil((entry.specs.quantityValue || 0) / entry.specs.individualPipeLength) : 0
                      }
                      onChange={(e) => {
                        const numberOfPipes = Number(e.target.value);
                        const updatedEntry = calculateQuantities(entry, 'numberOfPipes', numberOfPipes);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-blue-50"
                      placeholder="Number of pipes"
                      required
                    />
                    <p className="mt-0.5 text-xs text-gray-500">
                      Number of individual pipes
                    </p>
                  </div>

                </div>

              </div>
                  </>
                }
                previewContent={
                  Pipe3DPreview ? (
                    <Pipe3DPreview
                      length={entry.specs.individualPipeLength || 12.192}
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
                    />
                  ) : null
                }
              />

              {/* Remove Item Button */}
              {entries.length > 1 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => onRemoveEntry(entry.id)}
                    className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
                  >
                    Remove Item
                  </button>
                </div>
              )}

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

              {/* Calculation Results - Full Width Compact Layout */}
              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                  📊 Calculation Results
                </h4>

                {entry.calculation ? (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                    {/* Compact horizontal grid layout - equal width columns that fill container */}
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                      {/* Quantity of Pipes - Green for auto-calculated */}
                      <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                        <p className="text-xs text-green-800 font-medium">Qty Pipes</p>
                        <p className="text-lg font-bold text-green-900">{entry.calculation.calculatedPipeCount}</p>
                        <p className="text-xs text-green-600">pieces</p>
                      </div>

                      {/* Total Length - Blue for lengths */}
                      <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                        <p className="text-xs text-blue-800 font-medium">Total Length</p>
                        <p className="text-lg font-bold text-blue-900">{entry.calculation.calculatedTotalLength?.toFixed(1)}m</p>
                      </div>

                      {/* Total System Weight - includes backing ring weight for R/F configs */}
                      {(() => {
                        const configUpper = (entry.specs.pipeEndConfiguration || 'PE').toUpperCase();
                        const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);

                        let backingRingTotalWeight = 0;
                        if (hasRotatingFlange) {
                          const backingRingCountPerPipe = configUpper === 'FOE_RF' ? 1 : configUpper === '2X_RF' ? 2 : 0;
                          const totalBackingRings = backingRingCountPerPipe * (entry.calculation?.calculatedPipeCount || 0);
                          const nb = entry.specs.nominalBoreMm || 100;
                          const ringWeightEach = retainingRingWeight(nb, entry.calculation?.outsideDiameterMm);
                          backingRingTotalWeight = ringWeightEach * totalBackingRings;
                        }

                        const totalWithRings = (entry.calculation.totalSystemWeight || 0) + backingRingTotalWeight;

                        return (
                          <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                            <p className="text-xs text-green-800 font-medium">Total Weight</p>
                            <p className="text-lg font-bold text-green-900">{formatWeight(totalWithRings)}</p>
                            <p className="text-xs text-green-600">
                              (Pipe: {formatWeight(entry.calculation.totalPipeWeight)})
                            </p>
                            {backingRingTotalWeight > 0 && (
                              <p className="text-xs text-amber-600">
                                (incl. {backingRingTotalWeight.toFixed(1)}kg R/F rings)
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Total Flange Weight - Amber for flange info */}
                      <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                        <p className="text-xs text-amber-800 font-medium">Total Flange Weight</p>
                        <p className="text-lg font-bold text-amber-900">{formatWeight(entry.calculation.totalFlangeWeight)}</p>
                        <p className="text-xs text-amber-600">
                          {(() => {
                            const physicalFlanges = getPhysicalFlangeCount(entry.specs.pipeEndConfiguration || 'PE');
                            return physicalFlanges * (entry.calculation?.calculatedPipeCount || 0);
                          })()} flanges
                        </p>
                      </div>

                      {/* Backing Ring Weight - only for R/F configurations */}
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
                            <p className="text-lg font-bold text-orange-900">{totalWeight.toFixed(1)} kg</p>
                            <p className="text-xs text-orange-600">
                              {totalBackingRings} rings × {ringWeightEach.toFixed(2)}kg
                            </p>
                          </div>
                        );
                      })()}

                      {/* Flange Welds - Purple for weld info */}
                      <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                        <p className="text-xs text-purple-800 font-medium">Flange Welds</p>
                        <p className="text-lg font-bold text-purple-900">{entry.calculation.numberOfFlangeWelds}</p>
                        <p className="text-xs text-purple-600">{entry.calculation.totalFlangeWeldLength?.toFixed(2)}m</p>
                        <p className="text-[10px] text-purple-500">(2 per flange: in+out)</p>
                        {(() => {
                          const dn = entry.specs.nominalBoreMm;
                          const schedule = entry.specs.scheduleNumber || '';
                          const pipeWallThickness = entry.specs.wallThicknessMm;
                          if (!dn && !pipeWallThickness) return null;

                          // Check for SABS 719 - use item-level steel spec with global fallback
                          const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                          const isSABS719 = steelSpecId === 8;

                          // Determine fitting class from schedule
                          const scheduleUpper = schedule.toUpperCase();
                          const fittingClass =
                            scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                              ? 'XXH'
                              : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                ? 'XH'
                                : 'STD';

                          // Carbon Steel Weld Fittings wall thickness (ASME B31.1) - for ASTM/ASME only
                          const FITTING_WT: Record<string, Record<number, number>> = {
                            'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53, 750: 9.53, 900: 9.53, 1000: 9.53, 1050: 9.53, 1200: 9.53 },
                            'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70, 750: 12.70, 900: 12.70, 1000: 12.70, 1050: 12.70, 1200: 12.70 },
                            'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                          };

                          // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                          const fittingWt = isSABS719 ? null : (dn ? FITTING_WT[fittingClass]?.[dn] : null);
                          const effectiveWt = isSABS719 ? pipeWallThickness : (fittingWt || pipeWallThickness);
                          const usingPipeThickness = isSABS719 || (!fittingWt && pipeWallThickness);

                          if (!effectiveWt) return null;
                          return (
                            <div className={`mt-1 p-1 ${usingPipeThickness ? 'bg-blue-100' : 'bg-green-100'} rounded`}>
                              <p className={`text-xs font-bold ${usingPipeThickness ? 'text-blue-700' : 'text-green-700'}`}>
                                Weld: {effectiveWt.toFixed(2)}mm
                              </p>
                              <p className={`text-[10px] ${usingPipeThickness ? 'text-blue-600' : 'text-green-600'}`}>
                                {isSABS719 ? 'SABS 719 WT' : (usingPipeThickness ? 'Pipe WT' : fittingClass)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Surface Protection m² - External (only show if surface protection selected) */}
                      {showSurfaceProtection && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                        // Get pressure class - use entry override if available, otherwise global
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

                      {/* Surface Protection m² - Internal (only show if surface protection selected) */}
                      {showSurfaceProtection && entry.calculation?.outsideDiameterMm && entry.specs.wallThicknessMm && (() => {
                        // Get pressure class - use entry override if available, otherwise global
                        const pressureClassId = entry.specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
                        const pressureClassDesignation = pressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === pressureClassId)?.designation
                          : undefined;
                        return (
                          <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                            <p className="text-xs text-purple-700 font-medium">Internal m²</p>
                            <p className="text-lg font-bold text-purple-900">
                              {calculateTotalSurfaceArea({
                                outsideDiameterMm: entry.calculation.outsideDiameterMm,
                                insideDiameterMm: calculateInsideDiameter(entry.calculation.outsideDiameterMm, entry.specs.wallThicknessMm),
                                individualPipeLengthM: entry.specs.individualPipeLength || 0,
                                numberOfPipes: entry.calculation?.calculatedPipeCount || 0,
                                hasFlangeEnd1: (entry.specs.pipeEndConfiguration || 'PE') !== 'PE',
                                hasFlangeEnd2: ['FBE', 'FOE_RF', '2X_RF'].includes(entry.specs.pipeEndConfiguration || 'PE'),
                                dn: entry.specs.nominalBoreMm,
                                pressureClass: pressureClassDesignation,
                              }).total.totalInternalAreaM2.toFixed(2)}
                            </p>
                            <p className="text-xs text-purple-600">lining area</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Weight breakdown (compact) */}
                    {(entry.calculation.totalBoltWeight > 0 || entry.calculation.totalNutWeight > 0) && (
                      <div className="mt-2 flex gap-4 text-xs text-gray-600 justify-center">
                        {entry.calculation.totalBoltWeight > 0 && (
                          <span>Bolts: {formatWeight(entry.calculation.totalBoltWeight)}</span>
                        )}
                        {entry.calculation.totalNutWeight > 0 && (
                          <span>Nuts: {formatWeight(entry.calculation.totalNutWeight)}</span>
                        )}
                      </div>
                    )}

                    {/* Weld Thickness Recommendation */}
                    {(() => {
                      const dn = entry.specs.nominalBoreMm;
                      const pressure = globalSpecs?.workingPressureBar || 0;
                      const temp = entry.specs.workingTemperatureC || globalSpecs?.workingTemperatureC || 20;
                      const schedule = entry.specs.scheduleNumber;

                      if (!dn || !pressure) return null;

                      const recommendation = recommendWallThicknessCarbonPipe(dn, pressure, temp, schedule);
                      if (!recommendation) return null;

                      return (
                        <div className={`mt-3 p-3 rounded-lg border-2 ${recommendation.isAdequate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            {recommendation.isAdequate ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                            <span className={`text-sm font-semibold ${recommendation.isAdequate ? 'text-green-800' : 'text-amber-800'}`}>
                              Weld Thickness Verification
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-gray-600">Design Conditions:</div>
                            <div className="font-medium text-gray-900">{pressure} bar @ {temp}°C</div>
                            <div className="text-gray-600">Recommended Schedule:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedSchedule}</div>
                            <div className="text-gray-600">Recommended Wall:</div>
                            <div className="font-medium text-gray-900">{recommendation.recommendedWallMm.toFixed(2)} mm</div>
                            <div className="text-gray-600">Max Allowable Pressure:</div>
                            <div className="font-medium text-gray-900">{recommendation.maxPressureBar} bar</div>
                            {schedule && (
                              <>
                                <div className="text-gray-600">Selected Schedule:</div>
                                <div className={`font-medium ${recommendation.isAdequate ? 'text-green-700' : 'text-amber-700'}`}>
                                  {schedule} {recommendation.currentWallMm ? `(${recommendation.currentWallMm.toFixed(2)} mm)` : ''}
                                </div>
                              </>
                            )}
                          </div>
                          {recommendation.warning && (
                            <div className="mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                              {recommendation.warning}
                            </div>
                          )}
                          {recommendation.isAdequate && (
                            <div className="mt-2 text-xs text-green-700">
                              Selected schedule meets ASME B31.3 / ASTM A106 requirements
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Surface Area Calculations - Show when surface protection is selected */}
                    {requiredProducts.includes('surface_protection') && entry.specs.outsideDiameterMm && entry.specs.wallThicknessMm && entry.calculation && (
                      (() => {
                        const odMm = entry.specs.outsideDiameterMm;
                        const wtMm = entry.specs.wallThicknessMm;
                        const idMm = calculateInsideDiameter(odMm, wtMm);
                        const pipeEndConfig = entry.specs.pipeEndConfiguration || 'PE';
                        const hasFlangeEnd1 = pipeEndConfig !== 'PE';
                        const hasFlangeEnd2 = ['FBE', 'FOE_RF', '2X_RF'].includes(pipeEndConfig);
                        const individualPipeLengthM = entry.specs.individualPipeLength || 0;
                        const numberOfPipes = entry.calculation.calculatedPipeCount || 0;
                        const dn = entry.specs.nominalBoreMm;

                        const surfaceArea = calculateTotalSurfaceArea({
                          outsideDiameterMm: odMm,
                          insideDiameterMm: idMm,
                          individualPipeLengthM,
                          numberOfPipes,
                          hasFlangeEnd1,
                          hasFlangeEnd2,
                          dn,
                        });

                        const hasExternalCoating = globalSpecs?.externalCoatingConfirmed || globalSpecs?.externalCoatingType;
                        const hasInternalLining = globalSpecs?.internalLiningConfirmed || globalSpecs?.internalLiningType;
                        const showExternal = hasExternalCoating || !hasInternalLining;
                        const showInternal = hasInternalLining || !hasExternalCoating;

                        return (
                          <div className="mt-3 p-3 rounded-lg border-2 bg-indigo-50 border-indigo-200">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-semibold text-indigo-800">
                                Surface Area for Coating
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* External Surface Area */}
                              {showExternal && (
                                <div className="bg-white p-2 rounded border border-indigo-200">
                                  <p className="text-xs font-bold text-indigo-700 mb-1">External Coating Area</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Per Pipe:</span>
                                      <span className="font-medium text-gray-900">{surfaceArea.perPipe.totalExternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Total ({numberOfPipes} pipes):</span>
                                      <span className="font-bold text-indigo-900">{surfaceArea.total.totalExternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    {surfaceArea.perPipe.externalFlangeBackAreaM2 > 0 && (
                                      <div className="text-[10px] text-gray-500 mt-1 border-t pt-1">
                                        Includes flange back: {(surfaceArea.perPipe.externalFlangeBackAreaM2 * numberOfPipes).toFixed(3)} m²
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Internal Surface Area */}
                              {showInternal && (
                                <div className="bg-white p-2 rounded border border-indigo-200">
                                  <p className="text-xs font-bold text-indigo-700 mb-1">Internal Lining Area</p>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Per Pipe:</span>
                                      <span className="font-medium text-gray-900">{surfaceArea.perPipe.totalInternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">Total ({numberOfPipes} pipes):</span>
                                      <span className="font-bold text-indigo-900">{surfaceArea.total.totalInternalAreaM2.toFixed(3)} m²</span>
                                    </div>
                                    {surfaceArea.perPipe.internalFlangeFaceAreaM2 > 0 && (
                                      <div className="text-[10px] text-gray-500 mt-1 border-t pt-1">
                                        Includes flange face: {(surfaceArea.perPipe.internalFlangeFaceAreaM2 * numberOfPipes).toFixed(3)} m²
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Combined total */}
                            {showExternal && showInternal && (
                              <div className="mt-2 pt-2 border-t border-indigo-200 flex justify-between text-xs">
                                <span className="text-gray-600 font-medium">Combined Surface Area:</span>
                                <span className="font-bold text-indigo-900">{surfaceArea.total.totalSurfaceAreaM2.toFixed(3)} m²</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                    <p className="text-sm text-gray-600 text-center">
                      Fill in pipe specifications to see calculated results
                    </p>
                    {/* Debug info */}
                    <p className="text-xs text-gray-400 text-center mt-1">
                      NB={entry.specs.nominalBoreMm || '-'}, Sch={entry.specs.scheduleNumber || '-'}, Length={entry.specs.individualPipeLength || '-'}, Qty={entry.specs.quantityValue || '-'}
                    </p>
                    {entry.specs.nominalBoreMm && entry.specs.scheduleNumber && entry.specs.individualPipeLength && entry.specs.quantityValue && globalSpecs?.workingPressureBar && (
                      <div className="text-center mt-2">
                        <button
                          type="button"
                          onClick={() => onCalculate && onCalculate(entry.id)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Calculate Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
  );
}
