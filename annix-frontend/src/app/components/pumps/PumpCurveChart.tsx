"use client";

import { useMemo, useState } from "react";
import { PumpCurve, PumpCurvePoint, SystemCurvePoint } from "@/app/lib/config/pumps/calculations";

interface PumpCurveChartProps {
  pumpCurve: PumpCurve;
  systemCurve?: SystemCurvePoint[];
  operatingPoint?: { flowM3h: number; headM: number };
  width?: number;
  height?: number;
  showEfficiency?: boolean;
  showPower?: boolean;
  showNpsh?: boolean;
  title?: string;
}

interface ChartPoint {
  x: number;
  y: number;
}

const PADDING = { top: 40, right: 60, bottom: 50, left: 60 };
const COLORS = {
  pumpHead: "#2563eb",
  efficiency: "#16a34a",
  power: "#dc2626",
  npsh: "#9333ea",
  systemCurve: "#f97316",
  operatingPoint: "#ef4444",
  grid: "#e5e7eb",
  axis: "#374151",
  bepZone: "#dbeafe",
};

export function PumpCurveChart({
  pumpCurve,
  systemCurve,
  operatingPoint,
  width = 600,
  height = 400,
  showEfficiency = true,
  showPower = false,
  showNpsh = false,
  title,
}: PumpCurveChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<PumpCurvePoint | null>(null);

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const scales = useMemo(() => {
    const allFlows = [
      ...pumpCurve.points.map((p) => p.flowM3h),
      ...(systemCurve?.map((p) => p.flowM3h) ?? []),
    ];
    const allHeads = [
      ...pumpCurve.points.map((p) => p.headM),
      ...(systemCurve?.map((p) => p.headM) ?? []),
    ];

    const maxFlow = Math.max(...allFlows) * 1.1;
    const maxHead = Math.max(...allHeads) * 1.1;
    const maxEfficiency = 100;
    const maxPower = Math.max(...pumpCurve.points.map((p) => p.powerKw ?? 0)) * 1.2 || 50;
    const maxNpsh = Math.max(...pumpCurve.points.map((p) => p.npshRequiredM ?? 0)) * 1.2 || 10;

    return {
      xScale: (flow: number) => (flow / maxFlow) * chartWidth,
      yScaleHead: (head: number) => chartHeight - (head / maxHead) * chartHeight,
      yScaleEfficiency: (eff: number) => chartHeight - (eff / maxEfficiency) * chartHeight,
      yScalePower: (power: number) => chartHeight - (power / maxPower) * chartHeight,
      yScaleNpsh: (npsh: number) => chartHeight - (npsh / maxNpsh) * chartHeight,
      maxFlow,
      maxHead,
      maxEfficiency,
      maxPower,
      maxNpsh,
    };
  }, [pumpCurve, systemCurve, chartWidth, chartHeight]);

  const createPath = (points: ChartPoint[]): string => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  };

  const pumpHeadPath = useMemo(() => {
    const sortedPoints = [...pumpCurve.points].sort((a, b) => a.flowM3h - b.flowM3h);
    return createPath(
      sortedPoints.map((p) => ({
        x: scales.xScale(p.flowM3h),
        y: scales.yScaleHead(p.headM),
      })),
    );
  }, [pumpCurve.points, scales]);

  const efficiencyPath = useMemo(() => {
    if (!showEfficiency) return "";
    const pointsWithEff = pumpCurve.points.filter((p) => p.efficiencyPercent !== undefined);
    if (pointsWithEff.length === 0) return "";
    const sortedPoints = [...pointsWithEff].sort((a, b) => a.flowM3h - b.flowM3h);
    return createPath(
      sortedPoints.map((p) => ({
        x: scales.xScale(p.flowM3h),
        y: scales.yScaleEfficiency(p.efficiencyPercent!),
      })),
    );
  }, [pumpCurve.points, showEfficiency, scales]);

  const powerPath = useMemo(() => {
    if (!showPower) return "";
    const pointsWithPower = pumpCurve.points.filter((p) => p.powerKw !== undefined);
    if (pointsWithPower.length === 0) return "";
    const sortedPoints = [...pointsWithPower].sort((a, b) => a.flowM3h - b.flowM3h);
    return createPath(
      sortedPoints.map((p) => ({
        x: scales.xScale(p.powerKw!),
        y: scales.yScalePower(p.powerKw!),
      })),
    );
  }, [pumpCurve.points, showPower, scales]);

  const npshPath = useMemo(() => {
    if (!showNpsh) return "";
    const pointsWithNpsh = pumpCurve.points.filter((p) => p.npshRequiredM !== undefined);
    if (pointsWithNpsh.length === 0) return "";
    const sortedPoints = [...pointsWithNpsh].sort((a, b) => a.flowM3h - b.flowM3h);
    return createPath(
      sortedPoints.map((p) => ({
        x: scales.xScale(p.flowM3h),
        y: scales.yScaleNpsh(p.npshRequiredM!),
      })),
    );
  }, [pumpCurve.points, showNpsh, scales]);

  const systemCurvePath = useMemo(() => {
    if (!systemCurve || systemCurve.length === 0) return "";
    return createPath(
      systemCurve.map((p) => ({
        x: scales.xScale(p.flowM3h),
        y: scales.yScaleHead(p.headM),
      })),
    );
  }, [systemCurve, scales]);

  const gridLinesX = useMemo(() => {
    const lines: number[] = [];
    const step = scales.maxFlow / 5;
    for (let i = 0; i <= 5; i++) {
      lines.push(i * step);
    }
    return lines;
  }, [scales.maxFlow]);

  const gridLinesY = useMemo(() => {
    const lines: number[] = [];
    const step = scales.maxHead / 5;
    for (let i = 0; i <= 5; i++) {
      lines.push(i * step);
    }
    return lines;
  }, [scales.maxHead]);

  const bepZone = useMemo(() => {
    const bep = pumpCurve.bestEfficiencyPoint;
    const minFlow = pumpCurve.minContinuousFlowM3h;
    const maxFlow = pumpCurve.maxFlowM3h;
    const preferredMin = bep.flowM3h * 0.8;
    const preferredMax = bep.flowM3h * 1.1;

    return {
      x: scales.xScale(Math.max(minFlow, preferredMin)),
      width:
        scales.xScale(Math.min(maxFlow, preferredMax)) -
        scales.xScale(Math.max(minFlow, preferredMin)),
    };
  }, [pumpCurve, scales]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}

      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {gridLinesX.map((flow) => (
            <line
              key={`grid-x-${flow}`}
              x1={scales.xScale(flow)}
              y1={0}
              x2={scales.xScale(flow)}
              y2={chartHeight}
              stroke={COLORS.grid}
              strokeDasharray="2,2"
            />
          ))}
          {gridLinesY.map((head) => (
            <line
              key={`grid-y-${head}`}
              x1={0}
              y1={scales.yScaleHead(head)}
              x2={chartWidth}
              y2={scales.yScaleHead(head)}
              stroke={COLORS.grid}
              strokeDasharray="2,2"
            />
          ))}

          <rect
            x={bepZone.x}
            y={0}
            width={bepZone.width}
            height={chartHeight}
            fill={COLORS.bepZone}
            opacity={0.5}
          />

          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke={COLORS.axis}
            strokeWidth={2}
          />
          <line x1={0} y1={0} x2={0} y2={chartHeight} stroke={COLORS.axis} strokeWidth={2} />

          {gridLinesX.map((flow) => (
            <text
              key={`label-x-${flow}`}
              x={scales.xScale(flow)}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {Math.round(flow)}
            </text>
          ))}
          {gridLinesY.map((head) => (
            <text
              key={`label-y-${head}`}
              x={-10}
              y={scales.yScaleHead(head) + 4}
              textAnchor="end"
              className="text-xs fill-gray-600"
            >
              {Math.round(head)}
            </text>
          ))}

          <text
            x={chartWidth / 2}
            y={chartHeight + 40}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-medium"
          >
            Flow Rate (m³/h)
          </text>
          <text
            x={-35}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, -35, ${chartHeight / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Head (m)
          </text>

          <path d={pumpHeadPath} fill="none" stroke={COLORS.pumpHead} strokeWidth={2.5} />

          {efficiencyPath && (
            <path
              d={efficiencyPath}
              fill="none"
              stroke={COLORS.efficiency}
              strokeWidth={2}
              strokeDasharray="5,3"
            />
          )}

          {npshPath && (
            <path
              d={npshPath}
              fill="none"
              stroke={COLORS.npsh}
              strokeWidth={2}
              strokeDasharray="3,3"
            />
          )}

          {systemCurvePath && (
            <path d={systemCurvePath} fill="none" stroke={COLORS.systemCurve} strokeWidth={2} />
          )}

          <circle
            cx={scales.xScale(pumpCurve.bestEfficiencyPoint.flowM3h)}
            cy={scales.yScaleHead(pumpCurve.bestEfficiencyPoint.headM)}
            r={6}
            fill={COLORS.efficiency}
            stroke="white"
            strokeWidth={2}
          />

          {operatingPoint && (
            <g>
              <line
                x1={scales.xScale(operatingPoint.flowM3h)}
                y1={0}
                x2={scales.xScale(operatingPoint.flowM3h)}
                y2={chartHeight}
                stroke={COLORS.operatingPoint}
                strokeDasharray="4,2"
                opacity={0.5}
              />
              <line
                x1={0}
                y1={scales.yScaleHead(operatingPoint.headM)}
                x2={chartWidth}
                y2={scales.yScaleHead(operatingPoint.headM)}
                stroke={COLORS.operatingPoint}
                strokeDasharray="4,2"
                opacity={0.5}
              />
              <circle
                cx={scales.xScale(operatingPoint.flowM3h)}
                cy={scales.yScaleHead(operatingPoint.headM)}
                r={8}
                fill={COLORS.operatingPoint}
                stroke="white"
                strokeWidth={2}
              />
            </g>
          )}

          {pumpCurve.points.map((point, idx) => (
            <circle
              key={idx}
              cx={scales.xScale(point.flowM3h)}
              cy={scales.yScaleHead(point.headM)}
              r={hoveredPoint === point ? 6 : 4}
              fill={COLORS.pumpHead}
              stroke="white"
              strokeWidth={1}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {hoveredPoint && (
            <g
              transform={`translate(${scales.xScale(hoveredPoint.flowM3h) + 10}, ${scales.yScaleHead(hoveredPoint.headM) - 10})`}
            >
              <rect
                x={0}
                y={-50}
                width={120}
                height={60}
                rx={4}
                fill="white"
                stroke="#d1d5db"
                strokeWidth={1}
              />
              <text x={8} y={-32} className="text-xs fill-gray-700">
                Flow: {hoveredPoint.flowM3h.toFixed(1)} m³/h
              </text>
              <text x={8} y={-16} className="text-xs fill-gray-700">
                Head: {hoveredPoint.headM.toFixed(1)} m
              </text>
              {hoveredPoint.efficiencyPercent !== undefined && (
                <text x={8} y={0} className="text-xs fill-gray-700">
                  Eff: {hoveredPoint.efficiencyPercent.toFixed(1)}%
                </text>
              )}
            </g>
          )}
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: COLORS.pumpHead }} />
          <span className="text-gray-600">H-Q Curve</span>
        </div>
        {showEfficiency && efficiencyPath && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-0.5 border-dashed border-t-2"
              style={{ borderColor: COLORS.efficiency }}
            />
            <span className="text-gray-600">Efficiency</span>
          </div>
        )}
        {systemCurvePath && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5" style={{ backgroundColor: COLORS.systemCurve }} />
            <span className="text-gray-600">System Curve</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.efficiency }} />
          <span className="text-gray-600">BEP</span>
        </div>
        {operatingPoint && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS.operatingPoint }}
            />
            <span className="text-gray-600">Operating Point</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-3" style={{ backgroundColor: COLORS.bepZone, opacity: 0.5 }} />
          <span className="text-gray-600">Preferred Operating Range</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500 text-xs">Model</div>
          <div className="font-medium">{pumpCurve.pumpModel}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500 text-xs">Impeller</div>
          <div className="font-medium">{pumpCurve.impellerDiameterMm} mm</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500 text-xs">Speed</div>
          <div className="font-medium">{pumpCurve.speedRpm} RPM</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-500 text-xs">BEP</div>
          <div className="font-medium">
            {pumpCurve.bestEfficiencyPoint.flowM3h} m³/h @{" "}
            {pumpCurve.bestEfficiencyPoint.efficiencyPercent}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default PumpCurveChart;
