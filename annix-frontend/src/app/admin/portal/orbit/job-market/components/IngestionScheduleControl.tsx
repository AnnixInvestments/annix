"use client";

import { useState } from "react";
import { useScheduledJobs, useUpdateJobFrequency } from "@/app/lib/query/hooks";

// The single global cron that polls + ingests every enabled source. Editing its
// schedule here writes to the same store as the Scheduled Jobs admin page, so
// the two stay in sync automatically.
const POLL_JOB_NAME = "annix-orbit:poll-job-sources";

const PRESETS: { label: string; cron: string }[] = [
  { label: "Hourly", cron: "0 * * * *" },
  { label: "Every 6h", cron: "0 */6 * * *" },
  { label: "Daily 02:00", cron: "0 2 * * *" },
  { label: "Daily 06:00", cron: "0 6 * * *" },
];

export function IngestionScheduleControl() {
  const jobsQuery = useScheduledJobs();
  const updateFrequency = useUpdateJobFrequency();
  const [editing, setEditing] = useState(false);
  const [cronInput, setCronInput] = useState("");

  const jobsData = jobsQuery.data;
  const jobs = jobsData || [];
  const job = jobs.find((j) => j.name === POLL_JOB_NAME);
  if (!job) return null;

  const currentCron = job.cronTime;
  const isCustom = currentCron !== job.defaultCron;

  const openEdit = () => {
    setCronInput(currentCron);
    setEditing(true);
  };

  const save = (cron: string) => {
    const trimmed = cron.trim();
    if (trimmed.length === 0) return;
    updateFrequency.mutate({ name: POLL_JOB_NAME, cronExpression: trimmed });
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Ingestion schedule</h3>
          <p className="mt-1 text-sm text-gray-500">
            How often Annix polls every enabled source for new jobs.{" "}
            <span className="text-gray-400">Synced with the Scheduled Jobs page.</span>
          </p>
          <p className="mt-2 text-sm">
            Current:{" "}
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">{currentCron}</code>
            {!job.active && <span className="ml-2 text-xs text-amber-600">(paused)</span>}
            {isCustom && (
              <span className="ml-2 text-xs text-gray-400">(default {job.defaultCron})</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => (editing ? setEditing(false) : openEdit())}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {editing ? "Close" : "Edit schedule"}
        </button>
      </div>

      {editing && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.cron}
                type="button"
                onClick={() => setCronInput(preset.cron)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  cronInput === preset.cron
                    ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Cron expression</span>
            <input
              value={cronInput}
              onChange={(e) => setCronInput(e.target.value)}
              placeholder="0 * * * *"
              className="w-full sm:w-72 rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(cronInput)}
              disabled={updateFrequency.isPending}
              className="px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
            >
              {updateFrequency.isPending ? "Saving…" : "Save schedule"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
