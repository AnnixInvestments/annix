"use client";

import { useCallback, useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { now } from "@/app/lib/datetime";

interface SageExportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SageExportModal({ onClose, onSuccess }: SageExportModalProps) {
  const defaultDateTo = now().toISODate() ?? "";
  const defaultDateFrom = now().minus({ days: 30 }).toISODate() ?? "";

  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [excludeExported, setExcludeExported] = useState(true);
  const [preview, setPreview] = useState<{
    cocCount: number;
    batchCount: number;
    totalBatches: number;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedCount, setExportedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      setError(null);
      const result = await auRubberApiClient.cocSageExportPreview({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        excludeExported,
      });
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setIsLoadingPreview(false);
    }
  }, [dateFrom, dateTo, excludeExported]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      const blob = await auRubberApiClient.cocSageExportCsv({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        excludeExported,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sage-coc-export.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportedCount(preview?.cocCount ?? 0);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Export CoCs to Sage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Export supplier CoCs as CSV for Sage Business Cloud import
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {exportedCount !== null ? (
            <div className="rounded-md bg-green-50 p-4 text-center">
              <svg
                className="mx-auto h-10 w-10 text-green-500 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-sm font-medium text-green-800">
                Successfully exported {exportedCount} CoC{exportedCount !== 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-xs text-green-600">These CoCs are now marked as exported</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="exclude-exported-cocs"
                  type="checkbox"
                  checked={excludeExported}
                  onChange={(e) => setExcludeExported(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="exclude-exported-cocs" className="ml-2 text-sm text-gray-700">
                  Exclude previously exported CoCs
                </label>
              </div>

              {isLoadingPreview ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading preview...</p>
                </div>
              ) : preview ? (
                <div className="rounded-md bg-gray-50 p-4">
                  <dl className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">CoCs</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {preview.cocCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">Batches</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {preview.batchCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">Total Batches</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {preview.totalBatches}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {exportedCount !== null ? "Close" : "Cancel"}
          </button>
          {exportedCount === null && (
            <button
              onClick={handleExport}
              disabled={isExporting || isLoadingPreview || (preview?.cocCount ?? 0) === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Download CSV"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
