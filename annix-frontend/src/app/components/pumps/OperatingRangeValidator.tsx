"use client";

import { useMemo } from "react";
import { PumpCurve } from "@/app/lib/config/pumps/calculations";

interface OperatingRangeValidatorProps {
  pumpCurve: PumpCurve;
  operatingFlowM3h: number;
  operatingHeadM: number;
  npshAvailable?: number;
  onValidationComplete?: (result: ValidationResult) => void;
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  recommendation?: string;
}

interface ValidationResult {
  isValid: boolean;
  overallStatus: "optimal" | "acceptable" | "marginal" | "unacceptable";
  issues: ValidationIssue[];
  metrics: {
    flowRatioToBep: number;
    headRatioToBep: number;
    efficiencyAtOperatingPoint?: number;
    npshMargin?: number;
    distanceFromMinFlow: number;
    distanceFromMaxFlow: number;
  };
}

export function OperatingRangeValidator({
  pumpCurve,
  operatingFlowM3h,
  operatingHeadM,
  npshAvailable,
  onValidationComplete,
}: OperatingRangeValidatorProps) {
  const validation = useMemo((): ValidationResult => {
    const issues: ValidationIssue[] = [];
    const bep = pumpCurve.bestEfficiencyPoint;
    const minFlow = pumpCurve.minContinuousFlowM3h;
    const maxFlow = pumpCurve.maxFlowM3h;

    const flowRatioToBep = operatingFlowM3h / bep.flowM3h;
    const headRatioToBep = operatingHeadM / bep.headM;
    const distanceFromMinFlow = operatingFlowM3h - minFlow;
    const distanceFromMaxFlow = maxFlow - operatingFlowM3h;

    const sortedPoints = [...pumpCurve.points].sort((a, b) => a.flowM3h - b.flowM3h);
    let efficiencyAtOperatingPoint: number | undefined;
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (
        operatingFlowM3h >= sortedPoints[i].flowM3h &&
        operatingFlowM3h <= sortedPoints[i + 1].flowM3h
      ) {
        const t =
          (operatingFlowM3h - sortedPoints[i].flowM3h) /
          (sortedPoints[i + 1].flowM3h - sortedPoints[i].flowM3h);
        const eff1 = sortedPoints[i].efficiencyPercent;
        const eff2 = sortedPoints[i + 1].efficiencyPercent;
        if (eff1 !== undefined && eff2 !== undefined) {
          efficiencyAtOperatingPoint = eff1 + t * (eff2 - eff1);
        }
        break;
      }
    }

    let npshMargin: number | undefined;
    if (npshAvailable !== undefined) {
      for (let i = 0; i < sortedPoints.length - 1; i++) {
        if (
          operatingFlowM3h >= sortedPoints[i].flowM3h &&
          operatingFlowM3h <= sortedPoints[i + 1].flowM3h
        ) {
          const t =
            (operatingFlowM3h - sortedPoints[i].flowM3h) /
            (sortedPoints[i + 1].flowM3h - sortedPoints[i].flowM3h);
          const npshr1 = sortedPoints[i].npshRequiredM;
          const npshr2 = sortedPoints[i + 1].npshRequiredM;
          if (npshr1 !== undefined && npshr2 !== undefined) {
            const npshr = npshr1 + t * (npshr2 - npshr1);
            npshMargin = npshAvailable - npshr;
          }
          break;
        }
      }
    }

    if (operatingFlowM3h < minFlow) {
      issues.push({
        severity: "error",
        category: "Minimum Flow",
        message: `Operating flow ${operatingFlowM3h.toFixed(1)} m³/h is below minimum continuous flow of ${minFlow} m³/h`,
        recommendation: "Install minimum flow bypass or recirculation line to protect the pump",
      });
    } else if (distanceFromMinFlow < minFlow * 0.1) {
      issues.push({
        severity: "warning",
        category: "Minimum Flow",
        message: `Operating close to minimum continuous flow (${((operatingFlowM3h / minFlow) * 100).toFixed(0)}% of minimum)`,
        recommendation: "Monitor for signs of recirculation such as vibration and noise",
      });
    }

    if (operatingFlowM3h > maxFlow) {
      issues.push({
        severity: "error",
        category: "Maximum Flow",
        message: `Operating flow ${operatingFlowM3h.toFixed(1)} m³/h exceeds maximum flow of ${maxFlow} m³/h`,
        recommendation: "Throttle discharge or resize pump - motor may overload",
      });
    } else if (distanceFromMaxFlow < maxFlow * 0.05) {
      issues.push({
        severity: "warning",
        category: "Maximum Flow",
        message: `Operating near maximum flow limit (${((operatingFlowM3h / maxFlow) * 100).toFixed(0)}% of maximum)`,
        recommendation: "Verify motor has adequate power margin",
      });
    }

    if (flowRatioToBep < 0.7) {
      issues.push({
        severity: "warning",
        category: "BEP Range",
        message: `Operating at ${(flowRatioToBep * 100).toFixed(0)}% of BEP flow - suction recirculation may occur`,
        recommendation: "Consider a smaller pump or variable speed drive to improve efficiency",
      });
    } else if (flowRatioToBep > 1.2) {
      issues.push({
        severity: "warning",
        category: "BEP Range",
        message: `Operating at ${(flowRatioToBep * 100).toFixed(0)}% of BEP flow - discharge recirculation risk increases`,
        recommendation: "Monitor NPSH margin closely as NPSH required increases with flow",
      });
    } else if (flowRatioToBep >= 0.8 && flowRatioToBep <= 1.1) {
      issues.push({
        severity: "info",
        category: "BEP Range",
        message: `Operating in preferred range at ${(flowRatioToBep * 100).toFixed(0)}% of BEP flow`,
      });
    }

    if (efficiencyAtOperatingPoint !== undefined) {
      const efficiencyLoss = bep.efficiencyPercent - efficiencyAtOperatingPoint;
      if (efficiencyLoss > 10) {
        issues.push({
          severity: "warning",
          category: "Efficiency",
          message: `Efficiency at operating point (${efficiencyAtOperatingPoint.toFixed(1)}%) is ${efficiencyLoss.toFixed(1)} points below BEP`,
          recommendation: "Consider trimming impeller or using VFD for better efficiency match",
        });
      } else if (efficiencyLoss > 5) {
        issues.push({
          severity: "info",
          category: "Efficiency",
          message: `Efficiency at operating point is ${efficiencyAtOperatingPoint.toFixed(1)}% (${efficiencyLoss.toFixed(1)} points below BEP)`,
        });
      }
    }

    if (npshMargin !== undefined) {
      if (npshMargin < 0) {
        issues.push({
          severity: "error",
          category: "NPSH",
          message: `NPSHa is ${Math.abs(npshMargin).toFixed(1)}m below NPSHr - cavitation will occur`,
          recommendation:
            "Increase suction pressure, reduce friction losses, or lower pump elevation",
        });
      } else if (npshMargin < 0.5) {
        issues.push({
          severity: "warning",
          category: "NPSH",
          message: `NPSH margin of ${npshMargin.toFixed(2)}m is below recommended 0.5m minimum`,
          recommendation: "Increase NPSHa to provide adequate safety margin",
        });
      } else if (npshMargin < 1.0) {
        issues.push({
          severity: "info",
          category: "NPSH",
          message: `NPSH margin of ${npshMargin.toFixed(2)}m is acceptable`,
        });
      }
    }

    const headPoints = sortedPoints.filter(
      (p) => p.flowM3h >= operatingFlowM3h * 0.95 && p.flowM3h <= operatingFlowM3h * 1.05,
    );
    if (headPoints.length > 0) {
      const expectedHead = headPoints.reduce((sum, p) => sum + p.headM, 0) / headPoints.length;
      const headDeviation = Math.abs(operatingHeadM - expectedHead);
      if (headDeviation > expectedHead * 0.1) {
        issues.push({
          severity: "warning",
          category: "Head Match",
          message: `Operating head ${operatingHeadM.toFixed(1)}m differs from curve (${expectedHead.toFixed(1)}m) by ${((headDeviation / expectedHead) * 100).toFixed(0)}%`,
          recommendation: "Verify system resistance calculation or check for blockages",
        });
      }
    }

    let overallStatus: ValidationResult["overallStatus"];
    const hasErrors = issues.some((i) => i.severity === "error");
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    if (hasErrors) {
      overallStatus = "unacceptable";
    } else if (warningCount >= 2) {
      overallStatus = "marginal";
    } else if (warningCount === 1) {
      overallStatus = "acceptable";
    } else {
      overallStatus = "optimal";
    }

    const result: ValidationResult = {
      isValid: !hasErrors,
      overallStatus,
      issues,
      metrics: {
        flowRatioToBep,
        headRatioToBep,
        efficiencyAtOperatingPoint,
        npshMargin,
        distanceFromMinFlow,
        distanceFromMaxFlow,
      },
    };

    if (onValidationComplete) {
      onValidationComplete(result);
    }

    return result;
  }, [pumpCurve, operatingFlowM3h, operatingHeadM, npshAvailable, onValidationComplete]);

  const statusConfig = {
    optimal: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: "text-green-500",
      label: "Optimal",
    },
    acceptable: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "text-blue-500",
      label: "Acceptable",
    },
    marginal: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: "text-yellow-500",
      label: "Marginal",
    },
    unacceptable: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-500",
      label: "Unacceptable",
    },
  };

  const config = statusConfig[validation.overallStatus];

  const severityConfig = {
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: "text-red-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      icon: "text-yellow-500",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-500",
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Operating Range Validation</h3>
        <p className="text-sm text-gray-600 mt-1">
          Verify pump operation is within acceptable limits
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
          <div className="flex items-center gap-3">
            {validation.overallStatus === "optimal" && (
              <svg
                className={`w-8 h-8 ${config.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            {validation.overallStatus === "acceptable" && (
              <svg
                className={`w-8 h-8 ${config.icon}`}
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
            {validation.overallStatus === "marginal" && (
              <svg
                className={`w-8 h-8 ${config.icon}`}
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
            {validation.overallStatus === "unacceptable" && (
              <svg
                className={`w-8 h-8 ${config.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <div>
              <h4 className={`text-lg font-medium ${config.text}`}>{config.label}</h4>
              <p className={`text-sm ${config.text}`}>
                {validation.overallStatus === "optimal" &&
                  "Operating within preferred range near BEP"}
                {validation.overallStatus === "acceptable" && "Operating within acceptable limits"}
                {validation.overallStatus === "marginal" && "Operating outside recommended range"}
                {validation.overallStatus === "unacceptable" &&
                  "Operating conditions will damage pump"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Flow at BEP</div>
            <div className="text-xl font-bold text-gray-900">
              {(validation.metrics.flowRatioToBep * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Head at BEP</div>
            <div className="text-xl font-bold text-gray-900">
              {(validation.metrics.headRatioToBep * 100).toFixed(0)}%
            </div>
          </div>
          {validation.metrics.efficiencyAtOperatingPoint !== undefined && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Efficiency</div>
              <div className="text-xl font-bold text-gray-900">
                {validation.metrics.efficiencyAtOperatingPoint.toFixed(1)}%
              </div>
            </div>
          )}
          {validation.metrics.npshMargin !== undefined && (
            <div
              className={`rounded-lg p-3 text-center ${
                validation.metrics.npshMargin < 0
                  ? "bg-red-50"
                  : validation.metrics.npshMargin < 0.5
                    ? "bg-yellow-50"
                    : "bg-green-50"
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">NPSH Margin</div>
              <div
                className={`text-xl font-bold ${
                  validation.metrics.npshMargin < 0
                    ? "text-red-700"
                    : validation.metrics.npshMargin < 0.5
                      ? "text-yellow-700"
                      : "text-green-700"
                }`}
              >
                {validation.metrics.npshMargin.toFixed(2)}m
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Validation Details</h4>
          {validation.issues.length === 0 ? (
            <p className="text-sm text-gray-500">No issues detected</p>
          ) : (
            validation.issues.map((issue, idx) => {
              const sc = severityConfig[issue.severity];
              return (
                <div key={idx} className={`${sc.bg} ${sc.border} border rounded-lg p-3`}>
                  <div className="flex items-start gap-3">
                    {issue.severity === "error" && (
                      <svg
                        className={`w-5 h-5 ${sc.icon} flex-shrink-0 mt-0.5`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    {issue.severity === "warning" && (
                      <svg
                        className={`w-5 h-5 ${sc.icon} flex-shrink-0 mt-0.5`}
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
                    {issue.severity === "info" && (
                      <svg
                        className={`w-5 h-5 ${sc.icon} flex-shrink-0 mt-0.5`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${sc.bg} ${sc.text}`}
                        >
                          {issue.category}
                        </span>
                      </div>
                      <p className={`text-sm ${sc.text} mt-1`}>{issue.message}</p>
                      {issue.recommendation && (
                        <p className="text-xs text-gray-600 mt-2 bg-white rounded px-2 py-1">
                          <strong>Recommendation:</strong> {issue.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-3">Operating Point Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Operating Flow:</span>
              <span className="ml-2 font-medium">{operatingFlowM3h.toFixed(1)} m³/h</span>
            </div>
            <div>
              <span className="text-gray-500">Operating Head:</span>
              <span className="ml-2 font-medium">{operatingHeadM.toFixed(1)} m</span>
            </div>
            <div>
              <span className="text-gray-500">BEP Flow:</span>
              <span className="ml-2 font-medium">{pumpCurve.bestEfficiencyPoint.flowM3h} m³/h</span>
            </div>
            <div>
              <span className="text-gray-500">BEP Head:</span>
              <span className="ml-2 font-medium">{pumpCurve.bestEfficiencyPoint.headM} m</span>
            </div>
            <div>
              <span className="text-gray-500">Min Continuous Flow:</span>
              <span className="ml-2 font-medium">{pumpCurve.minContinuousFlowM3h} m³/h</span>
            </div>
            <div>
              <span className="text-gray-500">Max Flow:</span>
              <span className="ml-2 font-medium">{pumpCurve.maxFlowM3h} m³/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperatingRangeValidator;
