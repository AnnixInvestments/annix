"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { CrmSyncLog } from "@/app/lib/api/annixRepApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import { useCrmConfig, useCrmSyncLogs } from "@/app/lib/query/hooks";

function StatusBadge({ status }: { status: CrmSyncLog["status"] }) {
  const statusConfig = {
    in_progress: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-400",
      label: "In Progress",
    },
    completed: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-400",
      label: "Completed",
    },
    failed: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-400",
      label: "Failed",
    },
    partial: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-400",
      label: "Partial",
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: "push" | "pull" }) {
  const isPush = direction === "push";

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${
        isPush
          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
          : "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400"
      }`}
    >
      {isPush ? "Push" : "Pull"}
    </span>
  );
}

function SyncLogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: CrmSyncLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasErrors = log.errorDetails && log.errorDetails.length > 0;

  return (
    <>
      <tr className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
        <td className="px-4 py-3">
          <div className="text-sm text-gray-900 dark:text-white">
            {formatDateLongZA(new Date(log.startedAt))}
          </div>
          {log.completedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Completed: {formatDateLongZA(new Date(log.completedAt))}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <DirectionBadge direction={log.direction} />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={log.status} />
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm text-gray-900 dark:text-white">{log.recordsProcessed}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm text-green-600 dark:text-green-400">{log.recordsSucceeded}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm text-red-600 dark:text-red-400">{log.recordsFailed}</span>
        </td>
        <td className="px-4 py-3">
          {hasErrors && (
            <button
              onClick={onToggle}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {isExpanded ? "Hide" : "Show"} errors
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          )}
        </td>
      </tr>
      {isExpanded && hasErrors && (
        <tr className="border-b border-gray-200 dark:border-slate-700">
          <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-slate-800">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Error Details</h4>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="pr-4 pb-2">Record</th>
                      <th className="pr-4 pb-2">Type</th>
                      <th className="pr-4 pb-2">Error</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.errorDetails?.map((error, idx) => (
                      <tr key={idx} className="text-gray-700 dark:text-gray-300">
                        <td className="pr-4 py-1 font-mono text-xs">{error.recordId}</td>
                        <td className="pr-4 py-1">{error.recordType}</td>
                        <td className="pr-4 py-1 text-red-600 dark:text-red-400">{error.error}</td>
                        <td className="py-1 text-xs text-gray-500">{error.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function CrmSyncLogsPage() {
  const params = useParams();
  const configId = Number(params.id);

  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const { data: config, isLoading: configLoading } = useCrmConfig(configId);
  const { data: logsData, isLoading: logsLoading } = useCrmSyncLogs(configId, limit, offset);

  const isLoading = configLoading || logsLoading;
  const logs = logsData?.logs ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const toggleLogExpanded = (logId: number) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/annix-rep/settings/crm"
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sync History {config && `- ${config.name}`}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            View the history of sync operations for this CRM integration
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Sync History
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No sync operations have been performed yet for this integration.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Processed
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Succeeded
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <SyncLogRow
                      key={log.id}
                      log={log}
                      isExpanded={expandedLogId === log.id}
                      onToggle={() => toggleLogExpanded(log.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Syncs</h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Successful Syncs
          </h3>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
            {logs.filter((l) => l.status === "completed").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Failed Syncs
          </h3>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {logs.filter((l) => l.status === "failed").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Partial Syncs
          </h3>
          <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
            {logs.filter((l) => l.status === "partial").length}
          </p>
        </div>
      </div>
    </div>
  );
}
