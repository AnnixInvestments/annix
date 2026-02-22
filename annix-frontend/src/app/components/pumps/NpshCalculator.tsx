"use client";

import { useMemo, useState } from "react";
import {
  calculateNpshAvailable,
  checkNpshMargin,
  NpshCalculationParams,
} from "@product-data/pumps/calculations";

interface NpshCalculatorProps {
  npshRequired?: number;
  onNpshCalculated?: (npsha: number, isAdequate: boolean) => void;
}

interface FluidPreset {
  name: string;
  temperatureC: number;
  specificGravity: number;
  vaporPressureBar: number;
}

const FLUID_PRESETS: FluidPreset[] = [
  { name: "Water @ 20°C", temperatureC: 20, specificGravity: 1.0, vaporPressureBar: 0.0234 },
  { name: "Water @ 40°C", temperatureC: 40, specificGravity: 0.992, vaporPressureBar: 0.0738 },
  { name: "Water @ 60°C", temperatureC: 60, specificGravity: 0.983, vaporPressureBar: 0.1994 },
  { name: "Water @ 80°C", temperatureC: 80, specificGravity: 0.972, vaporPressureBar: 0.4736 },
  { name: "Diesel @ 20°C", temperatureC: 20, specificGravity: 0.85, vaporPressureBar: 0.001 },
  { name: "Gasoline @ 20°C", temperatureC: 20, specificGravity: 0.75, vaporPressureBar: 0.05 },
];

