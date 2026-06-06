"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { JobCardImportJob } from "@/app/lib/api/stockControlApi";
import { useAcknowledgeImportJob, useActiveImportJobs } from "@/app/lib/query/hooks";
import { useStockControlBranding } from "@/app/stock-control/context/StockControlBrandingContext";

function ImportJobCard(props: {
  job: JobCardImportJob;
  accent: string;
  navbar: string;
  onReview: (job: JobCardImportJob) => void;
  onDismiss: (job: JobCardImportJob) => void;
}) {
  const { job, accent, navbar, onReview, onDismiss } = props;
  const total = job.totalDocuments > 0 ? job.totalDocuments : null;
  const completed = job.completedDocuments;
  const rowCount = job.drawingRows ? job.drawingRows.length : 0;

  const isProcessing = job.status === "processing";
  const isCompleted = job.status === "completed";
  const errorMessage = job.error;

  return (
    <div className="w-80 rounded-lg bg-white shadow-xl ring-1 ring-black/10 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2 text-white"
        style={{ backgroundColor: navbar }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">Drawing import</span>
        {!isProcessing ? (
          <button
            type="button"
            onClick={() => onDismiss(job)}
            aria-label="Dismiss"
            className="text-lg leading-none text-white/70 transition-colors hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-medium text-gray-900" title={job.fileName}>
          {job.fileName}
        </p>

        {isProcessing ? (
          <>
            <p className="mt-1 text-xs text-gray-500">
              {job.currentDocumentName
                ? `Extracting ${job.currentDocumentName}`
                : "Extracting drawings…"}
            </p>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: total ? `${Math.round((completed / total) * 100)}%` : "10%",
                  backgroundColor: accent,
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              {total
                ? `${completed} of ${total} drawings · keeps running while you work`
                : "Starting…"}
            </p>
          </>
        ) : isCompleted ? (
          <>
            <p className="mt-1 text-xs text-emerald-700">
              Ready — {rowCount} {rowCount === 1 ? "item" : "items"} extracted
            </p>
            <button
              type="button"
              onClick={() => onReview(job)}
              className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Review &amp; import
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-red-600">
              {errorMessage || "The import failed. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(job)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ImportJobsBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { colors } = useStockControlBranding();
  const accent = colors.accent;
  const navbar = colors.background;
  const { data: jobs } = useActiveImportJobs(true);
  const ackMutation = useAcknowledgeImportJob();
  // Locally-dismissed jobs vanish immediately on ×: the active-jobs poll stops
  // once nothing is processing, so a completed job would otherwise linger until
  // a refetch that never comes.
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const docRef = globalThis.document;
  if (!docRef) return null;
  // Suppress the banner card for a job the user is already viewing on the import
  // page (its own popup / minimized pill owns the display there) — otherwise the
  // same job shows twice (sticky banner + movable pill).
  const onImportPage = pathname === "/stock-control/portal/job-cards/import";
  const pageJobId = onImportPage ? searchParams.get("jobId") : null;
  const allJobs = jobs ? jobs : [];
  const activeJobs = allJobs.filter(
    (job) => String(job.id) !== pageJobId && !dismissedIds.includes(job.id),
  );
  if (activeJobs.length === 0) return null;

  const reviewJob = (job: JobCardImportJob) => {
    router.push(`/stock-control/portal/job-cards/import?jobId=${job.id}`);
  };
  const dismissJob = (job: JobCardImportJob) => {
    setDismissedIds((prev) => (prev.includes(job.id) ? prev : [...prev, job.id]));
    ackMutation.mutate(job.id);
  };

  return createPortal(
    <div className="fixed bottom-4 left-4 z-[9998] flex flex-col gap-3 print:hidden">
      {activeJobs.map((job) => (
        <ImportJobCard
          key={job.id}
          job={job}
          accent={accent}
          navbar={navbar}
          onReview={reviewJob}
          onDismiss={dismissJob}
        />
      ))}
    </div>,
    docRef.body,
  );
}
