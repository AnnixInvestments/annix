import type { ImportResult, InventoryColumnMapping } from "@/app/lib/api/stockControlApi";
import {
  isRandColumn,
  isImportRowBlank,
  isImportSectionTitle,
  formatRandCell,
} from "../../lib/useInventoryPageState";

interface InventoryImportOverlayProps {
  isDragging: boolean;
  importStep: string;
  importFileName: string | null;
  importFormat: string | null;
  importHeaders: string[];
  importRawRows: string[][];
  importMapping: InventoryColumnMapping | null;
  importError: string | null;
  importResult: ImportResult | null;
  parsedRows: Record<string, unknown>[];
  isStockTakeMode: boolean;
  isPrintingLabels: boolean;
  onStockTakeModeChange: (checked: boolean) => void;
  onConfirmImport: () => void;
  onDismissImport: () => void;
  onClearImportError: () => void;
}

export function InventoryImportOverlay({
  isDragging,
  importStep,
  importFileName,
  importFormat,
  importHeaders,
  importRawRows,
  importMapping,
  importError,
  importResult,
  parsedRows,
  isStockTakeMode,
  isPrintingLabels,
  onStockTakeModeChange,
  onConfirmImport,
  onDismissImport,
  onClearImportError,
}: InventoryImportOverlayProps) {
  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/20 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-teal-500">
            <svg
              className="mx-auto h-16 w-16 text-teal-500"
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
            <p className="mt-4 text-lg font-semibold text-gray-900">Drop file to import</p>
            <p className="mt-1 text-sm text-gray-500">Excel, CSV, or PDF</p>
          </div>
        </div>
      )}

      {importStep === "parsing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Parsing {importFileName}...</p>
          </div>
        </div>
      )}

      {importStep === "preview" && (
        <ImportPreviewModal
          importFileName={importFileName}
          importFormat={importFormat}
          importHeaders={importHeaders}
          importRawRows={importRawRows}
          importMapping={importMapping}
          importError={importError}
          parsedRows={parsedRows}
          isStockTakeMode={isStockTakeMode}
          onStockTakeModeChange={onStockTakeModeChange}
          onConfirmImport={onConfirmImport}
          onDismissImport={onDismissImport}
        />
      )}

      {importStep === "importing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/75">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">Importing items...</p>
          </div>
        </div>
      )}

      {importStep === "result" && importResult && (
        <ImportResultModal importResult={importResult} onDismiss={onDismissImport} />
      )}

      {isPrintingLabels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Labels</h3>
              <p className="text-sm text-gray-500 text-center">
                Please wait while we prepare your PDF. This may take a moment...
              </p>
            </div>
          </div>
        </div>
      )}

      {importError && importStep === "idle" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 mr-2"
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
            <p className="text-sm text-red-700">{importError}</p>
          </div>
          <button onClick={onClearImportError} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

interface ImportPreviewModalProps {
  importFileName: string | null;
  importFormat: string | null;
  importHeaders: string[];
  importRawRows: string[][];
  importMapping: InventoryColumnMapping | null;
  importError: string | null;
  parsedRows: Record<string, unknown>[];
  isStockTakeMode: boolean;
  onStockTakeModeChange: (checked: boolean) => void;
  onConfirmImport: () => void;
  onDismissImport: () => void;
}

function ImportPreviewModal({
  importFileName,
  importFormat,
  importHeaders,
  importRawRows,
  importMapping,
  importError,
  parsedRows,
  isStockTakeMode,
  onStockTakeModeChange,
  onConfirmImport,
  onDismissImport,
}: ImportPreviewModalProps) {
  const nonBlankRowCount =
    importFormat === "excel"
      ? importRawRows.filter((r) => !isImportRowBlank(r)).length
      : parsedRows.length;

  const canConfirm = importFormat === "excel" ? importRawRows.length > 0 : parsedRows.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onDismissImport}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Import Preview</h3>
              <p className="text-sm text-gray-500">
                {importFileName} - {nonBlankRowCount} rows parsed
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onDismissImport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmImport}
                disabled={!canConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
              >
                Confirm Import ({nonBlankRowCount} rows)
              </button>
            </div>
          </div>
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isStockTakeMode}
                onChange={(e) => onStockTakeModeChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-medium text-amber-800">Monthly Stock Take</span>
                <p className="text-xs text-amber-600">
                  Overwrites quantities instead of adding. New items will be highlighted until labels
                  are printed.
                </p>
              </div>
            </label>
          </div>
          {importMapping && (
            <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                AI mapped columns:{" "}
                {Object.entries(importMapping)
                  .filter(([, v]) => v !== null)
                  .map(
                    ([field, colIdx]) => `${field} -> "${importHeaders[colIdx as number]}"`,
                  )
                  .join(", ") || "No columns mapped"}
              </p>
            </div>
          )}
          {importError && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          )}
          <div className="overflow-x-auto max-h-96">
            {importFormat === "excel" ? (
              <ExcelPreviewTable
                importHeaders={importHeaders}
                importRawRows={importRawRows}
              />
            ) : (
              <GenericPreviewTable parsedRows={parsedRows} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExcelPreviewTableProps {
  importHeaders: string[];
  importRawRows: string[][];
}

function ExcelPreviewTable({ importHeaders, importRawRows }: ExcelPreviewTableProps) {
  const headersEmpty = importHeaders.every((h) => h.trim() === "");
  const effectiveHeaders = headersEmpty ? importRawRows[0] || [] : importHeaders;
  const effectiveDataRows = headersEmpty ? importRawRows.slice(1) : importRawRows;

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
          {effectiveHeaders.map((header, idx) => (
            <th
              key={idx}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {effectiveDataRows
          .filter((row) => !isImportRowBlank(row))
          .map((row, rowIdx) => {
            const sectionTitle = isImportSectionTitle(row);
            return (
              <tr key={rowIdx} className={sectionTitle ? "bg-gray-100" : "hover:bg-gray-50"}>
                <td className="px-4 py-3 text-sm text-gray-500">{rowIdx + 1}</td>
                {effectiveHeaders.map((header, colIdx) => {
                  const cell = row[colIdx] || "";
                  const displayValue =
                    sectionTitle && (cell.trim() === "0" || cell.trim() === "")
                      ? ""
                      : isRandColumn(header) && !sectionTitle
                        ? formatRandCell(cell)
                        : cell;
                  return (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-sm text-gray-900 ${sectionTitle ? "font-bold" : ""}`}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}

interface GenericPreviewTableProps {
  parsedRows: Record<string, unknown>[];
}

function GenericPreviewTable({ parsedRows }: GenericPreviewTableProps) {
  if (parsedRows.length === 0) return null;

  const headers = Object.keys(parsedRows[0]);

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
          {headers.map((header) => (
            <th
              key={header}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {parsedRows.map((row, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
            {headers.map((header) => (
              <td key={header} className="px-4 py-3 text-sm text-gray-900">
                {String(row[header] || "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ImportResultModalProps {
  importResult: ImportResult;
  onDismiss: () => void;
}

function ImportResultModal({ importResult, onDismiss }: ImportResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onDismiss}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Complete</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
              <div className="text-sm text-green-600">Created</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
              <div className="text-sm text-blue-600">Updated</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {importResult.errors.length}
              </div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto space-y-1">
              {importResult.errors.map((err, index) => (
                <div key={index} className="text-sm text-red-700">
                  <span className="font-medium">Row {err.row}:</span> {err.message}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
