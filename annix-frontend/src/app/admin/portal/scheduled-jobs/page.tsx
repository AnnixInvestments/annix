"use client";

import type { ScheduledJobDto } from "@/app/lib/api/adminApi";
import {
  usePauseJob,
  useResumeJob,
  useScheduledJobs,
  useUpdateJobFrequency,
} from "@/app/lib/query/hooks";

const PRESET_FREQUENCIES = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 10 minutes", value: "*/10 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 2 hours", value: "0 */2 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 2am", value: "0 2 * * *" },
  { label: "Daily at 3am", value: "0 3 * * *" },
  { label: "Daily at 4am", value: "0 4 * * *" },
  { label: "Daily at 5am", value: "0 5 * * *" },
  { label: "Daily at 6am", value: "0 6 * * *" },
  { label: "Daily at 7am", value: "0 7 * * *" },
  { label: "Daily at 8am", value: "0 8 * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Daily at 10am", value: "0 10 * * *" },
  { label: "Weekly (Sunday midnight)", value: "0 0 * * 0" },
];

function normalizeCronToFiveField(cronTime: string): string {
  const parts = cronTime.trim().split(/\s+/);
  const fiveField = parts.length === 6 ? parts.slice(1).join(" ") : parts.join(" ");

  const equivalents: Record<string, string> = {
    "0 0-23/1 * * *": "0 * * * *",
    "*/1 * * * *": "* * * * *",
  };

  const mapped = equivalents[fiveField] || fiveField;
  return mapped.replace(/\b0(\d)\b/g, "$1");
}

function friendlyCron(cron: string): string {
  const fiveField = normalizeCronToFiveField(cron);

  const preset = PRESET_FREQUENCIES.find((p) => p.value === fiveField);
  if (preset) {
    return preset.label;
  }

  const parts = fiveField.split(/\s+/);
  if (parts.length !== 5) {
    return cron;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (dayOfWeek !== "*" && month === "*" && dayOfMonth === "*" && hour !== "*" && minute !== "*") {
    const dayNames: Record<string, string> = {
      "0": "Sunday",
      "1": "Monday",
      "2": "Tuesday",
      "3": "Wednesday",
      "4": "Thursday",
      "5": "Friday",
      "6": "Saturday",
      "7": "Sunday",
    };
    const dayName = dayNames[dayOfWeek] || `day ${dayOfWeek}`;
    return `Weekly ${dayName} at ${formatHourMinute(hour, minute)}`;
  }

  if (month === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    if (hour === "*" && minute.startsWith("*/")) {
      return `Every ${minute.slice(2)} minutes`;
    }
    if (hour === "*" && minute === "0") {
      return "Every hour";
    }
    if (hour.startsWith("*/") && minute === "0") {
      return `Every ${hour.slice(2)} hours`;
    }
    if (hour.includes("-") && minute === "0") {
      return `Hourly (${hour})`;
    }
    if (!hour.includes("*") && !hour.includes("/")) {
      return `Daily at ${formatHourMinute(hour, minute)}`;
    }
  }

  return fiveField;
}

function formatHourMinute(hour: string, minute: string): string {
  const h = Number.parseInt(hour, 10);
  const m = Number.parseInt(minute, 10);
  if (Number.isNaN(h)) {
    return `${hour}:${minute.padStart(2, "0")}`;
  }
  const suffix = h >= 12 ? "pm" : "am";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) {
    return `${displayHour}${suffix}`;
  }
  return `${displayHour}:${String(m).padStart(2, "0")}${suffix}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

const MODULE_COLORS: Record<string, string> = {
  FieldFlow: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  "CV Assistant": "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "Comply SA": "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  "AU Rubber": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "Stock Control": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
  Customers: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "Inbound Email": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  "Secure Docs": "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
};

function currentCronToPresetValue(cronTime: string): string {
  const fiveField = normalizeCronToFiveField(cronTime);
  const match = PRESET_FREQUENCIES.find((p) => p.value === fiveField);
  return match ? match.value : fiveField;
}

function JobRow(props: { job: ScheduledJobDto }) {
  const job = props.job;

  const pauseMutation = usePauseJob();
  const resumeMutation = useResumeJob();
  const frequencyMutation = useUpdateJobFrequency();

  const isMutating =
    pauseMutation.isPending || resumeMutation.isPending || frequencyMutation.isPending;

  const handleToggle = () => {
    if (job.active) {
      pauseMutation.mutate(job.name);
    } else {
      resumeMutation.mutate(job.name);
    }
  };

  const handleFrequencyChange = (newCron: string) => {
    frequencyMutation.mutate({ name: job.name, cronExpression: newCron });
  };

  const moduleColor =
    MODULE_COLORS[job.module] || "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300";

  const currentValue = currentCronToPresetValue(job.cronTime);
  const isCustomCron = !PRESET_FREQUENCIES.some((p) => p.value === currentValue);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${moduleColor}`}>
          {job.module}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium text-gray-900 dark:text-gray-200">{job.description}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500">{job.name}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            job.active
              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
          }`}
        >
          {job.active ? "Active" : "Paused"}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        <select
          value={currentValue}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          disabled={isMutating}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-200"
        >
          {isCustomCron ? (
            <option value={currentValue}>{friendlyCron(job.cronTime)} (custom)</option>
          ) : null}
          {PRESET_FREQUENCIES.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(job.lastExecution)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(job.nextExecution)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        <button
          onClick={handleToggle}
          disabled={isMutating}
          className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
            job.active
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300"
              : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300"
          }`}
        >
          {job.active ? "Pause" : "Resume"}
        </button>
      </td>
    </tr>
  );
}

export default function ScheduledJobsPage() {
  const { data: jobs, isLoading } = useScheduledJobs();

  const sortedJobs = (jobs || []).toSorted((a, b) => a.module.localeCompare(b.module));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Scheduled Jobs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage background cron jobs. Pausing a job prevents it from running until
          resumed. All changes persist across deployments.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                {[
                  "Module",
                  "Description",
                  "Status",
                  "Frequency",
                  "Last Run",
                  "Next Run",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading...
                  </td>
                </tr>
              ) : sortedJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No scheduled jobs found
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job) => <JobRow key={job.name} job={job} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
