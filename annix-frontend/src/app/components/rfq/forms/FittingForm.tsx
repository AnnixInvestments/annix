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
  retainingRingWeight,
  SABS_1123_FLANGE_TYPES,
  SABS_1123_PRESSURE_CLASSES,
  BS_4504_FLANGE_TYPES,
  BS_4504_PRESSURE_CLASSES,
} from '@/app/lib/config/rfq';
import { roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';
import { checkMaterialSuitability, suitableMaterials } from '@/app/lib/config/rfq/materialLimits';

export interface FittingFormProps {
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
  index,
  entries,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onDuplicateEntry,
  onCopyEntry,
  copiedItemId,
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

                {/* Working Conditions - Item Override */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold text-gray-800">
                      Working Conditions
                      {(!entry.specs?.workingPressureBar && !entry.specs?.workingTemperatureC) && (
                        <span className="ml-2 text-xs font-normal text-green-600">(From Global Spec)</span>
                      )}
                      {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
                        <span className="ml-2 text-xs font-normal text-orange-600">(Override)</span>
                      )}
                    </h4>
                    {(entry.specs?.workingPressureBar || entry.specs?.workingTemperatureC) && (
                      <button
                        type="button"
                        onClick={() => onUpdateEntry(entry.id, {
                          specs: { ...entry.specs, workingPressureBar: undefined, workingTemperatureC: undefined }
                        })}
                        className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                      >
                        Reset to Global
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Pressure (bar)
                      </label>
                      <select
                        value={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar || ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingPressureBar: value }
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">Select pressure...</option>
                        {[6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630].map((pressure) => (
                          <option key={pressure} value={pressure}>{pressure} bar</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Working Temperature (°C)
                      </label>
                      <select
                        value={entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC || ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, workingTemperatureC: value }
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                      >
                        <option value="">Select temperature...</option>
                        {[-29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500].map((temp) => (
                          <option key={temp} value={temp}>{temp}°C</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-900 mb-1">
                        Fitting Standard *
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard || derived;
                          if (hasGlobal && current === derived) return <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>;
                          if (hasGlobal && current !== derived) return <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      {(() => {
                        const selectId = `fitting-standard-wc-${entry.id}`;
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
                              { value: 'SABS62', label: 'SABS62 (Standard)' },
                              { value: 'SABS719', label: 'SABS719 (Fabricated)' }
                            ]}
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
                    </div>
                  </div>
                  {(() => {
                    const effectivePressure = entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar;
                    const effectiveTemperature = entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC;
                    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === steelSpecId);
                    const steelSpecName = steelSpec?.steelSpecName || '';

                    if (!steelSpecName || (!effectivePressure && !effectiveTemperature)) return null;

                    const suitability = checkMaterialSuitability(steelSpecName, effectiveTemperature, effectivePressure);

                    if (suitability.isSuitable && suitability.warnings.length === 0) return null;

                    const suitableSpecPatterns = suitableMaterials(effectiveTemperature, effectivePressure);
                    const recommendedSpecs = masterData.steelSpecs?.filter((s: any) =>
                      suitableSpecPatterns.some(pattern => s.steelSpecName?.includes(pattern))
                    ) || [];

                    return (
                      <div className={`mt-2 p-2 rounded border ${!suitability.isSuitable ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-sm ${!suitability.isSuitable ? 'text-red-600' : 'text-amber-600'}`}>⚠</span>
                          <div className="text-xs flex-1">
                            {!suitability.isSuitable && (
                              <p className="font-semibold text-red-700 mb-1">Steel spec not suitable - must be changed:</p>
                            )}
                            {suitability.warnings.map((warning, idx) => (
                              <p key={idx} className={!suitability.isSuitable ? 'text-red-800' : 'text-amber-800'}>{warning}</p>
                            ))}
                            {suitability.recommendation && (
                              <p className="mt-1 text-gray-700 italic">{suitability.recommendation}</p>
                            )}
                            {!suitability.isSuitable && recommendedSpecs.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-gray-600">Suitable specs:</span>
                                {recommendedSpecs.slice(0, 3).map((spec: any) => (
                                  <button
                                    key={spec.id}
                                    type="button"
                                    onClick={() => {
                                      const nominalDiameter = entry.specs?.nominalDiameterMm;
                                      let scheduleNumber = entry.specs?.scheduleNumber;
                                      let wallThicknessMm = entry.specs?.wallThicknessMm;

                                      if (nominalDiameter && globalSpecs?.workingPressureBar) {
                                        const schedules = getScheduleListForSpec(nominalDiameter, spec.id);
                                        const minWT = getMinimumWallThickness(nominalDiameter, globalSpecs.workingPressureBar);

                                        const eligibleSchedules = schedules
                                          .filter((s: any) => (s.wallThicknessMm || 0) >= minWT)
                                          .sort((a: any, b: any) => (a.wallThicknessMm || 0) - (b.wallThicknessMm || 0));

                                        if (eligibleSchedules.length > 0) {
                                          scheduleNumber = eligibleSchedules[0].scheduleDesignation;
                                          wallThicknessMm = eligibleSchedules[0].wallThicknessMm;
                                        } else if (schedules.length > 0) {
                                          const sorted = [...schedules].sort((a: any, b: any) =>
                                            (b.wallThicknessMm || 0) - (a.wallThicknessMm || 0)
                                          );
                                          scheduleNumber = sorted[0].scheduleDesignation;
                                          wallThicknessMm = sorted[0].wallThicknessMm;
                                        }
                                      }

                                      onUpdateEntry(entry.id, {
                                        specs: {
                                          ...entry.specs,
                                          steelSpecificationId: spec.id,
                                          scheduleNumber,
                                          wallThicknessMm
                                        }
                                      });
                                    }}
                                    className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 font-medium"
                                  >
                                    {spec.steelSpecName}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ROW 1: Primary Specs Header (Green Background) */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-bold text-green-900 border-b border-green-400 pb-1.5 mb-3">
                    Fitting Specifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                                    // For gusset tees (equal, unequal, reducing), use B dimension as the standard pipe length
                                    // B is the gusset tee center-to-face height which should be the default for both A and B
                                    const isGussetTee = ['GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType);
                                    const standardLength = isGussetTee ? (dimB || dimA) : dimA;

                                    if (standardLength && (isEqualTee || !entry.specs?.pipeLengthAOverride)) {
                                      pipeUpdates.pipeLengthAMm = standardLength;
                                      pipeUpdates.pipeLengthAMmAuto = standardLength;
                                    }
                                    if (standardLength && (isEqualTee || !entry.specs?.pipeLengthBOverride)) {
                                      pipeUpdates.pipeLengthBMm = standardLength;
                                      pipeUpdates.pipeLengthBMmAuto = standardLength;
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

                                    // For gusset tees (equal, unequal, reducing), use B dimension as the standard pipe length
                                    // B is the gusset tee center-to-face height which should be the default for both A and B
                                    const isGussetTee = ['GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType);
                                    const standardLength = isGussetTee ? (dimB || dimA) : dimA;

                                    if (standardLength && !pipeLengthAOverride) {
                                      pipeUpdates.pipeLengthAMm = standardLength;
                                      pipeUpdates.pipeLengthAMmAuto = standardLength;
                                    }
                                    if (standardLength && !pipeLengthBOverride) {
                                      pipeUpdates.pipeLengthBMm = standardLength;
                                      pipeUpdates.pipeLengthBMmAuto = standardLength;
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

                    {/* Schedule/Wall Thickness */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      const showSchedule = effectiveStandard === 'SABS719';

                      if (!showSchedule) {
                        return (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                              Wall Thickness
                            </label>
                            <p className="text-sm text-gray-600">N/A (SABS62)</p>
                          </div>
                        );
                      }

                      const selectId = `fitting-schedule-spec-${entry.id}`;
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
                            ? `★ ${scheduleValue} (${wt}mm)`
                            : `${scheduleValue} (${wt}mm)`;
                          return { value: scheduleValue, label };
                        });

                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <label className="block text-xs font-semibold text-green-900 mb-1">
                              Schedule / W/T *
                              <span className="text-green-600 text-xs ml-1 font-normal">(Auto)</span>
                            </label>
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
                            {entry.specs?.wallThicknessMm && (
                              <p className="text-xs text-green-700 mt-1">WT: {entry.specs.wallThicknessMm}mm</p>
                            )}
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
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Schedule / W/T *
                            <span className="text-orange-600 text-xs ml-1 font-normal">(Manual)</span>
                          </label>
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
                          {entry.specs?.wallThicknessMm && (
                            <p className="text-xs text-gray-600 mt-1">WT: {entry.specs.wallThicknessMm}mm</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ROW 2: Flange Specifications - Horizontal Layout */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-orange-900 border-b border-orange-400 pb-1.5">
                      Flanges
                      {entry.hasFlangeOverride ? (
                        <span className="text-blue-600 text-xs ml-1 font-normal">(Override)</span>
                      ) : globalSpecs?.flangeStandardId ? (
                        <span className="text-green-600 text-xs ml-1 font-normal">(Global)</span>
                      ) : (
                        <span className="text-orange-600 text-xs ml-1 font-normal">(Not Set)</span>
                      )}
                    </h4>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white p-2 rounded border border-green-200">
                        <label className="block text-xs text-gray-500 mb-0.5">Flange Standard</label>
                        <p className="text-sm font-medium text-gray-900">
                          {masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId)?.code || 'Not set'}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded border border-green-200">
                        <label className="block text-xs text-gray-500 mb-0.5">Pressure Class</label>
                        <p className="text-sm font-medium text-gray-900">
                          {masterData.pressureClasses?.find((pc: any) => pc.id === globalSpecs.flangePressureClassId)?.designation || 'Not set'}
                        </p>
                      </div>
                      {(() => {
                        const selectedStandard = masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId);
                        const showFlangeType = selectedStandard?.code === 'SABS 1123' || selectedStandard?.code === 'BS 4504';
                        if (!showFlangeType) return <div></div>;
                        const flangeType = (selectedStandard?.code === 'SABS 1123' ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES)
                          .find(ft => ft.code === globalSpecs.flangeTypeCode);
                        return (
                          <div className="bg-white p-2 rounded border border-green-200">
                            <label className="block text-xs text-gray-500 mb-0.5">Flange Type</label>
                            <p className="text-sm font-medium text-gray-900">
                              {flangeType ? `${flangeType.name} (${flangeType.code})` : 'Not set'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
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
                          {(() => {
                            const selectedStandard = masterData.flangeStandards?.find(
                              (fs: any) => fs.id === (entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId)
                            );
                            const isSabs1123 = selectedStandard?.code?.toUpperCase().includes('SABS') &&
                                               selectedStandard?.code?.includes('1123');
                            const isBs4504 = selectedStandard?.code?.toUpperCase().includes('BS') &&
                                             selectedStandard?.code?.includes('4504');
                            const hasThreeDropdowns = isSabs1123 || isBs4504;

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-orange-900 mb-1">Standard</label>
                                  <select
                                    value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                                    onChange={(e) => {
                                      const standardId = parseInt(e.target.value) || undefined;
                                      onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined, flangeTypeCode: undefined }
                                      });
                                      if (standardId) {
                                        getFilteredPressureClasses(standardId);
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                  >
                                    <option value="">Select Standard...</option>
                                    {masterData.flangeStandards?.map((standard: any) => (
                                      <option key={standard.id} value={standard.id}>{standard.code}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-orange-900 mb-1">Pressure Class</label>
                                  {hasThreeDropdowns ? (
                                    <select
                                      value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                      onChange={(e) => onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangePressureClassId: parseInt(e.target.value) || undefined }
                                      })}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                    >
                                      <option value="">Select Class...</option>
                                      {(isSabs1123 ? SABS_1123_PRESSURE_CLASSES : BS_4504_PRESSURE_CLASSES).map((pc) => {
                                        const matchingPc = masterData.pressureClasses?.find(
                                          (mpc: any) => mpc.designation?.includes(String(pc.value))
                                        );
                                        return matchingPc ? (
                                          <option key={matchingPc.id} value={matchingPc.id}>{isSabs1123 ? pc.value : pc.label}</option>
                                        ) : null;
                                      })}
                                    </select>
                                  ) : (
                                    <select
                                      value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                      onChange={(e) => onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangePressureClassId: parseInt(e.target.value) || undefined }
                                      })}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                    >
                                      <option value="">Select Class...</option>
                                      {(() => {
                                        const stdId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                                        const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                        return filtered.map((pressureClass: any) => (
                                          <option key={pressureClass.id} value={pressureClass.id}>{pressureClass.designation}</option>
                                        ));
                                      })()}
                                    </select>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-orange-900 mb-1">Flange Type</label>
                                  {hasThreeDropdowns ? (
                                    <select
                                      value={entry.specs?.flangeTypeCode || ''}
                                      onChange={(e) => onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined }
                                      })}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900"
                                    >
                                      <option value="">Select Type...</option>
                                      {(isSabs1123 ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES).map((ft) => (
                                        <option key={ft.code} value={ft.code} title={ft.description}>
                                          {ft.name} ({ft.code})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <select disabled className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-100 text-gray-500">
                                      <option>N/A for this standard</option>
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {entry.hasFlangeOverride && entry.specs?.flangeStandardId && entry.specs?.flangePressureClassId && (
                            <div className="flex gap-2 mt-2">
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

                {/* ROW 3: Quantity & Pipe Lengths - Combined Blue Area */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3">
                    Quantity & Dimensions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-blue-900 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.quantityValue ?? ''}
                        onChange={(e) => {
                          const qty = e.target.value === '' ? 1 : Number(e.target.value);
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, quantityValue: qty }
                          });
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white"
                        min="1"
                        placeholder="1"
                      />
                    </div>

                    {/* Pipe Length A - or Angle Range for Laterals/Y-Pieces */}
                  {(() => {
                    const fittingType = entry.specs?.fittingType;
                    const isLateral = fittingType === 'LATERAL' || fittingType === 'Y_PIECE';
                    const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType || '');
                    const isUnequalTee = ['UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE'].includes(fittingType || '');
                    const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType || '');
                    const isTee = isEqualTee || isUnequalTee || isReducingTee;
                    const isAutoA = entry.specs?.pipeLengthAMmAuto && !entry.specs?.pipeLengthAOverride;

                    if (isLateral) {
                      return (
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
                      );
                    }

                    return (
                      <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                        <label className="block text-xs font-semibold text-blue-900 mb-1">
                          Pipe Length A (mm) *
                          {isEqualTee && <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>}
                          {!isEqualTee && isAutoA && <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>}
                          {!isEqualTee && entry.specs?.pipeLengthAOverride && <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>}
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.pipeLengthAMm || ''}
                          onChange={(e) => {
                            if (isEqualTee) return;
                            const newValue = Number(e.target.value);
                            const isOverride = entry.specs?.pipeLengthAMmAuto && newValue !== entry.specs?.pipeLengthAMmAuto;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, pipeLengthAMm: newValue, pipeLengthAOverride: isOverride }
                            });
                          }}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                            isEqualTee
                              ? 'bg-blue-100 border-blue-400 text-blue-900 cursor-not-allowed font-medium'
                              : 'bg-blue-50 border-blue-300 focus:ring-blue-500 text-gray-900'
                          }`}
                          placeholder="e.g., 1000"
                          min="0"
                          readOnly={isEqualTee}
                        />
                        {(isUnequalTee || isReducingTee) && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Pipe Length B - or Degrees for Laterals */}
                  {(() => {
                    const fittingType = entry.specs?.fittingType;
                    const isLateral = fittingType === 'LATERAL';
                    const isYPiece = fittingType === 'Y_PIECE';
                    const isEqualTee = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE'].includes(fittingType || '');
                    const isUnequalTee = ['UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE'].includes(fittingType || '');
                    const isReducingTee = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType || '');
                    const isTee = isEqualTee || isUnequalTee || isReducingTee;
                    const isAutoB = entry.specs?.pipeLengthBMmAuto && !entry.specs?.pipeLengthBOverride;

                    if (isLateral) {
                      return (
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
                      );
                    }

                    if (isYPiece) {
                      return (
                        <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                          <label className="block text-xs font-semibold text-blue-900 mb-1">
                            Pipe Length B (mm) *
                            {isAutoB && <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>}
                            {entry.specs?.pipeLengthBOverride && <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>}
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.pipeLengthBMm || ''}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              const isOverride = entry.specs?.pipeLengthBMmAuto && newValue !== entry.specs?.pipeLengthBMmAuto;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, pipeLengthBMm: newValue, pipeLengthBOverride: isOverride }
                              });
                            }}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-blue-50"
                            placeholder="e.g., 1000"
                            min="0"
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                        <label className="block text-xs font-semibold text-blue-900 mb-1">
                          Pipe Length B (mm) *
                          {isEqualTee && <span className="text-blue-600 text-xs ml-1 font-normal">(Standard)</span>}
                          {!isEqualTee && isAutoB && <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>}
                          {!isEqualTee && entry.specs?.pipeLengthBOverride && <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>}
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.pipeLengthBMm || ''}
                          onChange={(e) => {
                            if (isEqualTee) return;
                            const newValue = Number(e.target.value);
                            const isOverride = entry.specs?.pipeLengthBMmAuto && newValue !== entry.specs?.pipeLengthBMmAuto;
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, pipeLengthBMm: newValue, pipeLengthBOverride: isOverride }
                            });
                          }}
                          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                            isEqualTee
                              ? 'bg-blue-100 border-blue-400 text-blue-900 cursor-not-allowed font-medium'
                              : 'bg-blue-50 border-blue-300 focus:ring-blue-500 text-gray-900'
                          }`}
                          placeholder="e.g., 1000"
                          min="0"
                          readOnly={isEqualTee}
                        />
                        {(isUnequalTee || isReducingTee) && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">Can Change Lengths</p>
                        )}
                      </div>
                    );
                  })()}
                  </div>
                </div>

                {/* ROW 4: Remaining fields in 3-column grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Column 1 - Additional Specs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Additional Specs
                    </h4>

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

                    {/* Auto-fetch pipe dimensions for tees */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      const fittingType = entry.specs?.fittingType;
                      const nb = entry.specs?.nominalDiameterMm;
                      const hasRequiredData = fittingType && nb;
                      const isTeeType = ['SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType || '');

                      if (isTeeType && hasRequiredData && !entry.specs?.pipeLengthAMm && !entry.specs?.pipeLengthBMm) {
                        masterDataApi.getFittingDimensions(effectiveStandard as 'SABS62' | 'SABS719', fittingType!, nb!, entry.specs?.angleRange)
                          .then((dims) => {
                            if (dims) {
                              const dimA = dims.dimensionAMm ? Number(dims.dimensionAMm) : null;
                              const dimB = dims.dimensionBMm ? Number(dims.dimensionBMm) : null;

                              // For gusset tees (equal, unequal, reducing), use B dimension as the standard pipe length
                              // B is the gusset tee center-to-face height which should be the default for both A and B
                              const isGussetTee = ['GUSSET_TEE', 'UNEQUAL_GUSSET_TEE', 'GUSSET_REDUCING_TEE'].includes(fittingType!);
                              const standardLength = isGussetTee ? (dimB || dimA) : dimA;

                              const updates: any = { specs: { ...entry.specs } };
                              if (standardLength) {
                                updates.specs.pipeLengthAMm = standardLength;
                                updates.specs.pipeLengthAMmAuto = standardLength;
                                updates.specs.pipeLengthBMm = standardLength;
                                updates.specs.pipeLengthBMmAuto = standardLength;
                                onUpdateEntry(entry.id, updates);
                              }
                            }
                          })
                          .catch((err) => log.debug('Could not fetch fitting dimensions:', err));
                      }
                      return null;
                    })()}

                    {/* Pipe Length A (for Laterals - moved from Row 2) */}
                    {entry.specs?.fittingType === 'LATERAL' && (() => {
                      const isAutoA = entry.specs?.pipeLengthAMmAuto && !entry.specs?.pipeLengthAOverride;
                      return (
                        <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                          <label className="block text-xs font-semibold text-blue-900 mb-1">
                            Pipe Length A (mm) *
                            {isAutoA && <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>}
                            {entry.specs?.pipeLengthAOverride && <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>}
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.pipeLengthAMm || ''}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              const isOverride = entry.specs?.pipeLengthAMmAuto && newValue !== entry.specs?.pipeLengthAMmAuto;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, pipeLengthAMm: newValue, pipeLengthAOverride: isOverride }
                              });
                            }}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-blue-50"
                            placeholder="e.g., 1000"
                            min="0"
                          />
                        </div>
                      );
                    })()}

                    {/* Pipe Length B (for Laterals - moved from Row 2) */}
                    {entry.specs?.fittingType === 'LATERAL' && (() => {
                      const isAutoB = entry.specs?.pipeLengthBMmAuto && !entry.specs?.pipeLengthBOverride;
                      return (
                        <div className="bg-blue-50 p-2 rounded-md border border-blue-200">
                          <label className="block text-xs font-semibold text-blue-900 mb-1">
                            Pipe Length B (mm) *
                            {isAutoB && <span className="text-blue-600 text-xs ml-1 font-normal">(Auto)</span>}
                            {entry.specs?.pipeLengthBOverride && <span className="text-orange-600 text-xs ml-1 font-normal">(Override)</span>}
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.pipeLengthBMm || ''}
                            onChange={(e) => {
                              const newValue = Number(e.target.value);
                              const isOverride = entry.specs?.pipeLengthBMmAuto && newValue !== entry.specs?.pipeLengthBMmAuto;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, pipeLengthBMm: newValue, pipeLengthBOverride: isOverride }
                              });
                            }}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-blue-50"
                            placeholder="e.g., 1000"
                            min="0"
                          />
                        </div>
                      );
                    })()}

                    {/* Tee NB - For Unequal Tees */}
                    {['UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE'].includes(entry.specs?.fittingType || '') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">
                          Tee NB (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Branch Outlet Size)</span>
                        </label>
                        {(() => {
                          const selectId = `fitting-tee-nb-${entry.id}`;
                          const mainNB = entry.specs?.nominalDiameterMm || 0;
                          const sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000, 1050, 1200]
                            .filter(nb => nb < mainNB);
                          const options = sizes.map((nb: number) => ({ value: String(nb), label: `${nb}mm` }));

                          return (
                            <Select
                              id={selectId}
                              value={entry.specs?.teeNominalDiameterMm ? String(entry.specs.teeNominalDiameterMm) : ''}
                              onChange={(value) => {
                                if (!value) return;
                                const teeDiameter = Number(value);
                                onUpdateEntry(entry.id, {
                                  specs: {
                                    ...entry.specs,
                                    teeNominalDiameterMm: teeDiameter
                                  }
                                });
                                setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                              }}
                              options={options}
                              placeholder="Select tee diameter..."
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

                  </div>

                  {/* Column 2 - Configuration & Ends */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      📐 Configuration
                    </h4>

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
                      <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-200">
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
                          className="w-full px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
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
                  </div>

                  {/* Column 3 - Flanges */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Flanges
                    </h4>

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
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-amber-800">Add Blank Flange(s)</span>
                            <span className="text-xs text-amber-600">({availablePositions.length} positions available)</span>
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
                                  className="w-3.5 h-3.5 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                                />
                                <span className="text-xs text-amber-800">{pos.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>


                {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

                {/* Smart Notes Dropdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
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

                {/* Calculation Results - Compact Layout matching Bend style */}
                {entry.calculation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-green-500 pb-1.5 mb-3">
                      Calculation Results
                    </h4>
                    <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                      {(() => {
                        const fittingType = entry.specs?.fittingType || 'Tee';
                        const nominalBore = entry.specs?.nominalDiameterMm || entry.specs?.nominalBoreMm || 0;
                        const branchNB = entry.specs?.branchNominalDiameterMm || entry.specs?.branchNominalBoreMm || nominalBore;
                        const pipeALength = entry.specs?.pipeLengthAMm || 0;
                        const pipeBLength = entry.specs?.pipeLengthBMm || 0;
                        const teeHeight = entry.specs?.teeHeightMm || 0;
                        const quantity = entry.specs?.quantityValue || 1;

                        const flangeConfig = getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || 'PE');
                        const numFlanges = (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0) + (flangeConfig.hasBranch ? 1 : 0);

                        const schedule = entry.specs?.scheduleNumber || '';
                        const pipeWallThickness = entry.calculation?.wallThicknessMm;

                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const steelSpec = masterData?.steelSpecs?.find((s: any) => s.id === steelSpecId);
                        const steelSpecName = steelSpec?.steelSpecName || '';
                        const isSABS719 = steelSpecName.includes('SABS 719') || steelSpecName.includes('SANS 719');

                        const scheduleUpper = schedule.toUpperCase();
                        const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') ? 'XH' : 'STD';

                        const FITTING_WT: Record<string, Record<number, number>> = {
                          'STD': { 50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53 },
                          'XH': { 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70 },
                          'XXH': { 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                        };

                        const fittingWeldThickness = isSABS719
                          ? roundToWeldIncrement(pipeWallThickness || 6)
                          : (FITTING_WT[fittingClass]?.[nominalBore] || pipeWallThickness || 6);
                        const branchWeldThickness = isSABS719
                          ? roundToWeldIncrement(pipeWallThickness || 6)
                          : (FITTING_WT[fittingClass]?.[branchNB] || fittingWeldThickness);

                        const rotatingFlangeCount =
                          (flangeConfig.inletType === 'rotating' ? 1 : 0) +
                          (flangeConfig.outletType === 'rotating' ? 1 : 0) +
                          (flangeConfig.branchType === 'rotating' ? 1 : 0);

                        const mainRingWeight = (flangeConfig.inletType === 'rotating' || flangeConfig.outletType === 'rotating')
                          ? retainingRingWeight(nominalBore, entry.calculation?.outsideDiameterMm)
                          : 0;
                        const branchRingWeight = flangeConfig.branchType === 'rotating'
                          ? retainingRingWeight(branchNB)
                          : 0;

                        const mainRingsCount = (flangeConfig.inletType === 'rotating' ? 1 : 0) + (flangeConfig.outletType === 'rotating' ? 1 : 0);
                        const totalRingWeight = (mainRingsCount * mainRingWeight) + (flangeConfig.branchType === 'rotating' ? branchRingWeight : 0);

                        const baseWeight = entry.calculation.totalWeight ||
                          ((entry.calculation.fittingWeight || 0) + (entry.calculation.pipeWeight || 0) +
                           (entry.calculation.flangeWeight || 0) + (entry.calculation.boltWeight || 0) +
                           (entry.calculation.nutWeight || 0));

                        const totalWeight = baseWeight + totalRingWeight;

                        return (
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                            {/* Qty & Dimensions - Blue for lengths */}
                            <div className="bg-blue-50 p-2 rounded text-center border border-blue-200">
                              <p className="text-xs text-blue-800 font-medium">Qty & Dimensions</p>
                              <p className="text-lg font-bold text-blue-900">{quantity} × {fittingType.replace(/_/g, ' ')}</p>
                              <div className="mt-1 space-y-0.5 text-left">
                                <p className="text-[10px] text-blue-700">Main: {nominalBore}NB</p>
                                {branchNB !== nominalBore && (
                                  <p className="text-[10px] text-blue-700">Branch: {branchNB}NB</p>
                                )}
                                {pipeALength > 0 && (
                                  <p className="text-[10px] text-blue-700">Pipe A: {pipeALength}mm</p>
                                )}
                                {pipeBLength > 0 && (
                                  <p className="text-[10px] text-blue-700">Pipe B: {pipeBLength}mm</p>
                                )}
                                {teeHeight > 0 && (
                                  <p className="text-[10px] text-blue-700">Height: {teeHeight}mm</p>
                                )}
                              </div>
                            </div>

                            {/* Total Weight - Green for auto-calculated */}
                            <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                              <p className="text-xs text-green-800 font-medium">Total Weight</p>
                              <p className="text-lg font-bold text-green-900">{totalWeight.toFixed(1)} kg</p>
                              <p className="text-[10px] text-green-600">per fitting</p>
                            </div>

                            {/* Weight Breakdown - Green for auto-calculated */}
                            <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                              <p className="text-xs text-green-800 font-medium">Weight Breakdown</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {(entry.calculation.fittingWeight || 0) > 0 && (
                                  <p className="text-[10px] text-green-700">Fitting: {entry.calculation.fittingWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.pipeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-green-700">Pipe: {entry.calculation.pipeWeight.toFixed(1)}kg</p>
                                )}
                                {(entry.calculation.flangeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-green-700">Flanges: {entry.calculation.flangeWeight.toFixed(1)}kg</p>
                                )}
                                {totalRingWeight > 0 && (
                                  <p className="text-[10px] text-amber-700 font-medium">R/F Rings: {totalRingWeight.toFixed(2)}kg ({rotatingFlangeCount}×)</p>
                                )}
                              </div>
                            </div>

                            {/* Flanges - Amber for flange info */}
                            <div className="bg-amber-50 p-2 rounded text-center border border-amber-200">
                              <p className="text-xs text-amber-800 font-medium">Total Flanges</p>
                              <p className="text-lg font-bold text-amber-900">{entry.calculation.numberOfFlanges || numFlanges}</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {flangeConfig.hasInlet && (
                                  <p className="text-[10px] text-amber-700">1 x {nominalBore}NB {flangeConfig.inletType === 'loose' ? 'L/F' : flangeConfig.inletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasOutlet && (
                                  <p className="text-[10px] text-amber-700">1 x {nominalBore}NB {flangeConfig.outletType === 'loose' ? 'L/F' : flangeConfig.outletType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                                {flangeConfig.hasBranch && (
                                  <p className="text-[10px] text-amber-700">1 x {branchNB}NB {flangeConfig.branchType === 'loose' ? 'L/F' : flangeConfig.branchType === 'rotating' ? 'R/F' : 'Flange'}</p>
                                )}
                              </div>
                            </div>

                            {/* Weld Summary - Purple for weld info */}
                            <div className="bg-purple-50 p-2 rounded text-center border border-purple-200">
                              <p className="text-xs text-purple-800 font-medium">Weld Summary</p>
                              <div className="text-left mt-1 space-y-0.5">
                                <p className="text-[10px] text-purple-700 font-medium">
                                  Tee Junction: 1 weld @ {branchWeldThickness?.toFixed(1)}mm
                                </p>
                                {numFlanges > 0 && (
                                  <p className="text-[10px] text-purple-700 font-medium">
                                    Flange Welds: {numFlanges * 2} @ {fittingWeldThickness?.toFixed(1)}mm
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
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
                          selectedNotes={entry.selectedNotes}
                        />
                      );
                    })()}
                  </>
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
              </>
  );
}
