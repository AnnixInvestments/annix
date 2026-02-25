"use client";

import { useMemo } from "react";
import {
  calculateTolerances,
  type ToleranceStandard,
  toleranceForPipe,
  toleranceStandardLabel,
} from "@/app/lib/config/rfq/pipeTolerances";

export interface PipeToleranceDisplayProps {
  odMm: number;
  wallMm: number;
  npsInches: number;
  standard: ToleranceStandard;
  compact?: boolean;
}

export function PipeToleranceDisplay({
  odMm,
  wallMm,
  npsInches,
  standard,
  compact = false,
}: PipeToleranceDisplayProps) {
  const toleranceSpec = useMemo(() => toleranceForPipe(standard, npsInches), [standard, npsInches]);

  const calculated = useMemo(
    () => calculateTolerances(odMm, wallMm, standard, npsInches),
    [odMm, wallMm, standard, npsInches],
  );

  if (!toleranceSpec || !calculated) {
    return (
      <div className="text-xs text-gray-500 italic">
        Tolerance data not available for this size/standard
      </div>
    );
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-gray-600">
        <span>
          OD: {calculated.odMinMm} - {calculated.odMaxMm} mm
        </span>
        <span className="text-gray-400">|</span>
        <span>
          Wall: {calculated.wallMinMm} - {calculated.wallMaxMm} mm
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">Pipe Tolerances</span>
        <span className="text-xs text-gray-500">{toleranceStandardLabel(standard)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-gray-500 block">
            OD Tolerance (±{toleranceSpec.odTolerancePct}%)
          </span>
          <p className="text-sm font-medium text-gray-800">
            {calculated.odMinMm} - {calculated.odMaxMm} mm
          </p>
          <p className="text-xs text-gray-500">Nominal: {odMm} mm</p>
        </div>

        <div>
          <span className="text-xs text-gray-500 block">
            Wall Tolerance (-{toleranceSpec.wallTolerancePctUnder}%
            {toleranceSpec.wallTolerancePctOver > 0
              ? ` / +${toleranceSpec.wallTolerancePctOver}%`
              : ""}
            )
          </span>
          <p className="text-sm font-medium text-gray-800">
            {calculated.wallMinMm} - {calculated.wallMaxMm} mm
          </p>
          <p className="text-xs text-gray-500">Nominal: {wallMm} mm</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Straightness</span>
          <p className="font-medium text-gray-700">{toleranceSpec.straightnessPerLength}</p>
        </div>
        <div>
          <span className="text-gray-500">Weight Tol.</span>
          <p className="font-medium text-gray-700">±{toleranceSpec.weightTolerancePct}%</p>
        </div>
        <div>
          <span className="text-gray-500">Length (DRL)</span>
          <p className="font-medium text-gray-700">
            +{toleranceSpec.lengthDrlPlusMm}/-{toleranceSpec.lengthDrlMinusMm} mm
          </p>
        </div>
      </div>
    </div>
  );
}

export interface ToleranceQuickRefProps {
  standard: ToleranceStandard;
}

export function ToleranceQuickRef({ standard }: ToleranceQuickRefProps) {
  return (
    <div className="text-xs text-gray-600 bg-blue-50 rounded px-2 py-1 border border-blue-100">
      <span className="font-medium">{toleranceStandardLabel(standard)}</span>
      <span className="mx-1">-</span>
      <span>Wall: -12.5%</span>
      {standard === "ASME_B36_19M" && <span>, +12.5%</span>}
    </div>
  );
}
