'use client';

import React from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import {
  PIPE_END_OPTIONS,
  getScheduleListForSpec,
  NB_TO_OD_LOOKUP,
} from '@/app/lib/config/rfq';
import {
  calculateMinWallThickness,
  findRecommendedSchedule,
} from '@/app/lib/utils/pipeCalculations';

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
  Pipe3DPreview: React.ComponentType<any>;
  nominalBores: number[];
  availableSchedulesMap: Record<string, any[]>;
  setAvailableSchedulesMap: (fn: (prev: Record<string, any[]>) => Record<string, any[]>) => void;
  fetchAvailableSchedules: (entryId: string, steelSpecId: number, nominalBore: number) => void;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
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
}: StraightPipeFormProps) {
  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;

  const handleNominalBoreChange = (value: string) => {
    const nominalBore = Number(value);
    if (!nominalBore) return;

    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || 2;
    const pressure = globalSpecs?.workingPressureBar || 0;
    const temperature = globalSpecs?.workingTemperatureC || 20;

    const nbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
    const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId);

    if (schedules.length > 0) {
      setAvailableSchedulesMap((prev: Record<string, any[]>) => ({
        ...prev,
        [entry.id]: schedules
      }));
    }

    let matchedSchedule: string | null = null;
    let matchedWT = 0;
    let minWT = 0;

    if (schedules.length > 0) {
      if (pressure > 0) {
        const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
        const materialCode = steelSpecId === 1 ? 'ASTM_A53_Grade_B' : 'ASTM_A106_Grade_B';
        minWT = calculateMinWallThickness(od, pressure, materialCode, temperature, 1.0, 0, 1.2);

        const recommendation = findRecommendedSchedule(schedules, od, pressure, materialCode, temperature, 1.2);

        if (recommendation.schedule) {
          matchedSchedule = recommendation.schedule.scheduleDesignation;
          matchedWT = recommendation.schedule.wallThicknessMm;
        } else {
          const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
          matchedSchedule = sorted[0].scheduleDesignation;
          matchedWT = sorted[0].wallThicknessMm;
        }
      } else {
        const sorted = [...schedules].sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);
        matchedSchedule = sorted[0].scheduleDesignation;
        matchedWT = sorted[0].wallThicknessMm;
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
    onUpdateEntry(entry.id, updatedEntry);
    fetchAvailableSchedules(entry.id, steelSpecId, nominalBore);
  };

  return (
    <SplitPaneLayout
      entryId={entry.id}
      itemType="straight_pipe"
      showSplitToggle={entry.specs?.nominalBoreMm}
      formContent={
        <>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-blue-500 pb-1.5">
                Pipe Specifications
              </h4>

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
                    const options = masterData.steelSpecs?.map((spec: any) => ({
                      value: String(spec.id),
                      label: spec.steelSpecName
                    })) || [];

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
                        options={options}
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
              </div>

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

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.nominalBoreMm ? String(entry.specs.nominalBoreMm) : ''}
                      onChange={handleNominalBoreChange}
                      options={options}
                      placeholder={isLoadingNominalBores ? 'Loading available sizes...' : 'Please Select NB'}
                      disabled={isLoadingNominalBores}
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
                {errors[`pipe_${index}_nb`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`pipe_${index}_nb`]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Schedule/Wall Thickness
                  {globalSpecs?.workingPressureBar ? (
                    <span className="text-green-600 text-xs ml-2">(Auto)</span>
                  ) : (
                    <span className="text-orange-600 text-xs ml-2">(Manual)</span>
                  )}
                </label>
                {(() => {
                  const selectId = `pipe-schedule-${entry.id}`;
                  const fallbackEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                  const fallbackSchedules = getScheduleListForSpec(entry.specs?.nominalBoreMm || 0, fallbackEffectiveSpecId);
                  const mapSchedules = availableSchedulesMap[entry.id] || [];
                  const allSchedules = fallbackSchedules.length > 0 ? fallbackSchedules : mapSchedules;
                  const minimumWT = entry.minimumWallThickness || 0;

                  const eligibleSchedules = allSchedules
                    .filter((dim: any) => (dim.wallThicknessMm || 0) >= minimumWT)
                    .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));

                  const options = eligibleSchedules.map((dim: any, idx: number) => {
                    const scheduleValue = dim.scheduleDesignation || dim.scheduleNumber?.toString() || 'Unknown';
                    const wt = dim.wallThicknessMm || 0;
                    const isRecommended = idx === 0;
                    const label = isRecommended
                      ? `${scheduleValue} (${wt}mm) - RECOMMENDED`
                      : `${scheduleValue} (${wt}mm)`;
                    return { value: scheduleValue, label };
                  });

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.scheduleNumber || ''}
                      onChange={(newSchedule) => {
                        if (!newSchedule) return;
                        const selectedDimension = allSchedules.find((dim: any) =>
                          (dim.scheduleDesignation || dim.scheduleNumber?.toString()) === newSchedule
                        );
                        const autoWallThickness = selectedDimension?.wallThicknessMm;

                        const updatedEntry: any = {
                          ...entry,
                          specs: {
                            ...entry.specs,
                            scheduleNumber: newSchedule,
                            wallThicknessMm: autoWallThickness || entry.specs?.wallThicknessMm
                          },
                          isScheduleOverridden: newSchedule !== entry.minimumSchedule
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                      }}
                      options={options}
                      placeholder={entry.specs?.nominalBoreMm ? 'Select schedule...' : 'Select NB first'}
                      disabled={!entry.specs?.nominalBoreMm}
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
                {entry.specs?.wallThicknessMm && (
                  <p className="text-xs text-green-700 mt-0.5">
                    Wall thickness: {entry.specs.wallThicknessMm}mm
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Length (mm) *
                </label>
                <input
                  type="number"
                  value={entry.specs?.lengthMm || ''}
                  onChange={(e) => {
                    const updatedEntry = {
                      ...entry,
                      specs: { ...entry.specs, lengthMm: Number(e.target.value) }
                    };
                    updatedEntry.description = generateItemDescription(updatedEntry);
                    onUpdateEntry(entry.id, updatedEntry);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="e.g., 6000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={entry.specs?.quantityValue || 1}
                  onChange={(e) => {
                    onUpdateEntry(entry.id, {
                      specs: { ...entry.specs, quantityValue: Number(e.target.value) }
                    });
                    setTimeout(() => onCalculate && onCalculate(entry.id), 100);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-blue-500 pb-1.5">
                Pipe End Configuration
              </h4>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  End 1 Configuration
                </label>
                {(() => {
                  const selectId = `pipe-end1-config-${entry.id}`;
                  const options = PIPE_END_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label
                  }));

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.pipeEnd1Configuration || 'PE'}
                      onChange={(newConfig) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, pipeEnd1Configuration: newConfig }
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        setTimeout(() => onCalculate && onCalculate(entry.id), 100);
                      }}
                      options={options}
                      placeholder="Select End 1 Configuration"
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  End 2 Configuration
                </label>
                {(() => {
                  const selectId = `pipe-end2-config-${entry.id}`;
                  const options = PIPE_END_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label
                  }));

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.pipeEnd2Configuration || 'PE'}
                      onChange={(newConfig) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, pipeEnd2Configuration: newConfig }
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        setTimeout(() => onCalculate && onCalculate(entry.id), 100);
                      }}
                      options={options}
                      placeholder="Select End 2 Configuration"
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
              </div>
            </div>
          </div>

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
        </>
      }
      previewContent={
        <Pipe3DPreview
          nominalBore={entry.specs?.nominalBoreMm}
          outerDiameter={entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[entry.specs?.nominalBoreMm] || (entry.specs?.nominalBoreMm * 1.05)}
          wallThickness={entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm || 5}
          length={entry.specs?.lengthMm || 1000}
          schedule={entry.specs?.scheduleNumber}
          materialName={masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId)?.steelSpecName}
          end1Config={entry.specs?.pipeEnd1Configuration || 'PE'}
          end2Config={entry.specs?.pipeEnd2Configuration || 'PE'}
        />
      }
    />
  );
}
