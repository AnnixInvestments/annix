"use client";

import { useMemo, useState } from "react";
import type {
  AggregatedUsageGroupBy,
  AggregatedUsageRow,
  ExtractionUsageQuery,
} from "@/app/lib/api/metricsApi";
import { fromISO, now } from "@/app/lib/datetime";
import { useExtractionMetricsUsage } from "@/app/lib/query/hooks";

const PRESETS: Array<{ label: string; days: number }> = [
  { label: "Last 24h", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

const GROUP_BY_OPTIONS: Array<{ label: string; value: AggregatedUsageGroupBy }> = [
  { label: "By operation", value: "operation" },
  { label: "By category", value: "category" },
  { label: "By day", value: "day" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)} min`;
  return `${(ms / 3_600_000).toFixed(2)} h`;
}

function formatLatest(raw: string | null): string {
  if (raw === null) return "—";
  const dt = fromISO(raw);
  if (!dt.isValid) return raw;
  return dt.toFormat("yyyy-LL-dd HH:mm");
}

function isoDaysAgo(days: number): string {
  return now().minus({ days }).toUTC().toISO() ?? "";
}

function categoryBadgeColor(category: string): string {
  if (category.startsWith("insights"))
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200";
  if (category.startsWith("rubber") || category.startsWith("au-rubber"))
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200";
  if (category.startsWith("cv-"))
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200";
  if (category.startsWith("stock-control") || category.startsWith("sc-"))
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

export default function ExtractionMetricsPage() {
  const [preset, setPreset] = useState<number>(7);
  const [groupBy, setGroupBy] = useState<AggregatedUsageGroupBy>("operation");
  const [categoryFilter, setCategoryFilter] = useState("");

  const trimmedCategory = categoryFilter.trim();
  const query: ExtractionUsageQuery = useMemo(
    () => ({
      from: isoDaysAgo(preset),
      groupBy,
      category: trimmedCategory.length > 0 ? trimmedCategory : undefined,
    }),
    [preset, groupBy, trimmedCategory],
  );

  const { data, isLoading, error } = useExtractionMetricsUsage(query);
  const rows: AggregatedUsageRow[] = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    let bytes = 0;
    let durMs = 0;
    let runs = 0;
    let failures = 0;
    for (const row of rows) {
      bytes += row.totalPayloadBytes;
      durMs += row.totalDurationMs;
      runs += row.runs;
      failures += row.failures;
    }
    return { bytes, durMs, runs, failures };
  }, [rows]);

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Extraction metrics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Aggregated <code className="text-xs">extraction_metric</code> rows — every long-running
          cron, AI extraction, and signal computation wrapped in{" "}
          <code className="text-xs">ExtractionMetricService.time()</code>. Sort by total bytes to
          find what's eating Atlas bandwidth; by total duration to find what's eating compute.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="preset"
            className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase"
          >
            Window
          </label>
          <div className="flex gap-1">
            {PRESETS.map((p) => {
              const active = p.days === preset;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => setPreset(p.days)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="groupBy"
            className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase"
          >
            Group by
          </label>
          <select
            id="groupBy"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as AggregatedUsageGroupBy)}
            className="px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label
            htmlFor="category"
            className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase"
          >
            Filter category
          </label>
          <input
            id="category"
            type="text"
            placeholder="e.g. insights-market-data"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Runs" value={totals.runs.toLocaleString()} />
        <SummaryCard label="Failures" value={totals.failures.toLocaleString()} tone="danger" />
        <SummaryCard label="Total duration" value={formatMs(totals.durMs)} />
        <SummaryCard label="Total payload" value={formatBytes(totals.bytes)} />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-200 text-sm"
        >
          Could not load metrics: {errorMessage}
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              {groupBy !== "category" ? <th className="px-4 py-3 text-left">Operation</th> : null}
              {groupBy === "day" ? <th className="px-4 py-3 text-left">Day</th> : null}
              <th className="px-4 py-3 text-right">Runs</th>
              <th className="px-4 py-3 text-right">Fail</th>
              <th className="px-4 py-3 text-right">Avg ms</th>
              <th className="px-4 py-3 text-right">p95 ms</th>
              <th className="px-4 py-3 text-right">Total dur.</th>
              <th className="px-4 py-3 text-right">Total bytes</th>
              <th className="px-4 py-3 text-left">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No metrics recorded in this window.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const dayDisplay = row.day;
                const dayKey = dayDisplay ?? "_";
                const operationText = row.operation;
                const operationDisplay = operationText.length > 0 ? operationText : "—";
                const failureReason = row.lastFailureReason;
                return (
                  <tr
                    key={`${row.category}-${row.operation}-${dayKey}-${idx}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/40"
                  >
                    <td className="px-4 py-2.5 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryBadgeColor(row.category)}`}
                      >
                        {row.category}
                      </span>
                    </td>
                    {groupBy !== "category" ? (
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-700 dark:text-gray-300">
                        {operationDisplay}
                      </td>
                    ) : null}
                    {groupBy === "day" ? (
                      <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                        {dayDisplay ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                      {row.runs.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right">
                      {row.failures > 0 ? (
                        <span
                          className="text-red-600 dark:text-red-400 cursor-help"
                          title={failureReason ?? "No error detail captured for these failures"}
                        >
                          {row.failures.toLocaleString()}
                          {failureReason ? (
                            <span className="block max-w-[14rem] truncate text-[10px] font-normal text-red-400 dark:text-red-300/80">
                              {failureReason}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                      {row.avgDurationMs.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                      {row.p95DurationMs.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatMs(row.totalDurationMs)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {formatBytes(row.totalPayloadBytes)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                      {formatLatest(row.latestRunAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string; tone?: "danger" }) {
  const toneClass =
    props.tone === "danger" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white";
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {props.label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{props.value}</div>
    </div>
  );
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
