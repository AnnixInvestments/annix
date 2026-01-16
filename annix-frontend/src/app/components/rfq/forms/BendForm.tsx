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
} from '@/app/lib/config/rfq';

const STEEL_SPEC_NB_FALLBACK: Record<string, number[]> = {
  'SABS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'SANS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'SABS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'SANS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'ASTM A106': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'ASTM A53': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'API 5L': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'ASTM A333': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'ASTM A179': [15, 20, 25, 32, 40, 50, 65, 80],
  'ASTM A192': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'ASTM A209': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300],
  'ASTM A210': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'ASTM A213': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'ASTM A312': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'ASTM A335': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'ASTM A358': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'ASTM A790': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400],
  'EN 10216': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'EN 10217': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
};
import {
  SABS62_NB_OPTIONS,
  SABS62_BEND_RADIUS,
  getSabs62CFInterpolated,
  getSabs62AvailableAngles,
  SABS62BendType,
} from '@/app/lib/utils/sabs62CfData';

export interface BendFormProps {
  entry: any;
  index: number;
  entries: any[];
  globalSpecs: any;
  masterData: any;
  onUpdateEntry: (id: string, updates: any) => void;
  onRemoveEntry: (id: string) => void;
  onCalculateBend?: (id: string) => void;
  openSelects: Record<string, boolean>;
  openSelect: (id: string) => void;
  closeSelect: (id: string) => void;
  focusAndOpenSelect: (id: string, retryCount?: number) => void;
  generateItemDescription: (entry: any) => string;
  Bend3DPreview?: React.ComponentType<any> | null;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
}

