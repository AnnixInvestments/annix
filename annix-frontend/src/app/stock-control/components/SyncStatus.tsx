"use client";

import { useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";
import { API_BASE_URL } from "@/lib/api-config";
import {
  forceSync,
  onSyncStatusChange,
  type SyncStatus as SyncStatusType,
} from "../lib/offline/syncManager";

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType>({
    isOnline: true,
    isSyncing: false,
    pendingMutations: 0,
    pendingPhotos: 0,
    lastSyncAt: null,
    error: null,
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const handleSync = async () => {
    const authHeaders = stockControlApiClient.authHeaders();
    await forceSync(API_BASE_URL, authHeaders.Authorization ?? "");
  };

  const totalPending = status.pendingMutations + status.pendingPhotos;

  if (status.isOnline && totalPending === 0 && !status.isSyncing) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !status.isOnline
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
            : status.isSyncing
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
              : totalPending > 0
                ? "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
      >
        {!status.isOnline ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Offline</span>
          </>
        ) : status.isSyncing ? (
          <>
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Syncing...</span>
          </>
        ) : totalPending > 0 ? (
          <>
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span>{totalPending} pending</span>
          </>
        ) : null}
      </button>

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Sync Status</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Connection</span>
                  <span
                    className={`font-medium ${status.isOnline ? "text-green-600" : "text-amber-600"}`}
                  >
                    {status.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending changes</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {status.pendingMutations}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending photos</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {status.pendingPhotos}
                  </span>
                </div>

                {status.lastSyncAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last sync</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateLongZA(status.lastSyncAt)}
                    </span>
                  </div>
                )}

                {status.error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {status.error}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={handleSync}
                  disabled={!status.isOnline || status.isSyncing}
                  className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status.isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
