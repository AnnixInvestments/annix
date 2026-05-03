"use client";

import type { JobMarketSource } from "@/app/lib/api/cvAssistantApi";
import { fromISO } from "@/app/lib/datetime";

export function SourceCard({
  source,
  ingestionStatus,
  onTrigger,
  onToggle,
  onDelete,
}: {
  source: JobMarketSource;
  ingestionStatus?: string;
  onTrigger: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lastIngested = source.lastIngestedAt
    ? fromISO(source.lastIngestedAt).toFormat("dd/MM/yyyy, HH:mm")
    : "Never";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{source.name}</h3>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full uppercase">
              {source.provider}
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                source.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {source.enabled ? "Active" : "Disabled"}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-500 space-y-1">
            <p>Countries: {source.countryCodes.join(", ").toUpperCase()}</p>
            <p>
              API requests: {source.requestsToday} / {source.rateLimitPerDay} today
            </p>
            <p>Ingestion interval: every {source.ingestionIntervalHours}h</p>
            <p>Last ingested: {lastIngested}</p>
          </div>
          {ingestionStatus && (
            <p
              className={`mt-2 text-sm ${
                ingestionStatus === "running"
                  ? "text-[#323288]"
                  : ingestionStatus.startsWith("Error")
                    ? "text-red-600"
                    : "text-green-600"
              }`}
            >
              {ingestionStatus === "running" ? "Ingesting..." : ingestionStatus}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTrigger}
            disabled={ingestionStatus === "running"}
            className="px-3 py-1.5 text-sm text-[#323288] border border-[#c0c0eb] rounded-lg hover:bg-[#f0f0fc] disabled:opacity-50 transition-colors"
          >
            Ingest Now
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              source.enabled
                ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                : "text-green-600 border-green-200 hover:bg-green-50"
            }`}
          >
            {source.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