export function NpshCalculator({ npshRequired = 3, onNpshCalculated }: NpshCalculatorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("Water @ 20°C");
  const [customMode, setCustomMode] = useState(false);

  const [atmosphericPressureBar, setAtmosphericPressureBar] = useState(1.013);
  const [liquidVaporPressureBar, setLiquidVaporPressureBar] = useState(0.0234);
  const [staticSuctionHeadM, setStaticSuctionHeadM] = useState(3);
  const [frictionLossM, setFrictionLossM] = useState(1);
  const [specificGravity, setSpecificGravity] = useState(1.0);
  const [safetyMargin, setSafetyMargin] = useState(0.5);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = FLUID_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setLiquidVaporPressureBar(preset.vaporPressureBar);
      setSpecificGravity(preset.specificGravity);
    }
  };

  const npshResult = useMemo(() => {
    const params: NpshCalculationParams = {
      atmosphericPressureBar,
      liquidVaporPressureBar,
      staticSuctionHeadM,
      frictionLossM,
      specificGravity,
    };

    const npsha = calculateNpshAvailable(params);
    const marginCheck = checkNpshMargin(npsha, npshRequired, safetyMargin);

    if (onNpshCalculated) {
      onNpshCalculated(npsha, marginCheck.isAdequate);
    }

    return {
      npsha,
      ...marginCheck,
    };
  }, [
    atmosphericPressureBar,
    liquidVaporPressureBar,
    staticSuctionHeadM,
    frictionLossM,
    specificGravity,
    npshRequired,
    safetyMargin,
    onNpshCalculated,
  ]);

  const npshBreakdown = useMemo(() => {
    const atmosphericHead = (atmosphericPressureBar * 100000) / (specificGravity * 1000 * 9.81);
    const vaporHead = (liquidVaporPressureBar * 100000) / (specificGravity * 1000 * 9.81);

    return {
      atmosphericHead: Math.round(atmosphericHead * 100) / 100,
      staticHead: staticSuctionHeadM,
      vaporHead: Math.round(vaporHead * 100) / 100,
      frictionLoss: frictionLossM,
    };
  }, [
    atmosphericPressureBar,
    liquidVaporPressureBar,
    staticSuctionHeadM,
    frictionLossM,
    specificGravity,
  ]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">NPSH Calculator</h3>
        <p className="text-sm text-gray-600 mt-1">
          Calculate Net Positive Suction Head Available (NPSHa) and verify adequate margin
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={!customMode}
              onChange={() => setCustomMode(false)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Use Preset</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={customMode}
              onChange={() => setCustomMode(true)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Custom Values</span>
          </label>
        </div>

        {!customMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fluid</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FLUID_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name} (SG: {preset.specificGravity}, Pv: {preset.vaporPressureBar} bar)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Static Suction Head (m)
              <span className="text-gray-500 font-normal ml-1">(+ above pump, - below)</span>
            </label>
            <input
              type="number"
              value={staticSuctionHeadM}
              onChange={(e) => setStaticSuctionHeadM(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              step={0.1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suction Friction Loss (m)
            </label>
            <input
              type="number"
              value={frictionLossM}
              onChange={(e) => setFrictionLossM(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              step={0.1}
            />
          </div>
        </div>

        {customMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vapor Pressure (bar)
              </label>
              <input
                type="number"
                value={liquidVaporPressureBar}
                onChange={(e) => setLiquidVaporPressureBar(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min={0}
                step={0.001}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Gravity
              </label>
              <input
                type="number"
                value={specificGravity}
                onChange={(e) => setSpecificGravity(parseFloat(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min={0.1}
                max={3}
                step={0.01}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Settings
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atmospheric Pressure (bar)
              </label>
              <input
                type="number"
                value={atmosphericPressureBar}
                onChange={(e) => setAtmosphericPressureBar(parseFloat(e.target.value) || 1.013)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                step={0.01}
              />
              <p className="text-xs text-gray-500 mt-1">Standard: 1.013 bar at sea level</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Safety Margin (m)
              </label>
              <input
                type="number"
                value={safetyMargin}
                onChange={(e) => setSafetyMargin(parseFloat(e.target.value) || 0.5)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min={0}
                step={0.1}
              />
              <p className="text-xs text-gray-500 mt-1">Typical: 0.5m minimum</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div
            className={`rounded-lg p-4 text-center ${
              npshResult.isAdequate
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div
              className={`text-3xl font-bold ${npshResult.isAdequate ? "text-green-700" : "text-red-700"}`}
            >
              {npshResult.npsha.toFixed(2)}
            </div>
            <div className={`text-sm ${npshResult.isAdequate ? "text-green-600" : "text-red-600"}`}>
              NPSHa (m)
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{npshRequired.toFixed(2)}</div>
            <div className="text-sm text-blue-600">NPSHr (m)</div>
          </div>

          <div
            className={`rounded-lg p-4 text-center ${
              npshResult.margin >= 1
                ? "bg-green-50 border border-green-200"
                : npshResult.margin >= 0
                  ? "bg-yellow-50 border border-yellow-200"
                  : "bg-red-50 border border-red-200"
            }`}
          >
            <div
              className={`text-3xl font-bold ${
                npshResult.margin >= 1
                  ? "text-green-700"
                  : npshResult.margin >= 0
                    ? "text-yellow-700"
                    : "text-red-700"
              }`}
            >
              {npshResult.margin.toFixed(2)}
            </div>
            <div
              className={`text-sm ${
                npshResult.margin >= 1
                  ? "text-green-600"
                  : npshResult.margin >= 0
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              Margin (m)
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg p-4 ${
            npshResult.isAdequate
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {npshResult.isAdequate ? (
              <svg
                className="w-6 h-6 text-green-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-red-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            <div>
              <h4
                className={`font-medium ${npshResult.isAdequate ? "text-green-800" : "text-red-800"}`}
              >
                {npshResult.isAdequate ? "NPSH Adequate" : "NPSH Warning"}
              </h4>
              <p
                className={`text-sm mt-1 ${npshResult.isAdequate ? "text-green-700" : "text-red-700"}`}
              >
                {npshResult.recommendation}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">NPSH Calculation Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Atmospheric Head:</span>
              <span className="font-medium text-green-600">
                + {npshBreakdown.atmosphericHead} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Static Suction Head:</span>
              <span
                className={`font-medium ${staticSuctionHeadM >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {staticSuctionHeadM >= 0 ? "+" : ""} {npshBreakdown.staticHead} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vapor Pressure Head:</span>
              <span className="font-medium text-red-600">- {npshBreakdown.vaporHead} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Friction Losses:</span>
              <span className="font-medium text-red-600">- {npshBreakdown.frictionLoss} m</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-700 font-medium">NPSHa:</span>
              <span className="font-bold text-gray-900">{npshResult.npsha.toFixed(2)} m</span>
            </div>
          </div>
        </div>

        {!npshResult.isAdequate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Suggestions to Increase NPSHa:</h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Raise the liquid level (increase static suction head)</li>
              <li>Lower the pump elevation</li>
              <li>Reduce suction pipe friction (larger diameter, fewer fittings)</li>
              <li>Cool the liquid (reduce vapor pressure)</li>
              <li>Use a booster pump or inducer</li>
              <li>Select a pump with lower NPSHr</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default NpshCalculator;
