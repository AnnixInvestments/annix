"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type { SeekerApplication, SeekerApplicationStatus } from "@/app/lib/api/annixOrbitApi";
import { metricsApi } from "@/app/lib/api/metricsApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useOrbitCreateSeekerEmployment,
  useOrbitDeleteSeekerApplication,
  useOrbitReactivateJobSearch,
  useOrbitSeekerApplications,
  useOrbitSeekerEmployment,
  useOrbitUpdateSeekerApplication,
} from "@/app/lib/query/hooks";

const APPLICATIONS_PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: SeekerApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "rejected", label: "Rejected" },
  { value: "offer", label: "Offer" },
  { value: "accepted", label: "Accepted" },
];

const STATUS_CLASS: Record<SeekerApplicationStatus, string> = {
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  interviewing: "bg-amber-50 text-amber-800 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accepted: "bg-violet-50 text-violet-700 border-violet-200",
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
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const query = useOrbitSeekerApplications();
  const updateMutation = useOrbitUpdateSeekerApplication();
  const deleteMutation = useOrbitDeleteSeekerApplication();
  const employmentQuery = useOrbitSeekerEmployment();
  const reactivateMutation = useOrbitReactivateJobSearch();
  const employmentData = employmentQuery.data;
  const employmentRecords = employmentData ? employmentData : [];
  const hasPendingEmployment = employmentRecords.some(
    (record) => record.researchStatus === "pending",
  );

  const handleReactivate = async () => {
    const stats = await metricsApi
      .extractionStats("orbit-company-research", "employment")
      .catch(() => null);
    const averageMs = stats?.averageMs;
    const estimatedDurationMs = averageMs || 15000;
    showExtraction({
      brand: "annix-orbit",
      label: "Nix is researching your employer and updating your CV…",
      estimatedDurationMs,
    });
    try {
      const result = await reactivateMutation.mutateAsync();
      hideExtraction();
      const count = result.refreshed;
      if (count > 0) {
        showToast(`Updated your CV with ${count} role${count === 1 ? "" : "s"}.`, "success");
      } else {
        showToast("Your CV is already up to date.", "info");
      }
    } catch {
      hideExtraction();
      showToast("Couldn't refresh your CV right now — please try again.", "error");
    }
  };
  const data = query.data;
  const applications = data || [];
  const [activeTab, setActiveTab] = useState<SeekerApplicationStatus>("applied");
  const [visibleCount, setVisibleCount] = useState(APPLICATIONS_PAGE_SIZE);
  const tabApplications = applications.filter((application) => application.status === activeTab);
  const visibleApplications = tabApplications.slice(0, visibleCount);
  const hasMore = tabApplications.length > visibleCount;
  const handleShowMore = () => setVisibleCount((current) => current + APPLICATIONS_PAGE_SIZE);

  const activeOption = STATUS_OPTIONS.find((option) => option.value === activeTab);
  const activeLabel = activeOption ? activeOption.label : "";

  const handleTabChange = (status: SeekerApplicationStatus) => {
    setActiveTab(status);
    setVisibleCount(APPLICATIONS_PAGE_SIZE);
  };

  const [acceptingApp, setAcceptingApp] = useState<SeekerApplication | null>(null);

  const handleAcceptSaved = (application: SeekerApplication) => {
    updateMutation.mutate(
      { id: application.id, input: { status: "accepted" } },
      {
        onSuccess: () => showToast("Marked as accepted — congratulations!", "success"),
        onError: () => showToast("Couldn't update the status — please try again", "error"),
      },
    );
    setAcceptingApp(null);
  };

  const handleStatusChange = (application: SeekerApplication, status: SeekerApplicationStatus) => {
    if (status === "accepted") {
      setAcceptingApp(application);
      return;
    }
    updateMutation.mutate(
      { id: application.id, input: { status } },
      {
        onSuccess: () => showToast("Status updated", "success"),
        onError: () => showToast("Couldn't update the status — please try again", "error"),
      },
    );
    if (status === "interviewing") {
      const company = application.company ? application.company : "";
      const params = new URLSearchParams({
        newInterviewFor: String(application.id),
        company,
        role: application.title,
      });
      router.push(`/annix/orbit/seeker/calendar?${params.toString()}`);
    }
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

      {hasPendingEmployment ? (
        <div className="bg-white rounded-xl border border-[var(--brand-navbar-100,#e0e0f5)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Looking for work again?</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Let Nix research your recent employer and add the role to your CV, so it's ready for
              your next search.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReactivate}
            disabled={reactivateMutation.isPending}
            className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
          >
            {reactivateMutation.isPending ? "Refreshing…" : "Refresh my CV"}
          </button>
        </div>
      ) : null}

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
            className="inline-block mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const count = applications.filter((app) => app.status === option.value).length;
              const isActive = activeTab === option.value;
              const tabClass = isActive
                ? "bg-[var(--brand-navbar,#323288)] text-white border-transparent"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
              const badgeClass = isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600";
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTabChange(option.value)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${tabClass}`}
                >
                  {option.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {tabApplications.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
              No applications marked “{activeLabel}” yet.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleApplications.map((application) => {
                const mutatingVars = updateMutation.variables;
                const statusPending =
                  updateMutation.isPending &&
                  mutatingVars?.id === application.id &&
                  mutatingVars.input.status !== undefined;
                return (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    statusPending={statusPending}
                    onStatusChange={handleStatusChange}
                    onNotesSave={handleNotesSave}
                    onDelete={handleDelete}
                  />
                );
              })}
              {hasMore ? (
                <button
                  type="button"
                  onClick={handleShowMore}
                  className="w-full py-3 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Show more ({visibleApplications.length} of {tabApplications.length})
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
      {acceptingApp ? (
        <AcceptEmploymentModal
          application={acceptingApp}
          onClose={() => setAcceptingApp(null)}
          onSaved={() => handleAcceptSaved(acceptingApp)}
        />
      ) : null}
      {ConfirmDialog}
    </div>
  );
}

function AcceptEmploymentModal(props: {
  application: SeekerApplication;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const createMutation = useOrbitCreateSeekerEmployment();
  const app = props.application;
  const appCompany = app.company;
  const [startDate, setStartDate] = useState("");
  const [employerName, setEmployerName] = useState(appCompany ? appCompany : "");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [roleTitle, setRoleTitle] = useState(app.title);
  const [roleOutline, setRoleOutline] = useState("");

  const handleSubmit = async () => {
    const trimmedEmployer = employerName.trim();
    const trimmedRole = roleTitle.trim();
    if (!startDate) {
      showToast("Add your start date.", "error");
      return;
    }
    if (!trimmedEmployer) {
      showToast("Add the employer name.", "error");
      return;
    }
    if (!trimmedRole) {
      showToast("Add the role title.", "error");
      return;
    }
    try {
      await createMutation.mutateAsync({
        applyClickId: app.id,
        externalJobId: app.externalJobId,
        employerName: trimmedEmployer,
        companyWebsiteUrl: websiteUrl.trim() ? websiteUrl.trim() : null,
        roleTitle: trimmedRole,
        roleOutline: roleOutline.trim() ? roleOutline.trim() : null,
        startDate,
      });
      showToast("Saved your new role", "success");
      props.onSaved();
    } catch {
      showToast("Couldn't save the role — please try again", "error");
    }
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-navbar-100,#e0e0f5)] focus:border-transparent";

  return (
    <FormModal
      isOpen={true}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title="You took the job — congratulations!"
      submitLabel="Save my new role"
      loading={createMutation.isPending}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          We'll keep this on file so your CV stays up to date. When you next look for work, Nix can
          research the company and add this role to your CV automatically.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-700">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Employer</span>
            <input
              type="text"
              value={employerName}
              onChange={(e) => setEmployerName(e.target.value)}
              placeholder="Company name"
              className={inputClass}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-gray-700">Role title</span>
          <input
            type="text"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            placeholder="e.g. Management Accountant"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Company website (optional)</span>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://company.co.za"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">What will you be doing? (optional)</span>
          <textarea
            value={roleOutline}
            onChange={(e) => setRoleOutline(e.target.value)}
            rows={3}
            placeholder="A short outline of your responsibilities in this role…"
            className={inputClass}
          />
        </label>
      </div>
    </FormModal>
  );
}

interface ApplicationCardProps {
  application: SeekerApplication;
  statusPending: boolean;
  onStatusChange: (application: SeekerApplication, status: SeekerApplicationStatus) => void;
  onNotesSave: (id: number, notes: string) => void;
  onDelete: (application: SeekerApplication) => void;
}

function ApplicationCard(props: ApplicationCardProps) {
  const app = props.application;
  const appNotes = app.notes;
  const savedNotes = appNotes || "";
  const [notes, setNotes] = useState(savedNotes);
  const notesFocused = useRef(false);

  useEffect(() => {
    if (notesFocused.current) return;
    setNotes((current) => (current === savedNotes ? current : savedNotes));
  }, [savedNotes]);

  const company = app.company;
  const location = app.location;
  const sourceUrl = app.sourceUrl;
  const appliedAt = app.appliedAt;
  const companyLabel = company || "Company not listed";
  const salaryLabel = formatSalary(app.salaryMin, app.salaryMax, app.salaryCurrency);
  const statusClass = STATUS_CLASS[app.status];

  const commitNotes = () => {
    notesFocused.current = false;
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
            aria-label={`Status for ${app.title}`}
            value={app.status}
            disabled={props.statusPending}
            onChange={(e) => props.onStatusChange(app, e.target.value as SeekerApplicationStatus)}
            className={`text-sm font-medium rounded-lg border px-2.5 py-1.5 disabled:opacity-60 ${statusClass}`}
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
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
            >
              View
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => props.onDelete(app)}
            title="Remove from my applications"
            aria-label={`Remove ${app.title} from my applications`}
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
        onFocus={() => {
          notesFocused.current = true;
        }}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={commitNotes}
        placeholder="Add a note — interview date, contact person, reference number…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
      />
    </div>
  );
}
