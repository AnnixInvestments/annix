"use client";

import React, { useMemo } from "react";
import {
  END_PREPARATIONS,
  type EndPrepType,
  endPreparationByType,
  recommendedEndPrep,
} from "@/app/lib/config/rfq/endPreparations";

export interface EndPreparationSelectorProps {
  selectedPrep: EndPrepType | null;
  wallThicknessMm: number | null;
  onPrepChange: (prep: EndPrepType) => void;
  disabled?: boolean;
  showRecommendation?: boolean;
  showDetails?: boolean;
}

export function EndPreparationSelector({
  selectedPrep,
  wallThicknessMm,
  onPrepChange,
  disabled,
  showRecommendation = true,
  showDetails = true,
}: EndPreparationSelectorProps) {
  const recommended = useMemo(() => {
    return wallThicknessMm ? recommendedEndPrep(wallThicknessMm) : null;
  }, [wallThicknessMm]);

  const prepSpec = useMemo(() => {
    return selectedPrep ? endPreparationByType(selectedPrep) : null;
  }, [selectedPrep]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End Preparation</label>
        <select
          value={selectedPrep ?? ""}
          onChange={(e) => onPrepChange(e.target.value as EndPrepType)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select preparation...</option>
          {END_PREPARATIONS.map((prep) => (
            <option key={prep.type} value={prep.type}>
              {prep.name}
              {recommended === prep.type && showRecommendation ? " (Recommended)" : ""}
            </option>
          ))}
        </select>
      </div>

      {showRecommendation && recommended && selectedPrep !== recommended && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 border border-amber-200">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            For {wallThicknessMm}mm wall, {endPreparationByType(recommended)?.name} is recommended
          </span>
        </div>
      )}

      {showDetails && prepSpec && <EndPreparationDetails spec={prepSpec} />}
    </div>
  );
}

interface EndPreparationDetailsProps {
  spec: ReturnType<typeof endPreparationByType>;
}

function EndPreparationDetails({ spec }: EndPreparationDetailsProps) {
  if (!spec) return null;

  return (
    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-800">{spec.name}</span>
        <span className="text-xs text-gray-500">{spec.description}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
        <div>
          <span className="text-gray-500">Bevel Angle</span>
          <p className="font-medium text-gray-800">
            {spec.bevelAngleDeg}° ±{spec.bevelAngleTolDeg}°
          </p>
        </div>
        {spec.secondaryAngleDeg !== null && (
          <div>
            <span className="text-gray-500">Secondary Angle</span>
            <p className="font-medium text-gray-800">{spec.secondaryAngleDeg}°</p>
          </div>
        )}
        <div>
          <span className="text-gray-500">Root Face</span>
          <p className="font-medium text-gray-800">
            {spec.rootFaceMm} ±{spec.rootFaceTolMm} mm
          </p>
        </div>
        <div>
          <span className="text-gray-500">Root Gap</span>
          <p className="font-medium text-gray-800">
            {spec.rootGapMmMin} - {spec.rootGapMmMax} mm
          </p>
        </div>
      </div>

      {spec.landMm !== null && (
        <div className="text-xs mb-2">
          <span className="text-gray-500">Land: </span>
          <span className="font-medium text-gray-700">{spec.landMm} mm</span>
        </div>
      )}

      <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
        <span className="font-medium">Applicable: </span>
        {spec.applicableFor}
      </div>

      <EndPrepVisual prepType={spec.type} />
    </div>
  );
}

interface EndPrepVisualProps {
  prepType: EndPrepType;
}

function EndPrepVisual({ prepType }: EndPrepVisualProps) {
  const visualPaths: Record<EndPrepType, React.ReactNode> = {
    SQUARE: (
      <path d="M10 30 L10 10 L90 10 L90 30" fill="none" stroke="currentColor" strokeWidth="2" />
    ),
    V_BEVEL: (
      <>
        <path
          d="M10 30 L10 10 L45 10 L50 20 L55 10 L90 10 L90 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="50" y="8" textAnchor="middle" fontSize="8" fill="currentColor">
          37.5°
        </text>
      </>
    ),
    COMPOUND: (
      <>
        <path
          d="M10 30 L10 10 L40 10 L45 15 L50 20 L55 15 L60 10 L90 10 L90 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="35" y="8" textAnchor="middle" fontSize="7" fill="currentColor">
          10°
        </text>
        <text x="65" y="8" textAnchor="middle" fontSize="7" fill="currentColor">
          37.5°
        </text>
      </>
    ),
    J_PREP: (
      <>
        <path
          d="M10 30 L10 10 L40 10 Q50 10 50 18 Q50 10 60 10 L90 10 L90 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="50" y="8" textAnchor="middle" fontSize="8" fill="currentColor">
          J
        </text>
      </>
    ),
    U_PREP: (
      <>
        <path
          d="M10 30 L10 10 L35 10 Q50 10 50 22 Q50 10 65 10 L90 10 L90 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="50" y="8" textAnchor="middle" fontSize="8" fill="currentColor">
          U
        </text>
      </>
    ),
  };

  return (
    <div className="mt-3 flex justify-center">
      <svg
        viewBox="0 0 100 40"
        className="w-32 h-16 text-blue-600"
        aria-label={`${prepType} end preparation diagram`}
      >
        {visualPaths[prepType]}
        <line
          x1="10"
          y1="30"
          x2="90"
          y2="30"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      </svg>
    </div>
  );
}

export interface EndPrepBadgeProps {
  prepType: EndPrepType;
}

export function EndPrepBadge({ prepType }: EndPrepBadgeProps) {
  const spec = endPreparationByType(prepType);
  if (!spec) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
      {spec.name}
      {spec.bevelAngleDeg > 0 && ` (${spec.bevelAngleDeg}°)`}
    </span>
  );
}
