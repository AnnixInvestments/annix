"use client";

import { useMemo } from "react";
import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

interface EnvironmentalConditionsInputProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
}

interface ConditionCheck {
  name: string;
  status: "ok" | "warning" | "critical";
  value: string;
  limit: string;
  message: string;
}

export function EnvironmentalConditionsInput({
  globalSpecs,
  onUpdateGlobalSpecs,
}: EnvironmentalConditionsInputProps) {
  const ambientTemp = globalSpecs.applicationAmbientTempC ?? 25;
  const relativeHumidity = globalSpecs.applicationHumidityPercent ?? 50;
  const steelTemp = globalSpecs.applicationSteelTempC ?? ambientTemp;

  const dewPoint = useMemo(() => {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * ambientTemp) / (b + ambientTemp) + Math.log(relativeHumidity / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  }, [ambientTemp, relativeHumidity]);

  const steelTempAboveDewPoint = steelTemp - dewPoint;

  const conditions = useMemo((): ConditionCheck[] => {
    const checks: ConditionCheck[] = [];

    if (relativeHumidity > 85) {
      checks.push({
        name: "Relative Humidity",
        status: "critical",
        value: `${relativeHumidity}%`,
        limit: "<85%",
        message: "RH too high - do not apply coatings",
      });
    } else if (relativeHumidity > 75) {
      checks.push({
        name: "Relative Humidity",
        status: "warning",
        value: `${relativeHumidity}%`,
        limit: "<85%",
        message: "RH approaching limit - monitor conditions",
      });
    } else {
      checks.push({
        name: "Relative Humidity",
        status: "ok",
        value: `${relativeHumidity}%`,
        limit: "<85%",
        message: "Within acceptable range",
      });
    }

    if (steelTempAboveDewPoint < 3) {
      checks.push({
        name: "Steel vs Dew Point",
        status: "critical",
        value: `${steelTempAboveDewPoint.toFixed(1)}C above`,
        limit: ">3C above dew point",
        message: "Steel too close to dew point - condensation risk",
      });
    } else if (steelTempAboveDewPoint < 5) {
      checks.push({
        name: "Steel vs Dew Point",
        status: "warning",
        value: `${steelTempAboveDewPoint.toFixed(1)}C above`,
        limit: ">3C above dew point",
        message: "Steel temp marginal - monitor closely",
      });
    } else {
      checks.push({
        name: "Steel vs Dew Point",
        status: "ok",
        value: `${steelTempAboveDewPoint.toFixed(1)}C above`,
        limit: ">3C above dew point",
        message: "Safe margin above dew point",
      });
    }

    if (ambientTemp < 10) {
      checks.push({
        name: "Ambient Temperature",
        status: "warning",
        value: `${ambientTemp}C`,
        limit: "10-35C typical",
        message: "Low temperature - check product TDS for limits",
      });
    } else if (ambientTemp > 35) {
      checks.push({
        name: "Ambient Temperature",
        status: "warning",
        value: `${ambientTemp}C`,
        limit: "10-35C typical",
        message: "High temperature - reduced pot life",
      });
    } else {
      checks.push({
        name: "Ambient Temperature",
        status: "ok",
        value: `${ambientTemp}C`,
        limit: "10-35C typical",
        message: "Within typical range",
      });
    }

    return checks;
  }, [ambientTemp, relativeHumidity, steelTempAboveDewPoint]);

  const overallStatus = useMemo(() => {
    if (conditions.some((c) => c.status === "critical")) return "critical";
    if (conditions.some((c) => c.status === "warning")) return "warning";
    return "ok";
  }, [conditions]);

  const statusColors = {
    ok: "bg-green-100 border-green-300 text-green-800",
    warning: "bg-amber-100 border-amber-300 text-amber-800",
    critical: "bg-red-100 border-red-300 text-red-800",
  };

  const statusIcons = {
    ok: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    critical: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
          Application Conditions
        </h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors[overallStatus]}`}>
          {overallStatus === "ok" && "Conditions OK"}
          {overallStatus === "warning" && "Caution"}
          {overallStatus === "critical" && "Do Not Apply"}
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">
            Ambient Temp (C)
          </label>
          <input
            type="number"
            value={ambientTemp}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                applicationAmbientTempC: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">
            Relative Humidity (%)
          </label>
          <input
            type="number"
            value={relativeHumidity}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                applicationHumidityPercent: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-600 mb-1">Steel Temp (C)</label>
          <input
            type="number"
            value={steelTemp}
            onChange={(e) =>
              onUpdateGlobalSpecs({
                ...globalSpecs,
                applicationSteelTempC: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Calculated Values */}
      <div className="bg-gray-50 rounded p-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Calculated Dew Point:</span>
            <span className="ml-2 font-semibold text-gray-900">{dewPoint}C</span>
          </div>
          <div>
            <span className="text-gray-600">Steel Above Dew Point:</span>
            <span
              className={`ml-2 font-semibold ${
                steelTempAboveDewPoint >= 3 ? "text-green-600" : "text-red-600"
              }`}
            >
              {steelTempAboveDewPoint.toFixed(1)}C
            </span>
          </div>
        </div>
      </div>

      {/* Condition Checks */}
      <div className="space-y-2">
        {conditions.map((condition) => (
          <div
            key={condition.name}
            className={`flex items-center justify-between p-2 rounded border ${statusColors[condition.status]}`}
          >
            <div className="flex items-center gap-2">
              {statusIcons[condition.status]}
              <div>
                <div className="text-xs font-medium">{condition.name}</div>
                <div className="text-[10px] opacity-75">{condition.message}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold">{condition.value}</div>
              <div className="text-[10px] opacity-75">Limit: {condition.limit}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning Message */}
      {overallStatus === "critical" && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-xs font-medium">
              Environmental conditions are outside acceptable limits. Do not proceed with coating
              application until conditions improve.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
