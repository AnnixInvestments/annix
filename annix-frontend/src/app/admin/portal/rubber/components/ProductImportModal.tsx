"use client";

import { useCallback, useState } from "react";
import { FileImportModal } from "@/app/components/modals/FileImportModal";
import {
  type ImportProductRowDto,
  type ImportProductsResultDto,
  rubberPortalApi,
} from "@/app/lib/api/rubberPortalApi";
import { useFileUpload } from "@/app/lib/hooks/useFileUpload";

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedRow extends ImportProductRowDto {
  _rowIndex: number;
  _parseErrors: string[];
}

const CSV_COLUMNS = [
  "title",
  "description",
  "type",
  "compound",
  "colour",
  "hardness",
  "grade",
  "curingMethod",
  "compoundOwner",
  "specificGravity",
  "costPerKg",
  "markup",
  "firebaseUid",
] as const;

function parseNumericField(
  val: string | undefined,
  fieldName: string,
): { value?: number; error?: string } {
  if (!val?.trim()) return {};
  const num = parseFloat(val.trim());
  if (Number.isNaN(num)) {
    return { error: `Invalid ${fieldName}: "${val}"` };
  }
  return { value: num };
}

function parseCSVLine(line: string): string[] {
  const result = line.split("").reduce(
    (acc, char, index) => {
      if (char === '"') {
        if (acc.inQuotes && line[index + 1] === '"') {
          return { ...acc, current: `${acc.current}"`, skipNext: true };
        }
        if (acc.skipNext) {
          return { ...acc, skipNext: false };
        }
        return { ...acc, inQuotes: !acc.inQuotes };
      }
      if (acc.skipNext) {
        return { ...acc, skipNext: false };
      }
      if (char === "," && !acc.inQuotes) {
        return { ...acc, values: [...acc.values, acc.current], current: "" };
      }
      return { ...acc, current: acc.current + char };
    },
    { values: [] as string[], current: "", inQuotes: false, skipNext: false },
  );
  return [...result.values, result.current];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const columnMap = headers.reduce(
    (map, header, index) => {
      const normalizedHeader = header.replace(/[_\s]/g, "").toLowerCase();
      const matchedColumn = CSV_COLUMNS.find(
        (col) =>
          col.toLowerCase() === normalizedHeader ||
          col.toLowerCase().replace(/[_\s]/g, "") === normalizedHeader,
      );
      if (matchedColumn) {
        return { ...map, [matchedColumn]: index };
      }
      return map;
    },
    {} as Record<string, number>,
  );

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line, index) => {
      const values = parseCSVLine(line);
      const parseErrors: string[] = [];

      const specificGravityResult = parseNumericField(
        values[columnMap.specificGravity],
        "specificGravity",
      );
      const costPerKgResult = parseNumericField(values[columnMap.costPerKg], "costPerKg");
      const markupResult = parseNumericField(values[columnMap.markup], "markup");

      if (specificGravityResult.error) parseErrors.push(specificGravityResult.error);
      if (costPerKgResult.error) parseErrors.push(costPerKgResult.error);
      if (markupResult.error) parseErrors.push(markupResult.error);

      return {
        _rowIndex: index + 1,
        _parseErrors: parseErrors,
        title:
          columnMap.title !== undefined ? values[columnMap.title]?.trim() || undefined : undefined,
        description:
          columnMap.description !== undefined
            ? values[columnMap.description]?.trim() || undefined
            : undefined,
        type:
          columnMap.type !== undefined ? values[columnMap.type]?.trim() || undefined : undefined,
        compound:
          columnMap.compound !== undefined
            ? values[columnMap.compound]?.trim() || undefined
            : undefined,
        colour:
          columnMap.colour !== undefined
            ? values[columnMap.colour]?.trim() || undefined
            : undefined,
        hardness:
          columnMap.hardness !== undefined
            ? values[columnMap.hardness]?.trim() || undefined
            : undefined,
        grade:
          columnMap.grade !== undefined ? values[columnMap.grade]?.trim() || undefined : undefined,
        curingMethod:
          columnMap.curingMethod !== undefined
            ? values[columnMap.curingMethod]?.trim() || undefined
            : undefined,
        compoundOwner:
          columnMap.compoundOwner !== undefined
            ? values[columnMap.compoundOwner]?.trim() || undefined
            : undefined,
        firebaseUid:
          columnMap.firebaseUid !== undefined
            ? values[columnMap.firebaseUid]?.trim() || undefined
            : undefined,
        specificGravity: specificGravityResult.value,
        costPerKg: costPerKgResult.value,
        markup: markupResult.value,
      };
    });
}

