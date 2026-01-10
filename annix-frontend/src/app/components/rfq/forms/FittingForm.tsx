'use client';

import React from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { masterDataApi } from '@/app/lib/api/client';
import {
  FITTING_END_OPTIONS,
  getScheduleListForSpec,
  NB_TO_OD_LOOKUP,
} from '@/app/lib/config/rfq';

export interface FittingFormProps {
  entry: any;
  index: number;
  entries: any[];
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onCalculateFitting?: (id: string) => void;
  openSelects: Record<string, boolean>;
  openSelect: (id: string) => void;
  closeSelect: (id: string) => void;
  focusAndOpenSelect: (id: string, retryCount?: number) => void;
  generateItemDescription: (entry: any) => string;
  Tee3DPreview: React.ComponentType<any>;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
}

const minWallThickness = (nominalBore: number, pressure: number): number => {
  const odLookup: Record<number, number> = {
    15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
    100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
    350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2,
    800: 812.8, 900: 914.4, 1000: 1016.0, 1200: 1219.2
  };
  const od = odLookup[nominalBore] || (nominalBore * 1.05);
  const pressureMpa = pressure * 0.1;
  const allowableStress = 137.9;
  const jointEfficiency = 1.0;
  const safetyFactor = 1.2;
  return (pressureMpa * od * safetyFactor) / (2 * allowableStress * jointEfficiency);
};

const TEE_FITTING_TYPES = ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'];

