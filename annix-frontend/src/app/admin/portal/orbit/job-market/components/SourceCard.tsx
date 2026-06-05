"use client";

import { useState } from "react";
import type { JobMarketSource, JobSourceCredentialField } from "@/app/lib/api/annixOrbitApi";
import { fromISO } from "@/app/lib/datetime";

const MATCH_TIERS = ["soft", "medium", "hard"] as const;

const TIER_LABELS: Record<string, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Heavy",
};

function tierLabel(tier: string): string {
  const mapped = TIER_LABELS[tier];
  return mapped || tier;
}

export interface SourceEditPayload {
  ingestionIntervalHours?: number;
  visibleTiers?: string[];
  apiId?: string;
  apiKey?: string;
}

export function SourceCard({
  source,
  ingestionStatus,
  jobCount,
  credentialFields,
  saving,
  onTrigger,
  onToggle,
  onDelete,
  onSave,
}: {
  source: JobMarketSource;
  ingestionStatus?: string;
  jobCount?: number;
  credentialFields?: JobSourceCredentialField[];
  saving?: boolean;
  onTrigger: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onSave?: (data: SourceEditPayload) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [intervalInput, setIntervalInput] = useState("");
  const [tiers, setTiers] = useState<string[]>([]);
  const [creds, setCreds] = useState<Record<string, string>>({});

  const lastIngested = source.lastIngestedAt
    ? fromISO(source.lastIngestedAt).toFormat("dd/MM/yyyy, HH:mm")
    : "Never";

  const fields = credentialFields ?? [];
  const canEdit = onSave != null;

  const openEdit = () => {
    const currentTiers = source.visibleTiers;
    setIntervalInput(String(source.ingestionIntervalHours));
    setTiers(currentTiers ? [...currentTiers] : []);
    setCreds({});
    setEditing(true);
  };

  const toggleTier = (tier: string) => {
    setTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]));
  };

  const handleSave = () => {
    if (!onSave) return;
    const parsedInterval = Number(intervalInput);
    const apiIdValue = creds.apiId;
    const apiKeyValue = creds.apiKey;
    const trimmedApiId = apiIdValue ? apiIdValue.trim() : "";
    const trimmedApiKey = apiKeyValue ? apiKeyValue.trim() : "";
    onSave({
      ingestionIntervalHours:
        Number.isFinite(parsedInterval) && parsedInterval >= 1
          ? Math.round(parsedInterval)
          : undefined,
      visibleTiers: tiers,
      apiId: trimmedApiId.length > 0 ? trimmedApiId : undefined,
      apiKey: trimmedApiKey.length > 0 ? trimmedApiKey : undefined,
    });
    setEditing(false);
  };

  const tierSummary = (() => {
    const current = source.visibleTiers;
    if (!current || current.length === 0) return "all tiers";
    return current.map(tierLabel).join(", ");
  })();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
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
            {jobCount != null && (
              <p className="font-semibold text-gray-900">Jobs ingested: {jobCount}</p>
            )}
            <p>Countries: {source.countryCodes.join(", ").toUpperCase()}</p>
            <p>
              API requests: {source.requestsToday} / {source.rateLimitPerDay} today
            </p>
            <p>Ingestion interval: every {source.ingestionIntervalHours}h</p>
            <p>Visible to: {tierSummary}</p>
            <p>Last ingested: {lastIngested}</p>
          </div>
          {ingestionStatus && (
            <p
              className={`mt-2 text-sm ${
                ingestionStatus === "running"
                  ? "text-blue-600"
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
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            Ingest Now
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEdit())}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {editing ? "Close" : "Edit"}
            </button>
          )}
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

      {canEdit && editing && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Ingestion interval (hours)</span>
              <input
                value={intervalInput}
                onChange={(e) => setIntervalInput(e.target.value)}
                inputMode="numeric"
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="text-sm">
              <span className="block text-gray-600 mb-1">Visible to tiers (none = all)</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {MATCH_TIERS.map((tier) => {
                  const checked = tiers.includes(tier);
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => toggleTier(tier)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        checked
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : "bg-white text-gray-500 border-gray-300"
                      }`}
                    >
                      {tierLabel(tier)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((field) => {
                const fieldKey = field.key;
                const fieldValue = creds[fieldKey];
                const inputValue = fieldValue || "";
                return (
                  <label key={fieldKey} className="text-sm">
                    <span className="block text-gray-600 mb-1">{field.label} (blank = keep)</span>
                    <input
                      type={field.secret ? "password" : "text"}
                      value={inputValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        setCreds((prev) => ({ ...prev, [fieldKey]: next }));
                      }}
                      autoComplete="off"
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
