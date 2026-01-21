'use client';

import React, { useState, useEffect } from 'react';
import { Select } from '@/app/components/ui/Select';
import { fetchFlangeSpecsStatic, FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';
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
  flangeWeight as getFlangeWeight,
  blankFlangeWeight as getBlankFlangeWeight,
  sansBlankFlangeWeight,
  tackWeldWeight as getTackWeldWeight,
  closureWeight as getClosureWeight,
  SABS_1123_FLANGE_TYPES,
  SABS_1123_PRESSURE_CLASSES,
  BS_4504_FLANGE_TYPES,
  BS_4504_PRESSURE_CLASSES,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
  NB_TO_OD_LOOKUP,
  SABS62_FITTING_SIZES,
  SABS719_FITTING_SIZES,
  ALL_FITTING_SIZES,
  FITTING_CLASS_WALL_THICKNESS,
} from '@/app/lib/config/rfq';
import { roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';
import { WorkingConditionsSection } from '@/app/components/rfq/WorkingConditionsSection';
import { MaterialSuitabilityWarning } from '@/app/components/rfq/MaterialSuitabilityWarning';
import { ClosureLengthSelector } from '@/app/components/rfq/ClosureLengthSelector';
import { getMinWallThicknessForNB, calculateFittingWeldVolume, calculateComprehensiveSurfaceArea } from '@/app/lib/utils/pipeCalculations';

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
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
}


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
  errors = {},
  isLoadingNominalBores = false,
}: FittingFormProps) {
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
                itemType="fitting"
                showSplitToggle={entry.specs?.fittingType && ['SHORT_TEE', 'GUSSET_TEE', 'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE', 'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE', 'EQUAL_TEE', 'UNEQUAL_TEE', 'SWEEP_TEE', 'GUSSETTED_TEE'].includes(entry.specs?.fittingType)}
                formContent={
                  <>
                {/* Item Description */}
                <div>
                  <label htmlFor={`fitting-description-${entry.id}`} className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    id={`fitting-description-${entry.id}`}
                    value={entry.description || generateItemDescription(entry)}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    rows={2}
                    placeholder="e.g., 100NB Short Equal Tee Sch40 SABS719"
                    required
                    aria-required="true"
                  />
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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
                <WorkingConditionsSection
                  color="green"
                  entryId={entry.id}
                  idPrefix="fitting"
                  workingPressureBar={entry.specs?.workingPressureBar}
                  workingTemperatureC={entry.specs?.workingTemperatureC}
                  globalPressureBar={globalSpecs?.workingPressureBar}
                  globalTemperatureC={globalSpecs?.workingTemperatureC}
                  onPressureChange={(value) => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingPressureBar: value } })}
                  onTemperatureChange={(value) => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingTemperatureC: value } })}
                  onReset={() => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingPressureBar: undefined, workingTemperatureC: undefined } })}
                  gridCols={3}
                  className="mb-3"
                  extraFields={
                    <div>
                      <label className="block text-xs font-semibold text-green-900 dark:text-green-300 mb-1">
                        Fitting Standard *
                        {(() => {
                          const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                          const derived = isSABS719 ? 'SABS719' : 'SABS62';
                          const hasGlobal = !!globalSpecs?.steelSpecificationId;
                          const current = entry.specs?.fittingStandard || derived;
                          if (hasGlobal && current === derived) return <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">(Auto)</span>;
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
                  }
                />
                <MaterialSuitabilityWarning
                  color="green"
                  steelSpecName={(() => {
                    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    return masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName || '';
                  })()}
                  effectivePressure={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar}
                  effectiveTemperature={entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC}
                  allSteelSpecs={masterData.steelSpecs || []}
                  onSelectSpec={(spec) => {
                    const nominalDiameter = entry.specs?.nominalDiameterMm;
                    let scheduleNumber = entry.specs?.scheduleNumber;
                    let wallThicknessMm = entry.specs?.wallThicknessMm;

                    if (nominalDiameter && globalSpecs?.workingPressureBar) {
                      const schedules = getScheduleListForSpec(nominalDiameter, spec.id);
                      const minWT = getMinWallThicknessForNB(nominalDiameter, globalSpecs.workingPressureBar);

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
                />

                {/* ROW 1: Primary Specs Header (Green Background) */}
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-3">
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Fitting Specifications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Fitting Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
                      {errors[`fitting_${index}_type`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_type`]}</p>
                      )}
                    </div>

                    {/* Nominal Diameter - Linked to Steel Specification */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Nominal Diameter (mm) *
                        {globalSpecs?.steelSpecificationId && (
                          <span className="text-green-600 dark:text-green-400 text-xs ml-2">(From Steel Spec)</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `fitting-nb-${entry.id}`;
                        const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                        const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                        const sizes = effectiveStandard === 'SABS719'
                          ? [...SABS719_FITTING_SIZES]
                          : [...SABS62_FITTING_SIZES];
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
                                  const minWT = getMinWallThicknessForNB(nominalDiameter, globalSpecs.workingPressureBar);
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

                              const isReducingTeeType = ['SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE'].includes(entry.specs?.fittingType || '');
                              const currentBranchNB = entry.specs?.branchNominalDiameterMm;
                              const shouldClearBranch = isReducingTeeType && currentBranchNB && currentBranchNB >= nominalDiameter;

                              const newSpecs = {
                                ...entry.specs,
                                nominalDiameterMm: nominalDiameter,
                                scheduleNumber: matchedSchedule,
                                wallThicknessMm: matchedWT,
                                branchNominalDiameterMm: shouldClearBranch ? undefined : entry.specs?.branchNominalDiameterMm
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
                          ? [...SABS719_FITTING_SIZES]
                          : [...SABS62_FITTING_SIZES];
                        return (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {sizes.length} sizes available ({effectiveStandard})
                          </p>
                        );
                      })()}
                      {errors[`fitting_${index}_nb`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_nb`]}</p>
                      )}
                    </div>

                    {/* Schedule/Wall Thickness */}
                    {(() => {
                      const isSABS719 = (entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId) === 8;
                      const effectiveStandard = entry.specs?.fittingStandard || (isSABS719 ? 'SABS719' : 'SABS62');
                      const showSchedule = effectiveStandard === 'SABS719';

                      if (!showSchedule) {
                        return (
                          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
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
                        const minWT = getMinWallThicknessForNB(nbValue, globalSpecs?.workingPressureBar || 0);
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
                          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2">
                            <label className="block text-xs font-semibold text-green-900 mb-1">
                              Schedule / W/T *
                              <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">(Auto)</span>
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="★ = Minimum schedule meeting pressure requirements. Auto-selected based on ASME B31.3 when working pressure is set.">?</span>
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
                            {errors[`fitting_${index}_schedule`] && (
                              <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_schedule`]}</p>
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
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            Schedule / W/T *
                            <span className="text-green-600 dark:text-green-400 text-xs ml-1 font-normal">(Manual)</span>
                            <span className="ml-1 text-gray-400 font-normal cursor-help" title="Manual selection when working pressure not set. Higher schedules provide thicker walls and greater pressure capacity.">?</span>
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
                          {errors[`fitting_${index}_schedule`] && (
                            <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_schedule`]}</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Weld Thickness Display */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Flange Weld WT
                        <span className="ml-1 text-xs font-normal text-green-600">(Auto)</span>
                      </label>
                      {(() => {
                        const dn = entry.specs?.nominalDiameterMm;
                        const schedule = entry.specs?.scheduleNumber || '';
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const isSABS719 = steelSpecId === 8;
                        const pipeWallThickness = entry.specs?.wallThicknessMm;
                        const numFlanges = entry.calculation?.numberOfFlanges || 0;

                        if (numFlanges === 0) {
                          return (
                            <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-400">
                              No welds (PE)
                            </div>
                          );
                        }

                        if (!dn || !pipeWallThickness) {
                          return (
                            <div className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500 dark:text-gray-400">
                              Select NB first
                            </div>
                          );
                        }

                        let effectiveWeldThickness: number | null = null;
                        let fittingClass: 'STD' | 'XH' | 'XXH' | '' = 'STD';
                        const usingPipeThickness = isSABS719 || !dn || dn > 600;

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
                          ? 'SABS 719 ERW - pipe WT'
                          : !fittingClass || usingPipeThickness
                            ? `Pipe WT (${schedule || 'WT'})`
                            : `${fittingClass} fitting class`;

                        return (
                          <div>
                            <div className="px-2 py-1.5 bg-emerald-100 border border-emerald-300 rounded text-xs font-medium text-emerald-800">
                              {effectiveWeldThickness?.toFixed(2)} mm
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{descText}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ROW 2: Flange Specifications - Horizontal Layout */}
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-3">
                  <div className="mb-2">
                    <h4 className="text-sm font-bold text-green-900 dark:text-green-300 border-b border-green-400 pb-1.5">
                      Flanges
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
                    const hasThreeDropdowns = isSabs1123 || isBs4504;

                    const effectiveStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                    const effectiveClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                    const effectiveTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                    const isStandardFromGlobal = globalSpecs?.flangeStandardId && effectiveStandardId === globalSpecs?.flangeStandardId;
                    const isStandardOverride = globalSpecs?.flangeStandardId && effectiveStandardId !== globalSpecs?.flangeStandardId;
                    const isClassFromGlobal = globalSpecs?.flangePressureClassId && effectiveClassId === globalSpecs?.flangePressureClassId;
                    const isClassOverride = globalSpecs?.flangePressureClassId && effectiveClassId !== globalSpecs?.flangePressureClassId;
                    const isTypeFromGlobal = globalSpecs?.flangeTypeCode && effectiveTypeCode === globalSpecs?.flangeTypeCode;
                    const isTypeOverride = globalSpecs?.flangeTypeCode && effectiveTypeCode !== globalSpecs?.flangeTypeCode;

                    const globalSelectClass = 'w-full px-2 py-1.5 border-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-green-500 dark:border-lime-400';
                    const overrideSelectClass = 'w-full px-2 py-1.5 border-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-red-500 dark:border-red-400';
                    const defaultSelectClass = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800';

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-green-900 mb-1">
                            Standard
                            {isStandardFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                            {isStandardOverride && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                          </label>
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
                            className={isStandardFromGlobal ? globalSelectClass : isStandardOverride ? overrideSelectClass : defaultSelectClass}
                          >
                            <option value="">Select Standard...</option>
                            {masterData.flangeStandards?.map((standard: any) => (
                              <option key={standard.id} value={standard.id}>{standard.code}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-green-900 mb-1">
                            Pressure Class
                            {isClassFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                            {isClassOverride && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                          </label>
                          {hasThreeDropdowns ? (
                            <select
                              value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                              onChange={(e) => onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, flangePressureClassId: parseInt(e.target.value) || undefined }
                              })}
                              className={isClassFromGlobal ? globalSelectClass : isClassOverride ? overrideSelectClass : defaultSelectClass}
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
                              className={isClassFromGlobal ? globalSelectClass : isClassOverride ? overrideSelectClass : defaultSelectClass}
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
                          <label className="block text-xs font-semibold text-green-900 mb-1">
                            Flange Type
                            {isTypeFromGlobal && hasThreeDropdowns && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                            {isTypeOverride && hasThreeDropdowns && <span className="ml-1 text-red-600 font-normal">(Override)</span>}
                          </label>
                          {hasThreeDropdowns ? (
                            <select
                              value={entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode || ''}
                              onChange={(e) => onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined }
                              })}
                              className={isTypeFromGlobal ? globalSelectClass : isTypeOverride ? overrideSelectClass : defaultSelectClass}
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
                </div>

                {/* ROW 3: Quantity & Pipe Lengths - Combined Blue Area */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-bold text-blue-900 border-b border-blue-400 pb-1.5 mb-3">
                    Quantity & Dimensions
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
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
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100'
                          }`}
                          placeholder="e.g., 1000"
                          min="0"
                          readOnly={isEqualTee}
                          aria-readonly={isEqualTee}
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
                          <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
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
                              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100 cursor-not-allowed font-medium'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 focus:ring-blue-500 text-gray-900 dark:text-gray-100'
                          }`}
                          placeholder="e.g., 1000"
                          min="0"
                          readOnly={isEqualTee}
                          aria-readonly={isEqualTee}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Column 1 - Additional Specs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Additional Specs
                    </h4>

                    {/* Branch Nominal Diameter - For Reducing Tees */}
                    {(entry.specs?.fittingType === 'SHORT_REDUCING_TEE' || entry.specs?.fittingType === 'GUSSET_REDUCING_TEE') && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          Branch Nominal Diameter (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Tee Outlet Size)</span>
                        </label>
                        {(() => {
                          const selectId = `fitting-branch-nb-${entry.id}`;
                          const mainNB = entry.specs?.nominalDiameterMm || 0;
                          const sizes = [...SABS719_FITTING_SIZES]
                            .filter(nb => nb < mainNB);
                          const options = sizes.map((nb: number) => ({ value: String(nb), label: `${nb}mm` }));

                          return (
                            <Select
                              id={selectId}
                              value={entry.specs?.branchNominalDiameterMm ? String(entry.specs.branchNominalDiameterMm) : ''}
                              onChange={(value) => {
                                if (!value) return;
                                const branchDiameter = Number(value);
                                if (branchDiameter >= mainNB) return;
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
                        {errors[`fitting_${index}_branchNb`] && (
                          <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_branchNb`]}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          Tee NB (mm) *
                          <span className="text-blue-600 text-xs ml-2">(Branch Outlet Size)</span>
                        </label>
                        {(() => {
                          const selectId = `fitting-tee-nb-${entry.id}`;
                          const mainNB = entry.specs?.nominalDiameterMm || 0;
                          const sizes = [...ALL_FITTING_SIZES]
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
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                        <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                          placeholder="e.g., 500"
                          min="0"
                        />
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Distance from left flange to center of tee outlet
                        </p>
                      </div>
                    )}

                    {/* Fitting End Configuration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Fitting End Configuration *
                        <span className="ml-1 text-gray-400 font-normal cursor-help" title="PE = Plain End (butt weld). FOE = Flanged One End. FBE = Flanged Both Ends. 3F = All Three Ends Flanged. L/F = Loose Flange. R/F = Rotating Flange.">?</span>
                      </label>
                      <select
                        value={entry.specs?.pipeEndConfiguration || 'PE'}
                        onChange={async (e) => {
                          const newConfig = e.target.value as any;

                          let weldDetails = null;
                          try {
                            weldDetails = await getPipeEndConfigurationDetails(newConfig);
                          } catch (error) {
                            log.warn('Could not get pipe end configuration details:', error);
                          }

                          const newFlangeTypeCode = recommendedFlangeTypeCode(newConfig);

                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                          const flangeCode = flangeStandard?.code || '';

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
                              flangeTypeCode: newFlangeTypeCode,
                              ...(newPressureClassId && { flangePressureClassId: newPressureClassId })
                            },
                            ...(weldDetails && { weldInfo: weldDetails })
                          };

                          updatedEntry.description = generateItemDescription({ ...entry, ...updatedEntry });

                          onUpdateEntry(entry.id, updatedEntry);
                          setTimeout(() => onCalculateFitting && onCalculateFitting(entry.id), 100);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                        required
                      >
                        {FITTING_END_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {errors[`fitting_${index}_endConfig`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`fitting_${index}_endConfig`]}</p>
                      )}
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
                      <div className="mt-3 bg-purple-50 dark:bg-purple-900/30 p-3 rounded-md border border-purple-200 dark:border-purple-700">
                        <ClosureLengthSelector
                          nominalBore={entry.specs?.nominalDiameterMm || 100}
                          currentValue={entry.specs?.closureLengthMm || null}
                          wallThickness={entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || 5}
                          onUpdate={(closureLength) => onUpdateEntry(entry.id, { specs: { ...entry.specs, closureLengthMm: closureLength } })}
                          error={errors[`fitting_${index}_closureLength`]}
                          variant="compact"
                        />
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
                            <span className="ml-1 text-gray-400 font-normal cursor-help" title="Blank flanges for hydrostatic testing, isolation, or future connections. Select all flanged ends when items will be pressure tested before installation.">?</span>
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
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 rounded-md">
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
                        const isStdSchedule = scheduleUpper.includes('40') || scheduleUpper === 'STD';
                        const isXhSchedule = scheduleUpper.includes('80') || scheduleUpper === 'XS' || scheduleUpper === 'XH';
                        const isXxhSchedule = scheduleUpper.includes('160') || scheduleUpper === 'XXS' || scheduleUpper === 'XXH';
                        let fittingClass: 'STD' | 'XH' | 'XXH' | '' = '';
                        if (isXxhSchedule) fittingClass = 'XXH';
                        else if (isXhSchedule) fittingClass = 'XH';
                        else if (isStdSchedule) fittingClass = 'STD';

                        const fittingRawThickness = (isSABS719 || !fittingClass)
                          ? (pipeWallThickness || 6)
                          : (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[nominalBore] || pipeWallThickness || 6);
                        const fittingWeldThickness = roundToWeldIncrement(fittingRawThickness);
                        const branchRawThickness = (isSABS719 || !fittingClass)
                          ? (pipeWallThickness || 6)
                          : (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[branchNB] || pipeWallThickness || 6);
                        const branchWeldThickness = roundToWeldIncrement(branchRawThickness);

                        const mainOdMm = entry.calculation?.outsideDiameterMm || (nominalBore ? NB_TO_OD_LOOKUP[nominalBore] || nominalBore * 1.05 : 0);
                        const branchOdMm = branchNB ? NB_TO_OD_LOOKUP[branchNB] || branchNB * 1.05 : 0;
                        const flangeConfigCalc = getFittingFlangeConfig(entry.specs?.pipeEndConfiguration || 'PE');
                        const mainFlangeWeldCount = (flangeConfigCalc.hasInlet ? 1 : 0) + (flangeConfigCalc.hasOutlet ? 1 : 0);
                        const branchFlangeWeldCount = flangeConfigCalc.hasBranch ? 1 : 0;
                        const fittingWeldVolume = mainOdMm && pipeWallThickness ? calculateFittingWeldVolume({
                          mainOdMm,
                          mainWallThicknessMm: pipeWallThickness,
                          branchOdMm: branchOdMm || undefined,
                          branchWallThicknessMm: pipeWallThickness,
                          numberOfMainFlangeWelds: mainFlangeWeldCount,
                          numberOfBranchFlangeWelds: branchFlangeWeldCount,
                          hasTeeJunctionWeld: true,
                        }) : null;

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

                        const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                        const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                        const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                        const flangeStandardCode = flangeStandard?.code || '';
                        const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                        const pressureClassDesignation = pressureClass?.designation || '';
                        const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;

                        const mainFlangeWeightPerUnit = nominalBore && pressureClassDesignation
                          ? getFlangeWeight(nominalBore, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
                          : 0;
                        const branchFlangeWeightPerUnit = branchNB && pressureClassDesignation
                          ? getFlangeWeight(branchNB, pressureClassDesignation, flangeStandardCode, flangeTypeCode)
                          : 0;

                        const mainFlangeCount = (flangeConfig.hasInlet ? 1 : 0) + (flangeConfig.hasOutlet ? 1 : 0);
                        const branchFlangeCount = flangeConfig.hasBranch ? 1 : 0;
                        const dynamicTotalFlangeWeight = (mainFlangeCount * mainFlangeWeightPerUnit) + (branchFlangeCount * branchFlangeWeightPerUnit);

                        const blankPositions = entry.specs?.blankFlangePositions || [];
                        const blankFlangeCount = blankPositions.length;
                        const isSans1123 = flangeStandardCode.includes('SABS 1123') || flangeStandardCode.includes('SANS 1123');
                        const blankWeightPerUnit = nominalBore && pressureClassDesignation
                          ? (isSans1123 ? sansBlankFlangeWeight(nominalBore, pressureClassDesignation) : getBlankFlangeWeight(nominalBore, pressureClassDesignation))
                          : 0;
                        const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                        const fittingEndOption = FITTING_END_OPTIONS.find(o => o.value === entry.specs.pipeEndConfiguration);
                        const hasLooseFlangeConfig = hasLooseFlange(entry.specs.pipeEndConfiguration || '');
                        const tackWeldEnds = hasLooseFlangeConfig ? 1 : 0;
                        const tackWeldTotalWeight = nominalBore && tackWeldEnds > 0
                          ? getTackWeldWeight(nominalBore, tackWeldEnds)
                          : 0;

                        const closureLengthMm = entry.specs?.closureLengthMm || 0;
                        const closureWallThickness = entry.specs?.wallThicknessMm || entry.calculation?.wallThicknessMm || pipeWallThickness || 5;
                        const closureTotalWeight = nominalBore && closureLengthMm > 0 && closureWallThickness > 0
                          ? getClosureWeight(nominalBore, closureLengthMm, closureWallThickness)
                          : 0;

                        const baseWeight = (entry.calculation.fittingWeight || 0) + (entry.calculation.pipeWeight || 0) +
                           dynamicTotalFlangeWeight + (entry.calculation.boltWeight || 0) +
                           (entry.calculation.nutWeight || 0);

                        const totalWeight = baseWeight + totalRingWeight + totalBlankFlangeWeight + tackWeldTotalWeight + closureTotalWeight;

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
                              <p className="text-lg font-bold text-green-900">{totalWeight.toFixed(2)} kg</p>
                              <p className="text-[10px] text-green-600">per fitting</p>
                              {(totalBlankFlangeWeight > 0 || closureTotalWeight > 0) && (
                                <p className="text-[10px] text-gray-500">
                                  {totalBlankFlangeWeight > 0 && `+${totalBlankFlangeWeight.toFixed(2)}kg blanks`}
                                  {closureTotalWeight > 0 && ` +${closureTotalWeight.toFixed(2)}kg closures`}
                                </p>
                              )}
                            </div>

                            {/* Weight Breakdown - Green for auto-calculated */}
                            <div className="bg-green-50 p-2 rounded text-center border border-green-200">
                              <p className="text-xs text-green-800 font-medium">Weight Breakdown</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {(entry.calculation.fittingWeight || 0) > 0 && (
                                  <p className="text-[10px] text-green-700">Fitting: {entry.calculation.fittingWeight.toFixed(2)}kg</p>
                                )}
                                {(entry.calculation.pipeWeight || 0) > 0 && (
                                  <p className="text-[10px] text-green-700">Pipe: {entry.calculation.pipeWeight.toFixed(2)}kg</p>
                                )}
                                {dynamicTotalFlangeWeight > 0 && (
                                  <p className="text-[10px] text-green-700">Flanges: {dynamicTotalFlangeWeight.toFixed(2)}kg</p>
                                )}
                                {totalRingWeight > 0 && (
                                  <p className="text-[10px] text-amber-700 font-medium">R/F Rings: {totalRingWeight.toFixed(2)}kg ({rotatingFlangeCount}×)</p>
                                )}
                                {totalBlankFlangeWeight > 0 && (
                                  <p className="text-[10px] text-gray-700">Blanks: {totalBlankFlangeWeight.toFixed(2)}kg</p>
                                )}
                                {closureTotalWeight > 0 && (
                                  <p className="text-[10px] text-purple-700">Closures: {closureTotalWeight.toFixed(2)}kg</p>
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
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded text-center border border-purple-200 dark:border-purple-700">
                              <p className="text-xs text-purple-800 font-medium">
                                Weld Summary
                                <span className="ml-1 text-gray-400 font-normal cursor-help" title="Thickness based on fitting class (STD/XH/XXH) for ASTM specs, or pipe wall for SABS 719. Rounded to 0.5mm for WPS matching.">?</span>
                              </p>
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

                            {/* Weld Volume - Fuchsia */}
                            {fittingWeldVolume && (
                              <div className="bg-fuchsia-50 p-2 rounded text-center border border-fuchsia-200">
                                <p className="text-xs text-fuchsia-800 font-medium">Weld Volume</p>
                                <p className="text-lg font-bold text-fuchsia-900">{(fittingWeldVolume.totalVolumeCm3 * quantity).toFixed(1)}</p>
                                <p className="text-xs text-fuchsia-600">cm³ total</p>
                              </div>
                            )}

                            {/* Surface Area - Indigo */}
                            {mainOdMm && pipeWallThickness && (() => {
                              const totalLengthMm = (pipeALength || 0) + (pipeBLength || 0) + (teeHeight || 0);
                              const pipeLengthM = totalLengthMm / 1000;
                              const insideDiameterMm = mainOdMm - (2 * pipeWallThickness);
                              const surfaceArea = calculateComprehensiveSurfaceArea({
                                outsideDiameterMm: mainOdMm,
                                insideDiameterMm,
                                pipeLengthM,
                                numberOfFlanges: numFlanges,
                                dn: nominalBore,
                                pressureClass: pressureClassDesignation,
                              });
                              return (
                                <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                                  <p className="text-xs text-indigo-800 font-medium">Surface Area</p>
                                  <p className="text-lg font-bold text-indigo-900">{(surfaceArea.totalExternalAreaM2 * quantity).toFixed(2)}</p>
                                  <p className="text-xs text-indigo-600">m² external</p>
                                </div>
                              );
                            })()}
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

                      const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                      const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                      const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                      const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                      const flangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                      const flangeStandardName = flangeStandard?.code === 'SABS_1123' ? 'SABS 1123' : flangeStandard?.code === 'BS_4504' ? 'BS 4504' : flangeStandard?.code?.replace(/_/g, ' ') || '';
                      const pressureClassDesignation = pressureClass?.designation || '';

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
                          flangeSpecs={flangeSpecs}
                          flangeStandardName={flangeStandardName}
                          pressureClassDesignation={pressureClassDesignation}
                          flangeTypeCode={flangeTypeCode}
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
