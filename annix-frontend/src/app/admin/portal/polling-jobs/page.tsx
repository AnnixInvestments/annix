"use client";

import { useMemo, useState } from "react";
import type { NightSuspensionHours, PollingJobDto } from "@/app/lib/api/adminApi";
import {
  usePausePollingJob,
  usePollingJobs,
  usePollingJobsGlobalSettings,
  useResumePollingJob,
  useUpdatePollingJobInterval,
  useUpdatePollingJobNightSuspension,
  useUpdatePollingJobsGlobalSettings,
} from "@/app/lib/query/hooks";

const INTERVAL_PRESETS: Array<{ label: string; value: number }> = [
  { label: "Every 1 minute", value: 60_000 },
  { label: "Every 2 minutes", value: 2 * 60_000 },
  { label: "Every 5 minutes", value: 5 * 60_000 },
  { label: "Every 15 minutes", value: 15 * 60_000 },
  { label: "Every 30 minutes", value: 30 * 60_000 },
  { label: "Every 1 hour", value: 60 * 60_000 },
  { label: "Every 3 hours", value: 3 * 60 * 60_000 },
  { label: "Every 6 hours", value: 6 * 60 * 60_000 },
  { label: "Every 12 hours", value: 12 * 60 * 60_000 },
  { label: "Every 24 hours", value: 24 * 60 * 60_000 },
];

const NIGHT_SUSPENSION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "None", value: "none" },
  { label: "6h (9pm-3am)", value: "6" },
  { label: "8h (8pm-4am)", value: "8" },
  { label: "12h (6pm-6am)", value: "12" },
];

const MODULE_COLORS: Record<string, string> = {
  "Stock Control Dashboard":
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  Admin: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
  "Annix Rep": "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
};

function formatInterval(ms: number): string {
  const preset = INTERVAL_PRESETS.find((p) => p.value === ms);
  if (preset) return preset.label;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / (60 * 60_000))}h`;
}

function JobRow(props: { job: PollingJobDto }) {
  const job = props.job;
  const pauseMutation = usePausePollingJob();
  const resumeMutation = useResumePollingJob();
  const intervalMutation = useUpdatePollingJobInterval();
  const nightMutation = useUpdatePollingJobNightSuspension();

  const [customMs, setCustomMs] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleToggle = () => {
    if (job.active) pauseMutation.mutate(job.name);
    else resumeMutation.mutate(job.name);
  };

  const handleIntervalChange = (value: string) => {
    if (value === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const ms = Number.parseInt(value, 10);
    if (!Number.isNaN(ms)) {
      intervalMutation.mutate({ name: job.name, intervalMs: ms });
    }
  };

  const handleCustomSubmit = () => {
    const ms = Number.parseInt(customMs, 10);
    if (!Number.isNaN(ms) && ms >= 10_000) {
      intervalMutation.mutate({ name: job.name, intervalMs: ms });
      setShowCustom(false);
      setCustomMs("");
    }
  };

  const handleResetDefault = () => {
    intervalMutation.mutate({ name: job.name, intervalMs: job.defaultIntervalMs });
  };

  const handleNightChange = (value: string) => {
    const nightHours: NightSuspensionHours =
      value === "none" ? null : (Number.parseInt(value, 10) as 6 | 8 | 12);
    nightMutation.mutate({ name: job.name, nightSuspensionHours: nightHours });
  };

  const moduleColor = MODULE_COLORS[job.module];
  const moduleClass = moduleColor
    ? moduleColor
    : "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300";

  const matchedPreset = INTERVAL_PRESETS.find((p) => p.value === job.intervalMs);
  const presetValue = matchedPreset ? matchedPreset.value.toString() : "custom";

  const nightHours = job.nightSuspensionHours;
  const nightValue = nightHours === null ? "none" : nightHours.toString();

  const isPausing = pauseMutation.isPending;
  const isResuming = resumeMutation.isPending;
  const toggleDisabled = isPausing || isResuming;

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
      <td className="px-3 py-2">
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${moduleClass}`}>
          {job.module}
        </span>
      </td>
      <td className="px-3 py-2 text-xs">
        <div className="font-mono text-gray-600 dark:text-gray-400">{job.name}</div>
        <div className="mt-0.5 text-gray-500 dark:text-gray-500">{job.description}</div>
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            job.active
              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
          }`}
        >
          {job.active ? "Active" : "Paused"}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <select
            value={presetValue}
            onChange={(e) => handleIntervalChange(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
          >
            {INTERVAL_PRESETS.map((p) => (
              <option key={p.value} value={p.value.toString()}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {showCustom ? (
            <div className="flex gap-1">
              <input
                type="number"
                value={customMs}
                onChange={(e) => setCustomMs(e.target.value)}
                placeholder="ms"
                className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                Set
              </button>
            </div>
          ) : null}
          {job.intervalMs !== job.defaultIntervalMs ? (
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-left text-[10px] text-blue-600 hover:underline dark:text-blue-400"
            >
              Reset to default ({formatInterval(job.defaultIntervalMs)})
            </button>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2">
        <select
          value={nightValue}
          onChange={(e) => handleNightChange(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
        >
          {NIGHT_SUSPENSION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleDisabled}
          className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
            job.active
              ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
              : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
          }`}
        >
          {job.active ? "Pause" : "Resume"}
        </button>
      </td>
    </tr>
  );
}

function GlobalSettingsBar() {
  const { data: settings } = usePollingJobsGlobalSettings();
  const mutation = useUpdatePollingJobsGlobalSettings();
  const suspend = settings ? settings.suspendOnWeekendsAndHolidays : false;
  const checked = suspend;

  const handleToggle = () => {
    mutation.mutate({ suspendOnWeekendsAndHolidays: !checked });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-800 dark:bg-orange-900/20">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleToggle}
          disabled={mutation.isPending}
          className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
        />
        <span className="font-medium">
          Suspend all polling jobs on weekends (Sat/Sun) and SA public holidays
        </span>
      </label>
      {mutation.isPending ? <span className="text-xs text-orange-400">Saving...</span> : null}
    </div>
  );
}

export default function PollingJobsPage() {
  const { data: jobs, isLoading } = usePollingJobs();

  const groupedByModule = useMemo(() => {
    if (!jobs) return [];
    const groups = jobs.reduce<Record<string, PollingJobDto[]>>((acc, job) => {
      const existing = acc[job.module];
      const list = existing ? existing : [];
      list.push(job);
      acc[job.module] = list;
      return acc;
    }, {});
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [jobs]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Polling Jobs</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Control frontend TanStack Query polling intervals. Reduces Neon network transfer by
          avoiding unnecessary repeat queries.
        </p>
      </div>

      <div className="mb-4">
        <GlobalSettingsBar />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading polling jobs…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2">Interval</th>
                <th className="px-3 py-2">Night Suspension</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedByModule.flatMap(([, moduleJobs]) =>
                moduleJobs.map((job) => <JobRow key={job.name} job={job} />),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
