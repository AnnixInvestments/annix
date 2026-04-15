"use client";

import { useCallback, useState } from "react";
import type {
  ImportMatchRow,
  ReviewedImportResult,
  ReviewedRow,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ImportReviewStepProps {
  matchedRows: ImportMatchRow[];
  isStockTake: boolean;
  stockTakeDate: string | null;
  onComplete: (result: ReviewedImportResult) => void;
  onCancel: () => void;
}

interface EditableRow {
  index: number;
  action: "update" | "create" | "skip";
  matchedItemId: number | null;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: string;
  quantity: string;
  minStockLevel: string;
  location: string;
  originalImported: ImportMatchRow["imported"];
  originalMatch: ImportMatchRow["match"];
  matchConfidence: number;
  matchReason: string | null;
}

function confidenceBadge(confidence: number): { label: string; className: string } {
  if (confidence >= 0.9) {
    return { label: "Exact", className: "bg-green-100 text-green-800" };
  } else if (confidence >= 0.7) {
    return { label: "Likely", className: "bg-blue-100 text-blue-800" };
  } else if (confidence >= 0.4) {
    return { label: "Possible", className: "bg-amber-100 text-amber-800" };
  }
  return { label: "New", className: "bg-gray-100 text-gray-600" };
}

function initEditableRows(matched: ImportMatchRow[]): EditableRow[] {
  return matched.map((m) => {
    const hasMatch = m.match !== null;
    const matchedItemId = m.match?.id;
    const importedSku = m.imported.sku;
    const matchedSku = m.match?.sku;
    const importedName = m.imported.name;
    const matchedName = m.match?.name;
    const importedDescription = m.imported.description;
    const matchedDescription = m.match?.description;
    const importedCategory = m.imported.category;
    const matchedCategory = m.match?.category;
    const importedUnitOfMeasure = m.imported.unitOfMeasure;
    const matchedUnitOfMeasure = m.match?.unitOfMeasure;
    const importedCostPerUnit = m.imported.costPerUnit;
    const matchedCostPerUnit = m.match?.costPerUnit;
    const importedQuantity = m.imported.quantity;
    const importedMinStockLevel = m.imported.minStockLevel;
    const importedLocation = m.imported.location;
    const matchedLocation = m.match?.location;
    return {
      index: m.index,
      action: hasMatch ? "update" : "create",
      matchedItemId: matchedItemId || null,
      sku: importedSku || matchedSku || "",
      name: importedName || matchedName || "",
      description: importedDescription || matchedDescription || "",
      category: importedCategory || matchedCategory || "",
      unitOfMeasure: importedUnitOfMeasure || matchedUnitOfMeasure || "each",
      costPerUnit: String(importedCostPerUnit ?? matchedCostPerUnit ?? 0),
      quantity: String(importedQuantity ?? ""),
      minStockLevel: String(importedMinStockLevel ?? 0),
      location: importedLocation || matchedLocation || "",
      originalImported: m.imported,
      originalMatch: m.match,
      matchConfidence: m.matchConfidence,
      matchReason: m.matchReason,
    };
  });
}

function buildCorrections(
  row: EditableRow,
): { field: string; originalValue: string | null; correctedValue: string | null }[] {
  const corrections: {
    field: string;
    originalValue: string | null;
    correctedValue: string | null;
  }[] = [];
  const orig = row.originalImported;
  const match = row.originalMatch;

  if (row.action === "update" && match) {
    const importedName = orig.name;
    const matchedName = match.name;
    const importedDescription = orig.description;
    const matchedDescription = match.description;
    const importedSku = orig.sku;
    const matchedSku = match.sku;
    const importedCategory = orig.category;
    const matchedCategory = match.category;
    const originalName = importedName || matchedName || "";
    const originalDescription = importedDescription || matchedDescription || "";
    const originalSku = importedSku || matchedSku || "";
    const originalCategory = importedCategory || matchedCategory || "";

    const correctedName = row.name;
    const correctedDescription = row.description;
    const correctedSku = row.sku;
    const correctedCategory = row.category;

    if (row.name !== originalName) {
      corrections.push({
        field: "name",
        originalValue: originalName || null,
        correctedValue: correctedName || null,
      });
    }
    if (row.description !== originalDescription) {
      corrections.push({
        field: "description",
        originalValue: originalDescription || null,
        correctedValue: correctedDescription || null,
      });
    }
    if (row.sku !== originalSku) {
      corrections.push({
        field: "sku",
        originalValue: originalSku || null,
        correctedValue: correctedSku || null,
      });
    }
    if (row.category !== originalCategory) {
      corrections.push({
        field: "category",
        originalValue: originalCategory || null,
        correctedValue: correctedCategory || null,
      });
    }
  } else if (row.action === "create" && orig.name && row.name !== orig.name) {
    const originalName = orig.name;
    const correctedName = row.name;
    corrections.push({
      field: "name",
      originalValue: originalName || null,
      correctedValue: correctedName || null,
    });
  }

  return corrections;
}

export function ImportReviewStep(props: ImportReviewStepProps) {
  const { matchedRows, isStockTake, stockTakeDate, onComplete, onCancel } = props;
  const [rows, setRows] = useState<EditableRow[]>(() => initEditableRows(matchedRows));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "matched" | "new">("all");

  const updateRow = useCallback((index: number, field: keyof EditableRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, [field]: value } : r)));
  }, []);

  const toggleAction = useCallback((index: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.index !== index) {
          return r;
        }
        const nextAction =
          r.action === "update"
            ? "create"
            : r.action === "create"
              ? "skip"
              : r.originalMatch
                ? "update"
                : "create";
        return { ...r, action: nextAction };
      }),
    );
  }, []);

  const deleteRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((r) => r.index !== index));
  }, []);

  const addRow = useCallback(() => {
    const maxIndex = rows.reduce((max, r) => Math.max(max, r.index), 0);
    const newRow: EditableRow = {
      index: maxIndex + 1,
      action: "create",
      matchedItemId: null,
      sku: "",
      name: "",
      description: "",
      category: "",
      unitOfMeasure: "each",
      costPerUnit: "0",
      quantity: "",
      minStockLevel: "0",
      location: "",
      originalImported: {},
      originalMatch: null,
      matchConfidence: 0,
      matchReason: null,
    };
    setRows((prev) => [...prev, newRow]);
  }, [rows]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const reviewedRows: ReviewedRow[] = rows.map((r) => {
        const description = r.description;
        const category = r.category;
        const unitOfMeasure = r.unitOfMeasure;
        const costPerUnit = r.costPerUnit;
        const quantity = r.quantity;
        const minStockLevel = r.minStockLevel;
        const location = r.location;
        return {
          index: r.index,
          action: r.action,
          matchedItemId: r.action === "update" ? r.matchedItemId : null,
          sku: r.sku,
          name: r.name,
          description: description || null,
          category: category || null,
          unitOfMeasure: unitOfMeasure || "each",
          costPerUnit: Number(costPerUnit) || 0,
          quantity: Number(quantity) || 0,
          minStockLevel: Number(minStockLevel) || 0,
          location: location || null,
          corrections: buildCorrections(r),
        };
      });

      const result = await stockControlApiClient.confirmReviewedImport(
        reviewedRows,
        isStockTake,
        isStockTake ? stockTakeDate : null,
      );
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchedCount = rows.filter((r) => r.originalMatch !== null).length;
  const newCount = rows.filter((r) => r.originalMatch === null).length;
  const skipCount = rows.filter((r) => r.action === "skip").length;

  const filteredRows =
    filterMode === "matched"
      ? rows.filter((r) => r.originalMatch !== null)
      : filterMode === "new"
        ? rows.filter((r) => r.originalMatch === null)
        : rows;

  return (
    <div className="space-y-4">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Review Import Matches</h3>
              <p className="mt-1 text-sm text-gray-500">
                Nix matched {matchedCount} items to existing inventory. {newCount} items are new.
                Review each row and edit fields as needed — Nix learns from your corrections.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || rows.length === 0}
                className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Importing..."
                  : `Confirm Import (${rows.length - skipCount} items)`}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex gap-3 text-xs">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-green-800 font-medium">
                {matchedCount} matched
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 font-medium">
                {newCount} new
              </span>
              {skipCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-red-700 font-medium">
                  {skipCount} skipped
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1">
              {(["all", "matched", "new"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium ${
                    filterMode === mode
                      ? "bg-teal-100 text-teal-800"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {mode === "all" ? "All" : mode === "matched" ? "Matched" : "New"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-16">Action</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-12">Match</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-28">SKU</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-40">Description</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-24">Category</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-16">UOM</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-20">Cost</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-16">Qty</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-16">Min</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-24">Location</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const badge = confidenceBadge(row.matchConfidence);
                const isSkipped = row.action === "skip";
                const matchReason = row.matchReason;
                const title = matchReason || "No match found";
                const importedName = row.originalImported.name;
                const matchedName = row.originalMatch?.name;
                const originalName = importedName || matchedName || "";
                return (
                  <tr
                    key={row.index}
                    className={isSkipped ? "bg-gray-50 opacity-50" : "hover:bg-gray-50"}
                  >
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => toggleAction(row.index)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          row.action === "update"
                            ? "bg-blue-100 text-blue-700"
                            : row.action === "create"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                        }`}
                        title="Click to cycle: Update / Create New / Skip"
                      >
                        {row.action === "update"
                          ? "Update"
                          : row.action === "create"
                            ? "Create"
                            : "Skip"}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
                        title={title}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.sku}
                        onChange={(e) => updateRow(row.index, "sku", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                      {row.originalMatch && row.sku !== row.originalMatch.sku && (
                        <div className="text-[10px] text-gray-400 mt-0.5 line-through">
                          {row.originalMatch.sku}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.index, "name", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                      {row.originalMatch && row.name !== originalName && (
                        <div className="text-[10px] text-gray-400 mt-0.5 line-through">
                          {row.originalMatch.name}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.index, "description", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.category}
                        onChange={(e) => updateRow(row.index, "category", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.unitOfMeasure}
                        onChange={(e) => updateRow(row.index, "unitOfMeasure", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.costPerUnit}
                        onChange={(e) => updateRow(row.index, "costPerUnit", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.index, "quantity", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs font-medium"
                        disabled={isSkipped}
                      />
                      {row.originalMatch && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          SOH: {row.originalMatch.quantity}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.minStockLevel}
                        onChange={(e) => updateRow(row.index, "minStockLevel", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => updateRow(row.index, "location", e.target.value)}
                        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                        disabled={isSkipped}
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.index)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove row"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Row
          </button>
        </div>
      </div>
    </div>
  );
}
