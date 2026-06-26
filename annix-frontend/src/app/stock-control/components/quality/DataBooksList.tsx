"use client";

import { useState } from "react";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import { metricsApi } from "@/app/lib/api/metricsApi";
import {
  useCompileDataBook,
  useDataBookStatuses,
  useDownloadDataBook,
  useJobCards,
} from "@/app/lib/query/hooks";

const DATA_BOOK_COMPILE_FALLBACK_MS = 45000;

export function DataBooksList() {
  const jobCardsQuery = useJobCards("active");
  const jobCardsData = jobCardsQuery.data;
  const jobCards = jobCardsData ? jobCardsData : [];
  const isLoading = jobCardsQuery.isLoading;
  const ids = jobCards.map((jc) => jc.id);
  const statusesQuery = useDataBookStatuses(ids);
  const statusesData = statusesQuery.data;
  const statuses = statusesData ? statusesData : {};
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [compilingId, setCompilingId] = useState<number | null>(null);
  const compileDataBookMutation = useCompileDataBook();
  const downloadDataBookMutation = useDownloadDataBook();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { showToast } = useToast();
  const pdfPreview = usePdfPreview();

  const query = searchQuery.trim().toLowerCase();
  const filteredJobCards = query
    ? jobCards.filter((jc) => {
        const jobNumber = jc.jobNumber;
        const jobName = jc.jobName;
        const customerName = jc.customerName;
        const jobNumberStr = jobNumber == null ? "" : jobNumber;
        const jobNameStr = jobName == null ? "" : jobName;
        const customerStr = customerName == null ? "" : customerName;
        return (
          jobNumberStr.toLowerCase().includes(query) ||
          jobNameStr.toLowerCase().includes(query) ||
          customerStr.toLowerCase().includes(query)
        );
      })
    : jobCards;

  const handleCompile = async (jobCardId: number) => {
    try {
      setCompilingId(jobCardId);
      const stats = await metricsApi
        .extractionStats("stock-control-data-books", "compile")
        .catch(() => null);
      const learnedMs = stats == null ? null : stats.averageMs;
      const estimatedDurationMs =
        learnedMs == null || learnedMs <= 0 ? DATA_BOOK_COMPILE_FALLBACK_MS : learnedMs;
      showExtraction({
        brand: "stock-control",
        label: "Compiling data book…",
        estimatedDurationMs,
      });
      const result = await compileDataBookMutation.mutateAsync(jobCardId);
      await statusesQuery.refetch();
      showToast(
        `Data book compiled with ${result.certificateCount} certificate${
          result.certificateCount === 1 ? "" : "s"
        }`,
        "success",
      );
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to compile data book"));
    } finally {
      hideExtraction();
      setCompilingId(null);
    }
  };

  const handleDownload = (jobCardId: number) => {
    pdfPreview.openWithFetch(
      () => downloadDataBookMutation.mutateAsync(jobCardId),
      `DataBook-JC${jobCardId}.pdf`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search by job number, name, or customer…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 text-sm"
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading job cards...</div>
      ) : jobCards.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No active job cards found</p>
          <p className="mt-1 text-sm text-gray-400">
            Create a job card and link certificates to compile a data book
          </p>
        </div>
      ) : filteredJobCards.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No job cards match your search</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Job Number
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Job Name
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Certificates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Data Book
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJobCards.map((jc) => {
                const status = statuses[jc.id];
                const customerName = jc.customerName;
                return (
                  <tr key={jc.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--sc-primary-hover,#252560)]">
                      {jc.jobNumber}
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {jc.jobName}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {customerName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {status?.certificateCount ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {status.certificateCount} cert{status.certificateCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {status?.exists && !status.isStale ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Compiled
                        </span>
                      ) : status?.exists && status.isStale ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Stale
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not compiled</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleCompile(jc.id)}
                        disabled={compilingId === jc.id || !status?.certificateCount}
                        className="mr-2 text-[var(--sc-primary,#323288)] hover:text-[var(--sc-primary-active,#1c1c48)] disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        {compilingId === jc.id
                          ? "Compiling..."
                          : status?.exists
                            ? "Recompile"
                            : "Compile"}
                      </button>
                      {status?.exists ? (
                        <button
                          onClick={() => handleDownload(jc.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Download
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
