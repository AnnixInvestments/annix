"use client";

import { useCallback, useRef, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

type ViewMode = "drop" | "analyzing" | "review" | "importing" | "done";

interface AnalyzedReport {
  batchName: string;
  pageStart: number;
  pageEnd: number;
  pageCount: number;
  instrumentType: string;
  probeSerial: string | null;
  createdAt: string | null;
  entityType: string;
}

interface ImportedUpload {
  uploadId: number;
  entityType: string;
  instrumentType: string;
  createdAt: string | null;
  pageRange: string;
  autoMatch: { jobCardId: number; jobNumber: string } | null;
}

const ENTITY_LABELS: Record<string, string> = {
  dft: "Coating Thickness (DFT)",
  blast_profile: "Surface Profile",
  shore_hardness: "Shore Hardness",
  environmental: "Environmental",
  unknown: "Unknown",
};

const ENTITY_COLORS: Record<string, string> = {
  dft: "bg-blue-100 text-blue-800",
  blast_profile: "bg-amber-100 text-amber-800",
  shore_hardness: "bg-purple-100 text-purple-800",
  environmental: "bg-green-100 text-green-800",
  unknown: "bg-gray-100 text-gray-800",
};

export default function BundleUploadPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("drop");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [summaryPageCount, setSummaryPageCount] = useState(0);
  const [reports, setReports] = useState<AnalyzedReport[]>([]);
  const [imports, setImports] = useState<ImportedUpload[]>([]);
  const [importStats, setImportStats] = useState<{
    found: number;
    imported: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setViewMode("analyzing");
    setError(null);

    try {
      const result = await stockControlApiClient.analyzeBundlePdf(selectedFile);
      setTotalPages(result.totalPages);
      setSummaryPageCount(result.summaryPageCount);
      setReports(result.reports);
      setViewMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setViewMode("drop");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setViewMode("importing");
    setError(null);

    try {
      const result = await stockControlApiClient.importBundlePdf(file);
      setImports(result.uploads);
      setImportStats({
        found: result.reportsFound,
        imported: result.reportsImported,
      });
      setViewMode("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setViewMode("review");
    }
  }, [file]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((f) => f.type === "application/pdf");
      if (pdfFile) {
        handleAnalyze(pdfFile);
      }
    },
    [handleAnalyze],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) {
        handleAnalyze(selected);
      }
    },
    [handleAnalyze],
  );

  const handleReset = () => {
    setViewMode("drop");
    setFile(null);
    setError(null);
    setReports([]);
    setImports([]);
    setImportStats(null);
    setTotalPages(0);
    setSummaryPageCount(0);
  };

  const typeCounts = reports.reduce<Record<string, number>>((acc, r) => {
    return { ...acc, [r.entityType]: (acc[r.entityType] || 0) + 1 };
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bundle Upload</h1>
        {viewMode !== "drop" && (
          <button
            onClick={handleReset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Start Over
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Upload a multi-report PosiTector PDF (e.g. a PosiSoft Desktop batch export). The system will
        identify individual reports and import them separately.
      </p>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {viewMode === "drop" && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed py-16 text-center transition-colors ${
            isDragOver
              ? "border-teal-500 bg-teal-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">
            Drop a PosiTector bundle PDF here
          </p>
          <p className="mt-1 text-sm text-gray-500">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {viewMode === "analyzing" && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-teal-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">Analyzing PDF bundle...</p>
          <p className="mt-1 text-sm text-gray-500">
            Scanning pages and identifying individual reports
          </p>
          {file && <p className="mt-2 text-xs text-gray-400">{file.name}</p>}
        </div>
      )}

      {viewMode === "importing" && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-teal-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">
            Importing {reports.length} reports...
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Splitting PDF, parsing readings, and storing each report
          </p>
        </div>
      )}

      {viewMode === "review" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Found {reports.length} individual reports across {totalPages} pages
            </p>
            {summaryPageCount > 0 && (
              <p className="mt-1 text-xs text-green-600">
                Pages 1-{summaryPageCount} are a combined summary and will be skipped
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {Object.entries(typeCounts).map(([type, count]) => {
              const colorClass = ENTITY_COLORS[type] || ENTITY_COLORS.unknown;
              const label = ENTITY_LABELS[type] || type;
              return (
                <div key={type} className={`rounded-lg px-4 py-3 text-center ${colorClass}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium">{label}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Batch
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Type
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Instrument
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Pages
                    </th>
                    <th className="hidden sm:table-cell px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports.map((r, idx) => {
                    const colorClass = ENTITY_COLORS[r.entityType] || ENTITY_COLORS.unknown;
                    const label = ENTITY_LABELS[r.entityType] || r.entityType;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-gray-900">
                          {r.batchName}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-gray-500">
                          {r.instrumentType}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-gray-500">
                          {r.pageStart === r.pageEnd
                            ? `p${r.pageStart}`
                            : `p${r.pageStart}-${r.pageEnd}`}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-gray-500">
                          {r.createdAt || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Import All {reports.length} Reports
            </button>
          </div>
        </div>
      )}

      {viewMode === "done" && importStats && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Successfully imported {importStats.imported} of {importStats.found} reports
            </p>
            {imports.filter((u) => u.autoMatch).length > 0 && (
              <p className="mt-1 text-xs text-green-600">
                {imports.filter((u) => u.autoMatch).length} report(s) auto-linked to job cards
              </p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Pages
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Created
                    </th>
                    <th className="px-3 py-2 text-left font-medium uppercase text-gray-500">
                      Auto-Linked
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {imports.map((u) => {
                    const colorClass = ENTITY_COLORS[u.entityType] || ENTITY_COLORS.unknown;
                    const label = ENTITY_LABELS[u.entityType] || u.entityType;
                    return (
                      <tr key={u.uploadId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                          p{u.pageRange}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
                          >
                            {label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                          {u.createdAt || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {u.autoMatch ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              {u.autoMatch.jobNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unlinked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleReset}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Upload Another Bundle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
