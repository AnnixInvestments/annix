"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
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

interface UsageGroup {
  key: string;
  date: string;
  app: string;
  actionType: string;
  provider: string;
  model: string;
  totalCalls: number;
  totalTokens: number;
  totalPages: number;
  totalTimeMs: number;
  logs: AiUsageLog[];
}

function groupLogs(logs: AiUsageLog[]): UsageGroup[] {
  return logs.reduce<UsageGroup[]>((groups, log) => {
    const date = formatDateZA(log.createdAt);
    const key = `${date}|${log.app}|${log.actionType}`;
    const existing = groups.find((g) => g.key === key);

    if (existing) {
      return groups.map((g) =>
        g.key === key
          ? {
              ...g,
              totalCalls: g.totalCalls + 1,
              totalTokens: g.totalTokens + (log.tokensUsed ?? 0),
              totalPages: g.totalPages + (log.pageCount ?? 0),
              totalTimeMs: g.totalTimeMs + (log.processingTimeMs ?? 0),
              logs: [...g.logs, log],
            }
          : g,
      );
    }

    return [
      ...groups,
      {
        key,
        date,
        app: log.app,
        actionType: log.actionType,
        provider: log.provider,
        model: log.model ?? "-",
        totalCalls: 1,
        totalTokens: log.tokensUsed ?? 0,
        totalPages: log.pageCount ?? 0,
        totalTimeMs: log.processingTimeMs ?? 0,
        logs: [log],
      },
    ];
  }, []);
}

export default function AiUsagePage() {
  const [filters, setFilters] = useState<AiUsageQueryParams>({
    page: 1,
    limit: 50,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data, isLoading } = useAiUsageLogs(filters);

  const groups = useMemo(() => groupLogs(data?.data ?? []), [data?.data]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const updateFilter = (key: keyof AiUsageQueryParams, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: key === "page" ? (value as number) : 1,
    }));
    setExpandedGroups(new Set());
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
                <th className="w-8 px-2 py-3" />
                {[
                  "Date",
                  "App",
                  "Action",
                  "Provider",
                  "Model",
                  "Calls",
                  "Pages",
                  "Tokens",
                  "Time",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No usage logs found
                  </td>
                </tr>
              ) : (
                groups.flatMap((group) => {
                  const isExpanded = expandedGroups.has(group.key);
                  const isSingleEntry = group.logs.length === 1;

                  return [
                    <tr
                      key={group.key}
                      onClick={() => !isSingleEntry && toggleGroup(group.key)}
                      className={`${isSingleEntry ? "" : "cursor-pointer"} hover:bg-gray-50 dark:hover:bg-slate-700/30 ${isExpanded ? "bg-gray-50 dark:bg-slate-700/20" : ""}`}
                    >
                      <td className="px-2 py-3 text-center text-gray-400">
                        {isSingleEntry ? (
                          <span className="inline-block w-4" />
                        ) : isExpanded ? (
                          <ChevronDown className="inline h-4 w-4" />
                        ) : (
                          <ChevronRight className="inline h-4 w-4" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                        {group.date}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${appBadgeColor(group.app)}`}
                        >
                          {group.app}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {group.actionType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${providerBadgeColor(group.provider)}`}
                        >
                          {group.provider}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {group.model}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                        {group.totalCalls}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {group.totalPages || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-gray-200">
                        {formatTokens(group.totalTokens || null)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatMs(group.totalTimeMs || null)}
                      </td>
                    </tr>,
                    ...(isExpanded
                      ? group.logs.map((log) => (
                          <tr
                            key={`detail-${log.id}`}
                            className="bg-gray-50/50 dark:bg-slate-700/10"
                          >
                            <td className="px-2 py-2" />
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400 pl-8">
                              {formatDateZA(log.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${appBadgeColor(log.app)}`}
                              >
                                {log.app}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              {log.actionType}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${providerBadgeColor(log.provider)}`}
                              >
                                {log.provider}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              {log.model ?? "-"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              1
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              {log.pageCount ?? "-"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                              {formatTokens(log.tokensUsed)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                              {formatMs(log.processingTimeMs)}
                            </td>
                          </tr>
                        ))
                      : []),
                  ];
                })
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
