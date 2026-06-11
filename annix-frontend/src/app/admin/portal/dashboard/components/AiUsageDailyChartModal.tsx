"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fromISO } from "@/app/lib/datetime";
import { useAiUsageDailySeries } from "@/app/lib/query/hooks";

export type AiUsageMetric = "calls" | "tokens";

const CHART_DAYS = 28;
const BAR_COLOR = "#6366f1";
const BUDGET_COLOR = "#f59e0b";

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

function shortDate(date: string): string {
  const dt = fromISO(date);
  return dt.isValid ? dt.toFormat("d MMM") : date;
}

export function AiUsageDailyChartModal(props: {
  isOpen: boolean;
  initialMetric: AiUsageMetric;
  callsBudget: number | null;
  tokensBudget: number | null;
  onClose: () => void;
}) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const initialMetric = props.initialMetric;
  const [metric, setMetric] = useState<AiUsageMetric>(initialMetric);

  useEffect(() => {
    if (isOpen) setMetric(initialMetric);
  }, [isOpen, initialMetric]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const seriesQuery = useAiUsageDailySeries(CHART_DAYS, isOpen);

  if (!isOpen) return null;

  const seriesData = seriesQuery.data;
  const days = seriesData ? seriesData.days : [];
  const chartData = days.map((day) => ({
    label: shortDate(day.date),
    value: metric === "calls" ? day.calls : day.tokens,
  }));
  const total = chartData.reduce((sum, point) => sum + point.value, 0);
  const peak = chartData.reduce((max, point) => Math.max(max, point.value), 0);
  const budget = metric === "calls" ? props.callsBudget : props.tokensBudget;
  const metricLabel = metric === "calls" ? "calls" : "tokens";
  const budgetText = budget !== null ? `daily soft budget ${compactNumber(budget)}` : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily AI usage"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              AI usage — last {CHART_DAYS} days
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {compactNumber(total)} {metricLabel} total · peak day {compactNumber(peak)}
              {budgetText ? ` · ${budgetText}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-white/10">
              {(["calls", "tokens"] as AiUsageMetric[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMetric(option)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                    metric === option
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-4 h-72">
          {seriesQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Loading daily usage…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No AI usage recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tickFormatter={compactNumber}
                  tick={{ fontSize: 10 }}
                  width={44}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  formatter={(value) => [compactNumber(Number(value ?? 0)), metricLabel]}
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {budget !== null && budget <= peak * 1.5 ? (
                  <ReferenceLine
                    y={budget}
                    stroke={BUDGET_COLOR}
                    strokeDasharray="4 4"
                    label={{
                      value: "soft budget",
                      fontSize: 10,
                      fill: BUDGET_COLOR,
                      position: "insideTopRight",
                    }}
                  />
                ) : null}
                <Bar dataKey="value" fill={BAR_COLOR} radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
