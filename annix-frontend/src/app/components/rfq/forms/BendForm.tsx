'use client';

import React from 'react';
import { log } from '@/app/lib/logger';
import { Select } from '@/app/components/ui/Select';
import SplitPaneLayout from '@/app/components/rfq/SplitPaneLayout';
import {
  BEND_END_OPTIONS,
  SABS719_BEND_TYPES,
  sabs719CenterToFaceBySegments as getSABS719CenterToFaceBySegments,
  weldCountPerBend as getWeldCountPerBend,
  hasLooseFlange,
  getScheduleListForSpec,
  NB_TO_OD_LOOKUP,
  flangeWeight as getFlangeWeight,
  blankFlangeWeight as getBlankFlangeWeight,
  sansBlankFlangeWeight,
  tackWeldWeight as getTackWeldWeight,
  closureWeight as getClosureWeight,
  closureLengthLimits,
  retainingRingWeight,
  SABS_1123_FLANGE_TYPES,
  SABS_1123_PRESSURE_CLASSES,
  BS_4504_FLANGE_TYPES,
  BS_4504_PRESSURE_CLASSES,
  recommendedFlangeTypeCode,
  recommendedPressureClassId,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
  STEEL_SPEC_NB_FALLBACK,
  FITTING_CLASS_WALL_THICKNESS,
  MIN_BEND_DEGREES,
  MAX_BEND_DEGREES,
} from '@/app/lib/config/rfq';
import { SmartNotesDropdown, formatNotesForDisplay } from '@/app/components/rfq/SmartNotesDropdown';
import { WorkingConditionsSection } from '@/app/components/rfq/WorkingConditionsSection';
import { MaterialSuitabilityWarning } from '@/app/components/rfq/MaterialSuitabilityWarning';
import {
  SABS62_NB_OPTIONS,
  SABS62_BEND_RADIUS,
  getSabs62CFInterpolated,
  getSabs62AvailableAngles,
  SABS62BendType,
} from '@/app/lib/utils/sabs62CfData';
import { groupSteelSpecifications } from '@/app/lib/utils/steelSpecGroups';
import { roundToWeldIncrement } from '@/app/lib/utils/weldThicknessLookup';
import { calculateMinWallThickness, calculateBendWeldVolume, calculateComprehensiveSurfaceArea } from '@/app/lib/utils/pipeCalculations';
import {
  steelStandardBendRules,
  allowedBendTypes,
  isNominalBoreValidForSpec,
  calculateWallThinning,
  segmentedBendDeratingFactor,
  type BendFabricationType,
} from '@/app/lib/config/rfq';

export interface BendFormProps {
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
  onCalculateBend?: (id: string) => void;
  openSelects: Record<string, boolean>;
  openSelect: (id: string) => void;
  closeSelect: (id: string) => void;
  focusAndOpenSelect: (id: string, retryCount?: number) => void;
  generateItemDescription: (entry: any) => string;
  Bend3DPreview?: React.ComponentType<any> | null;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
  errors?: Record<string, string>;
  isLoadingNominalBores?: boolean;
  requiredProducts?: string[];
}

