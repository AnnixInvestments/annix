"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { SeekerApplication, SeekerApplicationStatus } from "@/app/lib/api/annixOrbitApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitDeleteSeekerApplication,
  useOrbitSeekerApplications,
  useOrbitUpdateSeekerApplication,
} from "@/app/lib/query/hooks";

const STATUS_OPTIONS: { value: SeekerApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "rejected", label: "Rejected" },
  { value: "offer", label: "Offer" },
];

const STATUS_CLASS: Record<SeekerApplicationStatus, string> = {
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  interviewing: "bg-amber-50 text-amber-800 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const isRand = currency != null && currency.toUpperCase() === "ZAR";
  const prefix = isRand ? "R" : currency ? `${currency} ` : "";
  const fmt = (value: number) => `${prefix}${Math.round(value).toLocaleString()}`;
  if (min != null && max != null) {
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }
  const single = min != null ? min : max;
  return single != null ? fmt(single) : null;
}

export default function SeekerApplicationsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const query = useOrbitSeekerApplications();
  const updateMutation = useOrbitUpdateSeekerApplication();
  const deleteMutation = useOrbitDeleteSeekerApplication();
  const data = query.data;
  const applications = data || [];

  const handleStatusChange = (id: number, status: SeekerApplicationStatus) => {
    updateMutation.mutate(
      { id, input: { status } },
      { onError: () => showToast("Couldn't update the status — please try again", "error") },
    );
  };

  const handleNotesSave = (id: number, notes: string) => {
    updateMutation.mutate(
      { id, input: { notes } },
      { onError: () => showToast("Couldn't save your note — please try again", "error") },
    );
  };

  const handleDelete = async (application: SeekerApplication) => {
    const confirmed = await confirm({
      title: "Remove this application?",
      message: `"${application.title}" will be removed from your applications list.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteMutation.mutate(application.id, {
      onSuccess: () => showToast("Application removed", "success"),
      onError: () => showToast("Couldn't remove the application", "error"),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Applications</h1>
        <p className="text-white/70 mt-2">Track jobs you have applied to and their status.</p>
      </div>

      {query.isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading your applications…
        </div>
      ) : query.isError ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-red-700">
          We couldn't load your applications right now. Try refreshing the page.
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No applications yet</h2>
          <p className="text-gray-600 mt-2 max-w-md mx-auto">
            When you open a job with “View &amp; apply” on Browse Jobs, it’ll show up here so you
            can track its status and keep your own notes.
          </p>
          <Link
            href="/annix/orbit/seeker/jobs"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onStatusChange={handleStatusChange}
              onNotesSave={handleNotesSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

interface ApplicationCardProps {
  application: SeekerApplication;
  onStatusChange: (id: number, status: SeekerApplicationStatus) => void;
  onNotesSave: (id: number, notes: string) => void;
  onDelete: (application: SeekerApplication) => void;
}

function ApplicationCard(props: ApplicationCardProps) {
  const app = props.application;
  const appNotes = app.notes;
  const initialNotes = appNotes || "";
  const [notes, setNotes] = useState(initialNotes);

  const company = app.company;
  const location = app.location;
  const sourceUrl = app.sourceUrl;
  const appliedAt = app.appliedAt;
  const companyLabel = company || "Company not listed";
  const salaryLabel = formatSalary(app.salaryMin, app.salaryMax, app.salaryCurrency);
  const statusClass = STATUS_CLASS[app.status];

  const commitNotes = () => {
    const savedNotes = appNotes || "";
    if (notes !== savedNotes) {
      props.onNotesSave(app.id, notes);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{app.title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {companyLabel}
            {location ? ` · ${location}` : ""}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Applied {appliedAt ? formatDateZA(appliedAt) : "recently"}
            {salaryLabel ? ` · ${salaryLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={app.status}
            onChange={(e) =>
              props.onStatusChange(app.id, e.target.value as SeekerApplicationStatus)
            }
            className={`text-sm font-medium rounded-lg border px-2.5 py-1.5 ${statusClass}`}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              View
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => props.onDelete(app)}
            title="Remove from my applications"
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={commitNotes}
        placeholder="Add a note — interview date, contact person, reference number…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
      />
    </div>
  );
}
