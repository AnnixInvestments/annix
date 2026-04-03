"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IssuanceBatchRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

const PAINT_PATTERN =
  /paint|primer|coat|epoxy|polyurethane|topcoat|finish|hardtop|penguard|barrier/i;
const RUBBER_PATTERN = /rubber|lining|liner|ebonite|neoprene|butyl|natural|shore/i;
const SOLUTION_PATTERN = /solution|adhesive|cement|chemosil|chemlok|glue|bonding/i;

interface MaterialBatchSectionProps {
  jobCardId: number;
  batchRecords: IssuanceBatchRecord[];
  hasRubber: boolean;
  hasPaint: boolean;
}

interface GroupedProduct {
  productName: string;
  parts: {
    role: string | null;
    batchNumber: string;
    rollNumber: string | null;
    quantity: number;
  }[];
}

interface ManualEntry {
  fieldKey: string;
  label: string;
  value: string;
}

const RUBBER_MANUAL_FIELDS: { fieldKey: string; label: string }[] = [
  { fieldKey: "rubber_roll_number", label: "Roll Number" },
  { fieldKey: "rubber_batch_number", label: "Rubber Batch Number" },
  { fieldKey: "solution_batch_number", label: "Solution Batch Number" },
];

const PAINT_MANUAL_FIELDS: { fieldKey: string; label: string }[] = [
  { fieldKey: "paint_batch_number", label: "Paint Batch Number" },
];

function groupByProduct(records: IssuanceBatchRecord[]): GroupedProduct[] {
  const grouped = records.reduce<Record<string, GroupedProduct>>((acc, rec) => {
    const item = rec.stockItem;
    const groupKey = item?.componentGroup || item?.name || "Unknown";
    const existing = acc[groupKey] || { productName: groupKey, parts: [] };
    return {
      ...acc,
      [groupKey]: {
        ...existing,
        parts: [
          ...existing.parts,
          {
            role: item?.componentRole || null,
            batchNumber: rec.batchNumber,
            rollNumber: item?.rollNumber || null,
            quantity: rec.quantity,
          },
        ],
      },
    };
  }, {});
  return Object.values(grouped);
}

function deduplicateParts(parts: GroupedProduct["parts"]): GroupedProduct["parts"] {
  return parts.reduce<GroupedProduct["parts"]>((acc, part) => {
    const exists = acc.some((p) => p.batchNumber === part.batchNumber && p.role === part.role);
    return exists ? acc : [...acc, part];
  }, []);
}

