"use client";

import { useEffect, useState } from "react";
import { onSyncStatusChange, type SyncStatus, syncPendingActions } from "@/app/lib/offline";

export default function OfflineIndicator() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingActions();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!status || (status.isOnline && status.pendingCount === 0)) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`fixed bottom-20 right-4 z-40 p-3 rounded-full shadow-lg transition-all ${
          status.isOnline ? "bg-yellow-500 text-white" : "bg-red-500 text-white animate-pulse"
        }`}
      >
        {status.isOnline ? (
          <div className="relative">
            <svg
              className="w-6 h-6"
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
            {status.pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-yellow-500 text-xs font-bold rounded-full flex items-center justify-center">
                {status.pendingCount > 9 ? "9+" : status.pendingCount}
              </span>
            )}
          </div>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
          </svg>
        )}
      </button>

      {showDetails && (
        <div className="fixed bottom-36 right-4 z-40 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {status.isOnline ? "Sync Status" : "Offline Mode"}
            </h3>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status.isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {status.isOnline ? "Connected" : "No internet connection"}
              </span>
            </div>

            {status.pendingCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Pending actions</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {status.pendingCount}
                </span>
              </div>
            )}

            {status.lastSyncAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last sync</span>
                <span className="text-gray-900 dark:text-white">
                  {formatRelativeTime(status.lastSyncAt)}
                </span>
              </div>
            )}

            {status.error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                {status.error}
              </div>
            )}

            {status.isOnline && status.pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Sync Now
                  </>
                )}
              </button>
            )}

            {!status.isOnline && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your changes will be saved locally and synced when you're back online.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return date.toLocaleDateString();
}