export default function BendForm({
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
  onCalculateBend,
  openSelects,
  openSelect,
  closeSelect,
  focusAndOpenSelect,
  generateItemDescription,
  Bend3DPreview,
  pressureClassesByStandard,
  getFilteredPressureClasses,
  errors = {},
  isLoadingNominalBores = false,
  requiredProducts = [],
}: BendFormProps) {
  return (
              <SplitPaneLayout
                entryId={entry.id}
                itemType="bend"
                showSplitToggle={entry.specs?.nominalBoreMm && entry.specs?.bendDegrees}
                formContent={
                  <>
                {/* Item Description */}
                <div>
                  <label htmlFor={`bend-description-${entry.id}`} className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    id={`bend-description-${entry.id}`}
                    value={entry.description || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                    rows={2}
                    placeholder="e.g., 40NB 90° 1.5D Bend"
                    required
                    aria-required="true"
                  />
                </div>

                {/* Working Conditions - Item Override + Steel Spec */}
                <WorkingConditionsSection
                  color="purple"
                  entryId={entry.id}
                  idPrefix="bend"
                  workingPressureBar={entry.specs?.workingPressureBar}
                  workingTemperatureC={entry.specs?.workingTemperatureC}
                  globalPressureBar={globalSpecs?.workingPressureBar}
                  globalTemperatureC={globalSpecs?.workingTemperatureC}
                  onPressureChange={(value) => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingPressureBar: value } })}
                  onTemperatureChange={(value) => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingTemperatureC: value } })}
                  onReset={() => onUpdateEntry(entry.id, { specs: { ...entry.specs, workingPressureBar: undefined, workingTemperatureC: undefined, steelSpecificationId: undefined } })}
                  gridCols={3}
                  extraFields={
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Steel Specification
                        {(() => {
                          const isUsingGlobal = !entry.specs?.steelSpecificationId && globalSpecs?.steelSpecificationId;
                          const isOverride = entry.specs?.steelSpecificationId && entry.specs.steelSpecificationId !== globalSpecs?.steelSpecificationId;
                          if (isUsingGlobal) return <span className="text-green-600 text-xs ml-2">(Global)</span>;
                          if (isOverride) return <span className="text-orange-600 text-xs ml-2">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      {(() => {
                        const selectId = `bend-steel-spec-${entry.id}`;
                        const groupedOptions = masterData.steelSpecs
                          ? groupSteelSpecifications(masterData.steelSpecs)
                          : [];

                        return (
                          <Select
                            id={selectId}
                            value={String(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || '')}
                            onChange={(value) => {
                              const newSpecId = value ? Number(value) : undefined;
                              const nominalBore = entry.specs?.nominalBoreMm;

                              const newSpec = newSpecId ? masterData.steelSpecs?.find((s: any) => s.id === newSpecId) : null;
                              const newSpecName = newSpec?.steelSpecName || '';
                              const isNewSABS719 = newSpecName.includes('SABS 719') || newSpecName.includes('SANS 719');

                              const oldSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                              const oldSpec = oldSpecId ? masterData.steelSpecs?.find((s: any) => s.id === oldSpecId) : null;
                              const oldSpecName = oldSpec?.steelSpecName || '';
                              const wasOldSABS719 = oldSpecName.includes('SABS 719') || oldSpecName.includes('SANS 719');

                              const specTypeChanged = isNewSABS719 !== wasOldSABS719;
                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  steelSpecificationId: newSpecId,
                                  scheduleNumber: specTypeChanged ? undefined : entry.specs?.scheduleNumber,
                                  wallThicknessMm: specTypeChanged ? undefined : entry.specs?.wallThicknessMm,
                                  bendType: specTypeChanged ? undefined : entry.specs?.bendType,
                                  bendRadiusType: specTypeChanged ? undefined : entry.specs?.bendRadiusType,
                                  bendDegrees: specTypeChanged ? undefined : entry.specs?.bendDegrees,
                                  numberOfSegments: specTypeChanged ? undefined : entry.specs?.numberOfSegments,
                                  centerToFaceMm: specTypeChanged ? undefined : entry.specs?.centerToFaceMm,
                                  bendRadiusMm: specTypeChanged ? undefined : entry.specs?.bendRadiusMm
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (!specTypeChanged && nominalBore && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            options={[]}
                            groupedOptions={groupedOptions}
                            placeholder="Select Steel Spec"
                            open={openSelects[selectId]}
                            onOpenChange={(isOpen) => isOpen ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  }
                />
                <MaterialSuitabilityWarning
                  color="purple"
                  steelSpecName={(() => {
                    const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                    return masterData.steelSpecs?.find((s: any) => s.id === steelSpecId)?.steelSpecName || '';
                  })()}
                  effectivePressure={entry.specs?.workingPressureBar || globalSpecs?.workingPressureBar}
                  effectiveTemperature={entry.specs?.workingTemperatureC || globalSpecs?.workingTemperatureC}
                  allSteelSpecs={masterData.steelSpecs || []}
                  onSelectSpec={(spec) => onUpdateEntry(entry.id, { specs: { ...entry.specs, steelSpecificationId: spec.id } })}
                />

                {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
                {(() => {
                  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                  const steelSpecName = steelSpec?.steelSpecName || '';
                  const bendRules = steelStandardBendRules(steelSpecName);
                  const allowedTypes = allowedBendTypes(steelSpecName);
                  const isSABS719 = steelSpecName.includes('SABS 719') || steelSpecName.includes('SANS 719');
                  const isSABS62 = steelSpecName.includes('SABS 62') || steelSpecName.includes('SANS 62');
                  const isSegmentedAllowed = allowedTypes.includes('segmented');
                  const isPulledOnly = allowedTypes.length === 1 && allowedTypes[0] === 'pulled';

                  // Determine effective bend style (explicit selection or default from spec)
                  const effectiveBendStyle = entry.specs?.bendStyle || (isSABS719 ? 'segmented' : 'pulled');
                  const isSegmentedStyle = effectiveBendStyle === 'segmented';

                  // Common Steel Spec dropdown (used in both layouts)
                  const SteelSpecDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Steel Specification
                        {(() => {
                          const isUsingGlobal = !entry.specs?.steelSpecificationId && globalSpecs?.steelSpecificationId;
                          const isOverride = entry.specs?.steelSpecificationId && entry.specs.steelSpecificationId !== globalSpecs?.steelSpecificationId;
                          if (isUsingGlobal) return <span className="text-green-600 text-xs ml-2">(From Global)</span>;
                          if (isOverride) return <span className="text-orange-600 text-xs ml-2">(Override)</span>;
                          return null;
                        })()}
                      </label>
                      {(() => {
                        const selectId = `bend-steel-spec-${entry.id}`;
                        const groupedOptions = masterData.steelSpecs
                          ? groupSteelSpecifications(masterData.steelSpecs)
                          : [];

                        return (
                          <Select
                            id={selectId}
                            value={String(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || '')}
                            onChange={(value) => {
                              const newSpecId = value ? Number(value) : undefined;
                              const nominalBore = entry.specs?.nominalBoreMm;

                              const newSpec = newSpecId ? masterData.steelSpecs?.find((s: any) => s.id === newSpecId) : null;
                              const newSpecName = newSpec?.steelSpecName || '';
                              const isNewSABS719 = newSpecName.includes('SABS 719') || newSpecName.includes('SANS 719');

                              const oldSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                              const oldSpec = oldSpecId ? masterData.steelSpecs?.find((s: any) => s.id === oldSpecId) : null;
                              const oldSpecName = oldSpec?.steelSpecName || '';
                              const wasOldSABS719 = oldSpecName.includes('SABS 719') || oldSpecName.includes('SANS 719');

                              const specTypeChanged = isNewSABS719 !== wasOldSABS719;

                              let matchedSchedule: string | undefined;
                              let matchedWT: number | undefined;
                              let keepNB = false;

                              if (nominalBore && newSpecId) {
                                const nbValidForNewSpec = isNominalBoreValidForSpec(newSpecName, nominalBore);
                                if (nbValidForNewSpec) {
                                  keepNB = true;
                                  const schedules = getScheduleListForSpec(nominalBore, newSpecId);
                                  const pressure = globalSpecs?.workingPressureBar || 0;

                                  if (pressure > 0 && schedules.length > 0) {
                                    const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                                    const temperature = globalSpecs?.workingTemperatureC || 20;
                                    const minWT = calculateMinWallThickness(od, pressure, 'ASTM_A106_Grade_B', temperature, 1.0, 0, 1.2);

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
                                }
                              }

                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  steelSpecificationId: newSpecId,
                                  nominalBoreMm: keepNB ? nominalBore : undefined,
                                  scheduleNumber: keepNB ? matchedSchedule : undefined,
                                  wallThicknessMm: keepNB ? matchedWT : undefined,
                                  bendType: specTypeChanged ? undefined : entry.specs?.bendType,
                                  bendRadiusType: specTypeChanged ? undefined : entry.specs?.bendRadiusType,
                                  bendDegrees: specTypeChanged ? undefined : entry.specs?.bendDegrees,
                                  numberOfSegments: specTypeChanged ? undefined : entry.specs?.numberOfSegments,
                                  centerToFaceMm: specTypeChanged ? undefined : entry.specs?.centerToFaceMm,
                                  bendRadiusMm: specTypeChanged ? undefined : entry.specs?.bendRadiusMm
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (newSpecId && specTypeChanged) {
                                const nextFieldId = isNewSABS719
                                  ? `bend-radius-type-${entry.id}`
                                  : `bend-type-${entry.id}`;
                                setTimeout(() => focusAndOpenSelect(nextFieldId), 100);
                              } else if (keepNB && matchedSchedule) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            options={[]}
                            groupedOptions={groupedOptions}
                            placeholder="Select Steel Spec"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                      {errors[`bend_${index}_steelSpec`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`bend_${index}_steelSpec`]}</p>
                      )}
                    </div>
                  );

                  // NB Dropdown (shared logic but different placement)
                  const NBDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Nominal Bore (mm) *
                        <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help" title="Internal pipe diameter designation. NB (Nominal Bore) is the standard way to specify pipe size. Actual OD (Outside Diameter) varies by schedule.">?</span>
                      </label>
                      {(() => {
                        const selectId = `bend-nb-${entry.id}`;
                        const isDisabled = false;

                        const nbOptions = (() => {
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                          const steelSpecName = steelSpec?.steelSpecName || '';
                          const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => steelSpecName.includes(pattern))?.[1];
                          const nbs = fallbackNBs || [40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
                          return nbs.map((nb: number) => ({
                            value: String(nb),
                            label: `${nb} NB`
                          }));
                        })();

                        const selectedNB = entry.specs?.nominalBoreMm;
                        const nbValid = selectedNB ? isNominalBoreValidForSpec(steelSpecName, selectedNB) : true;
                        const nbRules = bendRules;

                        return (
                          <>
                            <Select
                              id={selectId}
                              value={entry.specs?.nominalBoreMm ? String(entry.specs.nominalBoreMm) : ''}
                              onChange={(value) => {
                                const nominalBore = parseInt(value);
                                if (!nominalBore) return;

                                const pressure = globalSpecs?.workingPressureBar || 0;
                                const nbEffectiveSpecId = entry?.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                                const schedules = getScheduleListForSpec(nominalBore, nbEffectiveSpecId);

                                let matchedSchedule: string | null = null;
                                let matchedWT = 0;

                                if (pressure > 0 && schedules.length > 0) {
                                  const od = NB_TO_OD_LOOKUP[nominalBore] || (nominalBore * 1.05);
                                  const temperature = globalSpecs?.workingTemperatureC || 20;
                                  const minWT = calculateMinWallThickness(od, pressure, 'ASTM_A106_Grade_B', temperature, 1.0, 0, 1.2);

                                  const eligibleSchedules = schedules
                                    .filter(s => s.wallThicknessMm >= minWT)
                                    .sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

                                  if (eligibleSchedules.length > 0) {
                                    matchedSchedule = eligibleSchedules[0].scheduleDesignation;
                                    matchedWT = eligibleSchedules[0].wallThicknessMm;
                                  } else {
                                    const sorted = [...schedules].sort((a, b) => b.wallThicknessMm - a.wallThicknessMm);
                                    matchedSchedule = sorted[0].scheduleDesignation;
                                    matchedWT = sorted[0].wallThicknessMm;
                                  }
                                } else if (schedules.length > 0) {
                                  const sch40 = schedules.find(s => s.scheduleDesignation === '40' || s.scheduleDesignation === 'Sch 40');
                                  if (sch40) {
                                    matchedSchedule = sch40.scheduleDesignation;
                                    matchedWT = sch40.wallThicknessMm;
                                  } else {
                                    matchedSchedule = schedules[0].scheduleDesignation;
                                    matchedWT = schedules[0].wallThicknessMm;
                                  }
                                }

                                let newCenterToFace: number | undefined = undefined;
                                let newBendRadius: number | undefined = undefined;

                                if (isSegmentedStyle && entry.specs?.bendRadiusType && entry.specs?.numberOfSegments) {
                                  const cfResult = getSABS719CenterToFaceBySegments(
                                    entry.specs.bendRadiusType,
                                    nominalBore,
                                    entry.specs.numberOfSegments
                                  );
                                  if (cfResult) {
                                    newCenterToFace = cfResult.centerToFace;
                                    newBendRadius = cfResult.radius;
                                  }
                                }

                                if (!isSegmentedStyle && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                  const bendType = entry.specs.bendType as SABS62BendType;
                                  newCenterToFace = getSabs62CFInterpolated(bendType, entry.specs.bendDegrees, nominalBore);
                                  newBendRadius = SABS62_BEND_RADIUS[bendType]?.[nominalBore];
                                }

                                const updatedEntry: any = {
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    nominalBoreMm: nominalBore,
                                    scheduleNumber: matchedSchedule,
                                    wallThicknessMm: matchedWT,
                                    centerToFaceMm: newCenterToFace,
                                    bendRadiusMm: newBendRadius
                                  }
                                };
                                updatedEntry.description = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, updatedEntry);

                                const hasBendSpecs = isSegmentedStyle
                                  ? (entry.specs?.bendRadiusType && entry.specs?.bendDegrees)
                                  : (entry.specs?.bendType && entry.specs?.bendDegrees);
                                if (matchedSchedule && hasBendSpecs) {
                                  setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                                }

                                if (!entry.specs?.bendDegrees) {
                                  setTimeout(() => focusAndOpenSelect(`bend-angle-${entry.id}`), 100);
                                }
                              }}
                              options={nbOptions}
                              placeholder="Select NB"
                              disabled={isDisabled}
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                            />
                            {selectedNB && !nbValid && nbRules && (
                              <p className="text-xs text-orange-600 mt-0.5">
                                {selectedNB} NB outside typical range ({nbRules.minNominalBoreMm}-{nbRules.maxNominalBoreMm} NB) for {nbRules.category.replace('_', ' ')}
                              </p>
                            )}
                            {errors[`bend_${index}_nb`] && (
                              <p role="alert" className="mt-1 text-xs text-red-600">{errors[`bend_${index}_nb`]}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );

                  // Schedule Dropdown (shared)
                  const ScheduleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Schedule *
                        <span className="ml-1 text-gray-400 font-normal cursor-help" title="Schedule determines wall thickness. Auto-selected based on ASME B31.3 pressure requirements when working pressure is set. Higher schedules = thicker walls = higher pressure rating.">?</span>
                        {entry.specs?.scheduleNumber && globalSpecs?.workingPressureBar && (
                          <span className="text-green-600 text-xs ml-2">(Auto)</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `bend-schedule-${entry.id}`;
                        const schedEffectiveSpecId = entry.specs?.steelSpecificationId ?? globalSpecs?.steelSpecificationId;
                        const schedules = getScheduleListForSpec(entry.specs?.nominalBoreMm || 0, schedEffectiveSpecId);
                        const options = schedules.map((s: any) => ({
                          value: s.scheduleDesignation,
                          label: `${s.scheduleDesignation} (${s.wallThicknessMm}mm)`
                        }));

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.scheduleNumber || ''}
                            onChange={(schedule) => {
                              if (!schedule) return;
                              const scheduleData = schedules.find((s: any) => s.scheduleDesignation === schedule);
                              const updatedEntry: any = {
                                ...entry,
                                specs: { ...entry.specs, scheduleNumber: schedule, wallThicknessMm: scheduleData?.wallThicknessMm }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                            }}
                            options={options}
                            placeholder={entry.specs?.nominalBoreMm ? 'Select Schedule' : 'Select NB first'}
                            disabled={!entry.specs?.nominalBoreMm}
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                      {entry.specs?.wallThicknessMm && (
                        <p className="text-xs text-green-700 mt-0.5">WT: {entry.specs.wallThicknessMm}mm</p>
                      )}
                      {errors[`bend_${index}_schedule`] && (
                        <p role="alert" className="mt-1 text-xs text-red-600">{errors[`bend_${index}_schedule`]}</p>
                      )}
                    </div>
                  );

                  // Bend Style Dropdown (Segmented vs Pulled)
                  const BendStyleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Bend Style *
                        <span className="ml-1 text-gray-400 font-normal cursor-help" title="Segmented = welded mitre segments (SABS 719). Pulled = smooth induction bends (SABS 62). Steel spec may restrict options.">?</span>
                      </label>
                      {(() => {
                        const selectId = `bend-style-${entry.id}`;
                        const options = [
                          { value: 'segmented', label: 'Segmented Bend', disabled: !isSegmentedAllowed },
                          { value: 'pulled', label: 'Pulled Bend' }
                        ];
                        const currentStyle = entry.specs?.bendStyle || (isSABS719 ? 'segmented' : 'pulled');

                        return (
                          <Select
                            id={selectId}
                            value={currentStyle}
                            onChange={(style) => {
                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  bendStyle: style,
                                  bendType: undefined,
                                  bendRadiusType: undefined,
                                  numberOfSegments: undefined,
                                  bendDegrees: undefined,
                                  centerToFaceMm: undefined,
                                  bendRadiusMm: undefined
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                            }}
                            options={options}
                            placeholder="Select Bend Style"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // Pulled Bend Type Dropdown (1D, 1.5D, 2D, etc.)
                  const BendTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Bend Radius *
                        <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help" title="Radius multiplier of nominal bore. 1D = tight elbow (radius = 1×NB). 1.5D = short radius (1.5×NB). 2D = standard (2×NB). 3D = long radius (3×NB). 5D = extra long (5×NB). Larger D = gentler curve, lower pressure drop.">?</span>
                      </label>
                      {(() => {
                        const selectId = `bend-type-${entry.id}`;
                        const options = [
                          { value: '1D', label: '1D (Elbow)' },
                          { value: '1.5D', label: '1.5D (Short Radius)' },
                          { value: '2D', label: '2D (Standard)' },
                          { value: '3D', label: '3D (Long Radius)' },
                          { value: '5D', label: '5D (Extra Long)' }
                        ];

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.bendType || ''}
                            onChange={(bendType) => {
                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  bendType: bendType || undefined,
                                  nominalBoreMm: undefined,
                                  bendDegrees: undefined,
                                  centerToFaceMm: undefined,
                                  bendRadiusMm: undefined
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (bendType) {
                                setTimeout(() => focusAndOpenSelect(`bend-nb-${entry.id}`), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select Bend Type"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // Segmented Bend Radius Type Dropdown (Short/Medium/Long)
                  const RadiusTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Bend Radius *
                        <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help" title="LRSE = Long Radius (3D, gentler curve). MRSE = Medium Radius (2.5D, tighter curve). Larger radius = lower pressure drop, easier flow.">?</span>
                      </label>
                      {(() => {
                        const selectId = `bend-radius-type-${entry.id}`;
                        const options = SABS719_BEND_TYPES.map(opt => ({
                          value: opt.value,
                          label: opt.label
                        }));

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.bendRadiusType || ''}
                            onChange={(radiusType) => {
                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  bendRadiusType: radiusType || undefined,
                                  bendType: undefined,
                                  numberOfSegments: undefined,
                                  centerToFaceMm: undefined,
                                  bendRadiusMm: undefined,
                                  bendDegrees: undefined
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (radiusType) {
                                setTimeout(() => focusAndOpenSelect(`bend-angle-${entry.id}`), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select Radius Type"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // Angle Dropdown - uses different angle lists based on bend style
                  const pulledBendType = entry.specs?.bendType as SABS62BendType | undefined;
                  const currentNB = entry.specs?.nominalBoreMm;
                  const availableAngles = !isSegmentedStyle && pulledBendType && currentNB
                    ? getSabs62AvailableAngles(pulledBendType, currentNB)
                    : [];

                  const AngleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Bend Angle *
                        <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help" title="The angle of direction change. 90° is a right-angle turn, 45° is a diagonal, 180° is a U-turn (return bend).">?</span>
                      </label>
                      {(() => {
                        const selectId = `bend-angle-${entry.id}`;
                        const isDisabled = !isSegmentedStyle && !pulledBendType;

                        const angleOptions = (() => {
                          if (!isSegmentedStyle) {
                            return availableAngles.map(deg => ({
                              value: String(deg),
                              label: `${deg}°`
                            }));
                          }
                          const sabs719Angles = [
                            ...Array.from({ length: 22 }, (_, i) => i + 1),
                            22.5,
                            ...Array.from({ length: 15 }, (_, i) => i + 23),
                            37.5,
                            ...Array.from({ length: 52 }, (_, i) => i + 38),
                            90,
                            ...Array.from({ length: 90 }, (_, i) => i + 91)
                          ];
                          return sabs719Angles.map(deg => ({
                            value: String(deg),
                            label: `${deg}°`
                          }));
                        })();

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.bendDegrees ? String(entry.specs.bendDegrees) : ''}
                            onChange={(value) => {
                              const rawDegrees = value ? parseFloat(value) : undefined;
                              const bendDegrees = rawDegrees !== undefined
                                ? Math.max(MIN_BEND_DEGREES, Math.min(MAX_BEND_DEGREES, rawDegrees))
                                : undefined;
                              let centerToFaceMm: number | undefined;
                              let bendRadiusMm: number | undefined;
                              if (!isSegmentedStyle && bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.bendType) {
                                const bendType = entry.specs.bendType as SABS62BendType;
                                centerToFaceMm = getSabs62CFInterpolated(bendType, bendDegrees, entry.specs.nominalBoreMm);
                                bendRadiusMm = SABS62_BEND_RADIUS[bendType]?.[entry.specs.nominalBoreMm];
                              }
                              const updatedEntry: any = {
                                ...entry,
                                specs: { ...entry.specs, bendDegrees, centerToFaceMm, bendRadiusMm, numberOfSegments: isSegmentedStyle ? undefined : entry.specs?.numberOfSegments }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                              if (bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            options={angleOptions}
                            placeholder={isDisabled ? 'Select Bend Radius first' : 'Select Angle'}
                            disabled={isDisabled}
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // SABS 62 C/F Display
                  const CFDisplay = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        C/F (mm)
                        {entry.specs?.centerToFaceMm && <span className="text-green-600 text-xs ml-1">(Auto)</span>}
                      </label>
                      <input
                        type="text"
                        value={
                          entry.specs?.centerToFaceMm
                            ? `${Number(entry.specs.centerToFaceMm).toFixed(1)} mm`
                            : 'Select specs'
                        }
                        disabled
                        className={`w-full px-3 py-2 border rounded-md text-sm cursor-not-allowed ${
                          entry.specs?.centerToFaceMm ? 'bg-green-50 border-green-300 text-green-900 font-medium' : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                    </div>
                  );

                  // SABS 719 Segments Dropdown
                  const SegmentsDropdown = (
                    <div>
                      {(() => {
                        const bendRadiusType = entry.specs?.bendRadiusType;
                        const bendDeg = entry.specs?.bendDegrees || 0;
                        const nominalBore = entry.specs?.nominalBoreMm || 0;

                        if (!bendRadiusType || bendDeg <= 0) {
                          return (
                            <>
                              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                Segments <span className="text-purple-600 text-xs ml-1">(SABS 719)</span>
                              </label>
                              <input type="text" value="Select radius & angle" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                            </>
                          );
                        }

                        const getSegmentOptions = (deg: number): number[] => {
                          if (deg <= 11) return [2];
                          if (deg <= 37) return [2, 3];
                          if (deg <= 59) return [3, 4];
                          return [5, 6, 7];
                        };

                        const segmentOptions = getSegmentOptions(bendDeg);
                        const isAutoFill = bendDeg <= 11;

                        if (isAutoFill && entry.specs?.numberOfSegments !== 2) {
                          setTimeout(() => {
                            const cfResult = getSABS719CenterToFaceBySegments(bendRadiusType, nominalBore, 2);
                            const updatedEntry: any = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                numberOfSegments: 2,
                                centerToFaceMm: cfResult?.centerToFace,
                                bendRadiusMm: cfResult?.radius
                              }
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                            if (nominalBore && entry.specs?.scheduleNumber) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }, 50);
                        }

                        if (isAutoFill) {
                          return (
                            <>
                              <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                Segments <span className="text-green-600 text-xs ml-1">(Auto: 2)</span>
                              </label>
                              <input type="text" value="2 segments" disabled className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-green-50 text-green-900 font-medium cursor-not-allowed" />
                            </>
                          );
                        }

                        return (
                          <>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Segments *
                              <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help" title="Number of welded pipe sections forming the bend. More segments = smoother curve but more mitre welds. Fewer segments = simpler fabrication but more abrupt angle changes.">?</span>
                              <span className="text-purple-600 text-xs ml-1">({segmentOptions.join(' or ')})</span>
                            </label>
                            <select
                              value={entry.specs?.numberOfSegments || ''}
                              onChange={(e) => {
                                const segments = e.target.value ? parseInt(e.target.value) : undefined;
                                let centerToFace: number | undefined;
                                let bendRadius: number | undefined;
                                if (segments && bendRadiusType && nominalBore) {
                                  const cfResult = getSABS719CenterToFaceBySegments(bendRadiusType, nominalBore, segments);
                                  if (cfResult) { centerToFace = cfResult.centerToFace; bendRadius = cfResult.radius; }
                                }
                                const updatedEntry: any = {
                                  ...entry,
                                  specs: { ...entry.specs, numberOfSegments: segments, centerToFaceMm: centerToFace, bendRadiusMm: bendRadius }
                                };
                                updatedEntry.description = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, updatedEntry);
                                if (segments && nominalBore && entry.specs?.scheduleNumber) {
                                  setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                            >
                              <option value="">Select</option>
                              {segmentOptions.map(seg => (
                                <option key={seg} value={seg}>{seg} segments</option>
                              ))}
                            </select>
                          </>
                        );
                      })()}
                    </div>
                  );

                  // Quantity Input (shared by both layouts)
                  const QuantityInput = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={entry.specs?.quantityValue || ''}
                        onChange={(e) => {
                          const quantity = parseInt(e.target.value) || 1;
                          onUpdateEntry(entry.id, {
                            specs: { ...entry.specs, quantityValue: quantity }
                          });
                          if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                            setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                        min="1"
                        placeholder="1"
                      />
                    </div>
                  );

                  // Unified Layout: Row 1: NB | Schedule | Bend Style, Row 2: depends on style
                  return (
                    <>
                      {/* Row 1: NB | Schedule | Bend Style */}
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {NBDropdown}
                          {ScheduleDropdown}
                          {BendStyleDropdown}
                        </div>
                      </div>

                      {/* Row 2: Based on Bend Style selection */}
                      {isSegmentedStyle ? (
                        <>
                          {/* Segmented: Radius Type | Angle | Segments */}
                          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              {RadiusTypeDropdown}
                              {AngleDropdown}
                              {SegmentsDropdown}
                              {QuantityInput}
                            </div>
                          </div>
                          {/* Pressure Derating for Segmented Bends - Single line */}
                          {entry.specs?.numberOfSegments && entry.specs?.numberOfSegments > 1 && entry.specs?.bendDegrees && (() => {
                            const derating = segmentedBendDeratingFactor(entry.specs.numberOfSegments, entry.specs.bendDegrees);
                            const deratingPercent = Math.round((1 - derating) * 100);
                            return (
                              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2 mt-3">
                                <p className="text-xs text-orange-800 dark:text-orange-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <span className="font-bold">Segmented Bend Pressure Derating:</span>
                                  <span className="text-orange-700 dark:text-orange-300">{entry.specs.numberOfSegments} segments ({entry.specs.numberOfSegments - 1} mitre welds)</span>
                                  <span className="font-medium">Effective pressure: {Math.round(derating * 100)}% ({deratingPercent}% reduction)</span>
                                  <span className="text-orange-600 dark:text-orange-400 italic">Per ASME B31.3</span>
                                </p>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {/* Pulled: Bend Type | Angle | C/F | QTY */}
                          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 mt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              {BendTypeDropdown}
                              {AngleDropdown}
                              {CFDisplay}
                              {QuantityInput}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Flange Configuration Row - 4 columns (matching Pipes form) */}
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mt-3">
                  <div className="mb-2">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Flange Specification
                    </h4>
                  </div>
                  {(() => {
                    const effectiveStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                    const effectivePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                    const effectiveFlangeTypeCode = entry.specs?.flangeTypeCode || globalSpecs?.flangeTypeCode;
                    const selectedStandard = masterData.flangeStandards?.find((fs: any) => fs.id === effectiveStandardId);
                    const isSabs1123 = selectedStandard?.code?.toUpperCase().includes('SABS') && selectedStandard?.code?.includes('1123');
                    const isBs4504 = selectedStandard?.code?.toUpperCase().includes('BS') && selectedStandard?.code?.includes('4504');
                    const showFlangeType = isSabs1123 || isBs4504;
                    const flangeTypes = isSabs1123 ? SABS_1123_FLANGE_TYPES : BS_4504_FLANGE_TYPES;
                    const pressureClasses = isSabs1123 ? SABS_1123_PRESSURE_CLASSES : BS_4504_PRESSURE_CLASSES;
                    const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                    const configUpper = bendEndConfig.toUpperCase();
                    const hasInletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);
                    const hasOutletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);
                    const hasFlanges = hasInletFlange || hasOutletFlange;
                    const availableBlankPositions: { key: string; label: string }[] = [
                      ...(hasInletFlange ? [{ key: 'inlet', label: 'Inlet' }] : []),
                      ...(hasOutletFlange ? [{ key: 'outlet', label: 'Outlet' }] : [])
                    ];
                    const currentBlankPositions = entry.specs?.blankFlangePositions || [];

                    const isStandardFromGlobal = globalSpecs?.flangeStandardId && !entry.specs?.flangeStandardId;
                    const isClassFromGlobal = globalSpecs?.flangePressureClassId && !entry.specs?.flangePressureClassId;
                    const isTypeFromGlobal = globalSpecs?.flangeTypeCode && !entry.specs?.flangeTypeCode;

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Standard
                              {isStandardFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {entry.specs?.flangeStandardId && entry.specs?.flangeStandardId !== globalSpecs?.flangeStandardId && <span className="ml-1 text-amber-600 font-normal">(Override)</span>}
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="Flange standard determines pressure class options and flange dimensions">?</span>
                            </label>
                            <select
                              value={effectiveStandardId || ''}
                              onChange={(e) => {
                                const standardId = parseInt(e.target.value) || undefined;
                                onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined, flangeTypeCode: undefined }
                                });
                                if (standardId) {
                                  getFilteredPressureClasses(standardId);
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                            >
                              <option value="">Select...</option>
                              {masterData.flangeStandards?.map((standard: any) => (
                                <option key={standard.id} value={standard.id}>{standard.code}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {isSabs1123 ? 'Class (kPa)' : 'Class'}
                              {isClassFromGlobal && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {entry.specs?.flangePressureClassId && entry.specs?.flangePressureClassId !== globalSpecs?.flangePressureClassId && <span className="ml-1 text-amber-600 font-normal">(Override)</span>}
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="Flange pressure rating. Should match or exceed working pressure.">?</span>
                            </label>
                            {showFlangeType ? (
                              <select
                                value={effectivePressureClassId || ''}
                                onChange={(e) => onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangePressureClassId: parseInt(e.target.value) || undefined }
                                })}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                              >
                                <option value="">Select...</option>
                                {pressureClasses.map((pc) => {
                                  const matchingPc = masterData.pressureClasses?.find((mpc: any) => mpc.designation?.includes(String(pc.value)));
                                  return matchingPc ? (
                                    <option key={matchingPc.id} value={matchingPc.id}>{isSabs1123 ? pc.value : pc.label}</option>
                                  ) : null;
                                })}
                              </select>
                            ) : (
                              <select
                                value={effectivePressureClassId || ''}
                                onChange={(e) => onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangePressureClassId: parseInt(e.target.value) || undefined }
                                })}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                              >
                                <option value="">Select...</option>
                                {(pressureClassesByStandard[effectiveStandardId || 0] || masterData.pressureClasses || []).map((pc: any) => (
                                  <option key={pc.id} value={pc.id}>{pc.designation}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Type
                              {isTypeFromGlobal && showFlangeType && <span className="ml-1 text-green-600 font-normal">(Global)</span>}
                              {entry.specs?.flangeTypeCode && entry.specs?.flangeTypeCode !== globalSpecs?.flangeTypeCode && showFlangeType && <span className="ml-1 text-amber-600 font-normal">(Override)</span>}
                            </label>
                            {showFlangeType ? (
                              <select
                                value={effectiveFlangeTypeCode || ''}
                                onChange={(e) => onUpdateEntry(entry.id, {
                                  specs: { ...entry.specs, flangeTypeCode: e.target.value || undefined }
                                })}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                              >
                                <option value="">Select...</option>
                                {flangeTypes.map((ft) => (
                                  <option key={ft.code} value={ft.code}>{ft.name} ({ft.code})</option>
                                ))}
                              </select>
                            ) : (
                              <div className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                N/A
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              Config
                              <span className="ml-1 text-gray-400 font-normal cursor-help" title="PE = Plain End (for butt welding). FOE = Flanged One End. FBE = Flanged Both Ends. L/F = Loose Flange (slip-on). R/F = Rotating Flange (backing ring).">?</span>
                            </label>
                            <select
                              value={entry.specs?.bendEndConfiguration || 'PE'}
                              onChange={(e) => {
                                const newConfig = e.target.value;
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
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    bendEndConfiguration: newConfig,
                                    flangeTypeCode: newFlangeTypeCode,
                                    blankFlangePositions: [],
                                    addBlankFlange: false,
                                    blankFlangeCount: 0,
                                    ...(newPressureClassId && { flangePressureClassId: newPressureClassId })
                                  }
                                };
                                updatedEntry.description = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                            >
                              {BEND_END_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {hasFlanges && availableBlankPositions.length > 0 && (
                          <div className="mt-2 flex justify-end">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Blank:</span>
                              <span className="text-gray-400 font-normal cursor-help text-xs" title="Add blank flanges for hydrostatic testing, isolation, or future connections.">?</span>
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
                                  <span className="text-xs text-gray-800 dark:text-gray-300">{pos.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Three-Column Layout Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {/* Column 1 - Bend Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-purple-500 dark:border-purple-400 pb-1.5">
                      Bend Info
                    </h4>

                    {/* Wall Thinning Info for Pulled Bends */}
                    {entry.specs?.bendRadiusMm && entry.specs?.nominalBoreMm && entry.specs?.wallThicknessMm && (() => {
                      const specId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      const spec = masterData.steelSpecs?.find((s: any) => s.id === specId);
                      const specName = spec?.steelSpecName || '';
                      const isPulledBend = !specName.includes('SABS 719') && !specName.includes('SANS 719');
                      if (!isPulledBend) return null;

                      const od = NB_TO_OD_LOOKUP[entry.specs.nominalBoreMm] || (entry.specs.nominalBoreMm * 1.05);
                      const thinning = calculateWallThinning(entry.specs.bendRadiusMm, od, entry.specs.wallThicknessMm);
                      return (
                        <div className={`border rounded-lg p-3 ${thinning.withinAcceptableLimit ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-300'}`}>
                          <h5 className={`text-xs font-bold mb-1 ${thinning.withinAcceptableLimit ? 'text-purple-900' : 'text-red-900'}`}>
                            Pulled Bend Wall Thinning
                          </h5>
                          <div className="grid grid-cols-2 gap-x-2 text-xs">
                            <p className={thinning.withinAcceptableLimit ? 'text-purple-700' : 'text-red-700'}>
                              Extrados: {thinning.extradosThicknessMm}mm ({thinning.thinningPercent}% thin)
                            </p>
                            <p className={thinning.withinAcceptableLimit ? 'text-purple-700' : 'text-red-700'}>
                              Intrados: {thinning.intradosThicknessMm}mm (+{thinning.thickeningPercent}%)
                            </p>
                          </div>
                          {!thinning.withinAcceptableLimit && (
                            <p className="text-xs text-red-800 font-medium mt-1">
                              ⚠️ Exceeds {thinning.maxAllowedThinningPercent}% max thinning - consider thicker pipe or larger bend radius
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Closure Length - Only for L/F configs */}
                    {hasLooseFlange(entry.specs?.bendEndConfiguration || '') && (
                      <div className="bg-purple-50 p-2 rounded-md border border-purple-200">
                        <label className="block text-xs font-semibold text-purple-900 mb-1">
                          Closure Length (mm) *
                        </label>
                        <input
                          type="number"
                          value={entry.specs?.closureLengthMm || ''}
                          onChange={(e) => {
                            onUpdateEntry(entry.id, {
                              specs: { ...entry.specs, closureLengthMm: e.target.value ? Number(e.target.value) : undefined }
                            });
                          }}
                          placeholder="150"
                          className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md text-sm text-gray-900 dark:text-gray-100"
                        />
                        {errors[`bend_${index}_closureLength`] && (
                          <p role="alert" className="mt-1 text-xs text-red-600">{errors[`bend_${index}_closureLength`]}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column 2 - Tangents & Length */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-purple-500 dark:border-purple-400 pb-1.5">
                      Tangents & Length
                    </h4>

                    {/* Tangents Section */}
                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-purple-900 mb-2">Tangent Extensions</h5>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Number of Tangents
                        </label>
                        <select
                          value={entry.specs?.numberOfTangents || 0}
                          onChange={(e) => {
                            const count = parseInt(e.target.value) || 0;
                            const currentLengths = entry.specs?.tangentLengths || [];
                            const newLengths = count === 0 ? [] :
                                             count === 1 ? [currentLengths[0] || 150] :
                                             [currentLengths[0] || 150, currentLengths[1] || 150];
                            const updatedEntry = {
                              ...entry,
                              specs: {
                                ...entry.specs,
                                numberOfTangents: count,
                                tangentLengths: newLengths
                              }
                            };
                            updatedEntry.description = generateItemDescription(updatedEntry);
                            onUpdateEntry(entry.id, updatedEntry);
                            if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                              setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                        >
                          <option value="0">0 - No Tangents</option>
                          <option value="1">1 - Single Tangent</option>
                          <option value="2">2 - Both Tangents</option>
                        </select>
                      </div>

                      {(entry.specs?.numberOfTangents || 0) >= 1 && (
                        <div className="mt-2 bg-purple-50 dark:bg-purple-900/30 p-2 rounded-md border border-purple-200 dark:border-purple-700">
                          <label className="block text-xs font-semibold text-purple-900 mb-1">
                            Tangent 1 Length (mm)
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.tangentLengths?.[0] || ''}
                            onChange={(e) => {
                              const lengths = [...(entry.specs?.tangentLengths || [])];
                              lengths[0] = parseInt(e.target.value) || 0;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, tangentLengths: lengths }
                              });
                              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                            min="0"
                            placeholder="150"
                          />
                        </div>
                      )}

                      {(entry.specs?.numberOfTangents || 0) >= 2 && (
                        <div className="mt-2 bg-purple-50 dark:bg-purple-900/30 p-2 rounded-md border border-purple-200 dark:border-purple-700">
                          <label className="block text-xs font-semibold text-purple-900 mb-1">
                            Tangent 2 Length (mm)
                          </label>
                          <input
                            type="number"
                            value={entry.specs?.tangentLengths?.[1] || ''}
                            onChange={(e) => {
                              const lengths = [...(entry.specs?.tangentLengths || [])];
                              lengths[1] = parseInt(e.target.value) || 0;
                              onUpdateEntry(entry.id, {
                                specs: { ...entry.specs, tangentLengths: lengths }
                              });
                              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                            min="0"
                            placeholder="150"
                          />
                        </div>
                      )}

                      {/* Tangent Buttweld Data - shows when tangents are added */}
                      {(entry.specs?.numberOfTangents || 0) > 0 && (
                        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-orange-900 mb-1">Tangent Buttweld Data</h6>
                          {(() => {
                            const dn = entry.specs?.nominalBoreMm;
                            const schedule = entry.specs?.scheduleNumber || '';
                            const pipeWallThickness = entry.specs?.wallThicknessMm;
                            const numTangents = entry.specs?.numberOfTangents || 0;
                            const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                            const isSABS719 = steelSpecId === 8;

                            let effectiveThickness: number | null = null;
                            let fittingClass: 'STD' | 'XH' | 'XXH' | '' = 'STD';
                            let weldThickness: number | null = null;

                            if (isSABS719) {
                              effectiveThickness = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : pipeWallThickness;
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

                              weldThickness = fittingClass && dn ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn] : null;
                              const rawThickness = weldThickness || pipeWallThickness;
                              effectiveThickness = rawThickness ? roundToWeldIncrement(rawThickness) : rawThickness;
                            }

                            // Calculate circumference
                            const od = dn ? (NB_TO_OD_LOOKUP[dn] || (dn * 1.05)) : 0;
                            const circumference = Math.PI * od;
                            const totalWeldLength = circumference * numTangents;

                            if (!dn || !effectiveThickness) {
                              return (
                                <p className="text-xs text-orange-700">
                                  Select NB and schedule for weld data
                                </p>
                              );
                            }

                            return (
                              <>
                                <p className="text-xs text-orange-800">
                                  <span className="font-medium">{numTangents} full penetration weld{numTangents > 1 ? 's' : ''}</span>
                                </p>
                                <p className="text-xs text-orange-700">
                                  Weld thickness: {effectiveThickness.toFixed(2)}mm ({isSABS719 ? 'SABS 719 WT' : weldThickness && fittingClass ? fittingClass : `${schedule} WT`})
                                </p>
                                <p className="text-xs text-orange-700">
                                  Linear meterage: {totalWeldLength.toFixed(0)}mm ({numTangents} x {circumference.toFixed(0)}mm circ)
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Flange Weld Data - Bend flanges and Stub flanges */}
                    {(() => {
                      const weldCount = getWeldCountPerBend(entry.specs?.bendEndConfiguration || 'PE');
                      const dn = entry.specs?.nominalBoreMm;
                      const schedule = entry.specs?.scheduleNumber || '';
                      const pipeWallThickness = entry.specs?.wallThicknessMm;
                      const numStubs = entry.specs?.numberOfStubs || 0;
                      const stubs = entry.specs?.stubs || [];
                      // Use item-level steel spec with global fallback
                      const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                      const isSABS719 = steelSpecId === 8;

                      let effectiveWeldThickness: number | undefined | null = null;
                      let fittingClass: 'STD' | 'XH' | 'XXH' | '' = 'STD';
                      let weldThickness: number | null = null;
                      let usingScheduleThickness = false;

                      if (isSABS719) {
                        effectiveWeldThickness = pipeWallThickness ? roundToWeldIncrement(pipeWallThickness) : pipeWallThickness;
                        usingScheduleThickness = true;
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

                        weldThickness = fittingClass && dn ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn] : null;
                        const rawWeldThickness = weldThickness || pipeWallThickness;
                        effectiveWeldThickness = rawWeldThickness ? roundToWeldIncrement(rawWeldThickness) : rawWeldThickness;
                        usingScheduleThickness = !weldThickness && !!pipeWallThickness;
                      }

                      // Calculate circumference for bend flanges
                      const od = dn ? (NB_TO_OD_LOOKUP[dn] || (dn * 1.05)) : 0;
                      const circumference = Math.PI * od;

                      // Stub flange info - also use SABS 719 logic for stubs
                      const stub1NB = stubs[0]?.nominalBoreMm;
                      const stub2NB = stubs[1]?.nominalBoreMm;
                      // Check if stub has flange - either via override or using global flange specs
                      const stub1HasFlange = stubs[0]?.hasFlangeOverride
                        || (stubs[0]?.flangeStandardId && stubs[0]?.flangePressureClassId)
                        || (globalSpecs?.flangeStandardId && globalSpecs?.flangePressureClassId && stubs[0]?.nominalBoreMm);
                      const stub2HasFlange = stubs[1]?.hasFlangeOverride
                        || (stubs[1]?.flangeStandardId && stubs[1]?.flangePressureClassId)
                        || (globalSpecs?.flangeStandardId && globalSpecs?.flangePressureClassId && stubs[1]?.nominalBoreMm);
                      const stub1OD = stub1NB ? (NB_TO_OD_LOOKUP[stub1NB] || (stub1NB * 1.05)) : 0;
                      const stub2OD = stub2NB ? (NB_TO_OD_LOOKUP[stub2NB] || (stub2NB * 1.05)) : 0;
                      const stub1Circumference = Math.PI * stub1OD;
                      const stub2Circumference = Math.PI * stub2OD;
                      // For SABS 719, round pipe WT to 1.5mm increments; for others, use fitting lookup
                      const stub1RawWt = (isSABS719 || !fittingClass)
                        ? pipeWallThickness
                        : (stub1NB ? (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : pipeWallThickness);
                      const stub2RawWt = (isSABS719 || !fittingClass)
                        ? pipeWallThickness
                        : (stub2NB ? (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : pipeWallThickness);
                      const stub1Thickness = stub1NB && stub1RawWt ? roundToWeldIncrement(stub1RawWt) : 0;
                      const stub2Thickness = stub2NB && stub2RawWt ? roundToWeldIncrement(stub2RawWt) : 0;

                      // Only show if there are bend flanges or stubs
                      if (weldCount === 0 && numStubs === 0) return null;

                      return (
                        <div className="mt-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-purple-900 mb-2">
                            Flange Weld Data
                            <span className="ml-1 text-gray-400 font-normal cursor-help" title="Weld thickness based on fitting class (STD/XH/XXH) for ASTM specs, or pipe wall thickness for SABS 719. Rounded to 0.5mm increments for WPS matching.">?</span>
                          </h6>

                          {/* Bend Flange Welds */}
                          {weldCount > 0 && dn && effectiveWeldThickness && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-purple-800">Bend Flanges ({weldCount}):</p>
                              <p className="text-xs text-purple-700">
                                {dn}NB - {effectiveWeldThickness?.toFixed(2)}mm weld{isSABS719 ? ' (SABS 719 WT)' : usingScheduleThickness ? ' (sch)' : ` (${fittingClass})`}
                              </p>
                              <p className="text-xs text-purple-600">
                                Weld length: {(circumference * 2 * weldCount).toFixed(0)}mm ({weldCount}x2x{circumference.toFixed(0)}mm circ)
                              </p>
                            </div>
                          )}

                          {/* Stub Flange Welds */}
                          {numStubs > 0 && (
                            <div className={weldCount > 0 ? 'pt-2 border-t border-purple-200' : ''}>
                              <p className="text-xs font-medium text-purple-800">Stub Flanges:</p>
                              {numStubs >= 1 && stub1NB && (
                                <div className="ml-2">
                                  {stub1HasFlange ? (
                                    <>
                                      <p className="text-xs text-purple-700">
                                        Stub 1: {stub1NB}NB - {stub1Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-purple-600">
                                        Weld length: {(stub1Circumference * 2).toFixed(0)}mm (2x{stub1Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Stub 1: {stub1NB}NB - OE (no weld data)</p>
                                  )}
                                </div>
                              )}
                              {numStubs >= 2 && stub2NB && (
                                <div className="ml-2 mt-1">
                                  {stub2HasFlange ? (
                                    <>
                                      <p className="text-xs text-purple-700">
                                        Stub 2: {stub2NB}NB - {stub2Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-purple-600">
                                        Weld length: {(stub2Circumference * 2).toFixed(0)}mm (2x{stub2Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Stub 2: {stub2NB}NB - OE (no weld data)</p>
                                  )}
                                </div>
                              )}
                              {numStubs >= 1 && !stub1NB && (
                                <p className="text-xs text-amber-600 ml-2">Stub 1: Select NB</p>
                              )}
                              {numStubs >= 2 && !stub2NB && (
                                <p className="text-xs text-amber-600 ml-2">Stub 2: Select NB</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Column 3 - Stubs */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Stub Connections
                    </h4>



                    {/* Stubs Section - Compact */}
                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-purple-900 mb-2">Stub Connections</h5>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Number of Stubs
                        </label>
                        {(() => {
                          const selectId = `bend-num-stubs-${entry.id}`;
                          const options = [
                            { value: '0', label: '0 - No Stubs' },
                            { value: '1', label: '1 - Single Stub' },
                            { value: '2', label: '2 - Both Stubs' }
                          ];

                          return (
                            <Select
                              id={selectId}
                              value={String(entry.specs?.numberOfStubs || 0)}
                              onChange={(value) => {
                                const count = parseInt(value) || 0;
                                const currentStubs = entry.specs?.stubs || [];
                                const mainNB = entry.specs?.nominalBoreMm || 50;
                                const defaultStubNB = mainNB <= 50 ? mainNB : 50;
                                const defaultStub = { nominalBoreMm: defaultStubNB, length: 150, orientation: 'outside', flangeSpec: '' };
                                const newStubs = count === 0 ? [] :
                                                count === 1 ? [currentStubs[0] || defaultStub] :
                                                [
                                                  currentStubs[0] || defaultStub,
                                                  currentStubs[1] || defaultStub
                                                ];
                                const updatedEntry = {
                                  ...entry,
                                  specs: {
                                    ...entry.specs,
                                    numberOfStubs: count,
                                    stubs: newStubs
                                  }
                                };
                                updatedEntry.description = generateItemDescription(updatedEntry);
                                onUpdateEntry(entry.id, updatedEntry);
                              }}
                              options={options}
                              placeholder="Select number of stubs"
                              open={openSelects[selectId] || false}
                              onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                            />
                          );
                        })()}
                      </div>

                      {(entry.specs?.numberOfStubs || 0) >= 1 && (
                        <div className="mt-2 p-2 bg-white rounded border border-purple-300">
                          <p className="text-xs font-medium text-purple-900 mb-1">Stub 1 <span className="text-gray-500 font-normal">(on horizontal tangent - vertical stub)</span></p>
                          <div className="grid grid-cols-1 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                              {(() => {
                                const selectId = `bend-stub1-nb-${entry.id}`;
                                const stub1EffectiveSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                const stub1SteelSpec = masterData.steelSpecs?.find((s: any) => s.id === stub1EffectiveSpecId);
                                const stub1SteelSpecName = stub1SteelSpec?.steelSpecName || '';
                                const stub1FallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => stub1SteelSpecName.includes(pattern))?.[1];
                                const allStub1Nbs = stub1FallbackNBs || [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
                                const mainBendNB = entry.specs?.nominalBoreMm || 0;
                                const stub1Nbs = allStub1Nbs.filter((nb: number) => nb <= mainBendNB);
                                const options = stub1Nbs.map((nb: number) => ({
                                  value: String(nb),
                                  label: `${nb} NB`
                                }));

                                return (
                                  <Select
                                    id={selectId}
                                    value={entry.specs?.stubs?.[0]?.nominalBoreMm ? String(entry.specs.stubs[0].nominalBoreMm) : ''}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = { ...stubs[0], nominalBoreMm: parseInt(value) || 0 };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={options}
                                    placeholder="Select NB"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">
                                W/T (mm)
                                {entry.specs?.stubs?.[0]?.wallThicknessOverride ? (
                                  <span className="text-purple-600 ml-1">(Override)</span>
                                ) : entry.specs?.stubs?.[0]?.nominalBoreMm ? (
                                  <span className="text-green-600 ml-1">(Auto)</span>
                                ) : null}
                              </label>
                              {(() => {
                                const selectId = `bend-stub1-wt-${entry.id}`;
                                const stub1NB = entry.specs?.stubs?.[0]?.nominalBoreMm;
                                const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                const isSABS719 = steelSpecId === 8;

                                const SABS_719_WT: Record<number, number> = {
                                  200: 5.2, 250: 5.2, 300: 6.4, 350: 6.4, 400: 6.4, 450: 6.4, 500: 6.4,
                                  550: 6.4, 600: 6.4, 650: 8.0, 700: 8.0, 750: 8.0, 800: 8.0, 850: 9.5,
                                  900: 9.5, 1000: 9.5, 1050: 9.5, 1200: 12.7
                                };
                                const ASTM_STUB_WT: Record<number, number> = {
                                  15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68,
                                  50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55,
                                  150: 7.11, 200: 8.18, 250: 9.27, 300: 10.31
                                };

                                const getSabs719Wt = (nb: number): number => {
                                  const sizes = Object.keys(SABS_719_WT).map(Number).sort((a, b) => a - b);
                                  let closest = sizes[0];
                                  for (const size of sizes) {
                                    if (size <= nb) closest = size;
                                    else break;
                                  }
                                  return SABS_719_WT[closest] || entry.specs?.wallThicknessMm || 6.4;
                                };

                                const autoWt = stub1NB
                                  ? (isSABS719 ? getSabs719Wt(stub1NB) : (ASTM_STUB_WT[stub1NB] || (stub1NB * 0.05)))
                                  : null;
                                const currentWt = entry.specs?.stubs?.[0]?.wallThicknessMm;

                                const wtOptions = isSABS719
                                  ? [
                                      ...(autoWt ? [{ value: String(autoWt), label: `${autoWt.toFixed(1)} (Auto - SABS 719)` }] : []),
                                      { value: '4.0', label: '4.0 (WT4)' },
                                      { value: '5.0', label: '5.0 (WT5)' },
                                      { value: '5.2', label: '5.2' },
                                      { value: '6.0', label: '6.0 (WT6)' },
                                      { value: '6.4', label: '6.4' },
                                      { value: '8.0', label: '8.0 (WT8)' },
                                      { value: '9.5', label: '9.5' },
                                      { value: '10.0', label: '10.0 (WT10)' },
                                      { value: '12.0', label: '12.0 (WT12)' },
                                      { value: '12.7', label: '12.7' },
                                    ].filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx)
                                  : [
                                      ...(autoWt ? [{ value: String(autoWt), label: `${autoWt.toFixed(2)} (Auto)` }] : []),
                                      { value: '2.77', label: '2.77' },
                                      { value: '3.38', label: '3.38' },
                                      { value: '3.91', label: '3.91' },
                                      { value: '5.16', label: '5.16' },
                                      { value: '5.49', label: '5.49' },
                                      { value: '6.02', label: '6.02' },
                                      { value: '6.55', label: '6.55' },
                                      { value: '7.11', label: '7.11' },
                                      { value: '8.18', label: '8.18' },
                                      { value: '9.27', label: '9.27' },
                                      { value: '10.31', label: '10.31' },
                                    ].filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx);

                                return (
                                  <Select
                                    id={selectId}
                                    value={currentWt ? String(currentWt) : (autoWt ? String(autoWt) : '')}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      const newWt = parseFloat(value) || 0;
                                      const isOverride = autoWt && newWt !== autoWt;
                                      stubs[0] = { ...stubs[0], wallThicknessMm: newWt, wallThicknessOverride: isOverride };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={wtOptions}
                                    placeholder="Select W/T"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Position <span className="text-gray-400">on T1</span></label>
                              {(() => {
                                const selectId = `bend-stub1-angle-${entry.id}`;
                                const angleOptions = [
                                  { value: '0', label: '0° (Top)' },
                                  { value: '45', label: '45°' },
                                  { value: '90', label: '90° (Side)' },
                                  { value: '135', label: '135°' },
                                  { value: '180', label: '180° (Bottom)' },
                                  { value: '225', label: '225°' },
                                  { value: '270', label: '270° (Side)' },
                                  { value: '315', label: '315°' }
                                ];
                                return (
                                  <Select
                                    id={selectId}
                                    value={String(entry.specs?.stubs?.[0]?.angleDegrees ?? '0')}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = { ...stubs[0], angleDegrees: parseInt(value) || 0, tangent: 1 };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={angleOptions}
                                    placeholder="Select angle"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                              <label className="block text-xs text-purple-800 mb-0.5">Length (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[0]?.length || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = { ...stubs[0], length: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                                placeholder="150"
                              />
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                              <label className="block text-xs text-purple-800 mb-0.5">Location (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[0]?.locationFromFlange || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[0] = { ...stubs[0], locationFromFlange: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 1 Flange - Global with Override */}
                          <div className="bg-amber-50 border border-amber-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[0]?.hasFlangeOverride ? (
                                  <span className="text-purple-600 ml-1">(Override)</span>
                                ) : globalSpecs?.flangeStandardId ? (
                                  <span className="text-green-600 ml-1">(Global)</span>
                                ) : null}
                              </span>
                              {globalSpecs?.flangeStandardId && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[0]?.hasFlangeOverride || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = {
                                        ...stubs[0],
                                        hasFlangeOverride: e.target.checked,
                                        flangeStandardId: e.target.checked ? (stubs[0]?.flangeStandardId || globalSpecs?.flangeStandardId) : undefined,
                                        flangePressureClassId: e.target.checked ? (stubs[0]?.flangePressureClassId || globalSpecs?.flangePressureClassId) : undefined
                                      };
                                      onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    }}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-600">Override</span>
                                </label>
                              )}
                            </div>
                            {!entry.specs?.stubs?.[0]?.hasFlangeOverride && globalSpecs?.flangeStandardId ? (
                              <p className="text-xs text-orange-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId);
                                  const pressureClass = masterData.pressureClasses?.find((pc: any) => pc.id === globalSpecs.flangePressureClassId);
                                  return flangeStandard && pressureClass ? `${flangeStandard.code}/${pressureClass.designation}` : 'Using global';
                                })()}
                              </p>
                            ) : entry.specs?.stubs?.[0]?.hasFlangeOverride ? (
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  value={entry.specs?.stubs?.[0]?.flangeStandardId || ''}
                                  onChange={async (e) => {
                                    const standardId = parseInt(e.target.value) || undefined;
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], flangeStandardId: standardId, flangePressureClassId: undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    // Fetch pressure classes for this standard
                                    if (standardId) {
                                      getFilteredPressureClasses(standardId);
                                    }
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="">Standard</option>
                                  {masterData.flangeStandards?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.code}</option>
                                  ))}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[0]?.flangePressureClassId || ''}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], flangePressureClassId: parseInt(e.target.value) || undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="">Class</option>
                                  {(() => {
                                    const stdId = entry.specs?.stubs?.[0]?.flangeStandardId;
                                    const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                    return filtered.map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.designation}</option>
                                    ));
                                  })()}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[0]?.flangeType || 'S/O'}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[0] = { ...stubs[0], flangeType: e.target.value };
                                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                    updatedEntry.description = generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, updatedEntry);
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="S/O">S/O (Slip-On)</option>
                                  <option value="L/F">L/F (Loose)</option>
                                  <option value="R/F">R/F (Rotating)</option>
                                </select>
                                <label className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[0]?.hasBlankFlange || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = { ...stubs[0], hasBlankFlange: e.target.checked };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                                  />
                                  <span className="text-xs text-red-700 font-medium">+ Blank Flange ({entry.specs?.stubs?.[0]?.nominalBoreMm || '?'}NB)</span>
                                </label>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-700">Set in Global Specs</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(entry.specs?.numberOfStubs || 0) >= 2 && (
                        <div className="mt-2 p-2 bg-white rounded border border-purple-300">
                          <p className="text-xs font-medium text-purple-900 mb-1">Stub 2 <span className="text-gray-500 font-normal">(on angled tangent)</span></p>
                          <div className="grid grid-cols-1 gap-2 mb-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">NB</label>
                              {(() => {
                                const selectId = `bend-stub2-nb-${entry.id}`;
                                const stub2EffectiveSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                const stub2SteelSpec = masterData.steelSpecs?.find((s: any) => s.id === stub2EffectiveSpecId);
                                const stub2SteelSpecName = stub2SteelSpec?.steelSpecName || '';
                                const stub2FallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => stub2SteelSpecName.includes(pattern))?.[1];
                                const allStub2Nbs = stub2FallbackNBs || [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
                                const mainBendNB = entry.specs?.nominalBoreMm || 0;
                                const stub2Nbs = allStub2Nbs.filter((nb: number) => nb <= mainBendNB);
                                const options = stub2Nbs.map((nb: number) => ({
                                  value: String(nb),
                                  label: `${nb} NB`
                                }));

                                return (
                                  <Select
                                    id={selectId}
                                    value={entry.specs?.stubs?.[1]?.nominalBoreMm ? String(entry.specs.stubs[1].nominalBoreMm) : ''}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = { ...stubs[1], nominalBoreMm: parseInt(value) || 0 };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={options}
                                    placeholder="Select NB"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">
                                W/T (mm)
                                {entry.specs?.stubs?.[1]?.wallThicknessOverride ? (
                                  <span className="text-purple-600 ml-1">(Override)</span>
                                ) : entry.specs?.stubs?.[1]?.nominalBoreMm ? (
                                  <span className="text-green-600 ml-1">(Auto)</span>
                                ) : null}
                              </label>
                              {(() => {
                                const selectId = `bend-stub2-wt-${entry.id}`;
                                const stub2NB = entry.specs?.stubs?.[1]?.nominalBoreMm;
                                const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                                const isSABS719 = steelSpecId === 8;

                                const SABS_719_WT: Record<number, number> = {
                                  200: 5.2, 250: 5.2, 300: 6.4, 350: 6.4, 400: 6.4, 450: 6.4, 500: 6.4,
                                  550: 6.4, 600: 6.4, 650: 8.0, 700: 8.0, 750: 8.0, 800: 8.0, 850: 9.5,
                                  900: 9.5, 1000: 9.5, 1050: 9.5, 1200: 12.7
                                };
                                const ASTM_STUB_WT: Record<number, number> = {
                                  15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68,
                                  50: 3.91, 65: 5.16, 80: 5.49, 100: 6.02, 125: 6.55,
                                  150: 7.11, 200: 8.18, 250: 9.27, 300: 10.31
                                };

                                const getSabs719Wt = (nb: number): number => {
                                  const sizes = Object.keys(SABS_719_WT).map(Number).sort((a, b) => a - b);
                                  let closest = sizes[0];
                                  for (const size of sizes) {
                                    if (size <= nb) closest = size;
                                    else break;
                                  }
                                  return SABS_719_WT[closest] || entry.specs?.wallThicknessMm || 6.4;
                                };

                                const autoWt = stub2NB
                                  ? (isSABS719 ? getSabs719Wt(stub2NB) : (ASTM_STUB_WT[stub2NB] || (stub2NB * 0.05)))
                                  : null;
                                const currentWt = entry.specs?.stubs?.[1]?.wallThicknessMm;

                                const wtOptions = isSABS719
                                  ? [
                                      ...(autoWt ? [{ value: String(autoWt), label: `${autoWt.toFixed(1)} (Auto - SABS 719)` }] : []),
                                      { value: '4.0', label: '4.0 (WT4)' },
                                      { value: '5.0', label: '5.0 (WT5)' },
                                      { value: '5.2', label: '5.2' },
                                      { value: '6.0', label: '6.0 (WT6)' },
                                      { value: '6.4', label: '6.4' },
                                      { value: '8.0', label: '8.0 (WT8)' },
                                      { value: '9.5', label: '9.5' },
                                      { value: '10.0', label: '10.0 (WT10)' },
                                      { value: '12.0', label: '12.0 (WT12)' },
                                      { value: '12.7', label: '12.7' },
                                    ].filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx)
                                  : [
                                      ...(autoWt ? [{ value: String(autoWt), label: `${autoWt.toFixed(2)} (Auto)` }] : []),
                                      { value: '2.77', label: '2.77' },
                                      { value: '3.38', label: '3.38' },
                                      { value: '3.91', label: '3.91' },
                                      { value: '5.16', label: '5.16' },
                                      { value: '5.49', label: '5.49' },
                                      { value: '6.02', label: '6.02' },
                                      { value: '6.55', label: '6.55' },
                                      { value: '7.11', label: '7.11' },
                                      { value: '8.18', label: '8.18' },
                                      { value: '9.27', label: '9.27' },
                                      { value: '10.31', label: '10.31' },
                                    ].filter((opt, idx, arr) => arr.findIndex(o => o.value === opt.value) === idx);

                                return (
                                  <Select
                                    id={selectId}
                                    value={currentWt ? String(currentWt) : (autoWt ? String(autoWt) : '')}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      const newWt = parseFloat(value) || 0;
                                      const isOverride = autoWt && newWt !== autoWt;
                                      stubs[1] = { ...stubs[1], wallThicknessMm: newWt, wallThicknessOverride: isOverride };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={wtOptions}
                                    placeholder="Select W/T"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Position <span className="text-gray-400">on T2</span></label>
                              {(() => {
                                const selectId = `bend-stub2-angle-${entry.id}`;
                                const angleOptions = [
                                  { value: '0', label: '0° (Top)' },
                                  { value: '45', label: '45°' },
                                  { value: '90', label: '90° (Side)' },
                                  { value: '135', label: '135°' },
                                  { value: '180', label: '180° (Bottom)' },
                                  { value: '225', label: '225°' },
                                  { value: '270', label: '270° (Side)' },
                                  { value: '315', label: '315°' }
                                ];
                                return (
                                  <Select
                                    id={selectId}
                                    value={String(entry.specs?.stubs?.[1]?.angleDegrees ?? '0')}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = { ...stubs[1], angleDegrees: parseInt(value) || 0, tangent: 2 };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={angleOptions}
                                    placeholder="Select angle"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                              <label className="block text-xs text-purple-800 mb-0.5">Length (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[1]?.length || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[1] = { ...stubs[1], length: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                                placeholder="150"
                              />
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 p-1 rounded border border-purple-200 dark:border-purple-700">
                              <label className="block text-xs text-purple-800 mb-0.5">Location (mm)</label>
                              <input
                                type="number"
                                value={entry.specs?.stubs?.[1]?.locationFromFlange || ''}
                                onChange={(e) => {
                                  const stubs = [...(entry.specs?.stubs || [])];
                                  stubs[1] = { ...stubs[1], locationFromFlange: parseInt(e.target.value) || 0 };
                                  const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                  updatedEntry.description = generateItemDescription(updatedEntry);
                                  onUpdateEntry(entry.id, updatedEntry);
                                }}
                                className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-600 rounded text-xs focus:ring-1 focus:ring-purple-500 text-gray-900 dark:text-gray-100"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 2 Flange - Global with Override */}
                          <div className="bg-amber-50 border border-amber-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[1]?.hasFlangeOverride ? (
                                  <span className="text-purple-600 ml-1">(Override)</span>
                                ) : globalSpecs?.flangeStandardId ? (
                                  <span className="text-green-600 ml-1">(Global)</span>
                                ) : null}
                              </span>
                              {globalSpecs?.flangeStandardId && (
                                <label className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[1]?.hasFlangeOverride || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = {
                                        ...stubs[1],
                                        hasFlangeOverride: e.target.checked,
                                        flangeStandardId: e.target.checked ? (stubs[1]?.flangeStandardId || globalSpecs?.flangeStandardId) : undefined,
                                        flangePressureClassId: e.target.checked ? (stubs[1]?.flangePressureClassId || globalSpecs?.flangePressureClassId) : undefined
                                      };
                                      onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    }}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-600">Override</span>
                                </label>
                              )}
                            </div>
                            {!entry.specs?.stubs?.[1]?.hasFlangeOverride && globalSpecs?.flangeStandardId ? (
                              <p className="text-xs text-orange-800">
                                {(() => {
                                  const flangeStandard = masterData.flangeStandards?.find((fs: any) => fs.id === globalSpecs.flangeStandardId);
                                  const pressureClass = masterData.pressureClasses?.find((pc: any) => pc.id === globalSpecs.flangePressureClassId);
                                  return flangeStandard && pressureClass ? `${flangeStandard.code}/${pressureClass.designation}` : 'Using global';
                                })()}
                              </p>
                            ) : entry.specs?.stubs?.[1]?.hasFlangeOverride ? (
                              <div className="grid grid-cols-2 gap-1">
                                <select
                                  value={entry.specs?.stubs?.[1]?.flangeStandardId || ''}
                                  onChange={async (e) => {
                                    const standardId = parseInt(e.target.value) || undefined;
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = { ...stubs[1], flangeStandardId: standardId, flangePressureClassId: undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                    // Fetch pressure classes for this standard
                                    if (standardId) {
                                      getFilteredPressureClasses(standardId);
                                    }
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="">Standard</option>
                                  {masterData.flangeStandards?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.code}</option>
                                  ))}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[1]?.flangePressureClassId || ''}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = { ...stubs[1], flangePressureClassId: parseInt(e.target.value) || undefined };
                                    onUpdateEntry(entry.id, { specs: { ...entry.specs, stubs } });
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="">Class</option>
                                  {(() => {
                                    const stdId = entry.specs?.stubs?.[1]?.flangeStandardId;
                                    const filtered = stdId ? (pressureClassesByStandard[stdId] || []) : masterData.pressureClasses || [];
                                    return filtered.map((p: any) => (
                                      <option key={p.id} value={p.id}>{p.designation}</option>
                                    ));
                                  })()}
                                </select>
                                <select
                                  value={entry.specs?.stubs?.[1]?.flangeType || 'S/O'}
                                  onChange={(e) => {
                                    const stubs = [...(entry.specs?.stubs || [])];
                                    stubs[1] = { ...stubs[1], flangeType: e.target.value };
                                    const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                    updatedEntry.description = generateItemDescription(updatedEntry);
                                    onUpdateEntry(entry.id, updatedEntry);
                                  }}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-800"
                                >
                                  <option value="S/O">S/O (Slip-On)</option>
                                  <option value="L/F">L/F (Loose)</option>
                                  <option value="R/F">R/F (Rotating)</option>
                                </select>
                                <label className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="checkbox"
                                    checked={entry.specs?.stubs?.[1]?.hasBlankFlange || false}
                                    onChange={(e) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = { ...stubs[1], hasBlankFlange: e.target.checked };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                                  />
                                  <span className="text-xs text-red-700 font-medium">+ Blank Flange ({entry.specs?.stubs?.[1]?.nominalBoreMm || '?'}NB)</span>
                                </label>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-700">Set in Global Specs</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tee Welds - for stub connections */}
                      {(entry.specs?.numberOfStubs || 0) > 0 && (
                        <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-teal-900 mb-1">Tee Welds</h6>
                          {(() => {
                            const schedule = entry.specs?.scheduleNumber || '';
                            const pipeWallThickness = entry.specs?.wallThicknessMm;
                            const numStubs = entry.specs?.numberOfStubs || 0;
                            const stubs = entry.specs?.stubs || [];

                            // Check for SABS 719 - use item-level steel spec with global fallback
                            const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                            const isSABS719 = steelSpecId === 8;

                            const scheduleUpper = schedule.toUpperCase();
                            const isStdSchedule = scheduleUpper.includes('40') || scheduleUpper === 'STD';
                            const isXhSchedule = scheduleUpper.includes('80') || scheduleUpper === 'XS' || scheduleUpper === 'XH';
                            const isXxhSchedule = scheduleUpper.includes('160') || scheduleUpper === 'XXS' || scheduleUpper === 'XXH';

                            let fittingClass: 'STD' | 'XH' | 'XXH' | '' = '';
                            if (isXxhSchedule) {
                              fittingClass = 'XXH';
                            } else if (isXhSchedule) {
                              fittingClass = 'XH';
                            } else if (isStdSchedule) {
                              fittingClass = 'STD';
                            }

                            const stub1NB = stubs[0]?.nominalBoreMm;
                            const stub2NB = stubs[1]?.nominalBoreMm;
                            const stub1OD = stub1NB ? (NB_TO_OD_LOOKUP[stub1NB] || (stub1NB * 1.05)) : 0;
                            const stub2OD = stub2NB ? (NB_TO_OD_LOOKUP[stub2NB] || (stub2NB * 1.05)) : 0;
                            const stub1Circumference = Math.PI * stub1OD;
                            const stub2Circumference = Math.PI * stub2OD;
                            const stub1RawThickness = isSABS719 || !fittingClass
                              ? pipeWallThickness
                              : (stub1NB ? (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : pipeWallThickness);
                            const stub2RawThickness = isSABS719 || !fittingClass
                              ? pipeWallThickness
                              : (stub2NB ? (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : pipeWallThickness);
                            const stub1Thickness = stub1NB && stub1RawThickness ? roundToWeldIncrement(stub1RawThickness) : 0;
                            const stub2Thickness = stub2NB && stub2RawThickness ? roundToWeldIncrement(stub2RawThickness) : 0;

                            if (!stub1NB && !stub2NB) {
                              return (
                                <p className="text-xs text-teal-700">
                                  Select stub NB to see tee weld data
                                </p>
                              );
                            }

                            return (
                              <>
                                <p className="text-xs text-teal-800 mb-1">
                                  <span className="font-medium">{numStubs} Tee weld{numStubs > 1 ? 's' : ''}</span> (full penetration)
                                  {isSABS719 && <span className="text-purple-600 ml-1">(SABS 719 WT)</span>}
                                </p>
                                {numStubs >= 1 && stub1NB && (
                                  <p className="text-xs text-teal-700">
                                    Stub 1: {stub1NB}NB - {stub1Thickness?.toFixed(2)}mm weld x {stub1Circumference.toFixed(0)}mm circ
                                  </p>
                                )}
                                {numStubs >= 2 && stub2NB && (
                                  <p className="text-xs text-teal-700">
                                    Stub 2: {stub2NB}NB - {stub2Thickness?.toFixed(2)}mm weld x {stub2Circumference.toFixed(0)}mm circ
                                  </p>
                                )}
                                <p className="text-xs text-teal-600 mt-1">
                                  Total linear meterage: {((numStubs >= 1 && stub1NB ? stub1Circumference : 0) + (numStubs >= 2 && stub2NB ? stub2Circumference : 0)).toFixed(0)}mm
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operating Conditions - Hidden: Uses global specs for working pressure/temp */}

                {/* Item Action Buttons */}
                <div className="mt-4 flex justify-end gap-2">
                  {onDuplicateEntry && (
                    <button
                      onClick={() => onDuplicateEntry(entry, index)}
                      className="flex items-center gap-1 px-3 py-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 text-sm font-medium border border-purple-300 rounded-md transition-colors"
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
                }
                previewContent={
                  <>
                  {Bend3DPreview && (
                    <Bend3DPreview
                      nominalBore={entry.specs.nominalBoreMm}
                      outerDiameter={entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[entry.specs.nominalBoreMm] || (entry.specs.nominalBoreMm * 1.05)}
                      wallThickness={entry.calculation?.wallThicknessMm || 5}
                      bendAngle={entry.specs.bendDegrees}
                      bendType={entry.specs.bendType || '1.5D'}
                      tangent1={entry.specs?.tangentLengths?.[0] || 0}
                      tangent2={entry.specs?.tangentLengths?.[1] || 0}
                      schedule={entry.specs.scheduleNumber}
                      materialName={masterData.steelSpecs.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
                      numberOfSegments={entry.specs?.numberOfSegments}
                      isSegmented={(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId) === 8}
                      stubs={entry.specs?.stubs}
                      numberOfStubs={entry.specs?.numberOfStubs || 0}
                      flangeConfig={entry.specs?.bendEndConfiguration || 'PE'}
                      closureLengthMm={entry.specs?.closureLengthMm || 0}
                      addBlankFlange={entry.specs?.addBlankFlange}
                      blankFlangePositions={entry.specs?.blankFlangePositions}
                      savedCameraPosition={entry.specs?.savedCameraPosition}
                      savedCameraTarget={entry.specs?.savedCameraTarget}
                      onCameraChange={(position: [number, number, number], target: [number, number, number]) => {
                        log.debug('BendForm onCameraChange called', JSON.stringify({ position, target, entryId: entry.id }))
                        onUpdateEntry(entry.id, {
                          specs: {
                            ...entry.specs,
                            savedCameraPosition: position,
                            savedCameraTarget: target
                          }
                        })
                      }}
                      selectedNotes={entry.selectedNotes}
                    />
                  )}

                  {/* Smart Notes Dropdown - Below 3D Preview */}
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
                }
                calcResultsContent={
                  entry.calculation && (
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                        Calculation Results
                      </h4>
                      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 p-3 rounded-md">
                        {(() => {
                          const cf = Number(entry.specs?.centerToFaceMm) || 0;
                          const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                          const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                          const numTangents = entry.specs?.numberOfTangents || 0;
                          const stubs = entry.specs?.stubs || [];
                          const stub1NB = stubs[0]?.nominalBoreMm;
                          const stub2NB = stubs[1]?.nominalBoreMm;
                          const stub1HasFlange = stub1NB ? true : false;
                          const stub2HasFlange = stub2NB ? true : false;
                          const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                          const end1 = cf + tangent1;
                          const end2 = cf + tangent2;
                          let cfDisplay = '';
                          if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
                            if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)}`;
                            } else if (tangent1 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)}`;
                            } else if (tangent2 > 0) {
                              cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)}`;
                            }
                          } else {
                            cfDisplay = `${cf.toFixed(0)}`;
                          }
                          const bendFlangeCount = ['FBE', '2xLF', '2X_RF', 'FOE_LF', 'FOE_RF'].includes(bendEndConfig) ? 2
                            : ['FOE'].includes(bendEndConfig) ? 1 : 0;
                          const stub1FlangeCount = stub1HasFlange ? 1 : 0;
                          const stub2FlangeCount = stub2HasFlange ? 1 : 0;
                          const numSegments = entry.specs?.numberOfSegments || 0;
                          const totalFlanges = bendFlangeCount + stub1FlangeCount + stub2FlangeCount;
                          const dn = entry.specs?.nominalBoreMm;
                          const schedule = entry.specs?.scheduleNumber || '';
                          const pipeWallThickness = entry.calculation?.wallThicknessMm;
                          const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                          const isSABS719 = steelSpecId === 8;
                          const scheduleUpper = schedule.toUpperCase();
                          const isStdSchedule = scheduleUpper.includes('40') || scheduleUpper === 'STD';
                          const isXhSchedule = scheduleUpper.includes('80') || scheduleUpper === 'XS' || scheduleUpper === 'XH';
                          const isXxhSchedule = scheduleUpper.includes('160') || scheduleUpper === 'XXS' || scheduleUpper === 'XXH';
                          let fittingClass: 'STD' | 'XH' | 'XXH' | '' = '';
                          if (isXxhSchedule) fittingClass = 'XXH';
                          else if (isXhSchedule) fittingClass = 'XH';
                          else if (isStdSchedule) fittingClass = 'STD';
                          const fittingWt = (isSABS719 || !fittingClass) ? null : (dn ? FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[dn] : null);
                          const rawEffectiveWt = fittingWt || pipeWallThickness;
                          const effectiveWt = rawEffectiveWt ? roundToWeldIncrement(rawEffectiveWt) : rawEffectiveWt;
                          const stub1Length = stubs[0]?.lengthMm || 0;
                          const stub2Length = stubs[1]?.lengthMm || 0;
                          const stub1RawWt = (isSABS719 || !fittingClass) ? pipeWallThickness : (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness);
                          const stub2RawWt = (isSABS719 || !fittingClass) ? pipeWallThickness : (FITTING_CLASS_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness);
                          const stub1Wt = stub1NB && stub1RawWt ? roundToWeldIncrement(stub1RawWt) : 0;
                          const stub2Wt = stub2NB && stub2RawWt ? roundToWeldIncrement(stub2RawWt) : 0;
                          const totalWeldLength = entry.calculation.totalWeldLengthMm || 0;

                          const mainOdMm = dn ? (NB_TO_OD_LOOKUP[dn] || dn * 1.05) : 0;
                          const mitreWeldCount = numSegments > 1 ? numSegments - 1 : 0;
                          const weldVolume = mainOdMm && pipeWallThickness ? calculateBendWeldVolume({
                            mainOdMm,
                            mainWallThicknessMm: pipeWallThickness,
                            numberOfFlangeWelds: bendFlangeCount,
                            numberOfMitreWelds: mitreWeldCount,
                            stubs: [
                              stub1NB && stub1HasFlange ? { odMm: NB_TO_OD_LOOKUP[stub1NB] || stub1NB * 1.05, wallThicknessMm: pipeWallThickness, hasFlangeWeld: true } : null,
                              stub2NB && stub2HasFlange ? { odMm: NB_TO_OD_LOOKUP[stub2NB] || stub2NB * 1.05, wallThicknessMm: pipeWallThickness, hasFlangeWeld: true } : null,
                            ].filter(Boolean) as Array<{odMm: number; wallThicknessMm: number; hasFlangeWeld: boolean}>,
                          }) : null;

                          const flangeStandardId = entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId;
                          const flangePressureClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
                          const flangeStandard = masterData.flangeStandards?.find((s: any) => s.id === flangeStandardId);
                          const flangeStandardCode = flangeStandard?.code || '';
                          const pressureClass = masterData.pressureClasses?.find((p: any) => p.id === flangePressureClassId);
                          const pressureClassDesignation = pressureClass?.designation || '';

                          const flangeWeightPerUnit = dn && pressureClassDesignation
                            ? getFlangeWeight(dn, pressureClassDesignation, flangeStandardCode)
                            : (entry.calculation?.flangeWeightPerUnit || 0);
                          const dynamicTotalFlangeWeight = totalFlanges * flangeWeightPerUnit;

                          const bendQuantity = entry.specs?.quantityValue || 1;
                          const blankPositions = entry.specs?.blankFlangePositions || [];
                          const blankFlangeCount = blankPositions.length * bendQuantity;
                          const isSans1123 = flangeStandardCode.includes('SABS 1123') || flangeStandardCode.includes('SANS 1123');
                          const blankWeightPerUnit = dn && pressureClassDesignation
                            ? (isSans1123 ? sansBlankFlangeWeight(dn, pressureClassDesignation) : getBlankFlangeWeight(dn, pressureClassDesignation))
                            : 0;
                          const totalBlankFlangeWeight = blankFlangeCount * blankWeightPerUnit;

                          const bendEndOption = BEND_END_OPTIONS.find(o => o.value === entry.specs.bendEndConfiguration);
                          const tackWeldEnds = (bendEndOption as any)?.tackWeldEnds || 0;
                          const tackWeldTotalWeight = dn && tackWeldEnds > 0
                            ? getTackWeldWeight(dn, tackWeldEnds) * bendQuantity
                            : 0;

                          const closureLengthMm = entry.specs?.closureLengthMm || 0;
                          const closureWallThickness = pipeWallThickness || 5;
                          const closureTotalWeight = dn && closureLengthMm > 0 && closureWallThickness > 0
                            ? getClosureWeight(dn, closureLengthMm, closureWallThickness) * bendQuantity
                            : 0;

                          const bendWeightOnly = entry.calculation.bendWeight || 0;
                          const totalWeight = bendWeightOnly + dynamicTotalFlangeWeight + totalBlankFlangeWeight + tackWeldTotalWeight + closureTotalWeight;

                          return (
                            <>
                            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">C/F (mm)</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{cfDisplay}</p>
                              </div>
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Flanges</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalFlanges}</p>
                                <p className="text-xs text-purple-500 dark:text-purple-400">{dynamicTotalFlangeWeight.toFixed(2)}kg</p>
                              </div>
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weight (kg)</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalWeight.toFixed(2)}</p>
                                {(totalBlankFlangeWeight > 0 || closureTotalWeight > 0) && (
                                  <p className="text-xs text-purple-500 dark:text-purple-400">
                                    {totalBlankFlangeWeight > 0 && `+${totalBlankFlangeWeight.toFixed(2)}kg blanks`}
                                    {closureTotalWeight > 0 && ` +${closureTotalWeight.toFixed(2)}kg closures`}
                                  </p>
                                )}
                              </div>
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded text-center">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Weld (mm)</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totalWeldLength.toFixed(0)}</p>
                              </div>
                              {weldVolume && (
                                <div className="bg-fuchsia-100 dark:bg-fuchsia-900/40 p-2 rounded text-center">
                                  <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-medium">Weld Vol</p>
                                  <p className="text-lg font-bold text-fuchsia-900 dark:text-fuchsia-100">{(weldVolume.totalVolumeCm3 * bendQuantity).toFixed(1)}</p>
                                  <p className="text-xs text-fuchsia-500 dark:text-fuchsia-400">cm³</p>
                                </div>
                              )}
                              {mainOdMm && pipeWallThickness && (() => {
                                const bendLengthM = (entry.calculation?.totalBendLengthMm || 0) / 1000;
                                const insideDiameterMm = mainOdMm - (2 * pipeWallThickness);
                                const surfaceArea = calculateComprehensiveSurfaceArea({
                                  outsideDiameterMm: mainOdMm,
                                  insideDiameterMm,
                                  pipeLengthM: bendLengthM,
                                  numberOfFlanges: totalFlanges,
                                  dn,
                                  pressureClass: pressureClassDesignation,
                                });
                                return (
                                  <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded text-center">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Surface m²</p>
                                    <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{(surfaceArea.totalExternalAreaM2 * bendQuantity).toFixed(2)}</p>
                                    <p className="text-xs text-indigo-500 dark:text-indigo-400">external</p>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Dimension Info - C/F with Radius and Total Bend Length */}
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* C/F and Radius */}
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Center-to-Face</p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{Number(entry.specs?.centerToFaceMm || 0).toFixed(1)} mm</p>
                                {entry.specs?.bendRadiusMm && (
                                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">Radius: {Number(entry.specs.bendRadiusMm).toFixed(1)} mm</p>
                                )}
                              </div>

                              {/* Total Bend Length */}
                              <div className="bg-purple-100 dark:bg-purple-900/40 p-3 rounded">
                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Total Bend Length</p>
                                {(() => {
                                  const cfVal = Number(entry.specs?.centerToFaceMm) || 0;
                                  const tan1 = entry.specs?.tangentLengths?.[0] || 0;
                                  const tan2 = entry.specs?.tangentLengths?.[1] || 0;
                                  const numTan = entry.specs?.numberOfTangents || 0;
                                  const numSt = entry.specs?.numberOfStubs || 0;
                                  const stubsList = entry.specs?.stubs || [];
                                  const st1Len = stubsList[0]?.length || 0;
                                  const st2Len = stubsList[1]?.length || 0;
                                  const stubsTot = st1Len + st2Len;

                                  const totLen = (cfVal * 2) + tan1 + tan2 + stubsTot;
                                  const e1 = cfVal + tan1;
                                  const e2 = cfVal + tan2;

                                  let cfDisp = '';
                                  if (numTan > 0 && (tan1 > 0 || tan2 > 0)) {
                                    if (numTan === 2 && tan1 > 0 && tan2 > 0) {
                                      cfDisp = `${e1.toFixed(0)}x${e2.toFixed(0)} C/F`;
                                    } else if (tan1 > 0) {
                                      cfDisp = `${e1.toFixed(0)}x${cfVal.toFixed(0)} C/F`;
                                    } else if (tan2 > 0) {
                                      cfDisp = `${cfVal.toFixed(0)}x${e2.toFixed(0)} C/F`;
                                    }
                                  } else {
                                    cfDisp = `C/F ${cfVal.toFixed(0)}mm`;
                                  }

                                  let stubDisp = '';
                                  if (numSt === 1 && st1Len > 0) {
                                    stubDisp = ` + ${st1Len}mm Stub`;
                                  } else if (numSt === 2 && st1Len > 0 && st2Len > 0) {
                                    if (st1Len === st2Len) {
                                      stubDisp = ` + 2xStubs ${st1Len}mm`;
                                    } else {
                                      stubDisp = ` + 1xStub ${st1Len}mm and 1xStub ${st2Len}mm`;
                                    }
                                  }

                                  return (
                                    <>
                                      <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{totLen.toFixed(0)} mm</p>
                                      <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{cfDisp}{stubDisp}</p>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )
                }
              />
  );
}
