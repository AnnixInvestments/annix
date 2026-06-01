"use client";

import Link from "next/link";
import { useVoiceAgentStatus } from "@/app/lib/query/hooks";

export function AgentStatusBanner() {
  const { data, isLoading, isError } = useVoiceAgentStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Checking for the Voice Filter desktop agent…
        </span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              Voice Filter desktop agent isn't running
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Live filtering, enrollment and meeting capture run on your computer. Launch the
              desktop agent, then refresh.{" "}
              <Link
                href="/annix-pulse/voice-filter/setup"
                className="font-medium underline hover:no-underline"
              >
                Setup guide
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const version = data.version;
  const versionLabel = version ? ` (v${version})` : "";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
      <span className="text-sm font-medium text-green-700 dark:text-green-400">
        Desktop agent connected{versionLabel}
      </span>
    </div>
  );
}
