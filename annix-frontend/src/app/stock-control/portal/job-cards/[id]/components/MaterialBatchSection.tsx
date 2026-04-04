"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  IssuanceBatchRecord,
  QcDefelskoBatchRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

const PAINT_PATTERN =
  /paint|primer|coat|epoxy|polyurethane|topcoat|finish|hardtop|penguard|barrier/i;
const RUBBER_PATTERN = /rubber|lining|liner|ebonite|neoprene|butyl|natural|shore/i;
const SOLUTION_PATTERN = /solution|adhesive|cement|chemosil|chemlok|glue|bonding/i;

const TWO_PART_GENERIC_TYPES = new Set([
  "epoxy",
  "epoxy_mastic",
  "polyurethane",
  "polysiloxane",
  "zinc_rich",
]);

interface MaterialBatchSectionProps {
  jobCardId: number;
  batchRecords: IssuanceBatchRecord[];
  hasRubber: boolean;
  hasPaint: boolean;
  coatingAnalysis: CoatingAnalysis | null;
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

interface PaintProductRow {
  productName: string;
  fields: { fieldKey: string; partLabel: string | null }[];
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

function paintProductRows(coats: CoatingAnalysis["coats"] | null): PaintProductRow[] {
  if (!coats || coats.length === 0) {
    return [
      {
        productName: "Paint",
        fields: [{ fieldKey: "paint_batch_number", partLabel: null }],
      },
    ];
  }

  const seen = new Set<string>();
  return coats.reduce<PaintProductRow[]>((acc, coat, idx) => {
    const productKey = coat.product
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    if (seen.has(productKey)) return acc;
    seen.add(productKey);

    const isTwoPart = TWO_PART_GENERIC_TYPES.has(coat.genericType || "");

    if (isTwoPart) {
      return [
        ...acc,
        {
          productName: coat.product,
          fields: [
            { fieldKey: `paint_${idx}_part_a`, partLabel: "Part A" },
            { fieldKey: `paint_${idx}_part_b`, partLabel: "Part B" },
          ],
        },
      ];
    }
    return [
      ...acc,
      {
        productName: coat.product,
        fields: [{ fieldKey: `paint_${idx}_batch`, partLabel: null }],
      },
    ];
  }, []);
}

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

function CertLinkStatus(statusProps: {
  fieldKey: string;
  value: string;
  certLinks: Record<string, number | null>;
}) {
  const certId = statusProps.certLinks[statusProps.fieldKey];
  if (!statusProps.value) return null;
  if (certId) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 whitespace-nowrap">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        Cert linked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 whitespace-nowrap">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      No cert found
    </span>
  );
}

function deduplicateParts(parts: GroupedProduct["parts"]): GroupedProduct["parts"] {
  return parts.reduce<GroupedProduct["parts"]>((acc, part) => {
    const exists = acc.some((p) => p.batchNumber === part.batchNumber && p.role === part.role);
    return exists ? acc : [...acc, part];
  }, []);
}

export function MaterialBatchSection(props: MaterialBatchSectionProps) {
  const { jobCardId, batchRecords, hasRubber, hasPaint, coatingAnalysis } = props;

  const productRows = useMemo(
    () => paintProductRows(coatingAnalysis?.coats || null),
    [coatingAnalysis],
  );

  const allPaintFieldKeys = useMemo(
    () => productRows.flatMap((row) => row.fields.map((f) => f.fieldKey)),
    [productRows],
  );

  const [rubberManual, setRubberManual] = useState<ManualEntry[]>(
    RUBBER_MANUAL_FIELDS.map((f) => ({ ...f, value: "" })),
  );
  const [paintValues, setPaintValues] = useState<Record<string, string>>({});
  const [certLinks, setCertLinks] = useState<Record<string, number | null>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPaintValues((prev) => {
      const next = { ...prev };
      allPaintFieldKeys.forEach((key) => {
        if (next[key] === undefined) {
          next[key] = "";
        }
      });
      return next;
    });
  }, [allPaintFieldKeys]);

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
              (s: QcDefelskoBatchRecord) => s.fieldKey === entry.fieldKey,
            );
            return match ? { ...entry, value: match.batchNumber || "" } : entry;
          }),
        );
        setPaintValues((prev) => {
          const next = { ...prev };
          materialEntries.forEach((s: QcDefelskoBatchRecord) => {
            if (s.batchNumber) {
              next[s.fieldKey] = s.batchNumber;
            }
          });
          return next;
        });
        setCertLinks(
          materialEntries.reduce<Record<string, number | null>>(
            (acc, s: QcDefelskoBatchRecord) => ({
              ...acc,
              [s.fieldKey]: s.supplierCertificateId,
            }),
            {},
          ),
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
      const paintBatches = productRows.flatMap((row) =>
        row.fields.map((f) => ({
          fieldKey: f.fieldKey,
          category: "material_paint",
          label: f.partLabel ? `${row.productName} — ${f.partLabel}` : row.productName,
          batchNumber: paintValues[f.fieldKey] || null,
          notApplicable: false,
        })),
      );
      const batches = [
        ...rubberManual.map((e) => ({
          fieldKey: e.fieldKey,
          category: "material_rubber",
          label: e.label,
          batchNumber: e.value || null,
          notApplicable: false,
        })),
        ...paintBatches,
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

  const updatePaintValue = (fieldKey: string, value: string) => {
    setPaintValues((prev) => ({ ...prev, [fieldKey]: value }));
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
                      <CertLinkStatus
                        fieldKey={entry.fieldKey}
                        value={entry.value}
                        certLinks={certLinks}
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
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Manual Entry
                  </div>
                  {productRows.map((row) => {
                    const partCount = row.fields.length;
                    return (
                      <div
                        key={row.productName}
                        className="grid items-center gap-2"
                        style={{
                          gridTemplateColumns: `minmax(120px, 1fr) ${row.fields.map(() => "minmax(0, 1fr)").join(" ")}`,
                        }}
                      >
                        <div
                          className="text-xs text-gray-700 font-medium truncate"
                          title={row.productName}
                        >
                          {row.productName}
                        </div>
                        {row.fields.map((field) => (
                          <div key={field.fieldKey} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={paintValues[field.fieldKey] || ""}
                              onChange={(e) => updatePaintValue(field.fieldKey, e.target.value)}
                              placeholder={
                                partCount === 1
                                  ? "Enter batch number"
                                  : `${field.partLabel || "Batch"}`
                              }
                              className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            />
                            <CertLinkStatus
                              fieldKey={field.fieldKey}
                              value={paintValues[field.fieldKey] || ""}
                              certLinks={certLinks}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