export function MaterialBatchSection(props: MaterialBatchSectionProps) {
  const { jobCardId, batchRecords, hasRubber, hasPaint } = props;

  const [rubberManual, setRubberManual] = useState<ManualEntry[]>(
    RUBBER_MANUAL_FIELDS.map((f) => ({ ...f, value: "" })),
  );
  const [paintManual, setPaintManual] = useState<ManualEntry[]>(
    PAINT_MANUAL_FIELDS.map((f) => ({ ...f, value: "" })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadSavedBatches = useCallback(async () => {
    try {
      const saved = await stockControlApiClient.defelskoBatchesForJobCard(jobCardId);
      const materialEntries = (saved || []).filter(
        (b: { category: string }) =>
          b.category === "material_rubber" || b.category === "material_paint",
      );

      if (materialEntries.length > 0) {
        setRubberManual((prev) =>
          prev.map((entry) => {
            const match = materialEntries.find(
              (s: { fieldKey: string }) => s.fieldKey === entry.fieldKey,
            );
            return match ? { ...entry, value: match.batchNumber || "" } : entry;
          }),
        );
        setPaintManual((prev) =>
          prev.map((entry) => {
            const match = materialEntries.find(
              (s: { fieldKey: string }) => s.fieldKey === entry.fieldKey,
            );
            return match ? { ...entry, value: match.batchNumber || "" } : entry;
          }),
        );
      }
    } catch {
      // Silently fail — manual fields just start empty
    } finally {
      setLoaded(true);
    }
  }, [jobCardId]);

  useEffect(() => {
    loadSavedBatches();
  }, [loadSavedBatches]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const batches = [
        ...rubberManual.map((e) => ({
          fieldKey: e.fieldKey,
          category: "material_rubber",
          label: e.label,
          batchNumber: e.value || null,
          notApplicable: false,
        })),
        ...paintManual.map((e) => ({
          fieldKey: e.fieldKey,
          category: "material_paint",
          label: e.label,
          batchNumber: e.value || null,
          notApplicable: false,
        })),
      ];
      await stockControlApiClient.saveDefelskoBatches(jobCardId, { batches });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const rubberRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const name = r.stockItem?.name || "";
        return RUBBER_PATTERN.test(name) || SOLUTION_PATTERN.test(name);
      }),
    [batchRecords],
  );

  const paintRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const name = r.stockItem?.name || "";
        return (
          PAINT_PATTERN.test(name) && !RUBBER_PATTERN.test(name) && !SOLUTION_PATTERN.test(name)
        );
      }),
    [batchRecords],
  );

  const rubberProducts = useMemo(() => groupByProduct(rubberRecords), [rubberRecords]);
  const paintProducts = useMemo(() => groupByProduct(paintRecords), [paintRecords]);

  const showRubber = hasRubber;
  const showPaint = hasPaint;

  if (!showRubber && !showPaint) {
    return null;
  }

  const updateRubberField = (fieldKey: string, value: string) => {
    setRubberManual((prev) => prev.map((e) => (e.fieldKey === fieldKey ? { ...e, value } : e)));
  };

  const updatePaintField = (fieldKey: string, value: string) => {
    setPaintManual((prev) => prev.map((e) => (e.fieldKey === fieldKey ? { ...e, value } : e)));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Material Batch Numbers</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-populated from stock issuances, or enter manually
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="text-xs text-green-600">Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className={showRubber && showPaint ? "grid grid-cols-2 gap-8" : ""}>
          {showRubber && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Rubber
              </h4>

              {rubberRecords.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    From Stock Issuances
                  </div>
                  {rubberProducts.map((product) => (
                    <div key={product.productName} className="text-sm">
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="mt-1 space-y-0.5">
                        {deduplicateParts(product.parts).map((part, idx) => (
                          <div
                            key={`${part.batchNumber}-${idx}`}
                            className="flex items-center gap-2 text-gray-600 text-xs"
                          >
                            {part.rollNumber && (
                              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 font-medium">
                                Roll: {part.rollNumber}
                              </span>
                            )}
                            <span>Batch: {part.batchNumber}</span>
                            {part.role && <span className="text-gray-400">({part.role})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loaded && (
                <div className="space-y-2">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Manual Entry
                  </div>
                  {rubberManual.map((entry) => (
                    <div key={entry.fieldKey} className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 w-36 flex-shrink-0">
                        {entry.label}
                      </label>
                      <input
                        type="text"
                        value={entry.value}
                        onChange={(e) => updateRubberField(entry.fieldKey, e.target.value)}
                        placeholder="Enter batch/roll number"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showPaint && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Paint
              </h4>

              {paintRecords.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    From Stock Issuances
                  </div>
                  {paintProducts.map((product) => (
                    <div key={product.productName} className="text-sm">
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="mt-1 space-y-0.5">
                        {deduplicateParts(product.parts).map((part, idx) => (
                          <div
                            key={`${part.batchNumber}-${idx}`}
                            className="flex items-center gap-2 text-gray-600 text-xs"
                          >
                            <span>Batch: {part.batchNumber}</span>
                            {part.role && <span className="text-gray-400">({part.role})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loaded && (
                <div className="space-y-2">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Manual Entry
                  </div>
                  {paintManual.map((entry) => (
                    <div key={entry.fieldKey} className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 w-36 flex-shrink-0">
                        {entry.label}
                      </label>
                      <input
                        type="text"
                        value={entry.value}
                        onChange={(e) => updatePaintField(entry.fieldKey, e.target.value)}
                        placeholder="Enter batch number"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
