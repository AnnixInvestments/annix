"use client";

import { useMemo, useState } from "react";
import {
  type DefectType,
  defectCriteriaByCode,
  defectTypeLabel,
  SOUR_SERVICE_HARDNESS_LIMITS,
  WELD_DEFECT_CRITERIA,
  type WeldingCode,
  weldingCodeLabel,
} from "@/app/lib/config/rfq/weldDefectAcceptance";

export interface WeldDefectAcceptanceRefProps {
  selectedCode?: WeldingCode;
  showSourServiceLimits?: boolean;
  compact?: boolean;
}

export function WeldDefectAcceptanceRef({
  selectedCode,
  showSourServiceLimits = false,
  compact = false,
}: WeldDefectAcceptanceRefProps) {
  const [activeCode, setActiveCode] = useState<WeldingCode>(selectedCode ?? "API_1104");

  const criteria = useMemo(() => {
    return defectCriteriaByCode(activeCode);
  }, [activeCode]);

  const codes: WeldingCode[] = ["API_1104", "ASME_B31_3", "AWS_D1_1"];

  if (compact) {
    return <CompactDefectRef code={activeCode} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Weld Defect Acceptance Criteria</h3>
        <div className="flex gap-2 mt-2">
          {codes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveCode(code)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeCode === code
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {code.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-500 mb-3">{weldingCodeLabel(activeCode)}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-700">Defect Type</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">Max Size</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">Cumulative Limit</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr
                  key={`${c.code}-${c.defectType}`}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-2">
                    <span
                      className={`font-medium ${
                        c.defectType === "CRACK" ? "text-red-700" : "text-gray-800"
                      }`}
                    >
                      {c.defectName}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-600">
                    {c.maxDimensionMm !== null && c.maxDimensionMm > 0
                      ? `${c.maxDimensionMm}mm`
                      : ""}
                    {c.maxDimensionPctT !== null && c.maxDimensionPctT > 0
                      ? `${c.maxDimensionMm !== null && c.maxDimensionMm > 0 ? " / " : ""}${c.maxDimensionPctT}%t`
                      : ""}
                    {c.maxDimensionMm === 0 && c.maxDimensionPctT === 0 && (
                      <span className="text-red-600 font-medium">Not Permitted</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{c.cumulativeLimit ?? "-"}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`${
                        c.repairLimit?.includes("Mandatory")
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {c.repairLimit ?? "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showSourServiceLimits && <SourServiceHardnessLimits />}
      </div>
    </div>
  );
}

function SourServiceHardnessLimits() {
  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h4 className="text-xs font-semibold text-gray-800 mb-2">
        Sour Service Hardness Limits (NACE MR0175)
      </h4>
      <div className="flex gap-4 text-xs">
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <span className="text-amber-700 font-medium">
            Max HRC: {SOUR_SERVICE_HARDNESS_LIMITS.maxHrc}
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <span className="text-amber-700 font-medium">
            Max HV: {SOUR_SERVICE_HARDNESS_LIMITS.maxHv}
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <span className="text-amber-700 font-medium">
            Max HB: {SOUR_SERVICE_HARDNESS_LIMITS.maxHb}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">{SOUR_SERVICE_HARDNESS_LIMITS.notes}</p>
    </div>
  );
}

interface CompactDefectRefProps {
  code: WeldingCode;
}

function CompactDefectRef({ code }: CompactDefectRefProps) {
  const criteria = defectCriteriaByCode(code);
  const crackCriteria = criteria.find((c) => c.defectType === "CRACK");
  const undercutCriteria = criteria.find((c) => c.defectType === "UNDERCUT");

  return (
    <div className="inline-flex items-center gap-3 text-xs bg-gray-50 rounded px-3 py-2 border border-gray-200">
      <span className="font-medium text-gray-700">{code.replace(/_/g, " ")}</span>
      <span className="text-gray-400">|</span>
      <span className="text-red-600">
        Cracks: {crackCriteria?.cumulativeLimit ?? "Zero tolerance"}
      </span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-600">Undercut: ≤{undercutCriteria?.maxDimensionMm ?? 0.8}mm</span>
    </div>
  );
}

export interface DefectQuickCheckProps {
  code: WeldingCode;
  defectType: DefectType;
  measuredValueMm?: number;
  wallThicknessMm?: number;
}

export function DefectQuickCheck({
  code,
  defectType,
  measuredValueMm,
  wallThicknessMm,
}: DefectQuickCheckProps) {
  const criteria = useMemo(() => {
    return WELD_DEFECT_CRITERIA.find((c) => c.code === code && c.defectType === defectType);
  }, [code, defectType]);

  if (!criteria) {
    return null;
  }

  const isAcceptable = useMemo(() => {
    if (measuredValueMm === undefined) return null;

    if (criteria.maxDimensionMm !== null && criteria.maxDimensionMm === 0) {
      return measuredValueMm === 0;
    }

    if (criteria.maxDimensionMm !== null && measuredValueMm > criteria.maxDimensionMm) {
      return false;
    }

    if (
      criteria.maxDimensionPctT !== null &&
      wallThicknessMm !== undefined &&
      measuredValueMm > (wallThicknessMm * criteria.maxDimensionPctT) / 100
    ) {
      return false;
    }

    return true;
  }, [criteria, measuredValueMm, wallThicknessMm]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
        isAcceptable === null
          ? "bg-gray-100 text-gray-700"
          : isAcceptable
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
      }`}
    >
      <span className="font-medium">{defectTypeLabel(defectType)}</span>
      {measuredValueMm !== undefined && (
        <>
          <span>: {measuredValueMm}mm</span>
          {isAcceptable !== null && (
            <span className="font-semibold">{isAcceptable ? "ACCEPTABLE" : "REJECT"}</span>
          )}
        </>
      )}
    </div>
  );
}
