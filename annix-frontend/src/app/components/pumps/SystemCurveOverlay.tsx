"use client";

import { useMemo, useState } from "react";
import {
  calculateSystemCurve,
  findOperatingPoint,
  interpolatePumpCurve,
  PumpCurve,
  SystemCurveParams,
} from "@/app/lib/config/pumps/calculations";
import { PumpCurveChart } from "./PumpCurveChart";

interface SystemCurveOverlayProps {
  pumpCurve: PumpCurve;
  initialSystemParams?: Partial<SystemCurveParams>;
  onOperatingPointChange?: (
    operatingPoint: { flowM3h: number; headM: number; efficiencyPercent?: number } | null,
  ) => void;
}

export function SystemCurveOverlay({
  pumpCurve,
  initialSystemParams,
  onOperatingPointChange,
}: SystemCurveOverlayProps) {
  const [systemParams, setSystemParams] = useState<SystemCurveParams>({
    staticHeadM: initialSystemParams?.staticHeadM ?? 10,
    frictionLossAtDesignFlowM: initialSystemParams?.frictionLossAtDesignFlowM ?? 10,
    designFlowM3h: initialSystemParams?.designFlowM3h ?? pumpCurve.bestEfficiencyPoint.flowM3h,
  });

  const [showSystemCurve, setShowSystemCurve] = useState(true);

  const systemCurve = useMemo(() => {
    if (!showSystemCurve) return undefined;
    return calculateSystemCurve(systemParams, 20);
  }, [systemParams, showSystemCurve]);

  const operatingPoint = useMemo(() => {
    if (!systemCurve) return null;
    const point = findOperatingPoint(pumpCurve.points, systemCurve);
    if (point && onOperatingPointChange) {
      onOperatingPointChange(point);
    }
    return point;
  }, [pumpCurve.points, systemCurve, onOperatingPointChange]);

  const operatingAnalysis = useMemo(() => {
    if (!operatingPoint) {
      return {
        status: "no_intersection" as const,
        message: "No operating point found - pump curve does not intersect system curve",
        color: "red",
      };
    }

    const bep = pumpCurve.bestEfficiencyPoint;
    const flowRatio = operatingPoint.flowM3h / bep.flowM3h;
    const minFlow = pumpCurve.minContinuousFlowM3h;

    if (operatingPoint.flowM3h < minFlow) {
      return {
        status: "below_min" as const,
        message: `Operating below minimum continuous flow (${minFlow} m³/h) - recirculation risk`,
        color: "red",
      };
    }

    if (flowRatio < 0.7) {
      return {
        status: "low_flow" as const,
        message: "Operating far left of BEP - reduced efficiency and potential recirculation",
        color: "yellow",
      };
    }

    if (flowRatio > 1.2) {
      return {
        status: "high_flow" as const,
        message: "Operating far right of BEP - increased NPSH and motor load",
        color: "yellow",
      };
    }

    if (flowRatio >= 0.8 && flowRatio <= 1.1) {
      return {
        status: "optimal" as const,
        message: "Operating in preferred range near BEP - optimal efficiency",
        color: "green",
      };
    }

    return {
      status: "acceptable" as const,
      message: "Operating in acceptable range",
      color: "blue",
    };
  }, [operatingPoint, pumpCurve]);

  const pumpPerformanceAtOperatingPoint = useMemo(() => {
    if (!operatingPoint) return null;
    return interpolatePumpCurve(pumpCurve, operatingPoint.flowM3h);
  }, [pumpCurve, operatingPoint]);

  const handleParamChange = (param: keyof SystemCurveParams, value: number) => {
    setSystemParams((prev) => ({ ...prev, [param]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Curve Parameters</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSystemCurve}
              onChange={(e) => setShowSystemCurve(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show System Curve</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Static Head (m)</label>
            <input
              type="number"
              value={systemParams.staticHeadM}
              onChange={(e) => handleParamChange("staticHeadM", parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              step={0.5}
            />
            <p className="text-xs text-gray-500 mt-1">Elevation difference + pressure difference</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Friction Loss at Design Flow (m)
            </label>
            <input
              type="number"
              value={systemParams.frictionLossAtDesignFlowM}
              onChange={(e) =>
                handleParamChange("frictionLossAtDesignFlowM", parseFloat(e.target.value) || 0)
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              step={0.5}
            />
            <p className="text-xs text-gray-500 mt-1">Pipe friction + fittings at design flow</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Design Flow (m³/h)
            </label>
            <input
              type="number"
              value={systemParams.designFlowM3h}
              onChange={(e) => handleParamChange("designFlowM3h", parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
              step={1}
            />
            <p className="text-xs text-gray-500 mt-1">Flow rate for friction calculation</p>
          </div>
        </div>
      </div>

      <PumpCurveChart
        pumpCurve={pumpCurve}
        systemCurve={systemCurve}
        operatingPoint={operatingPoint ?? undefined}
        showEfficiency={true}
        title="Pump & System Curve Analysis"
      />

      {operatingPoint && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`rounded-lg p-4 border ${
              operatingAnalysis.color === "green"
                ? "bg-green-50 border-green-200"
                : operatingAnalysis.color === "yellow"
                  ? "bg-yellow-50 border-yellow-200"
                  : operatingAnalysis.color === "red"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  operatingAnalysis.color === "green"
                    ? "bg-green-100"
                    : operatingAnalysis.color === "yellow"
                      ? "bg-yellow-100"
                      : operatingAnalysis.color === "red"
                        ? "bg-red-100"
                        : "bg-blue-100"
                }`}
              >
                {operatingAnalysis.color === "green" && (
                  <svg
                    className="w-5 h-5 text-green-600"
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
                )}
                {operatingAnalysis.color === "yellow" && (
                  <svg
                    className="w-5 h-5 text-yellow-600"
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
                {operatingAnalysis.color === "red" && (
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div>
                <h4
                  className={`font-medium ${
                    operatingAnalysis.color === "green"
                      ? "text-green-800"
                      : operatingAnalysis.color === "yellow"
                        ? "text-yellow-800"
                        : operatingAnalysis.color === "red"
                          ? "text-red-800"
                          : "text-blue-800"
                  }`}
                >
                  Operating Point Analysis
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    operatingAnalysis.color === "green"
                      ? "text-green-700"
                      : operatingAnalysis.color === "yellow"
                        ? "text-yellow-700"
                        : operatingAnalysis.color === "red"
                          ? "text-red-700"
                          : "text-blue-700"
                  }`}
                >
                  {operatingAnalysis.message}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Operating Point Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Flow Rate:</span>
                <span className="ml-2 font-medium">{operatingPoint.flowM3h.toFixed(1)} m³/h</span>
              </div>
              <div>
                <span className="text-gray-500">Head:</span>
                <span className="ml-2 font-medium">{operatingPoint.headM.toFixed(1)} m</span>
              </div>
              {pumpPerformanceAtOperatingPoint?.efficiencyPercent !== undefined && (
                <div>
                  <span className="text-gray-500">Efficiency:</span>
                  <span className="ml-2 font-medium">
                    {pumpPerformanceAtOperatingPoint.efficiencyPercent.toFixed(1)}%
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">BEP Flow:</span>
                <span className="ml-2 font-medium">
                  {pumpCurve.bestEfficiencyPoint.flowM3h} m³/h
                </span>
              </div>
              <div>
                <span className="text-gray-500">% of BEP:</span>
                <span className="ml-2 font-medium">
                  {((operatingPoint.flowM3h / pumpCurve.bestEfficiencyPoint.flowM3h) * 100).toFixed(
                    0,
                  )}
                  %
                </span>
              </div>
              <div>
                <span className="text-gray-500">Min Flow:</span>
                <span className="ml-2 font-medium">{pumpCurve.minContinuousFlowM3h} m³/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!operatingPoint && showSystemCurve && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 text-red-500"
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
            <div>
              <h4 className="font-medium text-red-800">No Operating Point Found</h4>
              <p className="text-sm text-red-700 mt-1">
                The pump curve does not intersect with the system curve. This pump may not be
                suitable for this application or the system parameters need adjustment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemCurveOverlay;
