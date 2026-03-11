"use client";

import { useState } from "react";
import type { AiUsageLog, AiUsageQueryParams } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAiUsageLogs } from "@/app/lib/query/hooks";

const APP_OPTIONS = [
  { value: "", label: "All Apps" },
  { value: "au-rubber", label: "AU Rubber" },
  { value: "nix", label: "Nix" },
  { value: "cv-assistant", label: "CV Assistant" },
  { value: "stock-control", label: "Stock Control" },
];

const PROVIDER_OPTIONS = [
  { value: "", label: "All Providers" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
];

function formatTokens(tokens: number | null): string {
  if (tokens === null) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toString();
}

function formatMs(ms: number | null): string {
  if (ms === null) return "-";
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${ms}ms`;
}

function appBadgeColor(app: string): string {
  const colors: Record<string, string> = {
    "au-rubber": "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    nix: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    "cv-assistant": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    "stock-control": "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  };
  return colors[app] ?? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
}

function providerBadgeColor(provider: string): string {
  if (provider === "gemini") return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
}

export default function AiUsagePage() {
  const [filters, setFilters] = useState<AiUsageQueryParams>({
    page: 1,
    limit: 50,
  });

  const { data, isLoading } = useAiUsageLogs(filters);

  const updateFilter = (key: keyof AiUsageQueryParams, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: key === "page" ? (value as number) : 1,
    }));
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const filterApp = filters.app ?? "";
  const filterProvider = filters.provider ?? "";
  const filterFrom = filters.from ?? "";
  const filterTo = filters.to ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">AI Usage</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track AI token usage across all applications
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.summary.totalCalls.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatTokens(data.summary.totalTokens)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow dark:bg-slate-800">
        <select
          value={filterApp}
          onChange={(e) => updateFilter("app", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {APP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filterProvider}
          onChange={(e) => updateFilter("provider", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filterFrom}
          onChange={(e) => updateFilter("from", e.target.value)}
          placeholder="From"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />

        <input
          type="date"
          value={filterTo}
          onChange={(e) => updateFilter("to", e.target.value)}
          placeholder="To"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {["Date", "App", "Action", "Provider", "Model", "Pages", "Tokens", "Time"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No usage logs found
                  </td>
                </tr>
              ) : (
                data?.data.map((log: AiUsageLog) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                      {formatDateZA(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${appBadgeColor(log.app)}`}
                      >
                        {log.app}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.actionType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${providerBadgeColor(log.provider)}`}
                      >
                        {log.provider}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {log.model ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.pageCount ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatTokens(log.tokensUsed)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatMs(log.processingTimeMs)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {data?.page} of {totalPages} ({data?.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter("page", (data?.page ?? 1) - 1)}
                disabled={!data || data.page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-600 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilter("page", (data?.page ?? 1) + 1)}
                disabled={!data || data.page >= totalPages}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-slate-600 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
