"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  JobCardImportMapping,
  JobCardImportResult,
  JobCardImportRow,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { consumePendingImportFile } from "./pending-file";

type ImportStep = "upload" | "mapping" | "preview" | "result";

const JOB_CARD_FIELDS = [
  { key: "jobNumber", label: "Job Number", required: true, color: "teal" },
  { key: "jobName", label: "Job Name", required: true, color: "blue" },
  { key: "customerName", label: "Customer Name", required: false, color: "purple" },
  { key: "description", label: "Description", required: false, color: "amber" },
] as const;

type MappingFieldKey = (typeof JOB_CARD_FIELDS)[number]["key"];

const FIELD_COLORS: Record<
  string,
  { bg: string; border: string; text: string; header: string; badge: string }
> = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-500",
    text: "text-teal-700",
    header: "bg-teal-100",
    badge: "bg-teal-600",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
    header: "bg-blue-100",
    badge: "bg-blue-600",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-700",
    header: "bg-purple-100",
    badge: "bg-purple-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    header: "bg-amber-100",
    badge: "bg-amber-600",
  },
};

function applyMapping(
  rawRows: Record<string, unknown>[],
  columnMap: Record<MappingFieldKey, string>,
): JobCardImportRow[] {
  return rawRows.map((row) => ({
    jobNumber: columnMap.jobNumber
      ? String(row[columnMap.jobNumber] ?? "").trim() || undefined
      : undefined,
    jobName: columnMap.jobName
      ? String(row[columnMap.jobName] ?? "").trim() || undefined
      : undefined,
    customerName: columnMap.customerName
      ? String(row[columnMap.customerName] ?? "").trim() || undefined
      : undefined,
    description: columnMap.description
      ? String(row[columnMap.description] ?? "").trim() || undefined
      : undefined,
  }));
}

function mappingToColumnMap(mapping: JobCardImportMapping): Record<MappingFieldKey, string> {
  return {
    jobNumber: mapping.jobNumberColumn,
    jobName: mapping.jobNameColumn,
    customerName: mapping.customerNameColumn ?? "",
    description: mapping.descriptionColumn ?? "",
  };
}

function assignedFieldForHeader(
  header: string,
  columnMap: Record<MappingFieldKey, string>,
): (typeof JOB_CARD_FIELDS)[number] | null {
  const entry = JOB_CARD_FIELDS.find((f) => columnMap[f.key] === header);
  return entry ?? null;
}

