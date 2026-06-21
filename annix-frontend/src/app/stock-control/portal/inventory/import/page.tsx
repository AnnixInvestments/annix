"use client";

import { toPairs as entries, keys } from "es-toolkit/compat";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { DateInput } from "@/app/components/ui/DateInput";
import type {
  ImportMatchRow,
  ImportUploadResponse,
  InventoryColumnMapping,
  ReviewedImportResult,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { DateTime, monthEndPeriodOptions } from "@/app/lib/datetime";
import { useMatchImportRows, useUploadImportFile } from "@/app/lib/query/hooks";
import { ImportReviewStep } from "./ImportReviewStep";

type ImportStep = "upload" | "preview" | "review" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRawRows, setImportRawRows] = useState<string[][]>([]);
  const [importMapping, setImportMapping] = useState<InventoryColumnMapping | null>(null);
  const [importFormat, setImportFormat] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewedImportResult | null>(null);
  const [matchedRows, setMatchedRows] = useState<ImportMatchRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isStockTake, setIsStockTake] = useState(false);
  const [stockTakeDate, setStockTakeDate] = useState<string | null>(null);
  const [stockTakePeriod, setStockTakePeriod] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const monthEndOptions = useMemo(() => monthEndPeriodOptions(false), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadImportFile();
  const matchMutation = useMatchImportRows();

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      setIsUploading(true);
      const response: ImportUploadResponse = await uploadMutation.mutateAsync(selectedFile);
      setImportFormat(response.format);

      if (response.format === "excel" && response.headers && response.rawRows) {
        const mapping = response.mapping;
        setImportHeaders(response.headers);
        setImportRawRows(response.rawRows);
        setImportMapping(mapping || null);
        setParsedRows([]);
        const responseSheets = response.sheetNames;
        const responseSelected = response.selectedSheet;
        setSheetNames(responseSheets ?? []);
        setSelectedSheet(responseSelected ?? null);
      } else {
        setParsedRows((response.rows as Record<string, unknown>[]) ?? []);
        setImportHeaders([]);
        setImportRawRows([]);
        setImportMapping(null);
        setSheetNames([]);
        setSelectedSheet(null);
      }

      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const buildImportRows = () => {
    if (importFormat === "excel" && importMapping) {
      const mapping = importMapping;
      const seed: { category: string | null; rows: Record<string, unknown>[] } = {
        category: null,
        rows: [],
      };
      const built = importRawRows.reduce((acc, row) => {
        const cellAt = (idx: number | null): string | undefined => {
          if (idx === null || idx < 0 || idx >= row.length) {
            return undefined;
          }
          const val = row[idx].trim();
          return val === "" ? undefined : val;
        };
        const numAt = (idx: number | null): number | undefined => {
          const val = cellAt(idx);
          if (val === undefined) {
            return undefined;
          }
          const num = Number(val);
          return Number.isNaN(num) ? undefined : num;
        };

        const name = cellAt(mapping.name);
        const sku = cellAt(mapping.sku);
        const quantity = numAt(mapping.quantity);
        const costPerUnit = numAt(mapping.costPerUnit);
        const minStockLevel = numAt(mapping.minStockLevel);

        const isBlank = name == null && sku == null;
        if (isBlank) {
          return acc;
        }

        const hasNumericValue =
          (quantity != null && quantity !== 0) ||
          (costPerUnit != null && costPerUnit !== 0) ||
          (minStockLevel != null && minStockLevel !== 0);
        const hasDigit = name != null && /\d/.test(name);
        const isSectionHeader = name != null && sku == null && !hasNumericValue && !hasDigit;
        if (isSectionHeader) {
          return { category: name, rows: acc.rows };
        }

        const mappedCategory = cellAt(mapping.category);
        const accCategory = acc.category;
        const category = mappedCategory ?? accCategory ?? undefined;
        const item = {
          sku,
          name,
          description: cellAt(mapping.description),
          category,
          unitOfMeasure: cellAt(mapping.unitOfMeasure),
          costPerUnit,
          quantity,
          minStockLevel,
          location: cellAt(mapping.location),
        };
        return { category: acc.category, rows: [...acc.rows, item] };
      }, seed);
      return built.rows;
    }
    return parsedRows;
  };

  const handleMatchAndReview = async () => {
    try {
      setIsMatching(true);
      setError(null);

      const rowsToMatch = buildImportRows();
      const matched = await matchMutation.mutateAsync(rowsToMatch);
      setMatchedRows(matched);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to match items");
    } finally {
      setIsMatching(false);
    }
  };

  const handleReviewComplete = (reviewResult: ReviewedImportResult) => {
    setResult(reviewResult);
    setStep("result");
  };

  const [downloadingVariances, setDownloadingVariances] = useState(false);
  const downloadVariances = async () => {
    if (!result || result.variances.length === 0) return;
    try {
      setDownloadingVariances(true);
      const blob = await stockControlApiClient.exportStockTakeVariances(result.variances);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const periodSlug =
        stockTakePeriod == null
          ? DateTime.now().toISODate()
          : stockTakePeriod
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
      a.download = `stock-variances-${periodSlug}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download variances");
    } finally {
      setDownloadingVariances(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setImportHeaders([]);
    setImportRawRows([]);
    setImportMapping(null);
    setImportFormat(null);
    setResult(null);
    setMatchedRows([]);
    setError(null);
    setIsStockTake(false);
    setStockTakeDate(null);
    setStockTakePeriod(null);
    setSheetNames([]);
    setSelectedSheet(null);
  };

  const reparseSheet = async (opts: { monthLabel?: string | null; sheetName?: string | null }) => {
    if (!file || importFormat !== "excel") return;
    try {
      setIsUploading(true);
      setError(null);
      const optsMonthLabel = opts.monthLabel;
      const optsSheetName = opts.sheetName;
      const response: ImportUploadResponse = await uploadMutation.mutateAsync({
        file,
        monthLabel: optsMonthLabel ?? null,
        sheetName: optsSheetName ?? null,
      });
      const headers = response.headers;
      const rawRows = response.rawRows;
      if (headers && rawRows) {
        const mapping = response.mapping;
        const responseSheets = response.sheetNames;
        const responseSelected = response.selectedSheet;
        setImportHeaders(headers);
        setImportRawRows(rawRows);
        setImportMapping(mapping || null);
        setSheetNames(responseSheets ?? sheetNames);
        setSelectedSheet(responseSelected ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read the selected tab");
    } finally {
      setIsUploading(false);
    }
  };

  const applyStockTakePeriod = (label: string) => {
    const option = monthEndOptions.find((o) => o.label === label);
    setStockTakePeriod(label);
    if (option) {
      setStockTakeDate(option.isoDate);
    }
    if (sheetNames.length > 1) {
      reparseSheet({ monthLabel: label });
    }
  };

  const handleStockTakeToggle = (checked: boolean) => {
    setIsStockTake(checked);
    if (checked && stockTakePeriod === null) {
      const current = monthEndOptions[0];
      if (current) {
        applyStockTakePeriod(current.label);
      }
    }
  };

  const previewRowCount = importFormat === "excel" ? importRawRows.length : parsedRows.length;
  const columnHeaders = parsedRows.length > 0 ? keys(parsedRows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/stock-control/portal/inventory" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Stock Items</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload an Excel or PDF file to import stock items
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-600 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-[var(--sc-primary,#323288)] bg-[var(--sc-primary-50,#eeeef6)]"
                  : "border-gray-300 hover:border-[var(--sc-primary-400,#5b5b9c)] hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                onChange={handleInputChange}
                className="hidden"
              />
              {isUploading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--sc-primary,#323288)] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Parsing file...</p>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    Drop your file here, or click to browse
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Supports Excel (.xlsx, .xls), PDF, and CSV files
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Import Preview</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {file?.name} - {previewRowCount} rows parsed
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMatchAndReview}
                  disabled={isMatching || previewRowCount === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] border border-transparent rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isMatching
                    ? "Matching inventory..."
                    : `Review & Match (${previewRowCount} rows)`}
                </button>
              </div>
            </div>
            <div className="mx-4 mt-4 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStockTake}
                    onChange={(e) => handleStockTakeToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-amber-800">Stock Take Mode</span>
                    <p className="text-xs text-amber-700 mt-1">
                      Only updates stock quantities (SOH). Preserves existing minimum stock levels,
                      costs, and other settings. New items will be added as normal.
                    </p>
                  </div>
                </label>
                {isStockTake && (
                  <div className="mt-3 pl-7 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Month-End Period
                      </label>
                      <select
                        value={stockTakePeriod ?? ""}
                        onChange={(e) => applyStockTakePeriod(e.target.value)}
                        className="block w-64 px-3 py-1.5 text-sm border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-amber-900 bg-white"
                      >
                        {monthEndOptions.map((opt) => (
                          <option key={opt.label} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-amber-600 mt-1">
                        Which month-end this count reconciles. Sets the count date to the last day
                        of that month — adjust the date below if you counted on a different day.
                      </p>
                    </div>
                    {sheetNames.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-amber-800 mb-1">
                          Workbook Tab
                        </label>
                        <select
                          value={selectedSheet ?? ""}
                          onChange={(e) => reparseSheet({ sheetName: e.target.value })}
                          className="block w-64 px-3 py-1.5 text-sm border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-amber-900 bg-white"
                        >
                          {sheetNames.map((sheet) => (
                            <option key={sheet} value={sheet}>
                              {sheet}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-amber-600 mt-1">
                          This workbook has multiple tabs. Reading the tab matching your month-end —
                          change it here if the wrong tab was picked.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-amber-800 mb-1">
                        Actual Count Date
                      </label>
                      <DateInput
                        value={stockTakeDate}
                        onChange={(value) => {
                          setStockTakeDate(value ? value : null);
                        }}
                        ariaLabel="Actual Count Date"
                        className="block w-48 px-3 py-1.5 text-sm border border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 text-amber-900 bg-white"
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        The day you physically counted. Deliveries and issuances recorded after this
                        date are replayed on top of the counted quantities, so a late upload still
                        balances correctly.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {importMapping && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    AI mapped columns:{" "}
                    {entries(importMapping)
                      .filter(([, v]) => v !== null)
                      .map(([field, colIdx]) => `${field} -> "${importHeaders[colIdx as number]}"`)

                      .join(", ") || "No columns mapped"}
                  </p>
                </div>
              )}
            </div>
            {previewRowCount === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-sm font-medium text-gray-900">No data found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The uploaded file contained no parseable rows.
                </p>
              </div>
            ) : importFormat === "excel" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Row
                      </th>
                      {importHeaders.map((header, idx) => (
                        <th
                          key={idx}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importRawRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {rowIdx + 1}
                        </td>
                        {importHeaders.map((_, colIdx) => {
                          const cellVal = row[colIdx];
                          const cellDisplay = cellVal != null ? cellVal : "";
                          return (
                            <td
                              key={colIdx}
                              className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                            >
                              {cellDisplay}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Row
                      </th>
                      {columnHeaders.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        {columnHeaders.map((header) => {
                          const headerVal = row[header];
                          const headerDisplay = headerVal != null ? String(headerVal) : "";
                          return (
                            <td
                              key={header}
                              className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                            >
                              {headerDisplay}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <ImportReviewStep
          matchedRows={matchedRows}
          isStockTake={isStockTake}
          stockTakeDate={stockTakeDate}
          stockTakePeriod={stockTakePeriod}
          onComplete={handleReviewComplete}
          onCancel={() => setStep("preview")}
        />
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Import Results</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                  <div className="text-sm text-blue-600">Updated</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">{result.skipped}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">{result.learned}</div>
                  <div className="text-sm text-purple-600">Nix Learned</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {result.zeroed > 0 && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    {result.zeroed} item{result.zeroed !== 1 ? "s were" : " was"} not on this count
                    and {result.zeroed !== 1 ? "have" : "has"} been set to zero (no longer in
                    stock). Check the variances spreadsheet to trace any differences.
                  </p>
                </div>
              )}

              {result.learned > 0 && (
                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    Nix learned from {result.learned} correction{result.learned !== 1 ? "s" : ""}.
                    Future imports and SDN extractions will use these corrections automatically.
                  </p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Errors</h4>
                  <div className="bg-red-50 rounded-lg p-4 space-y-2">
                    {result.errors.map((err, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {result.variances.length > 0 && (
                  <button
                    type="button"
                    onClick={downloadVariances}
                    disabled={downloadingVariances}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 disabled:opacity-50"
                  >
                    {downloadingVariances
                      ? "Preparing…"
                      : `Download Stock Variances (${result.variances.length}) — Excel`}
                  </button>
                )}
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <Link
                  href="/stock-control/portal/inventory"
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] border border-transparent rounded-md hover:bg-[var(--sc-primary-hover,#252560)]"
                >
                  View Inventory
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
