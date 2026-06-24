"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppUpdateAvailable } from "@/app/lib/hooks/useAppUpdateAvailable";

/**
 * Repo-wide "Update now" affordance. Mounted once at the root so it appears on
 * EVERY app and route (no per-navbar wiring) only when a newer build has been
 * deployed than the one this tab is running. Floating top-center pill so it
 * never shifts page layout. "Update now" performs the hard refresh users
 * understand better than "hard refresh" — the new build's chunks live at fresh
 * immutable URLs, so a plain reload picks them up cleanly.
 */
export function AppUpdateBanner() {
  const { updateAvailable, deployedBuildId } = useAppUpdateAvailable();
  const [dismissedBuildId, setDismissedBuildId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDismissed = dismissedBuildId !== null && dismissedBuildId === deployedBuildId;
  const shouldShow = mounted && updateAvailable && !isDismissed;

  if (!shouldShow) {
    return null;
  }

  const banner = (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-amber-300/80 bg-amber-50/95 px-4 py-2 text-amber-900 shadow-lg backdrop-blur dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-100">
        <svg
          className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="whitespace-nowrap text-sm font-medium">A new version is available</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Update now
        </button>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => setDismissedBuildId(deployedBuildId)}
          className="text-amber-500 transition-colors hover:text-amber-700 dark:hover:text-amber-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  return createPortal(banner, document.body);
}