export default function JobCardImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mappedRows, setMappedRows] = useState<JobCardImportRow[]>([]);
  const [columnMap, setColumnMap] = useState<Record<MappingFieldKey, string>>({
    jobNumber: "",
    jobName: "",
    customerName: "",
    description: "",
  });
  const [activeField, setActiveField] = useState<MappingFieldKey | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobCardImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCheckedPending = useRef(false);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    try {
      setIsUploading(true);
      const response = await stockControlApiClient.uploadJobCardImportFile(selectedFile);
      setHeaders(response.headers);
      setRawRows(response.rawRows);

      if (response.savedMapping) {
        const savedColumnMap = mappingToColumnMap(response.savedMapping);
        const allHeadersPresent = [savedColumnMap.jobNumber, savedColumnMap.jobName].every((col) =>
          response.headers.includes(col),
        );

        if (allHeadersPresent) {
          setColumnMap(savedColumnMap);
          setMappedRows(applyMapping(response.rawRows, savedColumnMap));
          setStep("preview");
        } else {
          setColumnMap(savedColumnMap);
          setStep("mapping");
        }
      } else {
        setStep("mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (hasCheckedPending.current) return;
    hasCheckedPending.current = true;
    const pending = consumePendingImportFile();
    if (pending) {
      handleFileSelect(pending);
    }
  }, []);

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

  const handleColumnClick = (header: string) => {
    if (!activeField) return;

    const existingField = assignedFieldForHeader(header, columnMap);
    if (existingField && existingField.key !== activeField) {
      setColumnMap({ ...columnMap, [existingField.key]: "", [activeField]: header });
    } else {
      setColumnMap({ ...columnMap, [activeField]: header });
    }

    const currentIndex = JOB_CARD_FIELDS.findIndex((f) => f.key === activeField);
    const nextUnassigned = JOB_CARD_FIELDS.find(
      (f, i) => i > currentIndex && !columnMap[f.key] && f.key !== activeField,
    );
    if (nextUnassigned) {
      setActiveField(nextUnassigned.key);
    } else {
      setActiveField(null);
    }
  };

  const handleClearField = (fieldKey: MappingFieldKey) => {
    setColumnMap({ ...columnMap, [fieldKey]: "" });
  };

  const handleSaveMapping = async () => {
    if (!columnMap.jobNumber || !columnMap.jobName) {
      setError("Job Number and Job Name columns are required");
      return;
    }

    try {
      setIsSavingMapping(true);
      setError(null);
      await stockControlApiClient.saveJobCardImportMapping({
        jobNumberColumn: columnMap.jobNumber,
        jobNameColumn: columnMap.jobName,
        customerNameColumn: columnMap.customerName || null,
        descriptionColumn: columnMap.description || null,
      });
      setMappedRows(applyMapping(rawRows, columnMap));
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      setError(null);
      const importResult = await stockControlApiClient.confirmJobCardImport(mappedRows);
      setResult(importResult);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import job cards");
    } finally {
      setIsConfirming(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMappedRows([]);
    setColumnMap({ jobNumber: "", jobName: "", customerName: "", description: "" });
    setActiveField(null);
    setResult(null);
    setError(null);
  };

  const mappedCount = JOB_CARD_FIELDS.filter((f) => columnMap[f.key]).length;
  const requiredMapped = columnMap.jobNumber && columnMap.jobName;
  const previewRows = rawRows.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/stock-control/portal/job-cards" className="text-gray-500 hover:text-gray-700">
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
          <h1 className="text-2xl font-bold text-gray-900">Import Job Cards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload an Excel, CSV, or PDF file to import job cards
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv"
                onChange={handleInputChange}
                className="hidden"
              />
              {isUploading ? (
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
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

      {step === "mapping" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-600 to-teal-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Map Columns</h2>
                <p className="text-sm text-white/80">
                  Select a field on the right, then click a column in the spreadsheet to assign it
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/80">
                {mappedCount} / {JOB_CARD_FIELDS.length} fields mapped
              </div>
              <button onClick={resetImport} className="text-white/80 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex" style={{ height: "calc(100vh - 320px)", minHeight: "400px" }}>
            <div className="flex-1 border-r flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">{file?.name}</span>
                  <span className="text-xs text-gray-400">({rawRows.length} rows)</span>
                </div>
                {activeField && (
                  <div className="text-sm px-3 py-1 rounded bg-white/20">
                    Click a column to assign:{" "}
                    <span className="font-medium">
                      {JOB_CARD_FIELDS.find((f) => f.key === activeField)?.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {headers.map((header) => {
                        const assigned = assignedFieldForHeader(header, columnMap);
                        const colors = assigned ? FIELD_COLORS[assigned.color] : null;
                        const isClickTarget = activeField !== null;

                        return (
                          <th
                            key={header}
                            onClick={() => handleColumnClick(header)}
                            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-b-2 transition-all ${
                              colors
                                ? `${colors.header} ${colors.border} ${colors.text}`
                                : isClickTarget
                                  ? "bg-gray-50 border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 cursor-pointer"
                                  : "bg-gray-50 border-gray-200 text-gray-500"
                            } ${isClickTarget && !colors ? "cursor-pointer" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{header}</span>
                              {colors && (
                                <span
                                  className={`${colors.badge} text-white text-[10px] px-1.5 py-0.5 rounded font-semibold`}
                                >
                                  {assigned?.label}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {previewRows.map((row, index) => (
                      <tr key={index}>
                        {headers.map((header) => {
                          const assigned = assignedFieldForHeader(header, columnMap);
                          const colors = assigned ? FIELD_COLORS[assigned.color] : null;

                          return (
                            <td
                              key={header}
                              className={`px-4 py-2.5 whitespace-nowrap text-sm ${
                                colors ? `${colors.bg} ${colors.text}` : "text-gray-700"
                              }`}
                            >
                              {String(row[header] ?? "")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-80 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-1">Job Card Fields</h3>
                <p className="text-xs text-gray-500">
                  Click a field below, then click the matching column in the spreadsheet.
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {JOB_CARD_FIELDS.map((field) => {
                    const isActive = activeField === field.key;
                    const isMapped = !!columnMap[field.key];
                    const colors = FIELD_COLORS[field.color];

                    return (
                      <button
                        key={field.key}
                        onClick={() => setActiveField(isActive ? null : field.key)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          isActive
                            ? `${colors.border} ${colors.bg} ring-2 ring-offset-1 ring-current ${colors.text}`
                            : isMapped
                              ? "border-green-300 bg-green-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors.badge}`} />
                            <span className="font-medium text-gray-900">{field.label}</span>
                            {field.required && <span className="text-red-500 text-xs">*</span>}
                          </div>
                          {isMapped ? (
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearField(field.key);
                                }}
                                className="text-gray-400 hover:text-red-500 p-0.5"
                                title="Clear mapping"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : isActive ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                              SELECTING
                            </span>
                          ) : null}
                        </div>
                        {isMapped && (
                          <div className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                            {columnMap[field.key]}
                          </div>
                        )}
                        {isActive && !isMapped && (
                          <div className="mt-1.5 text-xs text-gray-500">
                            Click a column header in the spreadsheet
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <button
                    onClick={resetImport}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMapping}
                    disabled={isSavingMapping || !requiredMapped}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSavingMapping ? "Saving..." : "Continue"}
                  </button>
                </div>
                {!requiredMapped && (
                  <p className="mt-2 text-xs text-center text-gray-500">
                    Map at least Job Number and Job Name to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Import Preview</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {file?.name} - {mappedRows.length} rows parsed
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setStep("mapping")}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Re-map Columns
                </button>
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || mappedRows.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isConfirming ? "Importing..." : `Confirm Import (${mappedRows.length} rows)`}
                </button>
              </div>
            </div>
            {mappedRows.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-sm font-medium text-gray-900">No data found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The uploaded file contained no parseable rows.
                </p>
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
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Job Number
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Job Name
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappedRows.map((row, index) => {
                      const missingRequired = !row.jobNumber || !row.jobName;
                      return (
                        <tr
                          key={index}
                          className={missingRequired ? "bg-red-50" : "hover:bg-gray-50"}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-sm ${!row.jobNumber ? "text-red-500 font-medium" : "text-gray-900"}`}
                          >
                            {row.jobNumber || "Missing"}
                          </td>
                          <td
                            className={`px-4 py-3 whitespace-nowrap text-sm ${!row.jobName ? "text-red-500 font-medium" : "text-gray-900"}`}
                          >
                            {row.jobName || "Missing"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.customerName || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.description || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Import Results</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
                  <div className="text-sm text-yellow-600">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

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

              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={resetImport}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Import Another File
                </button>
                <Link
                  href="/stock-control/portal/job-cards"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700"
                >
                  View Job Cards
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
