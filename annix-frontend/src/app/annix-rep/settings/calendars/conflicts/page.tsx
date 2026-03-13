"use client";

import { DateTime } from "luxon";
import Link from "next/link";
import { useState } from "react";
import type { SyncConflict } from "@/app/lib/api/annixRepApi";
import { useDetectConflicts, useResolveConflict, useSyncConflicts } from "@/app/lib/query/hooks";

function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return "N/A";
  return DateTime.fromISO(isoString).toFormat("ccc, d LLL yyyy 'at' HH:mm");
}

function ConflictCard({
  conflict,
  onResolve,
  isResolving,
}: {
  conflict: SyncConflict;
  onResolve: (resolution: "keep_local" | "keep_remote" | "dismissed") => void;
  isResolving: boolean;
}) {
  const localTitle = conflict.localData.title ?? "Meeting";
  const remoteTitle = conflict.remoteData.title ?? "Calendar Event";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400"
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
          <span className="font-medium text-amber-800 dark:text-amber-300">
            {conflict.conflictType === "time_overlap" && "Time Overlap"}
            {conflict.conflictType === "data_conflict" && "Data Conflict"}
            {conflict.conflictType === "deleted_locally" && "Deleted Locally"}
            {conflict.conflictType === "deleted_remotely" && "Deleted Remotely"}
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Detected {DateTime.fromISO(conflict.createdAt.toString()).toRelative()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              Your Meeting
            </h4>
            <p className="font-medium text-gray-900 dark:text-white">{localTitle}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {formatDateTime(conflict.localData.startTime as string)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              to {formatDateTime(conflict.localData.endTime as string)}
            </p>
            {conflict.localData.location && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {conflict.localData.location as string}
              </p>
            )}
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              External Calendar Event
            </h4>
            <p className="font-medium text-gray-900 dark:text-white">{remoteTitle}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {formatDateTime(conflict.remoteData.startTime as string)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              to {formatDateTime(conflict.remoteData.endTime as string)}
            </p>
            {conflict.remoteData.location && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {conflict.remoteData.location as string}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => onResolve("dismissed")}
            disabled={isResolving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            onClick={() => onResolve("keep_remote")}
            disabled={isResolving}
            className="px-4 py-2 text-sm text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
          >
            Keep Calendar Event
          </button>
          <button
            onClick={() => onResolve("keep_local")}
            disabled={isResolving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Keep Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConflictsPage() {
  const { data: conflicts, isLoading } = useSyncConflicts();
  const resolveConflict = useResolveConflict();
  const detectConflicts = useDetectConflicts();
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const handleResolve = async (
    conflictId: number,
    resolution: "keep_local" | "keep_remote" | "dismissed",
  ) => {
    setResolvingId(conflictId);
    try {
      await resolveConflict.mutateAsync({ id: conflictId, resolution });
    } finally {
      setResolvingId(null);
    }
  };

  const handleDetect = async () => {
    await detectConflicts.mutateAsync();
  };

  const pendingConflicts = conflicts?.filter((c) => c.resolution === "pending") ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/fieldflow/settings/calendars"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
            >
              &larr; Back to Calendar Settings
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sync Conflicts</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Resolve scheduling conflicts between your meetings and external calendars.
            </p>
          </div>
          <button
            onClick={handleDetect}
            disabled={detectConflicts.isPending}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {detectConflicts.isPending ? "Scanning..." : "Scan for Conflicts"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-24 bg-gray-200 dark:bg-slate-700 rounded" />
                  <div className="h-24 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingConflicts.length > 0 ? (
          <div className="space-y-4">
            {pendingConflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onResolve={(resolution) => handleResolve(conflict.id, resolution)}
                isResolving={resolvingId === conflict.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-green-500 mb-4"
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No conflicts found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Your meetings and calendar events are in sync. Use the scan button above to check for
              new conflicts.
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            About Conflict Resolution
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>
              <strong>Keep Meeting</strong> - The calendar event will be removed from your view
            </li>
            <li>
              <strong>Keep Calendar Event</strong> - The meeting will be marked as cancelled
            </li>
            <li>
              <strong>Dismiss</strong> - Ignore this conflict without making changes
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
