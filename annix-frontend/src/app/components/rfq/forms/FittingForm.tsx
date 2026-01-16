'use client';

import React from 'react';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import { getPipeEndConfigurationDetails } from '@/app/lib/utils/systemUtils';
import { masterDataApi } from '@/app/lib/api/client';
import { log } from '@/app/lib/logger';
import {
  FITTING_END_OPTIONS,
  getScheduleListForSpec,
  weldCountPerFitting as getWeldCountPerFitting,
  fittingFlangeConfig as getFittingFlangeConfig,
  hasLooseFlange,
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
  Tee3DPreview?: React.ComponentType<any> | null;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  requiredProducts?: string[];
}

const getMinimumWallThickness = (nominalBore: number, pressure: number): number => {
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

export default function FittingForm({
  entry,
  index: _index,
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
  requiredProducts = [],
}: FittingFormProps) {
  return (
    <>
              <SplitPaneLayout
                entryId={entry.id}
                itemType="fitting"
                showSplitToggle={entry.specs?.fittingType && ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'].includes(entry.specs?.fittingType)}
                formContent={
                  <>
                {/* Item Description */}
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

                {/* Fitting Specifications Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Column 1 - Basic Specs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Fitting Specifications
                    </h4>

                    {/* Fitting Standard - Auto from Global Steel Spec (ID 8 = SABS 719), can be overridden */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Standard *
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard || derived;
                          if (hasGlobal && current === derived) return <span className="text-green-600 text-xs ml-2 font-normal">(From Steel Spec)</span>;
                          if (hasGlobal && current !== derived) return <span className="text-blue-600 text-xs ml-2 font-normal">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      <div className="flex gap-2">
                        {(() => {
                          const selectId = `fitting-standard-${entry.id}`;
                          const derivedStandard = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8 ? 'SABS719' : 'SABS62';
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
                              className="flex-1"
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => {
                                if (open) {
                                  openSelect(selectId);
                                } else {
                                  closeSelect(selectId);
                                  setTimeout(() => focusAndOpenSelect(`fitting-type-${entry.id}`), 150);
                                }
                              }}
                            />
                          );
                        })()}
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard;
                          if (hasGlobal && current && current !== derived) {
                            return (
                              <button
                                type="button"
                                onClick={() => onUpdateEntry(entry.id, { specs: { ...entry.specs, fittingStandard: undefined, nominalDiameterMm: undefined } })}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                              >
                                Reset
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(entry.specs?.fittingStandard || ((entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8 ? 'SABS719' : 'SABS62')) === 'SABS719'
                          ? 'Uses pipe table for cut lengths, tee/lateral weld + flange welds'
                          : 'Uses standard fitting dimensions from tables'}
                      </p>
                    </div>

                    {/* Fitting Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting Type *
                      </label>
                      {(() => {
                        const selectId = `fitting-type-${entry.id}`;
                        const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                        const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                        const sabs62Options = [
                          { value: 'EQUAL_TEE', label: 'Equal Tee' },
                          { value: 'UNEQUAL_TEE', label: 'Unequal Tee' },
                          { value: 'LATERAL', label: 'Lateral' },
                          { value: 'SWEEP_TEE', label: 'Sweep Tee' },
                          { value: 'Y_PIECE', label: 'Y-Piece' },
                          { value: 'GUSSETTED_TEE', label: 'Gussetted Tee' },
                          { value: 'EQUAL_CROSS', label: 'Equal Cross' },
                          { value: 'UNEQUAL_CROSS', label: 'Unequal Cross' },
                        ];
                        const sabs719Options = [
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
                        ];
                        const commonOptions = [
                          { value: 'CON_REDUCER', label: 'Concentric Reducer' },
                          { value: 'ECCENTRIC_REDUCER', label: 'Eccentric Reducer' },
                        ];
                        const options = effectiveStandard === 'SABS62'
                          ? [...sabs62Options, ...commonOptions]
                          : [...sabs719Options, ...commonOptions];

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.fittingType || ''}
                            onChange={(fittingType) => {
                              if (!fittingType) return;

                              const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType);
                              const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType);

                              const updatedEntry = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  fittingType,
                                  branchNominalDiameterMm: isReducingTee ? entry.specs?.branchNominalDiameterMm : undefined,
                                  stubLocation: isEqualTee ? undefined : entry.specs?.stubLocation,
                                  pipeLengthAOverride: isEqualTee ? false : entry.specs?.pipeLengthAOverride,
                                  pipeLengthBOverride: isEqualTee ? false : entry.specs?.pipeLengthBOverride
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (fittingType && entry.specs?.nominalDiameterMm) {
                                masterDataApi.getFittingDimensions(
                                  effectiveStandard as 'SABS62' | 'SABS719',
                                  fittingType,
                                  entry.specs.nominalDiameterMm,
                                  entry.specs?.angleRange
                                ).then((dims) => {
                                  if (dims) {
                                    const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                    const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                    const pipeUpdates: Record<string, unknown> = {};
                                    if (dimA && (isEqualTee || !entry.specs?.pipeLengthAOverride)) {
                                      pipeUpdates.pipeLengthAMm = dimA;
                                      pipeUpdates.pipeLengthAMmAuto = dimA;
                                    }
                                    if (dimB && (isEqualTee || !entry.specs?.pipeLengthBOverride)) {
                                      pipeUpdates.pipeLengthBMm = dimB;
                                      pipeUpdates.pipeLengthBMmAuto = dimB;
                                    }
                                    if (Object.keys(pipeUpdates).length > 0) {
                                      onUpdateEntry(entry.id, { specs: pipeUpdates });
                                    }
                                  }
                                }).catch((err) => {
                                  log.debug('Could not fetch fitting dimensions:', err);
                                });
                              }

                              setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);

                              if (fittingType && !entry.specs?.nominalDiameterMm) {
                                setTimeout(() => focusAndOpenSelect(`fitting-nb-${entry.id}`), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select fitting type..."
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>

                    {/* Nominal Diameter - Linked to Steel Specification */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Diameter (mm) *
                        {globalSpecs?.steelSpecificationId && (
                          <span className="text-green-600 text-xs ml-2">(From Steel Spec)</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `fitting-nb-${entry.id}`;
                        const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                        const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                        const sizes = effectiveStandard === 'SABS719'
                          ? [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                          : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];
                        const options = sizes.map((nb: number) => ({ value: String(nb), label: `${nb}mm` }));

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
                                const effectiveSpecId2 = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const availableSchedules = getScheduleListForSpec(nominalDiameter, effectiveSpecId2);
                                if (availableSchedules.length > 0) {
                                  const minWT = getMinimumWallThickness(nominalDiameter, globalSpecs.workingPressureBar);
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

                              const fittingType = entry.specs?.fittingType;
                              const angleRange = entry.specs?.angleRange;
                              const pipeLengthAOverride = entry.specs?.pipeLengthAOverride;
                              const pipeLengthBOverride = entry.specs?.pipeLengthBOverride;

                              if (fittingType && nominalDiameter) {
                                masterDataApi.getFittingDimensions(
                                  effectiveStandard as 'SABS62' | 'SABS719',
                                  fittingType,
                                  nominalDiameter,
                                  angleRange
                                ).then((dims) => {
                                  if (dims) {
                                    const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                    const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                    const pipeUpdates: Record<string, unknown> = {};
                                    if (dimA && !pipeLengthAOverride) {
                                      pipeUpdates.pipeLengthAMm = dimA;
                                      pipeUpdates.pipeLengthAMmAuto = dimA;
                                    }
                                    if (dimB && !pipeLengthBOverride) {
                                      pipeUpdates.pipeLengthBMm = dimB;
                                      pipeUpdates.pipeLengthBMmAuto = dimB;
                                    }
                                    if (Object.keys(pipeUpdates).length > 0) {
                                      onUpdateEntry(entry.id, { specs: pipeUpdates });
                                    }
                                  }
                                }).catch((err) => {
                                  log.debug('Could not fetch fitting dimensions:', err);
                                });
                              }

                              setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);

                              const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(entry.specs?.fittingType || '');
                              const isSABS719Fitting = effectiveStandard === 'SABS719';
                              if (nominalDiameter && isReducingTee && !entry.specs?.branchNominalDiameterMm) {
                                setTimeout(() => focusAndOpenSelect(`fitting-branch-nb-${entry.id}`), 100);
                              } else if (nominalDiameter && isSABS719Fitting && !matchedSchedule) {
                                setTimeout(() => focusAndOpenSelect(`fitting-schedule-${entry.id}`), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select diameter..."
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                      {(() => {
                        const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                        const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                        const sizes = effectiveStandard === 'SABS719'
                          ? [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                          : [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150];
                        return (
                          <p className="mt-1 text-xs text-gray-500">
                            {sizes.length} sizes available ({effectiveStandard})
                          </p>
                        );
                      })()}
                    </div>

                    {/* Branch Nominal Diameter - For Reducing Tees */}
                    {(entry.specs?.fittingType === 'SHORT_REDUCING_TEE' || entry.specs?.fittingType === 'GUSSET_REDUCING_TEE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Branch Nominal Diameter (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Tee Outlet Size)</span>
                        </label>
                        {(() => {
                          const selectId = `fitting-branch-nb-${entry.id}`;
                          const mainNB = entry.specs?.nominalDiameterMm || 0;
                          const sizes = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
                            .filter(nb => nb < mainNB);
                          const options = sizes.map((nb: number) => ({ value: String(nb), label: `${nb}mm` }));

                          return (
                            <Select
                              id={selectId}
                              value={entry.specs?.branchNominalDiameterMm ? String(entry.specs.branchNominalDiameterMm) : ''}
                              onChange={(value) => {
                                if (!value) return;
                                const branchDiameter = Number(value);
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    branchNominalDiameterMm: branchDiameter
                                  }
                                });
                                setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                              }}
                              options={options}
                              placeholder="Select branch diameter..."
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                            />
                          );
                        })()}
                        <p className="mt-1 text-xs text-gray-500">
                          Branch/outlet size must be smaller than main pipe ({entry.specs?.nominalDiameterMm || '--'}mm)
                        </p>
                      </div>
                    )}

                    {/* Pipe Lengths - Auto-filled from fitting dimensions */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      const fittingType = entry.specs?.fittingType;
                      const nb = entry.specs?.nominalDiameterMm;
                      const hasRequiredData = fittingType && nb;
                      const isAutoA = entry.specs?.pipeLengthAMmAuto && !entry.specs?.pipeLengthAOverride;
                      const isAutoB = entry.specs?.pipeLengthBMmAuto && !entry.specs?.pipeLengthBOverride;

                      // Equal tees use standard C/F from tables only - no length/location customization
                      const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType || '');

                      // Function to fetch and set dimensions
                      const fetchDimensions = async () => {
                        if (!fittingType || !nb) return;
                        try {
                          const dims = await masterDataApi.getFittingDimensions(effectiveStandard as 'SABS62' | 'SABS719', fittingType, nb, entry.specs?.angleRange);
                          if (dims) {
                            // Parse string values to numbers (API returns decimal strings)
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
                          log.debug('Could not fetch fitting dimensions:', err);
                        }
                      };

                      // Auto-fetch for equal tees when data is available but lengths are not set
                      if (isEqualTee && hasRequiredData && !entry.specs?.pipeLengthAMm && !entry.specs?.pipeLengthBMm) {
                        fetchDimensions();
                      }

                      return (
                        <>
                          {/* Pipe Length A */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-gray-900">
                                Pipe Length A (mm) *
                                {isEqualTee && <span className="text-gray-500 text-xs ml-1 font-normal">(Standard C/F)</span>}
                                {!isEqualTee && isAutoA && <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>}
                                {!isEqualTee && entry.specs?.pipeLengthAOverride && <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>}
                              </label>
                              {!isEqualTee && hasRequiredData && !entry.specs?.pipeLengthAMmAuto && (
                                <button
                                  type="button"
                                  onClick={fetchDimensions}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Fetch
                                </button>
                              )}
                              {!isEqualTee && entry.specs?.pipeLengthAOverride && entry.specs?.pipeLengthAMmAuto && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, pipeLengthAMm: entry.specs?.pipeLengthAMmAuto, pipeLengthAOverride: false }
                                  })}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={entry.specs?.pipeLengthAMm || ''}
                              onChange={(e) => {
                                if (isEqualTee) return; // Don't allow changes for equal tees
                                const newValue = Number(e.target.value);
                                const isOverride = entry.specs?.pipeLengthAMmAuto && newValue !== entry.specs?.pipeLengthAMmAuto;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, pipeLengthAMm: newValue, pipeLengthAOverride: isOverride }
                                });
                              }}
                              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                isEqualTee
                                  ? 'bg-green-100 border-green-400 text-green-900 cursor-not-allowed font-medium'
                                  : 'border-gray-300 focus:ring-green-500 text-gray-900'
                              }`}
                              placeholder="e.g., 1000"
                              min="0"
                              readOnly={isEqualTee}
                            />
                            {isEqualTee && entry.specs?.pipeLengthAMm && (
                              <p className="mt-0.5 text-xs text-green-700">Standard C/F dimension from tables</p>
                            )}
                          </div>

                          {/* Pipe Length B */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-xs font-semibold text-gray-900">
                                Pipe Length B (mm) *
                                {isEqualTee && <span className="text-gray-500 text-xs ml-1 font-normal">(Standard C/F)</span>}
                                {!isEqualTee && isAutoB && <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>}
                                {!isEqualTee && entry.specs?.pipeLengthBOverride && <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>}
                              </label>
                              {!isEqualTee && entry.specs?.pipeLengthBOverride && entry.specs?.pipeLengthBMmAuto && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, {
                                    specs: { ...entry.specs, pipeLengthBMm: entry.specs?.pipeLengthBMmAuto, pipeLengthBOverride: false }
                                  })}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={entry.specs?.pipeLengthBMm || ''}
                              onChange={(e) => {
                                if (isEqualTee) return; // Don't allow changes for equal tees
                                const newValue = Number(e.target.value);
                                const isOverride = entry.specs?.pipeLengthBMmAuto && newValue !== entry.specs?.pipeLengthBMmAuto;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, pipeLengthBMm: newValue, pipeLengthBOverride: isOverride }
                                });
                              }}
                              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                isEqualTee
                                  ? 'bg-green-100 border-green-400 text-green-900 cursor-not-allowed font-medium'
                                  : 'border-gray-300 focus:ring-green-500 text-gray-900'
                              }`}
                              placeholder="e.g., 1000"
                              min="0"
                              readOnly={isEqualTee}
                            />
                            {isEqualTee && entry.specs?.pipeLengthBMm && (
                              <p className="mt-0.5 text-xs text-green-700">Standard C/F dimension from tables</p>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Angle Range (for Laterals and Y-Pieces) */}
                    {(entry.specs?.fittingType === 'LATERAL' || entry.specs?.fittingType === 'Y_PIECE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Angle Range *
                        </label>
                        <select
                          value={entry.specs?.angleRange || ''}
                          onChange={async (e) => {
                            const angleRange = e.target.value;
                            const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                            const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');

                            // Fetch fitting dimensions for pipe lengths with new angle
                            let pipeLengthA = entry.specs?.pipeLengthAMm;
                            let pipeLengthB = entry.specs?.pipeLengthBMm;
                            let pipeLengthAMmAuto = entry.specs?.pipeLengthAMmAuto;
                            let pipeLengthBMmAuto = entry.specs?.pipeLengthBMmAuto;

                            if (entry.specs?.fittingType && entry.specs?.nominalDiameterMm && angleRange) {
                              try {
                                const dims = await masterDataApi.getFittingDimensions(
                                  effectiveStandard as 'SABS62' | 'SABS719',
                                  entry.specs.fittingType,
                                  entry.specs.nominalDiameterMm,
                                  angleRange
                                );
                                if (dims) {
                                  // Parse string values to numbers (API returns decimal strings)
                                  const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                                  const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;
                                  if (dimA && !entry.specs?.pipeLengthAOverride) {
                                    pipeLengthA = dimA;
                                    pipeLengthAMmAuto = dimA;
                                  }
                                  if (dimB && !entry.specs?.pipeLengthBOverride) {
                                    pipeLengthB = dimB;
                                    pipeLengthBMmAuto = dimB;
                                  }
                                }
                              } catch (err) {
                                log.debug('Could not fetch fitting dimensions:', err);
                              }
                            }

                            onUpdateEntry(entry.id, {
                              specs: {
                                ...entry.specs,
                                angleRange,
                                pipeLengthAMm: pipeLengthA,
                                pipeLengthBMm: pipeLengthB,
                                pipeLengthAMmAuto,
                                pipeLengthBMmAuto
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        >
                          <option value="">Select angle range...</option>
                          <option value="60-90">60° - 90°</option>
                          <option value="45-59">45° - 59°</option>
                          <option value="30-44">30° - 44°</option>
                        </select>
                      </div>
                    )}

                    {/* Degrees (for Laterals) */}
                    {entry.specs?.fittingType === 'LATERAL' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Degrees *
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.degrees || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, degrees: Number(e.target.value) }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          placeholder="e.g., 45, 60, 90"
                          min="30"
                          max="90"
                        />
                      </div>
                    )}

                    {/* Quantity */}
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
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Column 2 - Configuration & Ends */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      📐 Configuration
                    </h4>

                    {/* Schedule - Required for SABS719 fabricated fittings */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      return effectiveStandard === 'SABS719';
                    })() && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Schedule *
                          {globalSpecs?.workingPressureBar ? (
                            <span className="text-green-600 text-xs ml-2">(Automated)</span>
                          ) : (
                            <span className="text-orange-600 text-xs ml-2">(Manual)</span>
                          )}
                        </label>
                        {(() => {
                          const selectId = `fitting-schedule-${entry.id}`;
                          const nbValue = entry.specs?.nominalDiameterMm || 0;
                          const fitEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                          const allSchedules = getScheduleListForSpec(nbValue, fitEffectiveSpecId);

                          if (globalSpecs?.workingPressureBar && entry.specs?.nominalDiameterMm) {
                            const minWT = getMinimumWallThickness(nbValue, globalSpecs?.workingPressureBar || 0);
                            const eligibleSchedules = allSchedules
                              .filter((dim: any) => (dim.wallThicknessMm || 0) >= minWT)
                              .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));

                            const options = eligibleSchedules.map((dim: any, idx: number) => {
                              const scheduleValue = dim.scheduleDesignation || dim.scheduleNumber?.toString() || 'Unknown';
                              const wt = dim.wallThicknessMm || 0;
                              const isRecommended = idx === 0;
                              const label = isRecommended
                                ? `★ ${scheduleValue} (${wt}mm) - RECOMMENDED`
                                : `${scheduleValue} (${wt}mm)`;
                              return { value: scheduleValue, label };
                            });

                            return (
                              <div className="bg-green-50 p-2 rounded-md">
                                <p className="text-green-800 font-medium text-xs mb-2">
                                  Auto-calculated for {globalSpecs.workingPressureBar} bar @ {entry.specs.nominalDiameterMm}NB
                                </p>
                                <Select
                                  id={selectId}
                                  value={entry.specs?.scheduleNumber || ''}
                                  onChange={(schedule) => {
                                    if (!schedule) return;
                                    const selectedDim = allSchedules.find((dim: any) =>
                                      (dim.scheduleDesignation || dim.scheduleNumber?.toString()) === schedule
                                    );
                                    onUpdateEntry(entry.id, {
                                      specs: {
                                        ...entry.specs,
                                        scheduleNumber: schedule,
                                        wallThicknessMm: selectedDim?.wallThicknessMm || entry.specs?.wallThicknessMm
                                      }
                                    });
                                    setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                                  }}
                                  options={options}
                                  placeholder="Select schedule..."
                                  open={openSelects[selectId] || false}
                                  onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                />
                              </div>
                            );
                          }

                          const manualOptions = allSchedules.length > 0
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
                              options={manualOptions}
                              placeholder="Select Schedule"
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                            />
                          );
                        })()}
                        <p className="text-xs text-gray-500 mt-1">
                          Required for fabricated SABS719 fittings
                        </p>
                      </div>
                    )}

                    {/* Stub/Lateral Location - Only for Unequal and Reducing Tees */}
                    {!['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(entry.specs?.fittingType || '') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Location of Stub/Lateral (mm from left flange)
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.stubLocation || ''}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : undefined;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, stubLocation: value }
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                          placeholder="e.g., 500"
                          min="0"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Distance from left flange to center of tee outlet
                        </p>
                      </div>
                    )}

                    {/* Fitting End Configuration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Fitting End Configuration *
                      </label>
                      <select
                        value={entry.specs?.pipeEndConfiguration || 'PE'}
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
                          // Auto-calculate fitting
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        required
                      >
                        {FITTING_END_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="mt-0.5 text-xs text-gray-700">
                        Select how the fitting ends should be configured
                        {entry.specs?.pipeEndConfiguration && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • {getWeldCountPerFitting(entry.specs.pipeEndConfiguration)} weld{getWeldCountPerFitting(entry.specs.pipeEndConfiguration) !== 1 ? 's' : ''} per fitting
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Closure Length Field - Only shown when L/F configuration is selected */}
                    {hasLooseFlange(entry.specs?.pipeEndConfiguration || '') && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        />
                        <p className="mt-0.5 text-xs text-gray-500">
                          Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)
                        </p>
                        {/* Tack Weld Information */}
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs font-bold text-amber-800">
                            Loose Flange Tack Welds Required:
                          </p>
                          <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                            <li>8 tack welds total (~20mm each)</li>
                            <li>4 tack welds on each side of loose flange</li>
                          </ul>
                          <p className="text-xs text-amber-600 mt-1 italic">
                            Tack weld charge applies per L/F end
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Blank Flange Option for Fittings - with position selection */}
                    {(() => {
                      const fittingEndConfig = entry.specs?.pipeEndConfiguration || 'PE';
                      const fittingFlangeConfig = getFittingFlangeConfig(fittingEndConfig);
                      // Get available flange positions (any type of flange can have a blank)
                      const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                        { key: 'inlet', label: 'Inlet (Left)', hasFlange: fittingFlangeConfig.hasInlet },
                        { key: 'outlet', label: 'Outlet (Right)', hasFlange: fittingFlangeConfig.hasOutlet },
                        { key: 'branch', label: 'Branch (Top)', hasFlange: fittingFlangeConfig.hasBranch },
                      ].filter(p => p.hasFlange);

                      if (availablePositions.length === 0) return null;

                      const currentPositions = entry.specs?.blankFlangePositions || [];

                      return (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-green-800">Add Blank Flange(s)</span>
                            <span className="text-xs text-green-600">({availablePositions.length} positions available)</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {availablePositions.map(pos => (
                              <label key={pos.key} className="flex items-center gap-1.5 cursor-pointer">
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
                                  className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-xs text-green-700">{pos.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Flange Specifications - Uses Global Specs with Override Option */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="text-xs font-bold text-orange-900">
                          Flanges
                          {entry.hasFlangeOverride ? (
                            <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>
                          ) : globalSpecs?.flangeStandardId ? (
                            <span className="text-green-600 text-xs ml-1 font-normal">(Global)</span>
                          ) : (
                            <span className="text-orange-600 text-xs ml-1 font-normal">(Not Set)</span>
                          )}
                        </h5>
                        {globalSpecs?.flangeStandardId && (
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
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
                                    flangeStandardId: entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId,
                                    flangePressureClassId: entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId
                                  } : {
                                    ...entry.specs,
                                    flangeStandardId: undefined,
                                    flangePressureClassId: undefined
                                  }
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-xs">Override</span>
                          </label>
                        )}
                      </div>

                      {globalSpecs?.flangeStandardId && !entry.hasFlangeOverride ? (
                        <div className="bg-green-50 p-2 rounded-md">
                          <p className="text-green-800 text-xs font-semibold">
                            {(() => {
                              const pressureClass = masterData.pressureClasses?.find(
                                (pc: any) => pc.id === globalSpecs.flangePressureClassId
                              );
                              const flangeStandard = masterData.flangeStandards?.find(
                                (fs: any) => fs.id === globalSpecs.flangeStandardId
                              );
                              if (pressureClass && flangeStandard) {
                                return `${flangeStandard.code} / ${pressureClass.designation}`;
                              }
                              return 'Using global specs';
                            })()}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {entry.flangeOverrideConfirmed ? (
                            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded-md">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                  <span className="text-green-600">✓</span> Item-Specific Flange Confirmed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: false })}
                                  className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                                >
                                  Edit
                                </button>
                              </div>
                              <div className="bg-white p-1.5 rounded border border-blue-200">
                                <p className="text-sm font-bold text-blue-800">
                                  {(() => {
                                    const flangeStandard = masterData.flangeStandards?.find(
                                      (fs: any) => fs.id === entry.specs?.flangeStandardId
                                    );
                                    const pressureClass = masterData.pressureClasses?.find(
                                      (pc: any) => pc.id === entry.specs?.flangePressureClassId
                                    );
                                    if (flangeStandard && pressureClass) {
                                      return `${flangeStandard.code} / ${pressureClass.designation}`;
                                    }
                                    return 'N/A';
                                  })()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                                  onChange={(e) => {
                                    const standardId = parseInt(e.target.value) || undefined;
                                    onUpdateEntry(entry.id, {
                                      specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined }
                                    });
                                    if (standardId) {
                                      getFilteredPressureClasses(standardId);
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                >
                                  <option value="">Standard...</option>
                                  {masterData.flangeStandards?.map((standard: any) => (
                                    <option key={standard.id} value={standard.id}>
                                      {standard.code}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                  onChange={(e) => onUpdateEntry(entry.id, {
                                    specs: {
                                      ...entry.specs,
                                      flangePressureClassId: parseInt(e.target.value) || undefined
                                    }
                                  })}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                >
                                  <option value="">Class...</option>
                                  {(() => {
                                    const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                    const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                    return filtered.map((pressureClass: any) => (
                                      <option key={pressureClass.id} value={pressureClass.id}>
                                        {pressureClass.designation}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </div>
                              {entry.hasFlangeOverride && entry.specs?.flangeStandardId && entry.specs?.flangePressureClassId && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateEntry(entry.id, { flangeOverrideConfirmed: true })}
                                    className="flex-1 px-2 py-1.5 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>✓</span> Confirm Override
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
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
                                    className="px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={entry.notes || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                    rows={2}
                    placeholder="Any special requirements or notes..."
                  />
                </div>
                  </>
                }
                previewContent={
                  <>
                    {(() => {
                      if (!Tee3DPreview) return null;

                      const fittingType = entry.specs?.fittingType || '';
                      const isTeeType = ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'].includes(fittingType);

                      if (!isTeeType) return null;

                      const teeType = ['GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE', 'GUSSETTED_TEE'].includes(fittingType)
                        ? 'gusset' as const
                        : 'short' as const;

                      const nominalBore = entry.specs?.nominalDiameterMm || 500;
                      const branchNominalBore = entry.specs?.branchNominalDiameterMm;
                      const wallThickness = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 8;
                      const outerDiameter = entry.calculation?.outsideDiameterMm;

                      const steelSpec = masterData.steelSpecs?.find((s: any) =>
                        s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId)
                      );

                      return (
                        <Tee3DPreview
                          nominalBore={nominalBore}
                          branchNominalBore={branchNominalBore}
                          outerDiameter={outerDiameter}
                          wallThickness={wallThickness}
                          teeType={teeType}
                          runLength={entry.specs?.pipeLengthAMm}
                          branchPositionMm={entry.specs?.stubLocation}
                          materialName={steelSpec?.steelSpecName}
                          hasInletFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasInlet}
                          hasOutletFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasOutlet}
                          hasBranchFlange={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').hasBranch}
                          inletFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').inletType}
                          outletFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').outletType}
                          branchFlangeType={getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || '').branchType}
                          closureLengthMm={entry.specs?.closureLengthMm || 150}
                          addBlankFlange={entry.specs?.addBlankFlange}
                          blankFlangeCount={entry.specs?.blankFlangeCount}
                          blankFlangePositions={entry.specs?.blankFlangePositions}
                          savedCameraPosition={entry.specs?.savedCameraPosition}
                          savedCameraTarget={entry.specs?.savedCameraTarget}
                          onCameraChange={(position: [number, number, number], target: [number, number, number]) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, savedCameraPosition: position, savedCameraTarget: target }
                            });
                          }}
                        />
                      );
                    })()}
                  </>
                }
              />

                {/* Calculate button removed - calculation happens automatically on spec changes */}

                {/* Calculation Results - Compact Layout matching Bend style */}
                {entry.calculation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-green-500 pb-1.5 mb-3">
                      📊 Calculation Results
                    </h4>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                      {(() => {
                        // Get fitting configuration values
                        const fittingType = entry.specs?.fittingType || 'Tee';
                        const nominalBore = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 0;
                        const branchNB = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || nominalBore;
                        const pipeALength = entry.specs?.pipeLengthAMm || 0;
                        const pipeBLength = entry.specs?.pipeLengthBMm || 0;
                        const teeHeight = entry.specs?.teeHeightMm || 0;
                        const quantity = entry.specs?.quantityValue || 1;

                        // Get flange configuration
                        const flangeConfig = getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || 'PE');
                        const numFlanges = (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0) + (flangeConfig.hasBranch ? 1 : 0);

                        // Weld thickness lookup
                        const schedule = entry.specs?.scheduleNumber || '';
                        const pipeWallThickness = entry.calculation?.wallThicknessMm;

                        // Check for SABS 719 - use item-level steel spec with global fallback
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const isSABS719 = steelSpecId === 8;

                        const scheduleUpper = schedule.toUpperCase();
                        const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') ? 'XH' : 'STD';

                        // SABS 719 ERW Pipe Wall Thickness Table (Class B - Standard)
                        const SABS_719_WT: Record<number, number> = {
                          200: 5.2, 250: 5.2, 300: 6.4, 350: 6.4, 400: 6.4, 450: 6.4, 500: 6.4,
                          550: 6.4, 600: 6.4, 650: 8.0, 700: 8.0, 750: 8.0, 800: 8.0, 850: 9.5,
                          900: 9.5, 1000: 9.5, 1050: 9.5, 1200: 12.7
                        };

                        // ASTM/ASME Carbon Steel Weld Fittings wall thickness (WPB Grade)
                        const FITTING_WT: Record<string, Record<number, number>> = {
                          'STD': { 50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53 },
                          'XH': { 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70 },
                          'XXH': { 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                        };

                        // Get SABS 719 wall thickness with closest size lookup
                        const getSabs719Wt = (nb: number): number => {
                          const sizes = Object.keys(SABS_719_WT).map(Number).sort((a, b) => a - b);
                          let closest = sizes[0];
                          for (const size of sizes) {
                            if (size <= nb) closest = size;
                            else break;
                          }
                          return SABS_719_WT[closest] || 6.4;
                        };

                        // For SABS 719: use SABS 719 WT table; for ASTM/ASME: use fitting lookup
                        const fittingWeldThickness = isSABS719
                          ? getSabs719Wt(nominalBore)
                          : (FITTING_WT[fittingClass]?.[nominalBore] || pipeWallThickness || 6);
                        const branchWeldThickness = isSABS719
                          ? getSabs719Wt(branchNB)
                          : (FITTING_WT[fittingClass]?.[branchNB] || fittingWeldThickness);

                        return (
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                            {/* Qty & Dimensions Combined */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Qty & Dimensions</p>
                              <p className="text-lg font-bold text-gray-900">{quantity} × {fittingType}</p>
                              <div className="mt-1 space-y-0.5 text-left">
                                <p className="text-[10px] text-gray-700">Main: {nominalBore}NB</p>
                                {branchNB !== nominalBore && (
                                  <p className="text-[10px] text-gray-700">Branch: {branchNB}NB</p>
                                )}
                                {pipeALength > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe A: {pipeALength}mm</p>
                                )}
                                {pipeBLength > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe B: {pipeBLength}mm</p>
                                )}
                                {teeHeight > 0 && (
                                  <p className="text-[10px] text-gray-700">Height: {teeHeight}mm</p>
                                )}
                              </div>
                            </div>

                            {/* Total Weight - Use API value directly */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                              <p className="text-lg font-bold text-green-900">
                                {(entry.calculation.totalWeight || ((entry.calculation.fittingWeight || 0) + (entry.calculation.pipeWeight || 0) + (entry.calculation.flangeWeight || 0) + (entry.calculation.boltWeight || 0) + (entry.calculation.nutWeight || 0))).toFixed(1)} kg
                              </p>
                              <p className="text-[10px] text-gray-500">per fitting</p>
                            </div>

                            {/* Weight Breakdown - Use API values directly */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weight Breakdown</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {(entry.calculation.fittingWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Fitting Body: {entry.calculation.fittingWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.pipeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Pipe Sections: {entry.calculation.pipeWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.flangeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Flanges: {entry.calculation.flangeWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.boltWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Bolts: {entry.calculation.boltWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.nutWeight || 0) > 0 && (
                                  <p className="text-[10px] text-gray-700">Nuts: {entry.calculation.nutWeight.toFixed(1)}kg</p>
                                )}
                              </div>
                            </div>

                            {/* Total Flanges - Use API value */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-gray-900">{entry.calculation.numberOfFlanges || numFlanges}</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {flangeConfig.hasInlet && (
                                  <p className="text-[10px] text-gray-700">1 x {nominalBore}NB {flangeConfig.inletType === 'loose' ? 'L/F' : flangeConfig.inletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasOutlet && (
                                  <p className="text-[10px] text-gray-700">1 x {nominalBore}NB {flangeConfig.outletType === 'loose' ? 'L/F' : flangeConfig.outletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasBranch && (
                                  <p className="text-[10px] text-green-700">1 x {branchNB}NB {flangeConfig.branchType === 'loose' ? 'L/F' : flangeConfig.branchType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                              </div>
                            </div>

                            {/* Weld Summary - Consolidated display */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weld Summary</p>
                              {(() => {
                                // Calculate tee junction weld (always 1 for tees)
                                const teeOd = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                                const teeWeldLengthM = (Math.PI * teeOd / 1000); // Circumference in meters

                                // Count fixed flanges (not loose) for weld calculations
                                const mainFixedFlanges = (flangeConfig.hasInlet && flangeConfig.inletType !== 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasOutlet && flangeConfig.outletType !== 'loose' ? 1 : 0);
                                const branchFixedFlanges = flangeConfig.hasBranch && flangeConfig.branchType !== 'loose' ? 1 : 0;
                                const totalFixedFlanges = mainFixedFlanges + branchFixedFlanges;

                                // Flange weld calculations (x2 for inside + outside welds)
                                const mainFlangeOd = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                                const branchFlangeOd = branchNB * 1.1; // Approximate branch OD
                                const mainFlangeWeldLengthPerFlange = Math.PI * mainFlangeOd / 1000; // Circumference in m
                                const branchFlangeWeldLengthPerFlange = Math.PI * branchFlangeOd / 1000;

                                // Total flange weld length = (count x circumference x 2) for inside + outside
                                const totalMainFlangeWeldLength = mainFixedFlanges * mainFlangeWeldLengthPerFlange * 2;
                                const totalBranchFlangeWeldLength = branchFixedFlanges * branchFlangeWeldLengthPerFlange * 2;
                                const totalFlangeWeldLength = totalMainFlangeWeldLength + totalBranchFlangeWeldLength;
                                const totalFlangeWeldCount = totalFixedFlanges * 2; // x2 for inside + outside

                                // Count loose flanges
                                const looseFlangeCount = (flangeConfig.hasInlet && flangeConfig.inletType === 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasOutlet && flangeConfig.outletType === 'loose' ? 1 : 0)
                                                       + (flangeConfig.hasBranch && flangeConfig.branchType === 'loose' ? 1 : 0);

                                return (
                                  <div className="text-left mt-1 space-y-0.5">
                                    {/* Tee Junction Weld */}
                                    <p className="text-[10px] text-blue-700 font-medium">
                                      Tee Junction: 1 weld @ {branchWeldThickness?.toFixed(1)}mm ({teeWeldLengthM.toFixed(2)}m)
                                    </p>

                                    {/* Combined Flange Welds (inside + outside) */}
                                    {totalFixedFlanges > 0 && (
                                      <p className="text-[10px] text-green-700 font-medium">
                                        Flange Welds: {totalFlangeWeldCount} @ {fittingWeldThickness?.toFixed(1)}mm ({totalFlangeWeldLength.toFixed(2)}m)
                                      </p>
                                    )}
                                    {totalFixedFlanges > 0 && (
                                      <p className="text-[9px] text-gray-500 pl-2">
                                        ({totalFixedFlanges} flange{totalFixedFlanges > 1 ? 's' : ''} × 2 welds for inside+outside)
                                      </p>
                                    )}

                                    {/* Loose flanges - tack welds only */}
                                    {looseFlangeCount > 0 && (
                                      <p className="text-[10px] text-purple-700">
                                        Loose Flanges: {looseFlangeCount} × 8 tack welds
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            

                            {/* External m² - Separate box */}
                            {requiredProducts?.includes('surface_protection') && globalSpecs?.externalCoatingConfirmed && (() => {
                              const odMm = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                              const odM = odMm / 1000;

                              // Count open ends and add 100mm allowance per end
                              const FLANGE_ALLOWANCE_MM = 100;
                              let mainEndCount = 0;
                              let branchEndCount = 0;
                              if (flangeConfig.hasInlet) mainEndCount++;
                              if (flangeConfig.hasOutlet) mainEndCount++;
                              if (flangeConfig.hasBranch) branchEndCount++;

                              // Calculate external surface areas
                              let pipeRunExtArea = 0;
                              let branchExtArea = 0;

                              const mainEndAllowance = (mainEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const runLength = ((pipeALength + pipeBLength) / 1000) + mainEndAllowance;
                              if (runLength > 0) {
                                pipeRunExtArea = odM * Math.PI * runLength;
                              }

                              if (teeHeight > 0) {
                                const branchOdMm = branchNB * 1.1;
                                const branchEndAllowance = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                                const branchLength = (teeHeight / 1000) + branchEndAllowance;
                                branchExtArea = (branchOdMm / 1000) * Math.PI * branchLength;
                              }

                              const itemExtArea = pipeRunExtArea + branchExtArea;
                              const totalExtArea = itemExtArea * quantity;

                              const branchOdMm = branchNB * 1.1;
                              const branchEndAllowanceCalc = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const branchLengthCalc = (teeHeight / 1000) + branchEndAllowanceCalc;

                              return (
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded text-center border border-indigo-200 dark:border-indigo-700">
                                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">🛡️ External m²</p>
                                  <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{totalExtArea.toFixed(3)} m²</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {runLength > 0 && (
                                      <p className="text-[9px] text-indigo-700 dark:text-indigo-300">
                                        Run: {pipeRunExtArea.toFixed(4)} m² <span className="text-indigo-500 dark:text-indigo-400">(OD {odMm.toFixed(1)}mm × π × {runLength.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {mainEndCount > 0 && (
                                      <p className="text-[8px] text-indigo-500 dark:text-indigo-400 pl-2">
                                        Length: {((pipeALength + pipeBLength) / 1000).toFixed(3)}m + {mainEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    {teeHeight > 0 && (
                                      <p className="text-[9px] text-indigo-700 dark:text-indigo-300">
                                        Branch: {branchExtArea.toFixed(4)} m² <span className="text-indigo-500 dark:text-indigo-400">(OD {branchOdMm.toFixed(1)}mm × π × {branchLengthCalc.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {teeHeight > 0 && branchEndCount > 0 && (
                                      <p className="text-[8px] text-indigo-500 dark:text-indigo-400 pl-2">
                                        Length: {(teeHeight / 1000).toFixed(3)}m + {branchEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium pt-0.5 border-t border-indigo-200 dark:border-indigo-600 mt-1">
                                      Per item: {itemExtArea.toFixed(4)} m² × {quantity} = {totalExtArea.toFixed(3)} m²
                                    </p>
                                    {globalSpecs?.coatingType && (
                                      <p className="text-[9px] text-indigo-500 dark:text-indigo-400 italic">{globalSpecs.coatingType}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Internal m² - Separate box */}
                            {requiredProducts?.includes('surface_protection') && globalSpecs?.internalLiningConfirmed && (() => {
                              const odMm = entry.calculation?.outsideDiameterMm || nominalBore * 1.1;
                              const wtMm = entry.calculation?.wallThicknessMm || 6;
                              const idMm = odMm - (2 * wtMm);
                              const idM = idMm / 1000;

                              // Count open ends and add 100mm allowance per end
                              const FLANGE_ALLOWANCE_MM = 100;
                              let mainEndCount = 0;
                              let branchEndCount = 0;
                              if (flangeConfig.hasInlet) mainEndCount++;
                              if (flangeConfig.hasOutlet) mainEndCount++;
                              if (flangeConfig.hasBranch) branchEndCount++;

                              // Calculate internal surface areas
                              let pipeRunIntArea = 0;
                              let branchIntArea = 0;

                              const mainEndAllowance = (mainEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const runLength = ((pipeALength + pipeBLength) / 1000) + mainEndAllowance;
                              if (runLength > 0) {
                                pipeRunIntArea = idM * Math.PI * runLength;
                              }

                              if (teeHeight > 0) {
                                const branchIdMm = (branchNB * 1.1) - (2 * wtMm);
                                const branchEndAllowance = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                                const branchLength = (teeHeight / 1000) + branchEndAllowance;
                                branchIntArea = (branchIdMm / 1000) * Math.PI * branchLength;
                              }

                              const itemIntArea = pipeRunIntArea + branchIntArea;
                              const totalIntArea = itemIntArea * quantity;

                              const branchIdMmCalc = (branchNB * 1.1) - (2 * wtMm);
                              const branchEndAllowanceCalc = (branchEndCount * FLANGE_ALLOWANCE_MM) / 1000;
                              const branchLengthCalc = (teeHeight / 1000) + branchEndAllowanceCalc;

                              return (
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded text-center border border-purple-200 dark:border-purple-700">
                                  <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">🛡️ Internal m²</p>
                                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalIntArea.toFixed(3)} m²</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {runLength > 0 && (
                                      <p className="text-[9px] text-purple-700 dark:text-purple-300">
                                        Run: {pipeRunIntArea.toFixed(4)} m² <span className="text-purple-500 dark:text-purple-400">(ID {idMm.toFixed(1)}mm × π × {runLength.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {mainEndCount > 0 && (
                                      <p className="text-[8px] text-purple-500 dark:text-purple-400 pl-2">
                                        Length: {((pipeALength + pipeBLength) / 1000).toFixed(3)}m + {mainEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    {teeHeight > 0 && (
                                      <p className="text-[9px] text-purple-700 dark:text-purple-300">
                                        Branch: {branchIntArea.toFixed(4)} m² <span className="text-purple-500 dark:text-purple-400">(ID {branchIdMmCalc.toFixed(1)}mm × π × {branchLengthCalc.toFixed(3)}m)</span>
                                      </p>
                                    )}
                                    {teeHeight > 0 && branchEndCount > 0 && (
                                      <p className="text-[8px] text-purple-500 dark:text-purple-400 pl-2">
                                        Length: {(teeHeight / 1000).toFixed(3)}m + {branchEndCount}×0.1m allowance
                                      </p>
                                    )}
                                    <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium pt-0.5 border-t border-purple-200 dark:border-purple-600 mt-1">
                                      Per item: {itemIntArea.toFixed(4)} m² × {quantity} = {totalIntArea.toFixed(3)} m²
                                    </p>
                                    {globalSpecs?.liningType && (
                                      <p className="text-[9px] text-purple-500 dark:text-purple-400 italic">{globalSpecs.liningType}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

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
              </>
  );
}
