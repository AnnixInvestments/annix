"use client";

import { useState } from "react";
import type { ScheduledJobDto } from "@/app/lib/api/adminApi";
import {
  usePauseJob,
  useResumeJob,
  useScheduledJobs,
  useUpdateJobFrequency,
} from "@/app/lib/query/hooks";

const PRESET_FREQUENCIES = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 min", value: "*/5 * * * *" },
  { label: "Every 10 min", value: "*/10 * * * *" },
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 2 hours", value: "0 */2 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily 2am", value: "0 2 * * *" },
  { label: "Daily 3am", value: "0 3 * * *" },
];

function friendlyCron(cron: string): string {
  const map: Record<string, string> = {
    "* * * * *": "Every minute",
    "*/5 * * * *": "Every 5 min",
    "*/10 * * * *": "Every 10 min",
    "*/30 * * * *": "Every 30 min",
    "0 * * * *": "Every hour",
    "0 */2 * * *": "Every 2 hours",
    "0 */6 * * *": "Every 6 hours",
    "0 2 * * *": "Daily 2am",
    "0 3 * * *": "Daily 3am",
    "0 5 * * *": "Daily 5am",
    "0 6 * * *": "Daily 6am",
    "0 7 * * *": "Daily 7am",
    "0 8 * * *": "Daily 8am",
    "0 9 * * *": "Daily 9am",
  };
  return map[cron] || cron;
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

function JobRow(props: { job: ScheduledJobDto }) {
  const job = props.job;
  const [editingFrequency, setEditingFrequency] = useState(false);
  const [selectedCron, setSelectedCron] = useState(job.cronTime);

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

  const handleSaveFrequency = () => {
    frequencyMutation.mutate(
      { name: job.name, cronExpression: selectedCron },
      {
        onSuccess: () => setEditingFrequency(false),
      },
    );
  };

  const moduleColor =
    MODULE_COLORS[job.module] || "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300";

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
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {editingFrequency ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedCron}
              onChange={(e) => setSelectedCron(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {PRESET_FREQUENCIES.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveFrequency}
              disabled={isMutating}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingFrequency(false);
                setSelectedCron(job.cronTime);
              }}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingFrequency(true)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {friendlyCron(job.cronTime)}
          </button>
        )}
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
          resumed. Frequency changes take effect immediately but reset on deploy.
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
