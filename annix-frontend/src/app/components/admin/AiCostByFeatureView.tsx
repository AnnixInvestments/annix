"use client";

import { useState } from "react";
import { AiCostDailyChart } from "@/app/components/admin/AiCostDailyChart";
import { useAiUsageByFeature, useAiUsageDailyByFeature } from "@/app/lib/query/hooks";

const DAY_OPTIONS = [7, 14, 28] as const;

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toString();
}

function formatUsd(usd: number): string {
  if (usd <= 0) return "-";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function modelBadgeColor(model: string | null): string {
  if (model === null) return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  if (model.includes("flash-lite"))
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  if (model.includes("flash"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
}

interface AiCostByFeatureViewProps {
  app: string;
  title: string;
  subtitle?: string;
}

export function AiCostByFeatureView(props: AiCostByFeatureViewProps) {
  const app = props.app;
  const title = props.title;
  const subtitle = props.subtitle;
  const [days, setDays] = useState<number>(28);

  const query = useAiUsageByFeature({ days, app, provider: "gemini" });
  const data = query.data;
  const isLoading = query.isLoading;

  const dailyQuery = useAiUsageDailyByFeature({ days, app, provider: "gemini" });
  const dailyData = dailyQuery.data;

  const rows = data ? data.rows : [];
  const totalCost = data ? data.summary.totalCostUsd : 0;
  const totalCalls = data ? data.summary.totalCalls : 0;
  const dailyAvg = totalCost > 0 ? totalCost / days : 0;

  const dailySeries = dailyData ? dailyData.series : [];
  const dailyFeatures = dailyData ? dailyData.features : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
          {DAY_OPTIONS.map((option) => {
            const active = option === days;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={
                  active
                    ? "rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow dark:bg-slate-600 dark:text-white"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }
              >
                {option}d
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost ({days}d)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatUsd(totalCost)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatUsd(dailyAvg)}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">target &lt; $1.00/day</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalCalls.toLocaleString()}
          </p>
        </div>
      </div>

      <AiCostDailyChart
        title="Daily spend by feature"
        series={dailySeries}
        seriesKeys={dailyFeatures}
      />

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Feature
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Model
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Calls
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tokens
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  % of total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No Gemini usage logged for this app in this window.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const share = totalCost > 0 ? (row.totalCostUsd / totalCost) * 100 : 0;
                const model = row.model;
                const modelLabel = model ?? "—";
                return (
                  <tr
                    key={`${row.actionType}-${model ?? "none"}`}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.actionType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${modelBadgeColor(model)}`}
                      >
                        {modelLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      {row.totalCalls.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                      {formatTokens(row.totalTokens)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {formatUsd(row.totalCostUsd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {share >= 0.1 ? `${share.toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
