"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  PositectorImportResult,
  PositectorUploadResponse,
} from "@/app/lib/api/stockControlApi";
import {
  useAnalyzeBundlePdf,
  useImportBundlePdf,
  useLinkPositectorUpload,
  usePositectorUploadDownloadUrl,
  useUploadPositectorFile,
} from "@/app/lib/query/hooks";

const FORMAT_LABELS: Record<string, string> = {
  positector_json: "PosiTector JSON",
  positector_csv: "PosiTector CSV (readings.txt)",
  posisoft_csv: "PosiSoft Desktop CSV Export",
  posisoft_pdf: "PosiSoft Desktop PDF Report",
  pasted_text: "Pasted Text Data",
  unknown: "Unknown",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  dft: "DFT Reading",
  blast_profile: "Blast Profile",
  shore_hardness: "Shore Hardness",
  environmental: "Environmental",
  pull_test: "Pull Test",
  unknown: "Unknown",
};

interface BundleAnalysis {
  file: File;
  totalPages: number;
  summaryPageCount: number;
  reports: Array<{
    batchName: string;
    pageStart: number;
    pageEnd: number;
    pageCount: number;
    instrumentType: string;
    probeSerial: string | null;
    createdAt: string | null;
    entityType: string;
  }>;
}

interface BundleImportResult {
  reportsFound: number;
  reportsImported: number;
  uploads: Array<{
    uploadId: number;
    entityType: string;
    instrumentType: string;
    createdAt: string | null;
    pageRange: string;
    autoMatch: { jobCardId: number; jobNumber: string } | null;
  }>;
}

const BUNDLE_ENTITY_LABELS: Record<string, string> = {
  dft: "Coating Thickness (DFT)",
  blast_profile: "Surface Profile",
  shore_hardness: "Shore Hardness",
  environmental: "Environmental",
  unknown: "Unknown",
};

const BUNDLE_ENTITY_COLORS: Record<string, string> = {
  dft: "bg-blue-100 text-blue-800",
  blast_profile: "bg-amber-100 text-amber-800",
  shore_hardness: "bg-purple-100 text-purple-800",
  environmental: "bg-green-100 text-green-800",
  unknown: "bg-gray-100 text-gray-800",
};

