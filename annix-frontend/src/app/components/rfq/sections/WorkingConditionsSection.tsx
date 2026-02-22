"use client";

import React from "react";
import { WORKING_PRESSURE_BAR, WORKING_TEMPERATURE_CELSIUS } from "@/app/lib/config/rfq";

type ColorScheme = "blue" | "purple" | "green";

const colorClasses: Record<
  ColorScheme,
  {
    container: string;
    label: string;
    button: string;
    input: string;
  }
> = {
  blue: {
    container: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700",
    label: "text-blue-600 dark:text-blue-400",
    button: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300",
    input: "focus:ring-blue-500",
  },
  purple: {
    container: "bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700",
    label: "text-purple-600 dark:text-purple-400",
    button: "text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300",
    input: "focus:ring-purple-500",
  },
  green: {
    container: "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700",
    label: "text-green-600 dark:text-green-400",
    button: "text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300",
    input: "focus:ring-green-500",
  },
};

interface WorkingConditionsSectionProps {
  color: ColorScheme;
  entryId: string;
  idPrefix: string;
  workingPressureBar: number | undefined;
  workingTemperatureC: number | undefined;
  globalPressureBar: number | undefined;
  globalTemperatureC: number | undefined;
  onPressureChange: (value: number | undefined) => void;
  onTemperatureChange: (value: number | undefined) => void;
  onReset: () => void;
  gridCols?: 2 | 3 | 4;
  pressureTooltip?: string;
  temperatureTooltip?: string;
  extraFields?: React.ReactNode;
  className?: string;
}

export function WorkingConditionsSection({
  color,
  entryId,
  idPrefix,
  workingPressureBar,
  workingTemperatureC,
  globalPressureBar,
  globalTemperatureC,
  onPressureChange,
  onTemperatureChange,
  onReset,
  gridCols = 3,
  pressureTooltip,
  temperatureTooltip,
  extraFields,
  className = "",
}: WorkingConditionsSectionProps) {
  const colors = colorClasses[color];
  const hasOverride = workingPressureBar !== undefined || workingTemperatureC !== undefined;
  const effectivePressure = workingPressureBar ?? globalPressureBar ?? "";
  const effectiveTemperature = workingTemperatureC ?? globalTemperatureC ?? "";

  const gridClass =
    gridCols === 2
      ? "grid grid-cols-2 gap-3"
      : gridCols === 4
        ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3";

  return (
    <div className={`${colors.container} rounded-lg p-3 mt-3 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Working Conditions
          {!hasOverride && (
            <span className={`ml-2 text-xs font-normal ${colors.label}`}>(From Specs Page)</span>
          )}
          {hasOverride && (
            <span className={`ml-2 text-xs font-normal ${colors.label}`}>(Override)</span>
          )}
        </h4>
        {hasOverride && (
          <button
            type="button"
            onClick={onReset}
            className={`text-xs ${colors.button} font-medium`}
          >
            Reset to Global
          </button>
        )}
      </div>
      <div className={gridClass}>
        <div>
          <label
            htmlFor={`${idPrefix}-pressure-${entryId}`}
            className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Working Pressure (bar)
            {pressureTooltip && (
              <span
                id={`${idPrefix}-pressure-help-${entryId}`}
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title={pressureTooltip}
              >
                ?
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-pressure-${entryId}`}
            aria-describedby={pressureTooltip ? `${idPrefix}-pressure-help-${entryId}` : undefined}
            value={effectivePressure}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : undefined;
              onPressureChange(value);
            }}
            className={`w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 ${colors.input} text-gray-900 dark:text-gray-100 dark:bg-gray-800`}
          >
            <option value="">Select pressure...</option>
            {WORKING_PRESSURE_BAR.map((pressure) => (
              <option key={pressure} value={pressure}>
                {pressure} bar
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-temp-${entryId}`}
            className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1"
          >
            Working Temperature (°C)
            {temperatureTooltip && (
              <span
                id={`${idPrefix}-temp-help-${entryId}`}
                className="ml-1 text-gray-400 dark:text-gray-500 font-normal cursor-help"
                title={temperatureTooltip}
              >
                ?
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-temp-${entryId}`}
            aria-describedby={temperatureTooltip ? `${idPrefix}-temp-help-${entryId}` : undefined}
            value={effectiveTemperature}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : undefined;
              onTemperatureChange(value);
            }}
            className={`w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 ${colors.input} text-gray-900 dark:text-gray-100 dark:bg-gray-800`}
          >
            <option value="">Select temperature...</option>
            {WORKING_TEMPERATURE_CELSIUS.map((temp) => (
              <option key={temp} value={temp}>
                {temp}°C
              </option>
            ))}
          </select>
        </div>
        {extraFields}
      </div>
    </div>
  );
}
