"use client";

import { useToast } from "@/app/components/Toast";
import { providerBadgeLabel } from "@/app/lib/annix-orbit/provider-labels";
import type { OrbitDelistReport } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  useAdminConfirmOrbitDelist,
  useAdminOrbitDelistReports,
  useAdminRejectOrbitDelist,
} from "@/app/lib/query/hooks";

export default function OrbitDelistReportsPage() {
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const reportsQuery = useAdminOrbitDelistReports();
  const confirmDelist = useAdminConfirmOrbitDelist();
  const rejectDelist = useAdminRejectOrbitDelist();

  const reportsData = reportsQuery.data;
  const reports = reportsData || [];
  const isLoading = reportsQuery.isLoading;

  const handleConfirm = async (report: OrbitDelistReport) => {
    const confirmed = await confirm({
      title: "Remove this job for everyone?",
      message:
        "Confirm only if the job has genuinely been delisted on the source site. It will be removed from matches, browse and cold-start for every seeker.",
      confirmLabel: "Confirm delisted",
      variant: "danger",
    });
    if (!confirmed) return;
    confirmDelist.mutate(report.id, {
      onSuccess: () => showToast("Job removed for all seekers.", "success"),
      onError: () => showToast("Couldn't confirm — please try again.", "error"),
    });
  };

  const handleReject = (report: OrbitDelistReport) => {
    rejectDelist.mutate(report.id, {
      onSuccess: () => showToast("Marked as still listed — kept live.", "success"),
      onError: () => showToast("Couldn't update — please try again.", "error"),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delist reports</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Jobs that seekers reported as taken down on the source site. Open each one to verify, then
          confirm to remove it for everyone, or keep it live if it's still listed.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-500">
          Loading reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No reports to review
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
            When a seeker reports a job as delisted, it appears here for you to verify and confirm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {reports.map((report) => (
            <DelistReportCard
              key={report.id}
              report={report}
              onConfirm={handleConfirm}
              onReject={handleReject}
              busy={
                (confirmDelist.isPending && confirmDelist.variables === report.id) ||
                (rejectDelist.isPending && rejectDelist.variables === report.id)
              }
            />
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

function DelistReportCard(props: {
  report: OrbitDelistReport;
  onConfirm: (report: OrbitDelistReport) => void;
  onReject: (report: OrbitDelistReport) => void;
  busy: boolean;
}) {
  const report = props.report;
  const busy = props.busy;
  const company = report.company;
  const locationRaw = report.locationRaw;
  const locationArea = report.locationArea;
  const location = locationRaw || locationArea || null;
  const providerLabel = providerBadgeLabel(report.sourceProvider);
  const salaryLabel = formatSalary(report.salaryMin, report.salaryMax, report.salaryCurrency);
  const sourceUrl = report.sourceUrl;
  const sourceHref = sourceUrl || "#";
  const reportedAt = report.delistReportedAt;
  const reportedAtLabel = reportedAt ? formatDateZA(reportedAt) : null;
  const reportedByRaw = report.delistReportedBy;
  const reportedBy = reportedByRaw || "a seeker";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {report.title}
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
            {company ? <span>{company}</span> : null}
            {location ? <span>· {location}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {providerLabel ? <span className="text-xs text-gray-500">{providerLabel}</span> : null}
          {salaryLabel ? (
            <span className="text-sm font-medium text-emerald-700">{salaryLabel}</span>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Reported by {reportedBy}
        {reportedAtLabel ? ` on ${reportedAtLabel}` : null}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => props.onConfirm(report)}
            disabled={busy}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm delisted
          </button>
          <button
            type="button"
            onClick={() => props.onReject(report)}
            disabled={busy}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Still listed
          </button>
        </div>
        {sourceUrl ? (
          <a
            href={sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navbar,#323288)] text-white hover:bg-[var(--brand-navbar-active,#252560)]"
          >
            View &amp; apply
          </a>
        ) : (
          <span className="text-sm text-gray-400">No source link</span>
        )}
      </div>
    </div>
  );
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const symbol = currency === "ZAR" ? "R" : currency ? `${currency} ` : "";
  if (min != null && max != null) {
    return `${symbol}${formatThousands(min)} - ${symbol}${formatThousands(max)}`;
  }
  if (min != null) return `From ${symbol}${formatThousands(min)}`;
  if (max != null) return `Up to ${symbol}${formatThousands(max)}`;
  return null;
}

function formatThousands(n: number): string {
  return Math.round(n).toLocaleString("en-ZA");
}