export default function PositectorUploadPage() {
  const router = useRouter();
  const uploadFileMutation = useUploadPositectorFile();
  const analyzeBundleMutation = useAnalyzeBundlePdf();
  const importBundleMutation = useImportBundlePdf();
  const downloadUrlMutation = usePositectorUploadDownloadUrl();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResponse, setUploadResponse] = useState<PositectorUploadResponse | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importResult, setImportResult] = useState<PositectorImportResult | null>(null);
  const [bundleAnalysis, setBundleAnalysis] = useState<BundleAnalysis | null>(null);
  const [bundleImporting, setBundleImporting] = useState(false);
  const [bundleResult, setBundleResult] = useState<BundleImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfPreview = usePdfPreview();

  const validExtensions = [".json", ".csv", ".txt", ".pdf"];

  const isValidFile = (file: File): boolean => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    return validExtensions.includes(ext);
  };

  const processTextData = useCallback(async (text: string, sourceName: string) => {
    const trimmed = text.trim().replace(/\r/g, "");
    const singleLine = !trimmed.includes("\n");
    const looksLikeBatchName =
      singleLine &&
      trimmed.length < 30 &&
      (/^[A-Za-z]{0,3}\d{1,6}$/.test(trimmed) || /^B\d+/i.test(trimmed));
    if (looksLikeBatchName) {
      setError(
        `Batch "${trimmed}" detected, but PosiSoft Desktop only sends the batch name when dragging from the tree — not the readings.\n\nTo upload this batch:\n1. In PosiSoft Desktop, select batch ${trimmed}\n2. Click File → Export (or right-click → Export)\n3. Save as CSV\n4. Drag or upload the exported CSV file here`,
      );
      return;
    }

    const normalized = text.includes("\t")
      ? text
          .split("\n")
          .map((line) => line.split("\t").join(","))
          .join("\n")
      : text;

    const lines = normalized
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0);

    const hasNumericData = lines.some((line) => /\d+[,\t]\s*\d+/.test(line));
    if (lines.length < 1 || (!hasNumericData && lines.length < 2)) {
      setError(
        "Dragged data does not contain readings. Export the batch from PosiSoft Desktop as CSV (File → Export) and upload the file here.",
      );
      return;
    }

    const csvContent =
      hasNumericData && !normalized.includes("reading") && !normalized.includes("thickness")
        ? `reading,thickness,time\n${normalized}`
        : normalized;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], `${sourceName}.csv`, { type: "text/csv" });

    try {
      setIsUploading(true);
      setError(null);
      setUploadResponse(null);
      setImportResult(null);

      const result = await uploadFileMutation.mutateAsync(file);
      setUploadResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse pasted data");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!isValidFile(file)) {
      setError(`Invalid file type. Accepted: ${validExtensions.join(", ")}`);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadResponse(null);
      setImportResult(null);
      setBundleAnalysis(null);
      setBundleResult(null);

      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const analysis = await analyzeBundleMutation.mutateAsync(file);
        if (analysis.reports.length > 1) {
          setBundleAnalysis({ file, ...analysis });
          setIsUploading(false);
          return;
        }
      }

      const result = await uploadFileMutation.mutateAsync(file);
      setUploadResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleBundleImport = useCallback(async () => {
    if (!bundleAnalysis) return;
    try {
      setBundleImporting(true);
      setError(null);
      const result = await importBundleMutation.mutateAsync(bundleAnalysis.file);
      setBundleResult(result);
      setBundleAnalysis(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bundle import failed");
    } finally {
      setBundleImporting(false);
    }
  }, [bundleAnalysis]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
      return;
    }

    const textData =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text") ||
      e.dataTransfer.getData("text/csv") ||
      e.dataTransfer.getData("text/tab-separated-values") ||
      e.dataTransfer.getData("text/unicode");

    if (textData && textData.trim().length > 0) {
      processTextData(textData, "posisoft-drag");
      return;
    }

    const htmlData = e.dataTransfer.getData("text/html");
    if (htmlData && htmlData.trim().length > 0) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlData;
      const textContent = tempDiv.textContent;
      const plainFromHtml = textContent || tempDiv.innerText || "";
      if (plainFromHtml.trim().length > 0) {
        processTextData(plainFromHtml, "posisoft-drag");
        return;
      }
    }

    setError(
      "Could not read data from PosiSoft Desktop drag. Please export the batch as a CSV or JSON file from PosiSoft Desktop (Export menu) and upload it here.",
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = "";
  };

  const handleClear = () => {
    setUploadResponse(null);
    setImportResult(null);
    setShowImportForm(false);
    setError(null);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (uploadResponse || showImportForm) return;

      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        processFile(files[0]);
        return;
      }

      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim().length > 0) {
        processTextData(text, "clipboard-paste");
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [uploadResponse, showImportForm, processFile, processTextData]);

  const handleClose = () => {
    router.push("/stock-control/portal/quality");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="space-y-6">
          <div className="pr-8">
            <h1 className="text-xl font-bold text-gray-900">PosiTector Data Dump</h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload PosiTector files — data is permanently stored in S3 and the database. If a
              matching batch number exists on a job card, readings are auto-imported. Otherwise,
              they will be imported automatically when the batch number is later entered on a job
              card.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div
              className={`rounded-md p-4 ${importResult.duplicateWarning ? "bg-amber-50" : "bg-green-50"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Imported {importResult.readingsImported} readings as {(() => {
                      const etl = ENTITY_TYPE_LABELS[importResult.entityType];
                      return etl ? etl : importResult.entityType;
                    })()}
                    {importResult.average !== null && ` (avg: ${importResult.average.toFixed(1)})`}
                  </p>
                  {importResult.duplicateWarning && (
                    <p className="mt-1 text-xs text-amber-700">
                      Warning: Readings for this type and date already exist on this job card
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {!uploadResponse && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {isUploading ? (
                <p className="text-sm text-gray-500">Uploading and storing data...</p>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  <p className="mt-4 text-sm font-medium text-gray-900">
                    Drop a PosiTector file here, or click to browse
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    All data is permanently stored — original file in S3, parsed readings in the
                    database
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Supports: JSON, CSV (readings.txt), PosiSoft Desktop CSV, PosiSoft PDF reports
                  </p>
                  <p className="mt-3 text-xs text-gray-400">
                    You can also drag data directly from PosiSoft Desktop or paste from clipboard
                    (Ctrl+V)
                  </p>
                </>
              )}
            </div>
          )}

          {uploadResponse &&
            (() => {
              const upload = uploadResponse.upload;
              const uploadBatchName = upload.batchName;
              const uploadProbeType = upload.probeType;
              const uploadEntityType = upload.entityType;
              const uploadFilename = upload.originalFilename;
              const uploadReadingCount = upload.readingCount;
              const detectedFormat = uploadResponse.detectedFormat;
              const autoMatch = uploadResponse.autoMatch;
              const autoResult = uploadResponse.autoImportResult;
              const isLinked = upload.linkedJobCardId !== null;

              return (
                <div className="space-y-4">
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          Data permanently stored
                        </p>
                        <p className="mt-1 text-xs text-green-700">
                          Original file saved to S3, {uploadReadingCount} readings saved to database
                          (Upload #{upload.id})
                        </p>
                      </div>
                    </div>
                  </div>

                  {autoResult && (
                    <div
                      className={`rounded-md p-4 ${autoResult.duplicateWarning ? "bg-amber-50" : "bg-teal-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <svg
                          className="mt-0.5 h-5 w-5 text-teal-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.06a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-teal-800">
                            Auto-imported to job card
                          </p>
                          <p className="mt-1 text-xs text-teal-700">
                            Batch name matched — {autoResult.readingsImported} readings imported as{" "}
                            {(() => {
                              const etl2 = ENTITY_TYPE_LABELS[autoResult.entityType];
                              return etl2 ? etl2 : autoResult.entityType;
                            })()}
                            {autoResult.average != null &&
                              ` (avg: ${autoResult.average.toFixed(1)})`}
                            {autoMatch &&
                              (() => {
                                const jcLabel = [autoMatch.jobNumber, autoMatch.jcNumber]
                                  .filter(Boolean)
                                  .join(" / ");
                                return jcLabel ? ` to ${jcLabel}` : "";
                              })()}
                          </p>
                          {autoResult.duplicateWarning && (
                            <p className="mt-1 text-xs text-amber-700">
                              Warning: Readings for this type and date already exist on this job
                              card
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isLinked && !autoResult && (
                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="mt-0.5 h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Not yet linked to a job card
                          </p>
                          <p className="mt-1 text-xs text-blue-700">
                            {uploadBatchName
                              ? `Batch "${uploadBatchName}" was not found on any job card. When this batch number is entered on a job card, the data will be automatically imported.`
                              : "No batch name detected. You can manually link this upload to a job card using the button below."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {uploadBatchName || uploadFilename}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          {detectedFormat === "posisoft_pdf" ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await downloadUrlMutation.mutateAsync(upload.id);
                                const downloadUrl = result.url;
                                if (downloadUrl) {
                                  const filename = uploadBatchName || uploadFilename || "report";
                                  pdfPreview.open(downloadUrl, `${filename}.pdf`);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                              {FORMAT_LABELS[detectedFormat]} — View
                            </button>
                          ) : (
                            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {(() => {
                                const fl = FORMAT_LABELS[detectedFormat];
                                return fl ? fl : detectedFormat;
                              })()}
                            </span>
                          )}
                          {uploadProbeType && <span>Probe: {uploadProbeType}</span>}
                          <span>Readings: {uploadReadingCount}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              uploadEntityType !== "unknown"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            Maps to: {(() => {
                              const etl3 = ENTITY_TYPE_LABELS[uploadEntityType];
                              return etl3 ? etl3 : "Unknown";
                            })()}
                          </span>
                          {isLinked && (
                            <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                              Linked to JC #{upload.linkedJobCardId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isLinked && uploadReadingCount > 0 && (
                          <button
                            onClick={() => setShowImportForm(true)}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Link to Job Card
                          </button>
                        )}
                        <button
                          onClick={handleClear}
                          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Upload Another
                        </button>
                      </div>
                    </div>
                  </div>

                  {upload.readingsData.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                                #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                                Value
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                                Units
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {upload.readingsData.map((reading) => {
                              const readingIndex = reading.index;
                              const readingValue = reading.value;
                              const readingUnits = reading.units;
                              return (
                                <tr key={readingIndex} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {readingIndex}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                    {readingValue}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {readingUnits || "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />

          {bundleAnalysis && !bundleImporting && !bundleResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Multi-report PDF detected: {bundleAnalysis.reports.length} individual reports
                  across {bundleAnalysis.totalPages} pages
                </p>
                {bundleAnalysis.summaryPageCount > 0 && (
                  <p className="mt-1 text-xs text-green-600">
                    Pages 1-{bundleAnalysis.summaryPageCount} (combined summary) will be skipped
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  bundleAnalysis.reports.reduce<Record<string, number>>(
                    (acc, r) => ({
                      ...acc,
                      [r.entityType]: (acc[r.entityType] ? acc[r.entityType] : 0) + 1,
                    }),
                    {},
                  ),
                ).map(([type, count]) => {
                  const colorClassRaw = BUNDLE_ENTITY_COLORS[type];
                  const colorClass = colorClassRaw ? colorClassRaw : BUNDLE_ENTITY_COLORS.unknown;
                  const labelRaw = BUNDLE_ENTITY_LABELS[type];
                  const label = labelRaw ? labelRaw : type;
                  return (
                    <div key={type} className={`rounded-lg px-4 py-3 text-center ${colorClass}`}>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs font-medium">{label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setBundleAnalysis(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBundleImport}
                  className="rounded-md bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Import All {bundleAnalysis.reports.length} Reports
                </button>
              </div>
            </div>
          )}

          {bundleImporting && (
            <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
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
              <p className="mt-4 text-lg font-medium text-gray-900">Importing reports...</p>
              <p className="mt-1 text-sm text-gray-500">
                Splitting PDF, parsing readings, and storing each report
              </p>
            </div>
          )}

          {bundleResult && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Imported {bundleResult.reportsImported} of {bundleResult.reportsFound} reports
                </p>
                {bundleResult.uploads.filter((u) => u.autoMatch).length > 0 && (
                  <p className="mt-1 text-xs text-green-600">
                    {bundleResult.uploads.filter((u) => u.autoMatch).length} auto-linked to job
                    cards
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setBundleResult(null);
                  setError(null);
                }}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Upload Another
              </button>
            </div>
          )}

          {showImportForm && uploadResponse && (
            <LinkUploadForm
              upload={uploadResponse.upload}
              suggestedEntityType={uploadResponse.suggestedEntityType}
              suggestedCoatType={uploadResponse.suggestedCoatType}
              onClose={() => setShowImportForm(false)}
              onLinked={(result) => {
                setShowImportForm(false);
                setImportResult(result);
                setUploadResponse((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    upload: {
                      ...prev.upload,
                      linkedJobCardId: result.recordId,
                      importRecordId: result.recordId,
                      importedAt: new Date().toISOString(),
                    },
                  };
                });
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LinkUploadForm(props: {
  upload: {
    id: number;
    readingCount: number;
    batchName: string | null;
    entityType: string;
    originalFilename: string;
  };
  suggestedEntityType: string;
  suggestedCoatType: string | null;
  onClose: () => void;
  onLinked: (result: PositectorImportResult & { uploadId: number }) => void;
}) {
  const suggestedCoatType = props.suggestedCoatType;
  const linkUploadMutation = useLinkPositectorUpload();
  const upload = props.upload;
  const onClose = props.onClose;
  const onLinked = props.onLinked;

  const [jobCardId, setJobCardId] = useState("");
  const [coatType, setCoatType] = useState(suggestedCoatType || "primer");
  const [paintProduct, setPaintProduct] = useState("");
  const [specMin, setSpecMin] = useState("");
  const [specMax, setSpecMax] = useState("");
  const [specMicrons, setSpecMicrons] = useState("");
  const [rubberSpec, setRubberSpec] = useState("");
  const [rubberBatchNumber, setRubberBatchNumber] = useState("");
  const [requiredShore, setRequiredShore] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityType = upload.entityType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobCardId.trim()) {
      setError("Job Card ID is required");
      return;
    }

    try {
      setIsImporting(true);
      setError(null);

      const result = await linkUploadMutation.mutateAsync({
        uploadId: upload.id,
        data: {
          jobCardId: parseInt(jobCardId, 10),
          coatType: entityType === "dft" ? coatType : undefined,
          paintProduct: entityType === "dft" ? paintProduct || "Unknown" : undefined,
          specMinMicrons: entityType === "dft" ? parseFloat(specMin) || 0 : undefined,
          specMaxMicrons: entityType === "dft" ? parseFloat(specMax) || 0 : undefined,
          specMicrons: entityType === "blast_profile" ? parseFloat(specMicrons) || 0 : undefined,
          rubberSpec: entityType === "shore_hardness" ? rubberSpec || "Unknown" : undefined,
          rubberBatchNumber:
            entityType === "shore_hardness" && rubberBatchNumber ? rubberBatchNumber : null,
          requiredShore:
            entityType === "shore_hardness" ? parseInt(requiredShore, 10) || 0 : undefined,
        },
      });

      onLinked(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link and import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Link Upload to Job Card</h2>
        <p className="mb-4 text-sm text-gray-500">
          const batchName = upload.batchName;
          {upload.readingCount} readings from {batchName || upload.originalFilename}
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Job Card ID</label>
            <input
              type="number"
              value={jobCardId}
              onChange={(e) => setJobCardId(e.target.value)}
              placeholder="Enter job card ID"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {entityType === "dft" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Coat Type</label>
                  <select
                    value={coatType}
                    onChange={(e) => setCoatType(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="primer">Primer</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Paint Product</label>
                  <input
                    type="text"
                    value={paintProduct}
                    onChange={(e) => setPaintProduct(e.target.value)}
                    placeholder="e.g. Penguard Express"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Min (um)</label>
                  <input
                    type="number"
                    value={specMin}
                    onChange={(e) => setSpecMin(e.target.value)}
                    placeholder="e.g. 240"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Spec Max (um)</label>
                  <input
                    type="number"
                    value={specMax}
                    onChange={(e) => setSpecMax(e.target.value)}
                    placeholder="e.g. 250"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {entityType === "blast_profile" && (
            <div className="rounded-md bg-gray-50 p-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Spec (um)</label>
                <input
                  type="number"
                  value={specMicrons}
                  onChange={(e) => setSpecMicrons(e.target.value)}
                  placeholder="e.g. 75"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          {entityType === "environmental" && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-600">
                Temperature, humidity, and dew point will be extracted from the stored batch data
                and saved as an environmental record for the selected job card.
              </p>
            </div>
          )}

          {entityType === "shore_hardness" && (
            <div className="space-y-3 rounded-md bg-gray-50 p-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Rubber Spec</label>
                  <input
                    type="text"
                    value={rubberSpec}
                    onChange={(e) => setRubberSpec(e.target.value)}
                    placeholder="e.g. AU 40 SHORE"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Batch No</label>
                  <input
                    type="text"
                    value={rubberBatchNumber}
                    onChange={(e) => setRubberBatchNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Required Shore</label>
                  <input
                    type="number"
                    value={requiredShore}
                    onChange={(e) => setRequiredShore(e.target.value)}
                    placeholder="e.g. 40"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isImporting ? "Importing..." : `Link & Import ${upload.readingCount} Readings`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
