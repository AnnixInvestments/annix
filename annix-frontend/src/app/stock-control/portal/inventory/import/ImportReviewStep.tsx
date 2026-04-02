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
    return {
      index: m.index,
      action: hasMatch ? "update" : "create",
      matchedItemId: m.match?.id || null,
      sku: m.imported.sku || m.match?.sku || "",
      name: m.imported.name || m.match?.name || "",
      description: m.imported.description || m.match?.description || "",
      category: m.imported.category || m.match?.category || "",
      unitOfMeasure: m.imported.unitOfMeasure || m.match?.unitOfMeasure || "each",
      costPerUnit: String(m.imported.costPerUnit ?? m.match?.costPerUnit ?? 0),
      quantity: String(m.imported.quantity ?? ""),
      minStockLevel: String(m.imported.minStockLevel ?? 0),
      location: m.imported.location || m.match?.location || "",
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
    if (row.name !== (orig.name || match.name || "")) {
      corrections.push({
        field: "name",
        originalValue: orig.name || match.name || null,
        correctedValue: row.name || null,
      });
    }
    if (row.description !== (orig.description || match.description || "")) {
      corrections.push({
        field: "description",
        originalValue: orig.description || match.description || null,
        correctedValue: row.description || null,
      });
    }
    if (row.sku !== (orig.sku || match.sku || "")) {
      corrections.push({
        field: "sku",
        originalValue: orig.sku || match.sku || null,
        correctedValue: row.sku || null,
      });
    }
    if (row.category !== (orig.category || match.category || "")) {
      corrections.push({
        field: "category",
        originalValue: orig.category || match.category || null,
        correctedValue: row.category || null,
      });
    }
  } else if (row.action === "create" && orig.name && row.name !== orig.name) {
    corrections.push({
      field: "name",
      originalValue: orig.name || null,
      correctedValue: row.name || null,
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

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const reviewedRows: ReviewedRow[] = rows.map((r) => ({
        index: r.index,
        action: r.action,
        matchedItemId: r.action === "update" ? r.matchedItemId : null,
        sku: r.sku,
        name: r.name,
        description: r.description || null,
        category: r.category || null,
        unitOfMeasure: r.unitOfMeasure || "each",
        costPerUnit: Number(r.costPerUnit) || 0,
        quantity: Number(r.quantity) || 0,
        minStockLevel: Number(r.minStockLevel) || 0,
        location: r.location || null,
        corrections: buildCorrections(r),
      }));

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => {
                const badge = confidenceBadge(row.matchConfidence);
                const isSkipped = row.action === "skip";
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
                        title={row.matchReason || "No match found"}
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
                      {row.originalMatch &&
                        row.name !==
                          (row.originalImported.name || row.originalMatch.name || "") && (
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