export default function BendForm({
  entry,
  index: _index,
  entries,
  globalSpecs,
  masterData,
  onUpdateEntry,
  onRemoveEntry,
  onCalculateBend,
  openSelects,
  openSelect,
  closeSelect,
  focusAndOpenSelect,
  generateItemDescription,
  Bend3DPreview,
  pressureClassesByStandard,
  getFilteredPressureClasses,
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
                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                    Item Description *
                  </label>
                  <textarea
                    value={entry.description || ''}
                    onChange={(e) => onUpdateEntry(entry.id, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    rows={2}
                    placeholder="e.g., 40NB 90° 1.5D Bend"
                    required
                  />
                </div>

                {/* Conditional Bend Layout - SABS 719 vs SABS 62 */}
                {(() => {
                  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                  const isSABS719 = effectiveSteelSpecId === 8;

                  // Common Steel Spec dropdown (used in both layouts)
                  const SteelSpecDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                        const options = masterData.steelSpecs?.map((spec: any) => ({
                          value: String(spec.id),
                          label: spec.steelSpecName
                        })) || [];

                        return (
                          <Select
                            id={selectId}
                            value={String(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId || '')}
                            onChange={(value) => {
                              const newSpecId = value ? Number(value) : undefined;
                              const updatedEntry: any = {
                                ...entry,
                                specs: {
                                  ...entry.specs,
                                  steelSpecificationId: newSpecId,
                                  nominalBoreMm: undefined,
                                  scheduleNumber: undefined,
                                  wallThicknessMm: undefined,
                                  bendType: undefined,
                                  bendRadiusType: undefined,
                                  bendDegrees: undefined,
                                  numberOfSegments: undefined,
                                  centerToFaceMm: undefined,
                                  bendRadiusMm: undefined
                                }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);

                              if (newSpecId) {
                                const isSABS719 = newSpecId === 8;
                                const nextFieldId = isSABS719
                                  ? `bend-radius-type-${entry.id}`
                                  : `bend-type-${entry.id}`;
                                setTimeout(() => focusAndOpenSelect(nextFieldId), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select Steel Spec"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // NB Dropdown (shared logic but different placement)
                  const NBDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Nominal Bore (mm) *
                        {!isSABS719 && !entry.specs?.bendType && (
                          <span className="text-orange-500 text-xs ml-1">(Select Bend Type first)</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `bend-nb-${entry.id}`;
                        const isDisabled = !isSABS719 && !entry.specs?.bendType;

                        const nbOptions = (() => {
                          if (!isSABS719 && entry.specs?.bendType) {
                            const bendType = entry.specs.bendType as SABS62BendType;
                            const sabs62NBs = SABS62_NB_OPTIONS[bendType] || [];
                            return sabs62NBs.map((nb: number) => ({
                              value: String(nb),
                              label: `${nb} NB`
                            }));
                          }
                          const steelSpec = masterData.steelSpecs?.find((s: any) => s.id === effectiveSteelSpecId);
                          const steelSpecName = steelSpec?.steelSpecName || '';
                          const fallbackNBs = Object.entries(STEEL_SPEC_NB_FALLBACK).find(([pattern]) => steelSpecName.includes(pattern))?.[1];
                          const nbs = fallbackNBs || [40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
                          return nbs.map((nb: number) => ({
                            value: String(nb),
                            label: `${nb} NB`
                          }));
                        })();

                        return (
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
                                const pressureMpa = pressure * 0.1;
                                const allowableStress = 137.9;
                                const safetyFactor = 1.2;
                                const minWT = (pressureMpa * od * safetyFactor) / (2 * allowableStress * 1.0);

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

                              if (isSABS719 && entry.specs?.bendRadiusType && entry.specs?.numberOfSegments) {
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

                              if (!isSABS719 && entry.specs?.bendType && entry.specs?.bendDegrees) {
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

                              const hasBendSpecs = isSABS719
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
                            placeholder={isDisabled ? 'Select Bend Type first' : 'Select NB'}
                            disabled={isDisabled}
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                    </div>
                  );

                  // Schedule Dropdown (shared)
                  const ScheduleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Schedule *
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
                    </div>
                  );

                  // SABS 62 Bend Type Dropdown
                  const BendTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Type *
                        <span className="text-purple-600 text-xs ml-1">(SABS 62)</span>
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

                  // SABS 719 Radius Type Dropdown
                  const RadiusTypeDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Radius *
                        <span className="text-blue-600 text-xs ml-1">(SABS 719)</span>
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

                  // Angle Dropdown (shared) - uses getSabs62AvailableAngles for SABS 62 bends
                  // This pulls ALL available angles from the Excel data for the selected bend type AND NB
                  const sabs62BendType = entry.specs?.bendType as SABS62BendType | undefined;
                  const sabs62NB = entry.specs?.nominalBoreMm;
                  const availableAngles = !isSABS719 && sabs62BendType && sabs62NB
                    ? getSabs62AvailableAngles(sabs62BendType, sabs62NB)
                    : [];

                  const AngleDropdown = (
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend Angle *
                        {!isSABS719 && sabs62BendType && (
                          <span className="text-purple-600 text-xs ml-1">({sabs62BendType})</span>
                        )}
                      </label>
                      {(() => {
                        const selectId = `bend-angle-${entry.id}`;
                        const isDisabled = !isSABS719 && !sabs62BendType;

                        const angleOptions = (() => {
                          if (!isSABS719) {
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
                            ...Array.from({ length: 53 }, (_, i) => i + 38)
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
                              const bendDegrees = value ? parseFloat(value) : undefined;
                              let centerToFaceMm: number | undefined;
                              let bendRadiusMm: number | undefined;
                              if (!isSABS719 && bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.bendType) {
                                const bendType = entry.specs.bendType as SABS62BendType;
                                centerToFaceMm = getSabs62CFInterpolated(bendType, bendDegrees, entry.specs.nominalBoreMm);
                                bendRadiusMm = SABS62_BEND_RADIUS[bendType]?.[entry.specs.nominalBoreMm];
                              }
                              const updatedEntry: any = {
                                ...entry,
                                specs: { ...entry.specs, bendDegrees, centerToFaceMm, bendRadiusMm, numberOfSegments: isSABS719 ? undefined : entry.specs?.numberOfSegments }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                              if (bendDegrees && entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            options={angleOptions}
                            placeholder={isDisabled ? 'Select Bend Type first' : 'Select Angle'}
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
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                              <label className="block text-xs font-semibold text-gray-900 mb-1">
                                Segments <span className="text-blue-600 text-xs ml-1">(SABS 719)</span>
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
                              <label className="block text-xs font-semibold text-gray-900 mb-1">
                                Segments <span className="text-green-600 text-xs ml-1">(Auto: 2)</span>
                              </label>
                              <input type="text" value="2 segments" disabled className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-green-50 text-green-900 font-medium cursor-not-allowed" />
                              {entry.specs?.centerToFaceMm && (
                                <p className="text-xs text-green-600 mt-0.5">C/F: {Number(entry.specs.centerToFaceMm).toFixed(1)}mm</p>
                              )}
                            </>
                          );
                        }

                        return (
                          <>
                            <label className="block text-xs font-semibold text-gray-900 mb-1">
                              Segments * <span className="text-blue-600 text-xs ml-1">({segmentOptions.join(' or ')})</span>
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                            >
                              <option value="">Select</option>
                              {segmentOptions.map(seg => (
                                <option key={seg} value={seg}>{seg} segments</option>
                              ))}
                            </select>
                            {entry.specs?.centerToFaceMm && (
                              <p className="text-xs text-green-600 mt-0.5">C/F: {Number(entry.specs.centerToFaceMm).toFixed(1)}mm</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );

                  // Render the appropriate layout
                  if (isSABS719) {
                    // SABS 719 Layout: Steel Spec -> NB -> Schedule | Radius Type -> Angle -> Segments
                    return (
                      <>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {SteelSpecDropdown}
                            {NBDropdown}
                            {ScheduleDropdown}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          {RadiusTypeDropdown}
                          {AngleDropdown}
                          {SegmentsDropdown}
                        </div>
                      </>
                    );
                  } else {
                    // SABS 62 Layout: Steel Spec -> Bend Type -> NB | Schedule -> Angle -> C/F
                    return (
                      <>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {SteelSpecDropdown}
                            {BendTypeDropdown}
                            {NBDropdown}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          {ScheduleDropdown}
                          {AngleDropdown}
                          {CFDisplay}
                        </div>
                      </>
                    );
                  }
                })()}

                {/* Two-Column Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {/* LEFT COLUMN - Quantity & Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-purple-500 pb-1.5">
                      Quantity & Options
                    </h4>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                        min="1"
                        placeholder="1"
                      />
                    </div>

                    {/* Center-to-Face Display */}
                    {entry.specs?.centerToFaceMm && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-green-900 mb-1">Center-to-Face</h5>
                        <p className="text-sm font-bold text-green-800">{Number(entry.specs.centerToFaceMm).toFixed(1)} mm</p>
                        {entry.specs?.bendRadiusMm && (
                          <p className="text-xs text-green-700 mt-0.5">Radius: {Number(entry.specs.bendRadiusMm).toFixed(1)} mm</p>
                        )}
                      </div>
                    )}

                    {/* Tangents Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-blue-900 mb-2">Tangent Extensions</h5>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="0">0 - No Tangents</option>
                          <option value="1">1 - Single Tangent</option>
                          <option value="2">2 - Both Tangents</option>
                        </select>
                      </div>

                      {(entry.specs?.numberOfTangents || 0) >= 1 && (
                        <div className="mt-2">
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                            min="0"
                            placeholder="150"
                          />
                        </div>
                      )}

                      {(entry.specs?.numberOfTangents || 0) >= 2 && (
                        <div className="mt-2">
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
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

                            // Weld thickness lookup (ASTM/ASME only - SABS 719 uses pipe WT directly)
                            const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                              'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                              'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                              'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                            };

                            let effectiveThickness: number | null = null;
                            let fittingClass = 'STD';
                            let weldThickness: number | null = null;

                            if (isSABS719) {
                              // SABS 719: Use pipe wall thickness directly
                              effectiveThickness = pipeWallThickness;
                            } else {
                              const scheduleUpper = schedule.toUpperCase();
                              fittingClass =
                                scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                                  ? 'XXH'
                                  : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                    ? 'XH'
                                    : 'STD';
                              weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                              effectiveThickness = weldThickness || pipeWallThickness;
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
                                  Weld thickness: {effectiveThickness.toFixed(2)}mm ({isSABS719 ? 'SABS 719 WT' : weldThickness ? fittingClass : 'from schedule'})
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

                      // Weld thickness lookup table (ASTM/ASME only)
                      const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                        'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                        'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                        'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                      };

                      let effectiveWeldThickness: number | undefined | null = null;
                      let fittingClass = 'STD';
                      let weldThickness: number | null = null;
                      let usingScheduleThickness = false;

                      if (isSABS719) {
                        // SABS 719: Use pipe wall thickness directly
                        effectiveWeldThickness = pipeWallThickness;
                        usingScheduleThickness = true;
                      } else {
                        const scheduleUpper = schedule.toUpperCase();
                        fittingClass =
                          scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                            ? 'XXH'
                            : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                              ? 'XH'
                              : 'STD';
                        weldThickness = dn ? FITTING_WALL_THICKNESS[fittingClass]?.[dn] : null;
                        effectiveWeldThickness = weldThickness || pipeWallThickness;
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
                      // For SABS 719, use pipe WT; for others, use fitting lookup
                      const stub1Thickness = isSABS719
                        ? (pipeWallThickness || 0)
                        : (stub1NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : 0);
                      const stub2Thickness = isSABS719
                        ? (pipeWallThickness || 0)
                        : (stub2NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : 0);

                      // Only show if there are bend flanges or stubs
                      if (weldCount === 0 && numStubs === 0) return null;

                      return (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <h6 className="text-xs font-bold text-green-900 mb-2">Flange Weld Data</h6>

                          {/* Bend Flange Welds */}
                          {weldCount > 0 && dn && effectiveWeldThickness && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-green-800">Bend Flanges ({weldCount}):</p>
                              <p className="text-xs text-green-700">
                                {dn}NB - {effectiveWeldThickness?.toFixed(2)}mm weld{isSABS719 ? ' (SABS 719 WT)' : usingScheduleThickness ? ' (sch)' : ` (${fittingClass})`}
                              </p>
                              <p className="text-xs text-green-600">
                                Weld length: {(circumference * 2 * weldCount).toFixed(0)}mm ({weldCount}x2x{circumference.toFixed(0)}mm circ)
                              </p>
                            </div>
                          )}

                          {/* Stub Flange Welds */}
                          {numStubs > 0 && (
                            <div className={weldCount > 0 ? 'pt-2 border-t border-green-200' : ''}>
                              <p className="text-xs font-medium text-green-800">Stub Flanges:</p>
                              {numStubs >= 1 && stub1NB && (
                                <div className="ml-2">
                                  {stub1HasFlange ? (
                                    <>
                                      <p className="text-xs text-green-700">
                                        Stub 1: {stub1NB}NB - {stub1Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-green-600">
                                        Weld length: {(stub1Circumference * 2).toFixed(0)}mm (2x{stub1Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Stub 1: {stub1NB}NB - OE (no weld data)</p>
                                  )}
                                </div>
                              )}
                              {numStubs >= 2 && stub2NB && (
                                <div className="ml-2 mt-1">
                                  {stub2HasFlange ? (
                                    <>
                                      <p className="text-xs text-green-700">
                                        Stub 2: {stub2NB}NB - {stub2Thickness?.toFixed(2)}mm weld
                                      </p>
                                      <p className="text-xs text-green-600">
                                        Weld length: {(stub2Circumference * 2).toFixed(0)}mm (2x{stub2Circumference.toFixed(0)}mm circ)
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-gray-500">Stub 2: {stub2NB}NB - OE (no weld data)</p>
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

                    {/* Total Bend Length - Auto-calculated */}
                    {entry.specs?.centerToFaceMm && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-purple-900 mb-1">Total Bend Length</h5>
                        {(() => {
                          const cf = Number(entry.specs.centerToFaceMm) || 0;
                          const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                          const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                          const numTangents = entry.specs?.numberOfTangents || 0;
                          const numStubs = entry.specs?.numberOfStubs || 0;
                          const stubs = entry.specs?.stubs || [];
                          const stub1Length = stubs[0]?.length || 0;
                          const stub2Length = stubs[1]?.length || 0;
                          const stubsTotal = stub1Length + stub2Length;

                          const totalLength = (cf * 2) + tangent1 + tangent2 + stubsTotal;
                          const end1 = cf + tangent1;
                          const end2 = cf + tangent2;

                          // Format like description: "455x555 C/F" or "C/F 305mm"
                          let cfDisplay = '';
                          if (numTangents > 0 && (tangent1 > 0 || tangent2 > 0)) {
                            if (numTangents === 2 && tangent1 > 0 && tangent2 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${end2.toFixed(0)} C/F`;
                            } else if (tangent1 > 0) {
                              cfDisplay = `${end1.toFixed(0)}x${cf.toFixed(0)} C/F`;
                            } else if (tangent2 > 0) {
                              cfDisplay = `${cf.toFixed(0)}x${end2.toFixed(0)} C/F`;
                            }
                          } else {
                            cfDisplay = `C/F ${cf.toFixed(0)}mm`;
                          }

                          // Format stub display
                          let stubDisplay = '';
                          if (numStubs === 1 && stub1Length > 0) {
                            stubDisplay = ` + ${stub1Length}mm Stub`;
                          } else if (numStubs === 2 && stub1Length > 0 && stub2Length > 0) {
                            if (stub1Length === stub2Length) {
                              stubDisplay = ` + 2xStubs ${stub1Length}mm`;
                            } else {
                              stubDisplay = ` + 1xStub ${stub1Length}mm and 1xStub ${stub2Length}mm`;
                            }
                          }

                          return (
                            <>
                              <p className="text-sm font-bold text-purple-800">{totalLength.toFixed(0)} mm</p>
                              <p className="text-xs text-purple-700 mt-0.5">{cfDisplay}{stubDisplay}</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN - Flanges & Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                      Flanges & Options
                    </h4>

                    {/* Bend End Configuration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">
                        Bend End Configuration
                      </label>
                      {(() => {
                        const selectId = `bend-end-config-${entry.id}`;
                        const options = BEND_END_OPTIONS.map(opt => ({
                          value: opt.value,
                          label: opt.label
                        }));

                        return (
                          <Select
                            id={selectId}
                            value={entry.specs?.bendEndConfiguration || 'PE'}
                            onChange={(newConfig) => {
                              const updatedEntry: any = {
                                ...entry,
                                specs: { ...entry.specs, bendEndConfiguration: newConfig }
                              };
                              updatedEntry.description = generateItemDescription(updatedEntry);
                              onUpdateEntry(entry.id, updatedEntry);
                              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber && entry.specs?.bendType && entry.specs?.bendDegrees) {
                                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
                              }
                            }}
                            options={options}
                            placeholder="Select End Configuration"
                            open={openSelects[selectId] || false}
                            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                          />
                        );
                      })()}
                      {entry.specs?.bendEndConfiguration && entry.specs.bendEndConfiguration !== 'PE' && (
                        <p className="mt-1 text-xs text-purple-600 font-medium">
                          {entry.specs.bendEndConfiguration === '2xLF'
                            ? '2 x tack weld ends (no flange welds)'
                            : `${getWeldCountPerBend(entry.specs.bendEndConfiguration)} weld${getWeldCountPerBend(entry.specs.bendEndConfiguration) !== 1 ? 's' : ''} per bend`}
                        </p>
                      )}
                    </div>

                    {/* Closure Length Field - Only shown when L/F configuration is selected */}
                    {hasLooseFlange(entry.specs?.bendEndConfiguration || '') && (() => {
                      const isLFBothEnds = entry.specs?.bendEndConfiguration === '2xLF';
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 mb-1">
                            Closure Length (mm) *
                            <span className="text-purple-600 text-xs ml-2">
                              {isLFBothEnds
                                ? '(Same length applies to both ends)'
                                : '(Site weld extension past L/F)'}
                            </span>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                          />
                          <p className="mt-0.5 text-xs text-gray-500">
                            {isLFBothEnds
                              ? 'Pipe extension past each loose flange for site weld connection - same length both ends (typically 100-200mm)'
                              : 'Additional pipe length extending past the loose flange for site weld connection (typically 100-200mm)'}
                          </p>
                          {/* Tack Weld Information */}
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                            <p className="text-xs font-bold text-amber-800">
                              Loose Flange Tack Welds Required:
                            </p>
                            <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                              {isLFBothEnds ? (
                                <>
                                  <li>16 tack welds total (~20mm each) - 8 per L/F end</li>
                                  <li>4 tack welds on each side of each loose flange</li>
                                </>
                              ) : (
                                <>
                                  <li>8 tack welds total (~20mm each)</li>
                                  <li>4 tack welds on each side of loose flange</li>
                                </>
                              )}
                            </ul>
                            <p className="text-xs text-amber-600 mt-1 italic">
                              Tack weld charge applies per L/F end{isLFBothEnds ? ' (x2)' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })()}


                    {/* Blank Flange Option for Bends - Position selector */}
                    {(() => {
                      const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';
                      const configUpper = bendEndConfig.toUpperCase();
                      // Determine available flange positions based on config
                      const hasInletFlange = ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);
                      const hasOutletFlange = ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2xLF'].includes(configUpper);

                      const availablePositions: { key: string; label: string; hasFlange: boolean }[] = [
                        { key: 'inlet', label: 'Inlet (Bottom)', hasFlange: hasInletFlange },
                        { key: 'outlet', label: 'Outlet (Top)', hasFlange: hasOutletFlange },
                      ].filter(p => p.hasFlange);

                      if (availablePositions.length === 0) return null;

                      const currentPositions = entry.specs?.blankFlangePositions || [];

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold text-green-800">Add Blank Flange(s)</span>
                            <span className="text-xs text-slate-500">({availablePositions.length} positions available)</span>
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
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-slate-700">{pos.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Flange Specifications - Uses Global Specs with Override Option */}
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="text-xs font-bold text-gray-900">
                          Flanges
                          {entry.hasFlangeOverride ? (
                            <span className="text-blue-600 text-xs ml-2 font-normal">(Override Active)</span>
                          ) : globalSpecs?.flangeStandardId ? (
                            <span className="text-green-600 text-xs ml-2 font-normal">(From Global Specs)</span>
                          ) : (
                            <span className="text-gray-500 text-xs ml-2 font-normal">(Not Set)</span>
                          )}
                        </h5>
                        {globalSpecs?.flangeStandardId && (
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            <span className="text-gray-500 italic">(click to change)</span>
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
                            <span className="font-medium">Override</span>
                          </label>
                        )}
                      </div>

                      {/* Warning if deviating from recommended pressure class */}
                      {(() => {
                        const currentClassId = entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId;
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
                        <div className="bg-green-50 p-2 rounded-md">
                          <p className="text-green-800 text-xs mb-1">
                            Using global flange standard from specifications page
                          </p>
                          {globalSpecs?.flangePressureClassId && (
                            <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                              <p className="text-blue-800 text-xs font-semibold">
                                Flange Spec:
                                <span className="ml-1">
                                  {(() => {
                                    const pressureClass = masterData.pressureClasses?.find(
                                      (pc: any) => pc.id === globalSpecs.flangePressureClassId
                                    );
                                    const flangeStandard = masterData.flangeStandards?.find(
                                      (fs: any) => fs.id === globalSpecs.flangeStandardId
                                    );
                                    if (pressureClass && flangeStandard) {
                                      return `${flangeStandard.code}/${pressureClass.designation}`;
                                    }
                                    return 'N/A';
                                  })()}
                                </span>
                              </p>
                              <p className="text-blue-600 text-xs mt-0.5">
                                For {globalSpecs?.workingPressureBar || 'N/A'} bar working pressure
                              </p>
                            </div>
                          )}
                        </div>
                      ) : !globalSpecs?.flangeStandardId ? (
                        <p className="text-xs text-gray-500">Set flange specs in Global Specifications</p>
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
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Flange Standard
                                  </label>
                                  <select
                                    value={entry.specs?.flangeStandardId || globalSpecs?.flangeStandardId || ''}
                                    onChange={async (e) => {
                                      const standardId = parseInt(e.target.value) || undefined;
                                      onUpdateEntry(entry.id, {
                                        specs: { ...entry.specs, flangeStandardId: standardId, flangePressureClassId: undefined }
                                      });
                                      // Fetch pressure classes for this standard
                                      if (standardId) {
                                        getFilteredPressureClasses(standardId);
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  >
                                    <option value="">Select Standard</option>
                                    {masterData.flangeStandards?.map((standard: any) => (
                                      <option key={standard.id} value={standard.id}>
                                        {standard.code}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-900 mb-1">
                                    Pressure Class
                                  </label>
                                  <select
                                    value={entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId || ''}
                                    onChange={(e) => onUpdateEntry(entry.id, {
                                      specs: {
                                        ...entry.specs,
                                        flangePressureClassId: parseInt(e.target.value) || undefined
                                      }
                                    })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  >
                                    <option value="">Select Class</option>
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

                    {/* Stubs Section - Compact */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h5 className="text-xs font-bold text-green-900 mb-2">Stub Connections</h5>
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
                        <div className="mt-2 p-2 bg-white rounded border border-green-300">
                          <p className="text-xs font-medium text-green-900 mb-1">Stub 1 <span className="text-gray-500 font-normal">(on horizontal tangent - vertical stub)</span></p>
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
                              <label className="block text-xs text-gray-600 mb-0.5">Orientation</label>
                              {(() => {
                                const selectId = `bend-stub1-orientation-${entry.id}`;
                                const orientationOptions = [
                                  { value: 'top', label: 'Top' },
                                  { value: 'bottom', label: 'Bottom' },
                                  { value: 'inside', label: 'Inside (bend)' },
                                  { value: 'outside', label: 'Outside (bend)' }
                                ];
                                return (
                                  <Select
                                    id={selectId}
                                    value={entry.specs?.stubs?.[0]?.orientation || 'outside'}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[0] = { ...stubs[0], orientation: value };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={orientationOptions}
                                    placeholder="Select"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Length (mm)</label>
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="150"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Location (mm)</label>
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 1 Flange - Global with Override */}
                          <div className="bg-orange-50 border border-orange-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[0]?.hasFlangeOverride ? (
                                  <span className="text-blue-600 ml-1">(Override)</span>
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
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="S/O">S/O (Slip-On)</option>
                                  <option value="L/F">L/F (Loose)</option>
                                  <option value="R/F">R/F (Rotating)</option>
                                </select>
                              </div>
                            ) : (
                              <p className="text-xs text-orange-700">Set in Global Specs</p>
                            )}
                          </div>
                        </div>
                      )}

                      {(entry.specs?.numberOfStubs || 0) >= 2 && (
                        <div className="mt-2 p-2 bg-white rounded border border-green-300">
                          <p className="text-xs font-medium text-green-900 mb-1">Stub 2 <span className="text-gray-500 font-normal">(on angled tangent)</span></p>
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
                              <label className="block text-xs text-gray-600 mb-0.5">Orientation</label>
                              {(() => {
                                const selectId = `bend-stub2-orientation-${entry.id}`;
                                const orientationOptions = [
                                  { value: 'top', label: 'Top' },
                                  { value: 'bottom', label: 'Bottom' },
                                  { value: 'inside', label: 'Inside (bend)' },
                                  { value: 'outside', label: 'Outside (bend)' }
                                ];
                                return (
                                  <Select
                                    id={selectId}
                                    value={entry.specs?.stubs?.[1]?.orientation || 'outside'}
                                    onChange={(value) => {
                                      const stubs = [...(entry.specs?.stubs || [])];
                                      stubs[1] = { ...stubs[1], orientation: value };
                                      const updatedEntry = { ...entry, specs: { ...entry.specs, stubs } };
                                      updatedEntry.description = generateItemDescription(updatedEntry);
                                      onUpdateEntry(entry.id, updatedEntry);
                                    }}
                                    options={orientationOptions}
                                    placeholder="Select"
                                    open={openSelects[selectId] || false}
                                    onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Length (mm)</label>
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="150"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-0.5">Location (mm)</label>
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
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 text-gray-900"
                                placeholder="From flange"
                              />
                            </div>
                          </div>
                          {/* Stub 2 Flange - Global with Override */}
                          <div className="bg-orange-50 border border-orange-200 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-orange-900">
                                Flange
                                {entry.specs?.stubs?.[1]?.hasFlangeOverride ? (
                                  <span className="text-blue-600 ml-1">(Override)</span>
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
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
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
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900"
                                >
                                  <option value="S/O">S/O (Slip-On)</option>
                                  <option value="L/F">L/F (Loose)</option>
                                  <option value="R/F">R/F (Rotating)</option>
                                </select>
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

                            // Weld thickness lookup (for ASTM/ASME only)
                            const FITTING_WALL_THICKNESS: Record<string, Record<number, number>> = {
                              'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53 },
                              'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70 },
                              'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40 }
                            };

                            const scheduleUpper = schedule.toUpperCase();
                            const fittingClass =
                              scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH')
                                ? 'XXH'
                                : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH')
                                  ? 'XH'
                                  : 'STD';

                            const stub1NB = stubs[0]?.nominalBoreMm;
                            const stub2NB = stubs[1]?.nominalBoreMm;
                            const stub1OD = stub1NB ? (NB_TO_OD_LOOKUP[stub1NB] || (stub1NB * 1.05)) : 0;
                            const stub2OD = stub2NB ? (NB_TO_OD_LOOKUP[stub2NB] || (stub2NB * 1.05)) : 0;
                            const stub1Circumference = Math.PI * stub1OD;
                            const stub2Circumference = Math.PI * stub2OD;
                            // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                            const stub1Thickness = isSABS719
                              ? (pipeWallThickness || 0)
                              : (stub1NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub1NB] || pipeWallThickness) : 0);
                            const stub2Thickness = isSABS719
                              ? (pipeWallThickness || 0)
                              : (stub2NB ? (FITTING_WALL_THICKNESS[fittingClass]?.[stub2NB] || pipeWallThickness) : 0);

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
                                  {isSABS719 && <span className="text-blue-600 ml-1">(SABS 719 WT)</span>}
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

                {/* Calculation Results - Compact Layout matching Pipe style */}
                {entry.calculation && (
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b-2 border-purple-500 pb-1.5 mb-3">
                      Calculation Results
                    </h4>
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-md">
                      {(() => {
                        // Calculate all values needed for display
                        const cf = Number(entry.specs?.centerToFaceMm) || 0;
                        const tangent1 = entry.specs?.tangentLengths?.[0] || 0;
                        const tangent2 = entry.specs?.tangentLengths?.[1] || 0;
                        const numTangents = entry.specs?.numberOfTangents || 0;
                        const numStubs = entry.specs?.numberOfStubs || 0;
                        const stubs = entry.specs?.stubs || [];
                        const stub1NB = stubs[0]?.nominalBoreMm;
                        const stub2NB = stubs[1]?.nominalBoreMm;
                        // Stubs always have flanges by default when they exist (have NB set)
                        const stub1HasFlange = stub1NB ? true : false;
                        const stub2HasFlange = stub2NB ? true : false;
                        const bendEndConfig = entry.specs?.bendEndConfiguration || 'PE';

                        // C/F display with tangents
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

                        // Count total flanges from all sources
                        // FBE = Flanged Both Ends (2), 2xLF = Loose Flange Both Ends (2), 2X_RF = 2x Rotating Flange (2)
                        // FOE = Flanged One End (1), FOE_LF = Flanged One End Loose Flange (1), FOE_RF = Flanged One End Rotating Flange (1)
                        const bendFlangeCount = ['FBE', '2xLF', '2X_RF'].includes(bendEndConfig) ? 2
                          : ['FOE', 'FOE_LF', 'FOE_RF'].includes(bendEndConfig) ? 1 : 0;
                        const stub1FlangeCount = stub1HasFlange ? 1 : 0;
                        const stub2FlangeCount = stub2HasFlange ? 1 : 0;
                        const numSegments = entry.specs?.numberOfSegments || 0;
                        const totalFlanges = bendFlangeCount + stub1FlangeCount + stub2FlangeCount;

                        // Weld thickness lookup
                        const dn = entry.specs?.nominalBoreMm;
                        const schedule = entry.specs?.scheduleNumber || '';
                        const pipeWallThickness = entry.calculation?.wallThicknessMm;

                        // Check for SABS 719 - use item-level steel spec with global fallback
                        const steelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
                        const isSABS719 = steelSpecId === 8;

                        const scheduleUpper = schedule.toUpperCase();
                        const fittingClass = scheduleUpper.includes('160') || scheduleUpper.includes('XXS') || scheduleUpper.includes('XXH') ? 'XXH' : scheduleUpper.includes('80') || scheduleUpper.includes('XS') || scheduleUpper.includes('XH') ? 'XH' : 'STD';
                        const FITTING_WT: Record<string, Record<number, number>> = {
                          'STD': { 15: 2.77, 20: 2.87, 25: 3.38, 32: 3.56, 40: 3.68, 50: 3.91, 65: 5.16, 80: 5.49, 90: 5.74, 100: 6.02, 125: 6.55, 150: 7.11, 200: 8.18, 250: 9.27, 300: 9.53, 350: 9.53, 400: 9.53, 450: 9.53, 500: 9.53, 600: 9.53, 750: 9.53, 900: 9.53, 1000: 9.53, 1050: 9.53, 1200: 9.53 },
                          'XH': { 15: 3.73, 20: 3.91, 25: 4.55, 32: 4.85, 40: 5.08, 50: 5.54, 65: 7.01, 80: 7.62, 100: 8.56, 125: 9.53, 150: 10.97, 200: 12.70, 250: 12.70, 300: 12.70, 350: 12.70, 400: 12.70, 450: 12.70, 500: 12.70, 600: 12.70, 750: 12.70, 900: 12.70, 1000: 12.70, 1050: 12.70, 1200: 12.70 },
                          'XXH': { 15: 7.47, 20: 7.82, 25: 9.09, 32: 9.70, 40: 10.16, 50: 11.07, 65: 14.02, 80: 15.24, 100: 17.12, 125: 19.05, 150: 22.23, 200: 22.23, 250: 25.40, 300: 25.40, 350: 25.40, 400: 25.40, 450: 25.40, 500: 25.40, 600: 25.40 }
                        };
                        const NB_TO_OD: Record<number, number> = { 15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9, 350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 600: 609.6, 700: 711.2, 750: 762.0, 800: 812.8, 900: 914.4, 1000: 1016.0, 1050: 1066.8, 1200: 1219.2 };
                        // For SABS 719: use pipe WT directly; for ASTM/ASME: use fitting lookup
                        const fittingWt = isSABS719 ? null : (dn ? FITTING_WT[fittingClass]?.[dn] : null);
                        const effectiveWt = isSABS719 ? pipeWallThickness : (fittingWt || pipeWallThickness);

                        // Calculate stub weights using proper pipe weight formula
                        // Weight = π × (OD² - ID²) / 4 × density × length / 1000000
                        // Steel density = 7850 kg/m³
                        const calculateStubWeight = (stubNB: number | null, stubLength: number, stubWt?: number): number => {
                          if (!stubNB || stubLength <= 0) return 0;
                          const stubOD = NB_TO_OD[stubNB] || stubNB * 1.1;
                          // Use provided WT or lookup from FITTING_WT, or estimate as 5% of OD
                          const stubWT = stubWt || FITTING_WT[fittingClass]?.[stubNB] || (stubOD * 0.05);
                          const stubID = stubOD - (2 * stubWT);
                          const crossSectionalArea = Math.PI * (Math.pow(stubOD, 2) - Math.pow(stubID, 2)) / 4; // mm²
                          const weightPerMeter = crossSectionalArea * 7850 / 1000000; // kg/m
                          return weightPerMeter * (stubLength / 1000); // kg
                        };
                        const stub1Weight = calculateStubWeight(stub1NB, stubs[0]?.length || 0, stubs[0]?.wallThicknessMm);
                        const stub2Weight = calculateStubWeight(stub2NB, stubs[1]?.length || 0, stubs[1]?.wallThicknessMm);
                        const stubsWeight = stub1Weight + stub2Weight;

                        // Stub weld thicknesses (for flange and tee welds) - SABS 719 uses pipe WT
                        const stub1Wt = isSABS719
                          ? (pipeWallThickness || 5)
                          : (stub1NB ? (FITTING_WT[fittingClass]?.[stub1NB] || pipeWallThickness || 5) : 0);
                        const stub2Wt = isSABS719
                          ? (pipeWallThickness || 5)
                          : (stub2NB ? (FITTING_WT[fittingClass]?.[stub2NB] || pipeWallThickness || 5) : 0);

                        // Calculate flange weights dynamically based on NB and pressure class
                        // Bend flanges - use bend's NB and pressure class
                        const bendPressureClass = masterData.pressureClasses?.find((p: any) => p.id === (entry.specs?.flangePressureClassId || globalSpecs?.flangePressureClassId))?.designation;
                        const bendFlangeWeight = bendFlangeCount > 0 ? getFlangeWeight(dn || 100, bendPressureClass) * bendFlangeCount : 0;

                        // Stub 1 flange - use stub's own NB and pressure class
                        const stub1PressureClass = stubs[0]?.flangePressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === stubs[0].flangePressureClassId)?.designation
                          : bendPressureClass;
                        const stub1FlangeWeight = stub1FlangeCount > 0 ? getFlangeWeight(stub1NB || dn || 100, stub1PressureClass) : 0;

                        // Stub 2 flange - use stub's own NB and pressure class
                        const stub2PressureClass = stubs[1]?.flangePressureClassId
                          ? masterData.pressureClasses?.find((p: any) => p.id === stubs[1].flangePressureClassId)?.designation
                          : bendPressureClass;
                        const stub2FlangeWeight = stub2FlangeCount > 0 ? getFlangeWeight(stub2NB || dn || 100, stub2PressureClass) : 0;

                        // Total calculated flange weight
                        const totalCalcFlangeWeight = bendFlangeWeight + stub1FlangeWeight + stub2FlangeWeight;

                        return (
                          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                            {/* Quantity */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Qty Bends</p>
                              <p className="text-lg font-bold text-gray-900">{entry.specs?.quantityValue || 1}</p>
                              <p className="text-xs text-gray-500">pieces</p>
                            </div>

                            {/* Combined Dimensions - C/F and Stubs */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Dimensions</p>
                              <p className="text-sm font-bold text-purple-900">C/F: {cfDisplay} mm</p>
                              {numTangents > 0 && <p className="text-[10px] text-gray-500">incl. tangents</p>}
                              {numStubs > 0 && (
                                <div className="mt-1 pt-1 border-t border-gray-200">
                                  {stub1NB && (
                                    <p className="text-[10px] text-gray-700">Stub 1 Length: {stubs[0]?.length || 0}mm</p>
                                  )}
                                  {stub2NB && (
                                    <p className="text-[10px] text-gray-700">Stub 2 Length: {stubs[1]?.length || 0}mm</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Surface Area - for coating calculations */}
                            {(() => {
                              const odMm = entry.calculation?.outsideDiameterMm || entry.specs?.outsideDiameterMm;
                              const wtMm = entry.calculation?.wallThicknessMm || entry.specs?.wallThicknessMm;
                              if (!odMm || !wtMm) return null;

                              const idMm = odMm - (2 * wtMm);
                              const odM = odMm / 1000;
                              const idM = idMm / 1000;

                              // Get bend radius and angle
                              const bendRadiusMm = entry.specs?.bendRadiusMm || entry.calculation?.bendRadiusMm ||
                                (entry.specs?.centerToFaceMm ? entry.specs.centerToFaceMm : (entry.specs?.nominalBoreMm || 100) * 1.5);
                              const bendAngleDeg = entry.specs?.bendDegrees || 90;
                              const bendAngleRad = (bendAngleDeg * Math.PI) / 180;
                              const arcLengthM = (bendRadiusMm / 1000) * bendAngleRad;

                              let extArea = odM * Math.PI * arcLengthM;
                              let intArea = idM * Math.PI * arcLengthM;

                              // Add tangents
                              const tangentLengths = entry.specs?.tangentLengths || [];
                              if (tangentLengths[0] > 0) {
                                extArea += odM * Math.PI * (tangentLengths[0] / 1000);
                                intArea += idM * Math.PI * (tangentLengths[0] / 1000);
                              }
                              if (tangentLengths[1] > 0) {
                                extArea += odM * Math.PI * (tangentLengths[1] / 1000);
                                intArea += idM * Math.PI * (tangentLengths[1] / 1000);
                              }

                              // Add stubs
                              if (entry.specs?.stubs?.length > 0) {
                                entry.specs.stubs.forEach((stub: any) => {
                                  if (stub?.nominalBoreMm && stub?.length) {
                                    const stubOdMm = stub.outsideDiameterMm || (stub.nominalBoreMm * 1.1);
                                    const stubWtMm = stub.wallThicknessMm || (stubOdMm * 0.08);
                                    const stubIdMm = stubOdMm - (2 * stubWtMm);
                                    extArea += (stubOdMm / 1000) * Math.PI * (stub.length / 1000);
                                    intArea += (stubIdMm / 1000) * Math.PI * (stub.length / 1000);
                                  }
                                });
                              }

                              return (
                                <div className="bg-indigo-50 p-2 rounded text-center border border-indigo-200">
                                  <p className="text-xs text-indigo-700 font-medium">Surface Area</p>
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-xs text-indigo-900">
                                      <span className="font-medium">Ext:</span> {extArea.toFixed(3)} m²
                                    </p>
                                    <p className="text-xs text-indigo-900">
                                      <span className="font-medium">Int:</span> {intArea.toFixed(3)} m²
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Total Weight - calculated from all components including backing rings */}
                            {(() => {
                              const bendConfig = (entry.specs?.bendEndConfiguration || 'PE').toUpperCase();
                              // Only R/F (rotating flange) configurations require backing rings
                              const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(bendConfig);

                              let backingRingWeight = 0;
                              if (hasRotatingFlange) {
                                const getBackingRingCountBend = () => {
                                  if (bendConfig === 'FOE_RF') return 1;
                                  if (bendConfig === '2X_RF') return 2;
                                  return 0;
                                };
                                const backingRingCount = getBackingRingCountBend();

                                const getFlangeODBend = (nb: number) => {
                                  const flangeODs: Record<number, number> = {
                                    15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                                    100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                                    400: 580, 450: 640, 500: 670, 600: 780
                                  };
                                  return flangeODs[nb] || nb * 1.5;
                                };

                                const pipeOD = entry.calculation?.outsideDiameterMm || (dn * 1.1);
                                const flangeOD = getFlangeODBend(dn || 100);
                                const ringOD = flangeOD - 10;
                                const ringID = pipeOD;
                                const ringThickness = 10;
                                const steelDensity = 7.85;

                                const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                                const weightPerRing = volumeCm3 * steelDensity / 1000;
                                backingRingWeight = weightPerRing * backingRingCount;
                              }

                              const totalWeight = (entry.calculation.bendWeight || 0) + (entry.calculation.tangentWeight || 0) + totalCalcFlangeWeight + stubsWeight + backingRingWeight;

                              return (
                                <div className="bg-white p-2 rounded text-center">
                                  <p className="text-xs text-gray-600 font-medium">Total Weight</p>
                                  <p className="text-lg font-bold text-purple-900">
                                    {totalWeight.toFixed(1)} kg
                                  </p>
                                  {backingRingWeight > 0 && (
                                    <p className="text-xs text-purple-600">
                                      (incl. {backingRingWeight.toFixed(1)}kg rings)
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Weight Breakdown - Bend first, then Tangent, Flange, Stubs, Rings */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weight Breakdown</p>
                              <p className="text-xs text-gray-700 mt-1">Bend: {entry.calculation.bendWeight?.toFixed(1) || '0'}kg</p>
                              <p className="text-xs text-gray-700">Tangent: {entry.calculation.tangentWeight?.toFixed(1) || '0'}kg</p>
                              <p className="text-xs text-gray-700">Flange: {totalCalcFlangeWeight.toFixed(1)}kg</p>
                              {bendFlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">({bendFlangeCount}x bend @ {bendFlangeWeight.toFixed(1)}kg)</p>}
                              {stub1FlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">(stub1 @ {stub1FlangeWeight.toFixed(1)}kg)</p>}
                              {stub2FlangeCount > 0 && <p className="text-[10px] text-gray-500 ml-2">(stub2 @ {stub2FlangeWeight.toFixed(1)}kg)</p>}
                              {numStubs > 0 && <p className="text-xs text-gray-700">Stubs: {stubsWeight.toFixed(1)}kg</p>}
                            </div>

                            {/* Flanges & Backing Rings - Combined field */}
                            {(() => {
                              const bendConfig = (entry.specs?.bendEndConfiguration || 'PE').toUpperCase();
                              // Only R/F (rotating flange) configurations require backing rings
                              const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(bendConfig);

                              // Get backing ring count and weight if applicable
                              let backingRingCount = 0;
                              let backingRingWeight = 0;
                              if (hasRotatingFlange) {
                                if (bendConfig === 'FOE_RF') backingRingCount = 1;
                                else if (bendConfig === '2X_RF') backingRingCount = 2;

                                if (backingRingCount > 0) {
                                  const getFlangeOD = (nb: number) => {
                                    const flangeODs: Record<number, number> = {
                                      15: 95, 20: 105, 25: 115, 32: 140, 40: 150, 50: 165, 65: 185, 80: 200,
                                      100: 220, 125: 250, 150: 285, 200: 340, 250: 405, 300: 460, 350: 520,
                                      400: 580, 450: 640, 500: 670, 600: 780
                                    };
                                    return flangeODs[nb] || nb * 1.5;
                                  };
                                  const pipeOD = entry.calculation?.outsideDiameterMm || (dn * 1.1);
                                  const flangeOD = getFlangeOD(dn || 100);
                                  const ringOD = flangeOD - 10;
                                  const ringID = pipeOD;
                                  const ringThickness = 10;
                                  const steelDensity = 7.85;
                                  const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
                                  const weightPerRing = volumeCm3 * steelDensity / 1000;
                                  backingRingWeight = weightPerRing * backingRingCount;
                                }
                              }

                              return (
                                <div className="bg-white p-2 rounded text-center">
                                  <p className="text-xs text-gray-600 font-medium">Flanges{backingRingCount > 0 ? ' & Rings' : ''}</p>
                                  <p className="text-lg font-bold text-gray-900">{totalFlanges}</p>
                                  <div className="text-left mt-1 space-y-0.5">
                                    {bendFlangeCount > 0 && (
                                      <p className="text-[10px] text-gray-700">{bendFlangeCount} x {dn}NB Flange</p>
                                    )}
                                    {/* Stub flanges - combine if same NB, separate if different */}
                                    {stub1FlangeCount > 0 && stub2FlangeCount > 0 && stub1NB === stub2NB ? (
                                      <p className="text-[10px] text-purple-700">2 x {stub1NB}NB Stub Flange</p>
                                    ) : (
                                      <>
                                        {stub1FlangeCount > 0 && stub1NB && (
                                          <p className="text-[10px] text-purple-700">1 x {stub1NB}NB Stub Flange</p>
                                        )}
                                        {stub2FlangeCount > 0 && stub2NB && (
                                          <p className="text-[10px] text-purple-700">1 x {stub2NB}NB Stub Flange</p>
                                        )}
                                      </>
                                    )}
                                    {backingRingCount > 0 && (
                                      <p className="text-[10px] text-purple-700 mt-1 pt-1 border-t border-purple-200">
                                        {backingRingCount} x Backing Ring ({backingRingWeight.toFixed(1)}kg)
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Weld Summary */}
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-600 font-medium">Weld Summary</p>
                              <div className="text-left mt-1 space-y-0.5">
                                {bendFlangeCount > 0 && (
                                  <p className="text-[10px] text-green-700">Bend Flange: {bendFlangeCount * 2} welds @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {numTangents > 0 && (
                                  <p className="text-[10px] text-blue-700">Tangent Buttweld: {numTangents} @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {numSegments > 1 && (
                                  <p className="text-[10px] text-red-700">Mitre Weld: {numSegments - 1} @ {effectiveWt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub1NB && (
                                  <p className="text-[10px] text-purple-700">Stub 1 Tee: 1 weld @ {stub1Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub2NB && (
                                  <p className="text-[10px] text-purple-700">Stub 2 Tee: 1 weld @ {stub2Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub1FlangeCount > 0 && (
                                  <p className="text-[10px] text-orange-700">Stub 1 Flange: 2 welds @ {stub1Wt?.toFixed(1) || '?'}mm</p>
                                )}
                                {stub2FlangeCount > 0 && (
                                  <p className="text-[10px] text-orange-700">Stub 2 Flange: 2 welds @ {stub2Wt?.toFixed(1) || '?'}mm</p>
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
                  Bend3DPreview ? (
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
                    />
                  ) : null
                }
              />
  );
}
