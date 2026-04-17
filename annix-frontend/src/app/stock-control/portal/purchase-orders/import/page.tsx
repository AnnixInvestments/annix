"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CpoImportResult,
  ImportMappingConfig,
  JobCardImportMapping,
  JobCardImportRow,
} from "@/app/lib/api/stockControlApi";
import {
  useAutoDetectJobCardMapping,
  useConfirmCpoImport,
  useUploadCpoImportFile,
} from "@/app/lib/query/hooks";
import { correctLineItemsEndRow, validItemRows } from "../../../lib/lineItemsEndRow";
import { consumePendingCpoImportFile } from "./pending-file";

type ImportStep = "upload" | "preview" | "result";

export default function CpoImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [savedMapping, setSavedMapping] = useState<JobCardImportMapping | null>(null);
  const [drawingRows, setDrawingRows] = useState<JobCardImportRow[] | null>(null);
  const [previewRows, setPreviewRows] = useState<JobCardImportRow[]>([]);
  const [importResult, setImportResult] = useState<CpoImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingProcessed = useRef(false);
  const uploadMutation = useUploadCpoImportFile();
  const autoDetectMutation = useAutoDetectJobCardMapping();
  const confirmImportMutation = useConfirmCpoImport();

  const processFile = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        setError(null);
        setFileName(file.name);

        const result = await uploadMutation.mutateAsync(file);
        setGrid(result.grid);
        setSavedMapping(result.savedMapping);

        const resultDrawingRows = result.drawingRows;
        if (resultDrawingRows && resultDrawingRows.length > 0) {
          setDrawingRows(resultDrawingRows);
          setPreviewRows(resultDrawingRows);
          setStep("preview");
        } else if (result.grid.length > 0) {
          const savedMappingConfig = result.savedMapping;
          const mapping = savedMappingConfig ? savedMappingConfig.mappingConfig : null;
          if (mapping) {
            const rows = extractRowsFromGrid(result.grid, mapping);
            setPreviewRows(rows);
            setStep("preview");
          } else {
            const detected = await autoDetectMutation.mutateAsync(result.grid);
            const rows = extractRowsFromGrid(result.grid, detected);
            setPreviewRows(rows);
            setStep("preview");
          }
        } else {
          setError("No data found in the uploaded file");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [uploadMutation, autoDetectMutation],
  );

  useEffect(() => {
    if (pendingProcessed.current) return;
    const file = consumePendingCpoImportFile();
    if (file) {
      pendingProcessed.current = true;
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    try {
      setIsImporting(true);
      setError(null);
      const result = await confirmImportMutation.mutateAsync(previewRows);
      setImportResult(result);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link href="/stock-control/portal/purchase-orders" className="hover:text-teal-600">
              Purchase Orders
            </Link>
            <span>/</span>
            <span className="text-gray-900">Import</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Import Customer Purchase Order</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm">
        {(["upload", "preview", "result"] as ImportStep[]).map((s, idx) => (
          <div key={s} className="flex items-center">
            {idx > 0 && <div className="w-8 h-px bg-gray-300 mr-4" />}
            <div
              className={`flex items-center space-x-2 ${
                step === s ? "text-teal-700 font-medium" : "text-gray-400"
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  step === s ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {idx + 1}
              </span>
              <span className="capitalize">{s}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === "upload" && (
        <div
          className="bg-white rounded-lg shadow p-12 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing {fileName}...</p>
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
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Upload Job Card Excel or PDF
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Drop your file here or click to browse. Uses the same format as Job Card imports.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
                onChange={handleFileSelect}
              />
            </>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Preview: {previewRows.length} job card{previewRows.length !== 1 ? "s" : ""} found
                </h2>
                <p className="text-sm text-gray-500">Each job card will become a separate CPO</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setStep("upload");
                    setPreviewRows([]);
                    setGrid([]);
                    setDrawingRows(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Start Over
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || previewRows.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {isImporting
                    ? "Importing..."
                    : `Create ${previewRows.length} CPO${previewRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {previewRows.map((row, idx) => {
                const jobNum = row.jobNumber;
                const jobNumDisplay = jobNum || "No Job #";
                const items = row.lineItems ? row.lineItems : [];
                return (
                  <div key={`row-${idx}`} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{jobNumDisplay}</span>
                        {row.jobName && (
                          <span className="ml-2 text-sm text-gray-500">{row.jobName}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{items.length} line items</span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                      {row.customerName && <span>Customer: {row.customerName}</span>}
                      {row.poNumber && <span>PO: {row.poNumber}</span>}
                      {row.siteLocation && <span>Site: {row.siteLocation}</span>}
                      {row.dueDate && <span>Due: {row.dueDate}</span>}
                    </div>

                    {items.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left pr-4 py-1 font-medium">Code</th>
                              <th className="text-left pr-4 py-1 font-medium">Description</th>
                              <th className="text-right pr-4 py-1 font-medium">Qty</th>
                              <th className="text-left pr-4 py-1 font-medium">JT No</th>
                              <th className="text-right py-1 font-medium">m2</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((li, liIdx) => {
                              const code = li.itemCode ? li.itemCode : "-";
                              const desc = li.itemDescription ? li.itemDescription : "-";
                              const qty = li.quantity ? li.quantity : "-";
                              const jt = li.jtNo ? li.jtNo : "-";
                              return (
                                <tr key={`li-${idx}-${liIdx}`} className="text-gray-700">
                                  <td className="pr-4 py-0.5 font-mono">{code}</td>
                                  <td className="pr-4 py-0.5 max-w-xs truncate">{desc}</td>
                                  <td className="pr-4 py-0.5 text-right">{qty}</td>
                                  <td className="pr-4 py-0.5">{jt}</td>
                                  <td className="py-0.5 text-right">
                                    {li.m2 != null ? Number(li.m2).toFixed(2) : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === "result" && importResult && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Import Complete</h2>
          <div className="mt-4 flex justify-center space-x-8 text-sm">
            <div>
              <span className="text-2xl font-bold text-teal-600">{importResult.created}</span>
              <p className="text-gray-500">Created</p>
            </div>
            {importResult.updated > 0 && (
              <div>
                <span className="text-2xl font-bold text-blue-600">{importResult.updated}</span>
                <p className="text-gray-500">Updated</p>
              </div>
            )}
            <div>
              <span className="text-2xl font-bold text-gray-400">{importResult.skipped}</span>
              <p className="text-gray-500">Skipped</p>
            </div>
            {importResult.errors.length > 0 && (
              <div>
                <span className="text-2xl font-bold text-red-500">
                  {importResult.errors.length}
                </span>
                <p className="text-gray-500">Errors</p>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-6 text-left max-w-md mx-auto">
              <h3 className="text-sm font-medium text-red-700 mb-2">Errors:</h3>
              <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                {importResult.errors.map((err, idx) => (
                  <li key={`err-${idx}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-center space-x-4">
            <Link
              href="/stock-control/portal/purchase-orders"
              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
            >
              View Purchase Orders
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setPreviewRows([]);
                setGrid([]);
                setDrawingRows(null);
                setImportResult(null);
                setFileName("");
              }}
              className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function extractRowsFromGrid(grid: string[][], mapping: ImportMappingConfig): JobCardImportRow[] {
  const rows: JobCardImportRow[] = [];

  const fieldValue = (
    gridData: string[][],
    fm: { column: number; startRow: number; endRow: number } | null,
  ): string | undefined => {
    if (!fm) return undefined;
    const endRow = Math.min(fm.endRow, gridData.length - 1);
    const rowCount = Math.max(0, endRow - fm.startRow + 1);
    const vals = Array.from({ length: rowCount }, (_, idx) => {
      const cell = gridData[fm.startRow + idx]?.[fm.column];
      return cell?.trim() || "";
    }).filter((v) => v.length > 0);
    return vals.length > 0 ? vals.join(" ") : undefined;
  };

  const jobNumber = fieldValue(grid, mapping.jobNumber);
  const jobName = fieldValue(grid, mapping.jobName);

  if (!jobNumber && !jobName) return rows;

  const liItemCode = mapping.lineItems?.itemCode;
  const liItemDesc = mapping.lineItems?.itemDescription;
  const codeStart = liItemCode ? liItemCode.startRow : 0;
  const descStart = liItemDesc ? liItemDesc.startRow : 0;
  const lineItemStart = codeStart || descStart || 0;
  const codeEnd = liItemCode ? liItemCode.endRow : 0;
  const descEnd = liItemDesc ? liItemDesc.endRow : 0;
  const rawLineItemEnd = codeEnd || descEnd || grid.length - 1;
  const lineItemEnd = correctLineItemsEndRow(grid, lineItemStart, rawLineItemEnd);
  const validRows = validItemRows(grid, lineItemStart);

  const lineItems: Array<{
    itemCode?: string;
    itemDescription?: string;
    itemNo?: string;
    quantity?: string;
    jtNo?: string;
  }> = [];

  const lineEndRow = Math.min(lineItemEnd, grid.length - 1);
  const lineRowCount = Math.max(0, lineEndRow - lineItemStart + 1);
  Array.from({ length: lineRowCount }, (_, idx) => lineItemStart + idx)
    .filter((r) => validRows.size === 0 || validRows.has(r))
    .forEach((r) => {
      const gridRow = grid[r];
      const liNo = mapping.lineItems?.itemNo;
      const liQty = mapping.lineItems?.quantity;
      const liJt = mapping.lineItems?.jtNo;
      const codeCol = liItemCode ? liItemCode.column : -1;
      const descCol = liItemDesc ? liItemDesc.column : -1;
      const noCol = liNo ? liNo.column : -1;
      const qtyCol = liQty ? liQty.column : -1;
      const jtCol = liJt ? liJt.column : -1;
      const cellOrEmpty = (col: number): string => {
        if (col < 0 || !gridRow) return "";
        const val = gridRow[col];
        return val ? val.trim() : "";
      };
      const itemCode = liItemCode ? cellOrEmpty(codeCol) : "";
      const itemDescription = liItemDesc ? cellOrEmpty(descCol) : "";
      const itemNo = liNo ? cellOrEmpty(noCol) : "";
      const quantity = liQty ? cellOrEmpty(qtyCol) : "";
      const jtNo = liJt ? cellOrEmpty(jtCol) : "";

      if (itemCode || itemDescription || quantity) {
        lineItems.push({ itemCode, itemDescription, itemNo, quantity, jtNo });
      }
    });

  rows.push({
    jobNumber: jobNumber || "UNKNOWN",
    jobName: jobName || jobNumber || "UNKNOWN",
    jcNumber: fieldValue(grid, mapping.jcNumber),
    pageNumber: fieldValue(grid, mapping.pageNumber),
    customerName: fieldValue(grid, mapping.customerName),
    description: fieldValue(grid, mapping.description),
    poNumber: fieldValue(grid, mapping.poNumber),
    siteLocation: fieldValue(grid, mapping.siteLocation),
    contactPerson: fieldValue(grid, mapping.contactPerson),
    dueDate: fieldValue(grid, mapping.dueDate),
    notes: fieldValue(grid, mapping.notes),
    reference: fieldValue(grid, mapping.reference),
    lineItems,
  });

  return rows;
}
