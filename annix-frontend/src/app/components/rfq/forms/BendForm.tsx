'use client';

import React from 'react';
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
} from '@/app/lib/config/rfq';
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
  Bend3DPreview: React.ComponentType<any>;
  pressureClassesByStandard: Record<number, any[]>;
  getFilteredPressureClasses: (standardId: number) => void;
}

const STEEL_SPEC_NB_FALLBACK: Record<string, number[]> = {
  'SABS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'SANS 62': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  'SABS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'SANS 719': [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  'ASTM A106': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'ASTM A53': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600],
  'API 5L': [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
};

const SABS719_ANGLE_OPTIONS = [
  { value: '11', label: '11°' },
  { value: '22.5', label: '22.5°' },
  { value: '30', label: '30°' },
  { value: '37', label: '37°' },
  { value: '45', label: '45°' },
  { value: '59', label: '59°' },
  { value: '60', label: '60°' },
  { value: '90', label: '90°' },
];

const segmentOptionsForAngle = (deg: number): number[] => {
  if (deg <= 11) return [2];
  if (deg <= 37) return [2, 3];
  if (deg <= 59) return [3, 4];
  return [5, 6, 7];
};

export default function BendForm({
  entry,
  index,
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
  const effectiveSteelSpecId = entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId;
  const isSABS719 = effectiveSteelSpecId === 8;

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
                const newIsSABS719 = newSpecId === 8;
                const nextFieldId = newIsSABS719
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

  const RadiusTypeDropdown = (
    <div>
      <label className="block text-xs font-semibold text-gray-900 mb-1">
        Bend Radius Type *
      </label>
      {(() => {
        const selectId = `bend-radius-type-${entry.id}`;
        const options = SABS719_BEND_TYPES.map(bt => ({
          value: bt.value,
          label: bt.label
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
                  numberOfSegments: undefined,
                  centerToFaceMm: undefined,
                  bendRadiusMm: undefined,
                  bendDegrees: undefined
                }
              };
              updatedEntry.description = generateItemDescription(updatedEntry);
              onUpdateEntry(entry.id, updatedEntry);

              if (radiusType) {
                setTimeout(() => focusAndOpenSelect(`bend-nb-${entry.id}`), 100);
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

  const AngleDropdownSABS719 = (
    <div>
      <label className="block text-xs font-semibold text-gray-900 mb-1">
        Bend Angle *
        {!entry.specs?.bendRadiusType && (
          <span className="text-orange-500 text-xs ml-1">(Select Radius Type first)</span>
        )}
      </label>
      {(() => {
        const selectId = `bend-angle-${entry.id}`;

        return (
          <Select
            id={selectId}
            value={entry.specs?.bendDegrees ? String(entry.specs.bendDegrees) : ''}
            onChange={(angleValue) => {
              const angle = parseFloat(angleValue);
              if (!angle) return;

              const updatedEntry: any = {
                ...entry,
                specs: {
                  ...entry.specs,
                  bendDegrees: angle,
                  numberOfSegments: undefined,
                  centerToFaceMm: undefined,
                  bendRadiusMm: undefined
                }
              };
              updatedEntry.description = generateItemDescription(updatedEntry);
              onUpdateEntry(entry.id, updatedEntry);
            }}
            options={SABS719_ANGLE_OPTIONS}
            placeholder={!entry.specs?.bendRadiusType ? 'Select Radius Type first' : 'Select Angle'}
            disabled={!entry.specs?.bendRadiusType}
            open={openSelects[selectId] || false}
            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
          />
        );
      })()}
    </div>
  );

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

        const segmentOptions = segmentOptionsForAngle(bendDeg);
        const isAutoFill = bendDeg <= 11;

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

  const AngleDropdownSABS62 = (
    <div>
      <label className="block text-xs font-semibold text-gray-900 mb-1">
        Bend Angle *
        {!entry.specs?.bendType && (
          <span className="text-orange-500 text-xs ml-1">(Select Bend Type first)</span>
        )}
      </label>
      {(() => {
        const selectId = `bend-angle-${entry.id}`;
        const bendType = entry.specs?.bendType as SABS62BendType;
        const nb = entry.specs?.nominalBoreMm;
        const availableAngles = bendType && nb ? getSabs62AvailableAngles(bendType, nb) : [];
        const angleOptions = availableAngles.map((angle: number) => ({
          value: String(angle),
          label: `${angle}°`
        }));

        return (
          <Select
            id={selectId}
            value={entry.specs?.bendDegrees ? String(entry.specs.bendDegrees) : ''}
            onChange={(angleValue) => {
              const angle = parseInt(angleValue);
              if (!angle || !bendType || !nb) return;

              const centerToFace = getSabs62CFInterpolated(bendType, angle, nb);
              const bendRadius = SABS62_BEND_RADIUS[bendType]?.[nb];

              const updatedEntry: any = {
                ...entry,
                specs: {
                  ...entry.specs,
                  bendDegrees: angle,
                  centerToFaceMm: centerToFace,
                  bendRadiusMm: bendRadius
                }
              };
              updatedEntry.description = generateItemDescription(updatedEntry);
              onUpdateEntry(entry.id, updatedEntry);

              if (entry.specs?.nominalBoreMm && entry.specs?.scheduleNumber) {
                setTimeout(() => onCalculateBend && onCalculateBend(entry.id), 100);
              }
            }}
            options={angleOptions}
            placeholder={!bendType ? 'Select Bend Type first' : !nb ? 'Select NB first' : 'Select Angle'}
            disabled={!bendType || !nb}
            open={openSelects[selectId] || false}
            onOpenChange={(open) => open ? openSelect(selectId) : closeSelect(selectId)}
          />
        );
      })()}
    </div>
  );

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

  return (
    <SplitPaneLayout
      entryId={entry.id}
      itemType="bend"
      showSplitToggle={entry.specs?.nominalBoreMm && entry.specs?.bendDegrees}
      formContent={
        <>
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

          {isSABS719 ? (
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
                {AngleDropdownSABS719}
                {SegmentsDropdown}
              </div>
            </>
          ) : (
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
                {AngleDropdownSABS62}
                {CFDisplay}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-purple-500 pb-1.5">
                Quantity & Options
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={entry.specs?.quantityValue || ''}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 1;
                    onUpdateEntry(entry.id, { specs: { ...entry.specs, quantityValue: qty } });
                  }}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900"
                  placeholder="1"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 border-b border-green-500 pb-1.5">
                Flanges & Options
              </h4>
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
                    {entry.specs.bendEndConfiguration === 'LF_BE'
                      ? '2 x tack weld ends (no flange welds)'
                      : `${getWeldCountPerBend(entry.specs.bendEndConfiguration)} weld${getWeldCountPerBend(entry.specs.bendEndConfiguration) !== 1 ? 's' : ''} per bend`}
                  </p>
                )}
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
        <Bend3DPreview
          nominalBore={entry.specs?.nominalBoreMm}
          outerDiameter={entry.calculation?.outsideDiameterMm || NB_TO_OD_LOOKUP[entry.specs?.nominalBoreMm] || (entry.specs?.nominalBoreMm * 1.05)}
          wallThickness={entry.calculation?.wallThicknessMm || 5}
          bendAngle={entry.specs?.bendDegrees}
          bendType={entry.specs?.bendType || '1.5D'}
          tangent1={entry.specs?.tangentLengths?.[0] || 0}
          tangent2={entry.specs?.tangentLengths?.[1] || 0}
          schedule={entry.specs?.scheduleNumber}
          materialName={masterData.steelSpecs?.find((s: any) => s.id === (entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId))?.steelSpecName}
          numberOfSegments={entry.specs?.numberOfSegments}
          isSegmented={(entry.specs?.steelSpecificationId || globalSpecs?.steelSpecificationId) === 8}
          stubs={entry.specs?.stubs}
          numberOfStubs={entry.specs?.numberOfStubs || 0}
          flangeConfig={entry.specs?.bendEndConfiguration || 'PE'}
          closureLengthMm={entry.specs?.closureLengthMm || 0}
          addBlankFlange={entry.specs?.addBlankFlange}
          blankFlangePositions={entry.specs?.blankFlangePositions}
        />
      }
    />
  );
}
