"use client";

import { isNumber } from "es-toolkit/compat";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fromISO } from "@/app/lib/datetime";

const METRIC_OPTIONS = ["cost", "calls"] as const;
const DEFAULT_MAX_KEYS = 6;
const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

export interface AiCostDailyPoint {
  date: string;
  cost: Record<string, number>;
  calls: Record<string, number>;
}

interface AiCostDailyChartProps {
  title: string;
  series: AiCostDailyPoint[];
  seriesKeys: string[];
  maxKeys?: number;
}

function formatUsd(usd: number): string {
  if (usd <= 0) return "-";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

export function AiCostDailyChart(props: AiCostDailyChartProps) {
  const title = props.title;
  const series = props.series;
  const maxKeysProp = props.maxKeys;
  const maxKeys = maxKeysProp ?? DEFAULT_MAX_KEYS;
  const keys = props.seriesKeys.slice(0, maxKeys);
  const [metric, setMetric] = useState<"cost" | "calls">("cost");

  const chartData = series.map((point) => {
    const values = metric === "cost" ? point.cost : point.calls;
    return keys.reduce<Record<string, number | string>>(
      (acc, key) => {
        const value = values[key];
        acc[key] = value ?? 0;
        return acc;
      },
      { label: fromISO(point.date).toFormat("dd LLL") },
    );
  });

  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-900">
          {METRIC_OPTIONS.map((option) => {
            const active = option === metric;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                className={
                  active
                    ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow dark:bg-slate-600 dark:text-white"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }
              >
                {option === "cost" ? "Spend" : "Calls"}
              </button>
            );
          })}
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          No daily data in this window.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 11 }}
              width={52}
              tickFormatter={(value) =>
                metric === "cost" ? `$${value}` : formatCount(Number(value))
              }
            />
            <Tooltip
              formatter={(value) => {
                const num = isNumber(value) ? value : Number(value);
                return metric === "cost" ? formatUsd(num) : num.toLocaleString();
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[index % COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
