"use client";

import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Offline</span>
    </div>
  );
}