export function ProductImportModal(props: ProductImportModalProps) {
  const { isOpen, onClose, onImportComplete } = props;
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportProductsResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileUpload = useFileUpload({ accept: ".csv", multiple: false });

  const handleFileSelected = useCallback(
    (files: File[]) => {
      fileUpload.addFiles(files);
      const file = files[0];
      if (!file) return;

      setError(null);
      setImportResult(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          const rows = parseCSV(text);
          if (rows.length === 0) {
            setError(
              "No valid rows found in CSV file. Make sure the file has a header row and at least one data row.",
            );
            return;
          }
          setParsedRows(rows);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV file");
        }
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsText(file);
    },
    [fileUpload],
  );

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const rows: ImportProductRowDto[] = parsedRows.map((row) => {
        const { _rowIndex, _parseErrors, ...rest } = row;
        return rest;
      });

      const result = await rubberPortalApi.importProducts({ rows, updateExisting });
      setImportResult(result);

      if (result.created > 0 || result.updated > 0) {
        onImportComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setImportResult(null);
    setError(null);
    setUpdateExisting(false);
    fileUpload.clearFiles();
    onClose();
  };

  const rowsWithParseErrors = parsedRows.filter((r) => r._parseErrors.length > 0);
  const validRowCount = parsedRows.length - rowsWithParseErrors.length;

  return (
    <FileImportModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Products from CSV"
      accept=".csv"
      multiple={false}
      error={error || fileUpload.error}
      hideDropzone={!!importResult}
      maxWidth="max-w-5xl"
      files={fileUpload.files}
      onFilesSelected={handleFileSelected}
      onRemoveFile={(index) => {
        fileUpload.removeFile(index);
        setParsedRows([]);
      }}
      isDragging={fileUpload.isDragging}
      dragProps={fileUpload.dragProps}
      dropzoneLabel="Upload CSV File"
      dropzoneSubLabel="or click to browse"
      dropzoneHint="Expected columns: title, description, type, compound, colour, hardness, grade, curingMethod, compoundOwner, specificGravity, costPerKg, markup, firebaseUid"
      submitLabel={`Import ${validRowCount} Products`}
      onSubmit={!importResult && parsedRows.length > 0 ? handleImport : undefined}
      submitDisabled={isImporting || rowsWithParseErrors.length === parsedRows.length}
      loading={isImporting}
      cancelLabel={importResult ? "Close" : "Cancel"}
    >
      {!importResult && parsedRows.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} found
              {rowsWithParseErrors.length > 0 && (
                <span className="text-amber-600 ml-2">
                  ({rowsWithParseErrors.length} with parse errors)
                </span>
              )}
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Update existing products</span>
            </label>
          </div>

          <div className="border rounded-lg overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Title</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Compound</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Colour</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Cost/kg</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Markup</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Errors</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedRows.slice(0, 100).map((row) => {
                    const rowErrors = row._parseErrors;
                    const hasErrors = rowErrors.length > 0;
                    const costPerKg = row.costPerKg;
                    const markup = row.markup;
                    const costDisplay = costPerKg !== undefined ? costPerKg : "-";
                    const markupDisplay = markup !== undefined ? `${markup}%` : "-";
                    const rowTitle = row.title;
                    const titleDisplay = rowTitle ? rowTitle : "-";
                    const rowType = row.type;
                    const typeDisplay = rowType ? rowType : "-";
                    const rowCompound = row.compound;
                    const compoundDisplay = rowCompound ? rowCompound : "-";
                    const rowColour = row.colour;
                    const colourDisplay = rowColour ? rowColour : "-";
                    return (
                      <tr key={row._rowIndex} className={hasErrors ? "bg-amber-50" : ""}>
                        <td className="px-3 py-2 text-gray-500">{row._rowIndex}</td>
                        <td className="px-3 py-2">{titleDisplay}</td>
                        <td className="px-3 py-2">{typeDisplay}</td>
                        <td className="px-3 py-2">{compoundDisplay}</td>
                        <td className="px-3 py-2">{colourDisplay}</td>
                        <td className="px-3 py-2">{costDisplay}</td>
                        <td className="px-3 py-2">{markupDisplay}</td>
                        <td className="px-3 py-2 text-red-600">
                          {hasErrors ? rowErrors.join("; ") : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 100 && (
              <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500">
                Showing first 100 of {parsedRows.length} rows
              </div>
            )}
          </div>
        </>
      )}

      {importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{importResult.totalRows}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
              <div className="text-sm text-green-600">Created</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
              <div className="text-sm text-blue-600">Updated</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-500">{importResult.skipped}</div>
              <div className="text-sm text-gray-500">Skipped</div>
            </div>
          </div>

          {importResult.results.some((r) => r.status === "failed") && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <h3 className="font-medium text-red-800">Failed Rows</h3>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Title</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importResult.results
                      .filter((r) => r.status === "failed")
                      .map((result) => {
                        const resultTitle = result.title;
                        const resultTitleDisplay = resultTitle ? resultTitle : "-";
                        return (
                          <tr key={result.rowIndex}>
                            <td className="px-3 py-2 text-gray-500">{result.rowIndex + 1}</td>
                            <td className="px-3 py-2">{resultTitleDisplay}</td>
                            <td className="px-3 py-2 text-red-600">{result.errors.join("; ")}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </FileImportModal>
  );
}
