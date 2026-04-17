"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BatchMetricData, QualityConfigDto } from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";

interface MetricDef {
  key: string;
  label: string;
  dataKey: keyof BatchMetricData;
  color: string;
  unit?: string;
  decimals: number;
  specMin?: number | null;
  specMax?: number | null;
}

interface BatchHistoryChartProps {
  batches: BatchMetricData[];
  config: QualityConfigDto;
}

const METRIC_GROUPS: { label: string; metrics: Omit<MetricDef, "specMin" | "specMax">[] }[] = [
  {
    label: "Physical Properties",
    metrics: [
      { key: "shoreA", label: "Shore A", dataKey: "shoreA", color: "#2563eb", decimals: 1 },
      {
        key: "sg",
        label: "Specific Gravity",
        dataKey: "specificGravity",
        color: "#7c3aed",
        decimals: 3,
      },
      {
        key: "rebound",
        label: "Rebound",
        dataKey: "rebound",
        color: "#059669",
        unit: "%",
        decimals: 1,
      },
    ],
  },
  {
    label: "Strength Properties",
    metrics: [
      {
        key: "tear",
        label: "Tear Strength",
        dataKey: "tearStrength",
        color: "#dc2626",
        unit: "kN/m",
        decimals: 1,
      },
      {
        key: "tensile",
        label: "Tensile",
        dataKey: "tensile",
        color: "#ea580c",
        unit: "MPa",
        decimals: 1,
      },
      {
        key: "elongation",
        label: "Elongation",
        dataKey: "elongation",
        color: "#ca8a04",
        unit: "%",
        decimals: 0,
      },
    ],
  },
  {
    label: "Rheometer Properties",
    metrics: [
      { key: "sMin", label: "S'min", dataKey: "sMin", color: "#0891b2", decimals: 2 },
      { key: "sMax", label: "S'max", dataKey: "sMax", color: "#4f46e5", decimals: 2 },
      { key: "ts2", label: "TS2", dataKey: "ts2", color: "#be185d", decimals: 2 },
      {
        key: "tc90",
        label: "TC90",
        dataKey: "tc90",
        color: "#6d28d9",
        unit: "min",
        decimals: 2,
      },
    ],
  },
];

function specLimitsForMetric(
  metricKey: string,
  config: QualityConfigDto,
): { specMin: number | null; specMax: number | null } {
  const map: Record<string, { specMin: number | null; specMax: number | null }> = {
    shoreA: { specMin: config.shoreAMin, specMax: config.shoreAMax },
    sg: { specMin: config.densityMin, specMax: config.densityMax },
    rebound: { specMin: config.reboundMin, specMax: config.reboundMax },
    tear: { specMin: config.tearStrengthMin, specMax: config.tearStrengthMax },
    tensile: { specMin: config.tensileMin, specMax: config.tensileMax },
    elongation: { specMin: config.elongationMin, specMax: config.elongationMax },
  };
  const rawMapByMetrickey = map[metricKey];
  return rawMapByMetrickey || { specMin: null, specMax: null };
}

function MetricChart(props: { batches: BatchMetricData[]; metric: MetricDef }) {
  const { batches, metric } = props;

  const chartData = useMemo(
    () =>
      [...batches].reverse().map((b) => ({
        batch: b.batchNumber,
        date: formatDateZA(b.createdAt),
        value: b[metric.dataKey] as number | null,
      })),
    [batches, metric.dataKey],
  );

  const hasData = chartData.some((d) => d.value != null);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="batch" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} width={50} />
        <Tooltip
          formatter={(value: unknown) => {
            const num = Number(value);
            return [
              `${num.toFixed(metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`,
              metric.label,
            ];
          }}
          labelFormatter={(label: unknown, payload: readonly unknown[]) => {
            const rawPayloadDate = first?.payload?.date;
            const first = payload[0] as { payload?: { date?: string } } | undefined;
            return `Batch ${String(label)} (${rawPayloadDate || ""})`;
          }}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={metric.color}
          strokeWidth={2}
          dot={{ r: 3, fill: metric.color }}
          activeDot={{ r: 5 }}
          connectNulls
          name={metric.label}
        />
        {metric.specMin != null && (
          <ReferenceLine
            y={metric.specMin}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: "Min", position: "insideTopLeft", fill: "#ef4444", fontSize: 10 }}
          />
        )}
        {metric.specMax != null && (
          <ReferenceLine
            y={metric.specMax}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: "Max", position: "insideBottomLeft", fill: "#ef4444", fontSize: 10 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function BatchHistoryChart(props: BatchHistoryChartProps) {
  const { batches, config } = props;
  const [selectedGroup, setSelectedGroup] = useState(0);

  if (batches.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 py-12">
        <p>No batch data available for charting.</p>
      </div>
    );
  }

  const group = METRIC_GROUPS[selectedGroup];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-3">
        {METRIC_GROUPS.map((g, idx) => (
          <button
            key={g.label}
            onClick={() => setSelectedGroup(idx)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              idx === selectedGroup
                ? "bg-yellow-100 text-yellow-800"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {group.metrics.map((m) => {
          const specs = specLimitsForMetric(m.key, config);
          const metric: MetricDef = { ...m, ...specs };
          return (
            <div key={m.key} className="border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {m.label}
                {m.unit ? <span className="text-gray-400 ml-1">({m.unit})</span> : null}
              </h4>
              <MetricChart batches={batches} metric={metric} />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0 border-t-2 border-dashed border-red-500" />
          <span>Spec limits</span>
        </div>
        <span>{batches.length} batches plotted (newest to oldest, left to right)</span>
      </div>
    </div>
  );
}
