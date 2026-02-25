"use client";

import { useMemo } from "react";
import {
  API_5L_GRADE_LIST,
  API_5L_GRADES,
  type Api5lGradeSpec,
  type PslLevel,
} from "@/app/lib/config/rfq/api5lGrades";

export interface Api5lGradeSelectorProps {
  selectedGrade: string | null;
  selectedPsl: PslLevel;
  onGradeChange: (grade: string) => void;
  onPslChange: (psl: PslLevel) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

export function Api5lGradeSelector({
  selectedGrade,
  selectedPsl,
  onGradeChange,
  onPslChange,
  disabled,
  showDetails = true,
}: Api5lGradeSelectorProps) {
  const gradeSpec = useMemo(() => {
    return selectedGrade ? API_5L_GRADES[selectedGrade] : null;
  }, [selectedGrade]);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">API 5L Grade</label>
          <select
            value={selectedGrade ?? ""}
            onChange={(e) => onGradeChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select grade...</option>
            {API_5L_GRADE_LIST.map((grade) => (
              <option key={grade} value={grade}>
                {grade} - SMYS {API_5L_GRADES[grade].smysMpa} MPa
              </option>
            ))}
          </select>
        </div>

        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">PSL Level</label>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => onPslChange("PSL1")}
              disabled={disabled}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                selectedPsl === "PSL1"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              PSL1
            </button>
            <button
              type="button"
              onClick={() => onPslChange("PSL2")}
              disabled={disabled}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                selectedPsl === "PSL2"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              PSL2
            </button>
          </div>
        </div>
      </div>

      {showDetails && gradeSpec && <Api5lGradeDetails spec={gradeSpec} pslLevel={selectedPsl} />}
    </div>
  );
}

interface Api5lGradeDetailsProps {
  spec: Api5lGradeSpec;
  pslLevel: PslLevel;
}

function Api5lGradeDetails({ spec, pslLevel }: Api5lGradeDetailsProps) {
  const carbonLimit = pslLevel === "PSL1" ? spec.carbonMaxPct.psl1 : spec.carbonMaxPct.psl2;
  const phosphorusLimit =
    pslLevel === "PSL1" ? spec.phosphorusMaxPct.psl1 : spec.phosphorusMaxPct.psl2;
  const sulfurLimit = pslLevel === "PSL1" ? spec.sulfurMaxPct.psl1 : spec.sulfurMaxPct.psl2;

  return (
    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-800">
          Grade {spec.grade} ({pslLevel})
        </span>
        {pslLevel === "PSL2" && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
            Enhanced Requirements
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-gray-500">SMYS</span>
          <p className="font-medium text-gray-800">{spec.smysMpa} MPa</p>
        </div>
        <div>
          <span className="text-gray-500">SMTS</span>
          <p className="font-medium text-gray-800">{spec.smtsMpa} MPa</p>
        </div>
        <div>
          <span className="text-gray-500">Elongation Min</span>
          <p className="font-medium text-gray-800">{spec.elongationPctMin}%</p>
        </div>
        <div>
          <span className="text-gray-500">CEq Max</span>
          <p className="font-medium text-gray-800">{spec.ceqMax ?? "N/A"}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500 block mb-1">Chemistry Limits (max %)</span>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-gray-700">C: {carbonLimit}</span>
          <span className="text-gray-700">Mn: {spec.manganeseMaxPct}</span>
          <span className="text-gray-700">P: {phosphorusLimit}</span>
          <span className="text-gray-700">S: {sulfurLimit}</span>
        </div>
      </div>

      {pslLevel === "PSL2" && spec.cvnAvgJ !== null && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-500 block mb-1">CVN Impact Requirements</span>
          <div className="flex gap-4 text-xs">
            <span className="text-gray-700">Test Temp: {spec.cvnTempC}°C</span>
            <span className="text-gray-700">Avg: ≥{spec.cvnAvgJ}J</span>
            <span className="text-gray-700">Min: ≥{spec.cvnMinJ}J</span>
          </div>
        </div>
      )}
    </div>
  );
}

export interface Api5lGradeBadgeProps {
  grade: string;
  pslLevel: PslLevel;
  compact?: boolean;
}

export function Api5lGradeBadge({ grade, pslLevel, compact = false }: Api5lGradeBadgeProps) {
  const spec = API_5L_GRADES[grade];
  if (!spec) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {grade} {pslLevel}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200">
      <span className="text-sm font-semibold text-blue-800">API 5L {grade}</span>
      <span
        className={`px-1.5 py-0.5 text-xs font-medium rounded ${
          pslLevel === "PSL2" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
        }`}
      >
        {pslLevel}
      </span>
      <span className="text-xs text-blue-600">{spec.smysMpa} MPa</span>
    </div>
  );
}