export default function FittingForm({
  entry,
  index,
  entries,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onCalculateFitting,
  openSelects,
  openSelect,
  closeSelect,
  focusAndOpenSelect,
  generateItemDescription,
  Tee3DPreview,
  pressureClassesByStandard,
  getFilteredPressureClasses,
}: FittingFormProps) {
  const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
  const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

  const sabs62FittingOptions = [
    { value: 'EQUAL_TEE', label: 'Equal Tee' },
    { value: 'UNEQUAL_TEE', label: 'Unequal Tee' },
    { value: 'LATERAL', label: 'Lateral' },
    { value: 'SWEEP_TEE', label: 'Sweep Tee' },
    { value: 'Y_PIECE', label: 'Y-Piece' },
    { value: 'GUSSETTED_TEE', label: 'Gussetted Tee' },
    { value: 'EQUAL_CROSS', label: 'Equal Cross' },
    { value: 'UNEQUAL_CROSS', label: 'Unequal Cross' },
    { value: 'CON_REDUCER', label: 'Concentric Reducer' },
    { value: 'ECCENTRIC_REDUCER', label: 'Eccentric Reducer' },
  ];

  const sabs719FittingOptions = [
    { value: 'SHORT_TEE', label: 'Short Tee (Equal)' },
    { value: 'UNEQUAL_SHORT_TEE', label: 'Short Tee (Unequal)' },
    { value: 'SHORT_REDUCING_TEE', label: 'Short Reducing Tee' },
    { value: 'GUSSET_TEE', label: 'Gusset Tee (Equal)' },
    { value: 'UNEQUAL_GUSSET_TEE', label: 'Gusset Tee (Unequal)' },
    { value: 'GUSSET_REDUCING_TEE', label: 'Gusset Reducing Tee' },
    { value: 'LATERAL', label: 'Lateral' },
    { value: 'DUCKFOOT_SHORT', label: 'Duckfoot (Short)' },
    { value: 'DUCKFOOT_GUSSETTED', label: 'Duckfoot (Gussetted)' },
    { value: 'SWEEP_LONG_RADIUS', label: 'Sweep (Long Radius)' },
    { value: 'SWEEP_MEDIUM_RADIUS', label: 'Sweep (Medium Radius)' },
    { value: 'SWEEP_ELBOW', label: 'Sweep Elbow' },
    { value: 'CON_REDUCER', label: 'Concentric Reducer' },
    { value: 'ECCENTRIC_REDUCER', label: 'Eccentric Reducer' },
  ];

  const fittingOptions = effectiveStandard === 'SABS62' ? sabs62FittingOptions : sabs719FittingOptions;

  const sizeOptions = effectiveStandard === 'SABS719'
    ? [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
    : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];

  const fetchFittingDimensions = async (fittingType: string, nominalDiameter: number, angleRange?: string) => {
    try {
      const dims = await masterDataApi.getFittingDimensions(
        effectiveStandard as 'SABS62' | 'SABS719',
        fittingType,
        nominalDiameter,
        angleRange
      );
      if (dims) {
        const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
        const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
        const updates: any = { specs: { ...entry.specs } };
        if (dimA && !entry.specs?.pipeLengthAOverride) {
          updates.specs.pipeLengthAMm = dimA;
          updates.specs.pipeLengthAMmAuto = dimA;
        }
        if (dimB && !entry.specs?.pipeLengthBOverride) {
          updates.specs.pipeLengthBMm = dimB;
          updates.specs.pipeLengthBMmAuto = dimB;
        }
        onUpdateEntry(entry.id, updates);
      }
    } catch (err) {
      console.log('Could not fetch fitting dimensions:', err);
    }
  };

  return (
    <SplitPaneLayout
      entryId={entry.id}
      itemType="fitting"
      showSplitToggle={entry.specs?.fittingType && TEE_FITTING_TYPES.includes(entry.specs?.fittingType)}
      formContent={
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-900 mb-1">
              Item Description *
            </label>
            <textarea
              value={entry.description || generateItemDescription(entry)}
              onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
              rows={2}
              placeholder="e.g., 100NB Short Equal Tee Sch40 SABS719"
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
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  Reset to Auto-generated
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                Fitting Specifications
              </h4>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Fitting Standard *
                  {(() => {
                    const derived = isSABS719 ? 'SABS719' : 'SABS62';
                    const hasGlobal = !!globalSpecs?.steelSpecificationId;
                    const current = entry.specs?.fittingStandard || derived;
                    if (hasGlobal && current === derived) return <span className="text-green-600 text-xs ml-2 font-normal">(From Steel Spec)</span>;
                    if (hasGlobal && current !== derived) return <span className="text-blue-600 text-xs ml-2 font-normal">(Override)</span>;
                    return null;
                  })()}
                </label>
                {(() => {
                  const selectId = `fitting-standard-${entry.id}`;
                  const derivedStandard = isSABS719 ? 'SABS719' : 'SABS62';
                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.fittingStandard || derivedStandard}
                      onChange={(newStandard) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, fittingStandard: newStandard as 'SABS62' | 'SABS719', nominalDiameterMm: undefined, scheduleNumber: undefined }
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);

                        if (!entry.specs?.fittingType) {
                          setTimeout(() => focusAndOpenSelect(`fitting-type-${entry.id}`), 100);
                        } else {
                          setTimeout(() => focusAndOpenSelect(`fitting-nb-${entry.id}`), 100);
                        }
                      }}
                      options={[
                        { value: 'SABS62', label: 'SABS62 (Standard Fittings)' },
                        { value: 'SABS719', label: 'SABS719 (Fabricated Fittings)' }
                      ]}
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Fitting Type *
                </label>
                {(() => {
                  const selectId = `fitting-type-${entry.id}`;
                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.fittingType || ''}
                      onChange={(fittingType) => {
                        if (!fittingType) return;
                        const updatedEntry = {
                          ...entry,
                          specs: {
                            ...entry.specs,
                            fittingType,
                          }
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);

                        if (entry.specs?.nominalDiameterMm) {
                          fetchFittingDimensions(fittingType, entry.specs.nominalDiameterMm);
                        }

                        setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);

                        if (!entry.specs?.nominalDiameterMm) {
                          setTimeout(() => focusAndOpenSelect(`fitting-nb-${entry.id}`), 100);
                        }
                      }}
                      options={fittingOptions}
                      placeholder="Select fitting type..."
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Nominal Diameter (mm) *
                  {globalSpecs?.steelSpecificationId && (
                    <span className="text-green-600 text-xs ml-2">(From Steel Spec)</span>
                  )}
                </label>
                {(() => {
                  const selectId = `fitting-nb-${entry.id}`;
                  const options = sizeOptions.map((nb: number) => ({ value: String(nb), label: `${nb}mm` }));

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.nominalDiameterMm ? String(entry.specs.nominalDiameterMm) : ''}
                      onChange={(selectedValue) => {
                        if (!selectedValue) return;

                        const nominalDiameter = parseInt(selectedValue, 10);
                        if (isNaN(nominalDiameter)) return;

                        let matchedSchedule = entry.specs?.scheduleNumber;
                        let matchedWT = entry.specs?.wallThicknessMm;

                        if (effectiveStandard === 'SABS719' && globalSpecs?.workingPressureBar) {
                          const effectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const availableSchedules = getScheduleListForSpec(nominalDiameter, effectiveSpecId);
                          if (availableSchedules.length > 0) {
                            const minWT = minWallThickness(nominalDiameter, globalSpecs.workingPressureBar);
                            const sorted = [...availableSchedules].sort((a: any, b: any) =>
                              (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0)
                            );
                            const suitable = sorted.find((s: any) => (s.wallThicknessMm || 0) >= minWT);
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

                        const newSpecs = {
                          ...entry.specs,
                          nominalDiameterMm: nominalDiameter,
                          scheduleNumber: matchedSchedule,
                          wallThicknessMm: matchedWT
                        };
                        const immediateEntry = { ...entry, specs: newSpecs };
                        immediateEntry.description = generateItemDescription(immediateEntry);
                        onUpdateEntry(entry.id, immediateEntry);

                        if (entry.specs?.fittingType) {
                          fetchFittingDimensions(entry.specs.fittingType, nominalDiameter);
                        }

                        setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                      }}
                      options={options}
                      placeholder="Select diameter..."
                      open={openSelects[selectId] || false}
                      onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                    />
                  );
                })()}
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
                    setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                Configuration
              </h4>

              {effectiveStandard === 'SABS719' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Schedule *
                    {globalSpecs?.workingPressureBar ? (
                      <span className="text-green-600 text-xs ml-2">(Auto)</span>
                    ) : (
                      <span className="text-orange-600 text-xs ml-2">(Manual)</span>
                    )}
                  </label>
                  {(() => {
                    const selectId = `fitting-schedule-${entry.id}`;
                    const nbValue = entry.specs?.nominalDiameterMm || 0;
                    const fitEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                    const allSchedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId);

                    const options = allSchedules.length > 0
                      ? allSchedules.map((dim: any) => ({
                          value: dim.scheduleDesignation || dim.scheduleNumber?.toString(),
                          label: `${dim.scheduleDesignation || dim.scheduleNumber?.toString()} (${dim.wallThicknessMm}mm)`
                        }))
                      : [
                          { value: '10', label: 'Sch 10' },
                          { value: '40', label: 'Sch 40' },
                          { value: '80', label: 'Sch 80' },
                          { value: '160', label: 'Sch 160' },
                        ];

                    return (
                      <Select
                        id={selectId}
                        value={entry.specs?.scheduleNumber || ''}
                        onChange={(scheduleNumber) => {
                          if (!scheduleNumber) return;
                          const schedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId);
                          const matchingSchedule = schedules.find((s: any) =>
                            (s.scheduleDesignation || s.scheduleNumber?.toString()) === scheduleNumber
                          );
                          const wallThickness = matchingSchedule?.wallThicknessMm;

                          const updatedEntry = {
                            ...entry,
                            specs: {
                              ...entry.specs,
                              scheduleNumber,
                              wallThicknessMm: wallThickness
                            }
                          };
                          updatedEntry.description = generateItemDescription(updatedEntry);
                          onUpdateEntry(entry.id, updatedEntry);
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        options={options}
                        placeholder="Select Schedule"
                        open={openSelects[selectId] || false}
                        onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                      />
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Pipe End Configuration
                </label>
                {(() => {
                  const selectId = `fitting-end-config-${entry.id}`;
                  const options = FITTING_END_OPTIONS.map(opt => ({
                    value: opt.value,
                    label: opt.label
                  }));

                  return (
                    <Select
                      id={selectId}
                      value={entry.specs?.pipeEndConfiguration || 'PE'}
                      onChange={(newConfig) => {
                        const updatedEntry = {
                          ...entry,
                          specs: { ...entry.specs, pipeEndConfiguration: newConfig }
                        };
                        updatedEntry.description = generateItemDescription(updatedEntry);
                        onUpdateEntry(entry.id, updatedEntry);
                        setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                      }}
                      options={options}
                      placeholder="Select End Configuration"
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
        <Tee3DPreview
          nominalBore={entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm}
          outerDiameter={entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[entry.specs?.nominalDiameterMm] || (entry.specs?.nominalDiameterMm * 1.05)}
          wallThickness={entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm || 5}
          fittingType={entry.specs?.fittingType || 'SHORT_TEE'}
          branchDiameter={entry.specs?.branchNominalDiameterMm}
          pipeALength={entry.specs?.pipeLengthAMm}
          pipeBLength={entry.specs?.pipeLengthBMm}
          schedule={entry.specs?.scheduleNumber}
          materialName={masterData.steelSpecs?.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
          flangeConfig={entry.specs?.pipeEndConfiguration || 'PE'}
        />
      }
    />
  );
}
