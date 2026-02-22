"use client";

import { useEffect, useMemo, useState } from "react";
import { useHeatTreatments } from "@/app/lib/hooks/useHeatTreatments";
import type {
  HeatTreatment,
  HeatTreatmentRequirementResponse,
} from "@/app/lib/pipe-steel-work/types";

interface HeatTreatmentSelectorProps {
  value: string | null;
  onChange: (treatmentCode: string | null, isRequired: boolean) => void;
  material?: string;
  wallThicknessMm?: number;
  weldType?: string;
  designCode?: string;
  weightKg?: number;
  disabled?: boolean;
  showRequirementCheck?: boolean;
  showCostEstimate?: boolean;
  className?: string;
}

const HEAT_TREATMENT_TYPE_LABELS: Record<string, string> = {
  pwht: "Post Weld Heat Treatment (PWHT)",
  stress_relief: "Stress Relief",
  normalizing: "Normalizing",
  annealing: "Annealing",
  solution_annealing: "Solution Annealing",
  quench_temper: "Quench & Temper",
};

const WELD_TYPE_OPTIONS = [
  { value: "butt_weld", label: "Butt Weld" },
  { value: "fillet_weld", label: "Fillet Weld" },
  { value: "socket_weld", label: "Socket Weld" },
  { value: "seal_weld", label: "Seal Weld" },
];

const DESIGN_CODE_OPTIONS = [
  { value: "ASME_B31.3", label: "ASME B31.3 (Process Piping)" },
  { value: "ASME_B31.1", label: "ASME B31.1 (Power Piping)" },
  { value: "ASME_VIII", label: "ASME VIII (Pressure Vessels)" },
  { value: "API_570", label: "API 570 (Inspection)" },
];

