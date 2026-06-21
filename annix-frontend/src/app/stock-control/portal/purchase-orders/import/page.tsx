"use client";

import { isArray } from "es-toolkit/compat";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CpoImportResult,
  ImportMappingConfig,
  JobCardImportCorrection,
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

const DETAIL_EDIT_KEYS = [
  "jobNumber",
  "jcNumber",
  "pageNumber",
  "jobName",
  "customerName",
  "description",
  "poNumber",
  "siteLocation",
  "contactPerson",
  "dueDate",
  "notes",
  "reference",
] as const;

const LINE_ITEM_EDIT_KEYS = [
  "itemCode",
  "itemDescription",
  "itemNo",
  "quantity",
  "jtNo",
  "m2",
  "notes",
] as const;

const cloneImportRows = (rows: JobCardImportRow[]) =>
  JSON.parse(JSON.stringify(rows)) as JobCardImportRow[];

export default function CpoImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [savedMapping, setSavedMapping] = useState<JobCardImportMapping | null>(null);
  const [drawingRows, setDrawingRows] = useState<JobCardImportRow[] | null>(null);
  const [previewRows, setPreviewRows] = useState<JobCardImportRow[]>([]);
  const [originalPreviewRows, setOriginalPreviewRows] = useState<JobCardImportRow[]>([]);
  const [importResult, setImportResult] = useState<CpoImportResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingProcessed = useRef(false);
  const uploadMutation = useUploadCpoImportFile();
  const autoDetectMutation = useAutoDetectJobCardMapping();
  const confirmImportMutation = useConfirmCpoImport();

  const replacePreviewRows = useCallback((rows: JobCardImportRow[]) => {
    setPreviewRows(rows);
    setOriginalPreviewRows(cloneImportRows(rows));
  }, []);

  const updatePreviewRow = (
    rowIndex: number,
    field: (typeof DETAIL_EDIT_KEYS)[number],
    value: string,
  ) => {
    setPreviewRows((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
    );
  };

  const updatePreviewLineItem = (
    rowIndex: number,
    lineItemIndex: number,
    field: (typeof LINE_ITEM_EDIT_KEYS)[number],
    value: string,
  ) => {
    setPreviewRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;
        const existingLineItems = isArray(row.lineItems) ? row.lineItems : [];
        const lineItems = [...existingLineItems];
        const currentLineItem = lineItems[lineItemIndex];
        const current = currentLineItem ? currentLineItem : {};
        lineItems[lineItemIndex] = {
          ...current,
          [field]: field === "m2" ? (value === "" ? undefined : Number(value)) : value,
        };
        return { ...row, lineItems };
      }),
    );
  };

  const addPreviewLineItem = (rowIndex: number) => {
    setPreviewRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              lineItems: [
                ...(isArray(row.lineItems) ? row.lineItems : []),
                {
                  itemCode: "",
                  itemDescription: "",
                  itemNo: "",
                  quantity: "1",
                  jtNo: "",
                },
              ],
            }
          : row,
      ),
    );
  };

  const removePreviewLineItem = (rowIndex: number, lineItemIndex: number) => {
    setPreviewRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              lineItems: (isArray(row.lineItems) ? row.lineItems : []).filter(
                (_, itemIndex) => itemIndex !== lineItemIndex,
              ),
            }
          : row,
      ),
    );
  };

  const importCorrections = (rows: JobCardImportRow[]): JobCardImportCorrection[] => {
    const corrections: JobCardImportCorrection[] = [];

    rows.forEach((row, rowIndex) => {
      const originalRow = originalPreviewRows[rowIndex];
      const original = originalRow ? originalRow : {};
      const rowCustomerName = row.customerName;
      const correctionCustomerName = rowCustomerName == null ? null : rowCustomerName;
      DETAIL_EDIT_KEYS.forEach((fieldName) => {
        const originalValue = original[fieldName] == null ? "" : String(original[fieldName]);
        const correctedValue = row[fieldName] == null ? "" : String(row[fieldName]);
        if (originalValue !== correctedValue) {
          corrections.push({
            rowIndex,
            fieldName,
            originalValue,
            correctedValue,
            customerName: correctionCustomerName,
          });
        }
      });

      const rowLineItems = isArray(row.lineItems) ? row.lineItems : [];
      rowLineItems.forEach((lineItem, lineItemIndex) => {
        const originalLineItems = original.lineItems;
        const originalLineItemRaw = originalLineItems
          ? originalLineItems[lineItemIndex]
          : undefined;
        const originalLineItem = originalLineItemRaw ? originalLineItemRaw : {};
        LINE_ITEM_EDIT_KEYS.forEach((fieldName) => {
          const originalValue =
            originalLineItem[fieldName] == null ? "" : String(originalLineItem[fieldName]);
          const correctedValue = lineItem[fieldName] == null ? "" : String(lineItem[fieldName]);
          if (originalValue !== correctedValue) {
            corrections.push({
              rowIndex,
              lineItemIndex,
              fieldName: `lineItems.${fieldName}`,
              originalValue,
              correctedValue,
              customerName: correctionCustomerName,
              itemDescription: lineItem.itemDescription == null ? null : lineItem.itemDescription,
            });
          }
        });
      });
    });

    return corrections;
  };

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
          replacePreviewRows(resultDrawingRows);
          setStep("preview");
        } else if (result.grid.length > 0) {
          const savedMappingConfig = result.savedMapping;
          const mapping = savedMappingConfig ? savedMappingConfig.mappingConfig : null;
          if (mapping) {
            const rows = extractRowsFromGrid(result.grid, mapping);
            replacePreviewRows(rows);
            setStep("preview");
          } else {
            const detected = await autoDetectMutation.mutateAsync(result.grid);
            const rows = extractRowsFromGrid(result.grid, detected);
            replacePreviewRows(rows);
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
    [uploadMutation, autoDetectMutation, replacePreviewRows],
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
      const result = await confirmImportMutation.mutateAsync({
        rows: previewRows,
        corrections: importCorrections(previewRows),
      });
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
            <Link
              href="/stock-control/portal/purchase-orders"
              className="hover:text-[var(--sc-primary,#323288)]"
            >
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
                step === s ? "text-[var(--sc-primary-hover,#252560)] font-medium" : "text-gray-400"
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  step === s
                    ? "bg-[var(--sc-primary,#323288)] text-white"
                    : "bg-gray-200 text-gray-500"
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--sc-primary,#323288)] mx-auto"></div>
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
                Drop CPO drawings, PDFs, images, or spreadsheets
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Drop your drawing pack here or click to browse. Nix will extract the CPO line items
                for review before import.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-2 bg-[var(--sc-primary,#323288)] text-white rounded-md hover:bg-[var(--sc-primary-hover,#252560)] text-sm font-medium"
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
                    setOriginalPreviewRows([]);
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
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--sc-primary,#323288)] rounded-md hover:bg-[var(--sc-primary-hover,#252560)] disabled:opacity-50"
                >
                  {isImporting
                    ? "Importing..."
                    : `Create ${previewRows.length} CPO${previewRows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {previewRows.map((row, idx) => {
                const items = row.lineItems ? row.lineItems : [];
                return (
                  <div key={`row-${idx}`} className="px-6 py-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">CPO {idx + 1}</span>
                      <button
                        onClick={() => addPreviewLineItem(idx)}
                        className="text-xs font-medium text-[var(--sc-primary-hover,#252560)] hover:text-[var(--sc-primary-active,#1c1c48)]"
                      >
                        Add line item
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        ["jobNumber", "Job number"] as const,
                        ["jcNumber", "JC number"] as const,
                        ["pageNumber", "Page"] as const,
                        ["jobName", "Job name"] as const,
                        ["customerName", "Customer"] as const,
                        ["poNumber", "PO"] as const,
                        ["siteLocation", "Site"] as const,
                        ["contactPerson", "Contact"] as const,
                        ["dueDate", "Due"] as const,
                        ["reference", "Reference"] as const,
                      ].map(([field, label]) => {
                        const fieldValue = row[field];
                        return (
                          <label key={field} className="text-xs font-medium text-gray-600">
                            {label}
                            <input
                              value={fieldValue ? fieldValue : ""}
                              onChange={(e) => updatePreviewRow(idx, field, e.target.value)}
                              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                            />
                          </label>
                        );
                      })}
                      <label className="text-xs font-medium text-gray-600 md:col-span-3">
                        Description
                        <textarea
                          value={row.description ? row.description : ""}
                          onChange={(e) => updatePreviewRow(idx, "description", e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                      <label className="text-xs font-medium text-gray-600 md:col-span-3">
                        Notes
                        <textarea
                          value={row.notes ? row.notes : ""}
                          onChange={(e) => updatePreviewRow(idx, "notes", e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                        />
                      </label>
                    </div>

                    {items.length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left pr-4 py-1 font-medium">Code</th>
                              <th className="text-left pr-4 py-1 font-medium">Description</th>
                              <th className="text-left pr-4 py-1 font-medium">Item No</th>
                              <th className="text-right pr-4 py-1 font-medium">Qty</th>
                              <th className="text-left pr-4 py-1 font-medium">JT No</th>
                              <th className="text-right py-1 font-medium">m2</th>
                              <th className="text-left pl-4 py-1 font-medium">Notes</th>
                              <th className="text-right pl-4 py-1 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((li, liIdx) => {
                              const liItemCode = li.itemCode;
                              const liItemDescription = li.itemDescription;
                              const liItemNo = li.itemNo;
                              const liQuantity = li.quantity;
                              const liJtNo = li.jtNo;
                              const liNotes = li.notes;
                              return (
                                <tr key={`li-${idx}-${liIdx}`} className="text-gray-700">
                                  <td className="pr-4 py-1">
                                    <input
                                      value={liItemCode ? liItemCode : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(
                                          idx,
                                          liIdx,
                                          "itemCode",
                                          e.target.value,
                                        )
                                      }
                                      className="w-32 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pr-4 py-1">
                                    <input
                                      value={liItemDescription ? liItemDescription : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(
                                          idx,
                                          liIdx,
                                          "itemDescription",
                                          e.target.value,
                                        )
                                      }
                                      className="w-80 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pr-4 py-1">
                                    <input
                                      value={liItemNo ? liItemNo : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(idx, liIdx, "itemNo", e.target.value)
                                      }
                                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pr-4 py-1">
                                    <input
                                      value={liQuantity ? liQuantity : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(
                                          idx,
                                          liIdx,
                                          "quantity",
                                          e.target.value,
                                        )
                                      }
                                      className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pr-4 py-1">
                                    <input
                                      value={liJtNo ? liJtNo : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(idx, liIdx, "jtNo", e.target.value)
                                      }
                                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="py-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={li.m2 == null ? "" : String(li.m2)}
                                      onChange={(e) =>
                                        updatePreviewLineItem(idx, liIdx, "m2", e.target.value)
                                      }
                                      className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pl-4 py-1">
                                    <input
                                      value={liNotes ? liNotes : ""}
                                      onChange={(e) =>
                                        updatePreviewLineItem(idx, liIdx, "notes", e.target.value)
                                      }
                                      className="w-48 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                    />
                                  </td>
                                  <td className="pl-4 py-1 text-right">
                                    <button
                                      onClick={() => removePreviewLineItem(idx, liIdx)}
                                      className="text-xs font-medium text-red-600 hover:text-red-800"
                                    >
                                      Remove
                                    </button>
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
              <span className="text-2xl font-bold text-[var(--sc-primary,#323288)]">
                {importResult.created}
              </span>
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
              className="px-6 py-2 bg-[var(--sc-primary,#323288)] text-white rounded-md hover:bg-[var(--sc-primary-hover,#252560)] text-sm font-medium"
            >
              View Purchase Orders
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setPreviewRows([]);
                setOriginalPreviewRows([]);
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
