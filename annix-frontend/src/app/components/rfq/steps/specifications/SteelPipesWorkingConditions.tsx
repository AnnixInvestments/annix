import { memo } from "react";

interface SteelPipesWorkingConditionsProps {
  workingPressureBar: number | null | undefined;
  workingTemperatureC: number | null | undefined;
  workingPressures: readonly number[];
  workingTemperatures: readonly number[];
  pressureError: string | undefined;
  temperatureError: string | undefined;
  onPressureChange: (value: number | null) => void;
  onTemperatureChange: (value: number | null) => void;
}

const SteelPipesWorkingConditionsInner = (props: SteelPipesWorkingConditionsProps) => {
  const rawPressure = props.workingPressureBar;
  const rawTemperature = props.workingTemperatureC;
  const pressureValue = rawPressure || "";
  const temperatureValue = rawTemperature || "";
  const pressureError = props.pressureError;
  const temperatureError = props.temperatureError;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h3 className="text-xs font-semibold text-gray-800 mb-2">
        Working Conditions
        <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div data-field="workingPressure">
          <label
            className={`block text-xs font-semibold mb-1 ${pressureError ? "text-red-700" : "text-gray-900"}`}
          >
            Working Pressure (bar) <span className="text-red-600">*</span>
          </label>
          <select
            value={pressureValue}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              props.onPressureChange(v);
            }}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
              pressureError
                ? "border-red-500 focus:ring-red-500 bg-red-50"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          >
            <option value="">Select pressure...</option>
            {props.workingPressures.map((pressure) => (
              <option key={pressure} value={pressure}>
                {pressure} bar
              </option>
            ))}
          </select>
          {pressureError && <p className="mt-0.5 text-xs text-red-600">{pressureError}</p>}
        </div>

        <div data-field="workingTemperature">
          <label
            className={`block text-xs font-semibold mb-1 ${temperatureError ? "text-red-700" : "text-gray-900"}`}
          >
            Working Temperature (°C) <span className="text-red-600">*</span>
          </label>
          <select
            value={temperatureValue}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              props.onTemperatureChange(v);
            }}
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 text-gray-900 ${
              temperatureError
                ? "border-red-500 focus:ring-red-500 bg-red-50"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          >
            <option value="">Select temperature...</option>
            {props.workingTemperatures.map((temp) => (
              <option key={temp} value={temp}>
                {temp}°C
              </option>
            ))}
          </select>
          {temperatureError && <p className="mt-0.5 text-xs text-red-600">{temperatureError}</p>}
        </div>
      </div>
    </div>
  );
};

export const SteelPipesWorkingConditions = memo(SteelPipesWorkingConditionsInner);