export default function HeatTreatmentSelector({
  value,
  onChange,
  material,
  wallThicknessMm,
  weldType,
  designCode,
  weightKg,
  disabled = false,
  showRequirementCheck = true,
  showCostEstimate = true,
  className = "",
}: HeatTreatmentSelectorProps) {
  const { treatments, isLoading, treatmentByCode, checkRequirement, isCheckingRequirement } =
    useHeatTreatments();
  const [requirement, setRequirement] = useState<HeatTreatmentRequirementResponse | null>(null);
  const [localWeldType, setLocalWeldType] = useState(weldType || "butt_weld");
  const [localDesignCode, setLocalDesignCode] = useState(designCode || "ASME_B31.3");

  const selectedTreatment = useMemo(
    () => (value ? treatmentByCode(value) : null),
    [value, treatmentByCode],
  );

  const treatmentsByType = useMemo(() => {
    const grouped: Record<string, HeatTreatment[]> = {};
    treatments.forEach((t) => {
      const type = t.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(t);
    });
    return grouped;
  }, [treatments]);

  const filteredTreatments = useMemo(() => {
    if (!material) return treatments;
    return treatments.filter((t) =>
      t.applicableMaterials.some((m) => material.toUpperCase().includes(m.toUpperCase())),
    );
  }, [treatments, material]);

  useEffect(() => {
    if (!showRequirementCheck || !material || !wallThicknessMm) {
      setRequirement(null);
      return;
    }

    const abortController = new AbortController();

    const runCheck = async () => {
      const result = await checkRequirement({
        material,
        wallThicknessMm,
        weldType: weldType || localWeldType,
        designCode: designCode || localDesignCode,
      });
      if (!abortController.signal.aborted) {
        setRequirement(result);
        if (result?.isRequired && result.requiredTreatment && !value) {
          const requiredTreatmentCode = treatments.find(
            (t) => t.type === result.requiredTreatment,
          )?.code;
          if (requiredTreatmentCode) {
            onChange(requiredTreatmentCode, true);
          }
        }
      }
    };

    const timeoutId = setTimeout(runCheck, 300);
    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [
    material,
    wallThicknessMm,
    weldType,
    localWeldType,
    designCode,
    localDesignCode,
    showRequirementCheck,
    checkRequirement,
    treatments,
    value,
    onChange,
  ]);

  const estimatedCost = useMemo(() => {
    if (!selectedTreatment || !weightKg || !selectedTreatment.baseCostPerKg) return null;
    return selectedTreatment.baseCostPerKg * weightKg;
  }, [selectedTreatment, weightKg]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heat Treatment
            {isLoading && <span className="ml-2 text-xs text-gray-400">(loading...)</span>}
            {requirement?.isRequired && (
              <span className="ml-2 text-xs text-red-600 font-medium">(Required)</span>
            )}
          </label>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null, requirement?.isRequired || false)}
            disabled={disabled || isLoading}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              requirement?.isRequired && !value ? "border-red-300 bg-red-50" : "border-gray-300"
            }`}
          >
            <option value="">No heat treatment</option>
            {Object.entries(treatmentsByType).map(([type, treats]) => {
              const filtered = treats.filter(
                (t) =>
                  !material ||
                  t.applicableMaterials.some((m) =>
                    material.toUpperCase().includes(m.toUpperCase()),
                  ),
              );
              if (filtered.length === 0) return null;
              return (
                <optgroup key={type} label={HEAT_TREATMENT_TYPE_LABELS[type] || type}>
                  {filtered.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                      {t.baseCostPerKg ? ` (~R${t.baseCostPerKg}/kg)` : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {selectedTreatment && (
        <div className="bg-orange-50 rounded-md p-3 text-sm border border-orange-200">
          <p className="text-gray-700 mb-2">{selectedTreatment.description}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Temperature Range:</span>
              <p className="font-medium text-gray-700">
                {selectedTreatment.tempRangeLowC}°C - {selectedTreatment.tempRangeHighC}°C
              </p>
            </div>
            <div>
              <span className="text-gray-500">Hold Time:</span>
              <p className="font-medium text-gray-700">{selectedTreatment.holdTimeFormula}</p>
            </div>
            <div>
              <span className="text-gray-500">Max Heating Rate:</span>
              <p className="font-medium text-gray-700">
                {selectedTreatment.heatingRateMaxCPerHr}°C/hr
              </p>
            </div>
            <div>
              <span className="text-gray-500">Max Cooling Rate:</span>
              <p className="font-medium text-gray-700">
                {selectedTreatment.coolingRateMaxCPerHr === 999
                  ? "Rapid (water/air)"
                  : `${selectedTreatment.coolingRateMaxCPerHr}°C/hr`}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs">
            <span className="text-gray-500">Code References: </span>
            <span className="font-medium text-gray-700">
              {selectedTreatment.codeReferences.join(", ")}
            </span>
          </div>
        </div>
      )}

      {showCostEstimate && selectedTreatment && weightKg && estimatedCost && (
        <div className="bg-green-50 rounded-md p-3 border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600">Estimated Heat Treatment Cost</p>
              <p className="text-sm text-gray-500">
                {weightKg.toFixed(1)}kg × R{selectedTreatment.baseCostPerKg}/kg
              </p>
            </div>
            <p className="text-lg font-bold text-green-700">R {estimatedCost.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showRequirementCheck && (
        <div className="grid grid-cols-2 gap-3">
          {!weldType && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weld Type</label>
              <select
                value={localWeldType}
                onChange={(e) => setLocalWeldType(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {WELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!designCode && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Design Code</label>
              <select
                value={localDesignCode}
                onChange={(e) => setLocalDesignCode(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {DESIGN_CODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {isCheckingRequirement && (
        <p className="text-xs text-gray-500 animate-pulse">Checking requirements...</p>
      )}

      {requirement && (
        <div
          className={`rounded-md p-3 ${
            requirement.isRequired
              ? "bg-red-50 border border-red-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div className="flex items-start gap-2">
            {requirement.isRequired ? (
              <svg
                className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <div>
              <p
                className={`text-sm font-medium ${requirement.isRequired ? "text-red-700" : "text-green-700"}`}
              >
                {requirement.isRequired ? "Heat Treatment Required" : "Heat Treatment Not Required"}
              </p>
              <p className="text-xs text-gray-600 mt-1">{requirement.reason}</p>
            </div>
          </div>

          {requirement.codeReferences.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">References: </span>
              {requirement.codeReferences.join(", ")}
            </div>
          )}

          {requirement.exemptionConditions && requirement.exemptionConditions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-600">Exemption conditions:</p>
              <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                {requirement.exemptionConditions.map((cond, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-gray-400 mt-0.5">•</span>
                    {cond}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requirement.isRequired && requirement.estimatedCostImpact > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <span className="font-medium">Estimated cost impact: </span>
                <span className="text-orange-600 font-semibold">
                  +R{requirement.estimatedCostImpact.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
