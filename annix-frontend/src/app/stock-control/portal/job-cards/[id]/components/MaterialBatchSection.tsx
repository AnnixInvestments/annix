"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  IssuanceBatchRecord,
  QcControlPlanRecord,
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
  rubberPlanOverride?: { manualRolls?: any[] | null } | null;
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

const SOLUTION_ACTIVITY_PATTERN =
  /hero bond|ty bond|chemosil|chemlok|adhesive|bonding agent|primer bond/i;

function rubberManualFields(
  rollCount: number,
  solutionDescriptions: string[],
): { fieldKey: string; label: string }[] {
  const rollFields = Array.from({ length: rollCount }, (_, i) => ({
    fieldKey: `rubber_roll_batch_${i}`,
    label: rollCount === 1 ? "Roll/Batch Number" : `Roll/Batch Number ${i + 1}`,
  }));

  const solutionFields =
    solutionDescriptions.length > 0
      ? solutionDescriptions.map((desc, i) => ({
          fieldKey: `solution_batch_${i}`,
          label: `${desc} Batch Number`,
        }))
      : [{ fieldKey: "solution_batch_number", label: "Solution Batch Number" }];

  return [...rollFields, ...solutionFields];
}

function paintProductRows(
  coats: CoatingAnalysis["coats"] | null,
  rawNotes: string | null,
): PaintProductRow[] {
  if (!coats || coats.length === 0) {
    return [
      {
        productName: "Paint",
        fields: [{ fieldKey: "paint_batch_number", partLabel: null }],
      },
    ];
  }

  const notesUpper = rawNotes ? rawNotes.toUpperCase() : "";
  const bandingIdx = notesUpper.indexOf("BANDING");
  const preBanding = bandingIdx >= 0 ? notesUpper.substring(0, bandingIdx) : notesUpper;
  const postBanding = bandingIdx >= 0 ? notesUpper.substring(bandingIdx) : "";

  const seen = new Set<string>();
  return coats.reduce<PaintProductRow[]>((acc, coat, idx) => {
    const productUpper = coat.product ? coat.product.toUpperCase() : "";
    const inBandingOnly =
      postBanding.length > 0 &&
      productUpper.length > 0 &&
      postBanding.includes(productUpper) &&
      !preBanding.includes(productUpper);
    if (inBandingOnly) return acc;

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
    const rawComponentGroup = item ? item.componentGroup : null;
    const rawItemName = item ? item.name : null;
    const groupKey = rawComponentGroup || rawItemName || "Unknown";
    const rawExisting = acc[groupKey];
    const existing = rawExisting || { productName: groupKey, parts: [] };
    const rawRole = item ? item.componentRole : null;
    const role = rawRole || null;
    const rawRollNumber = item ? item.rollNumber : null;
    const rollNumber = rawRollNumber || null;
    return {
      ...acc,
      [groupKey]: {
        ...existing,
        parts: [
          ...existing.parts,
          {
            role,
            batchNumber: rec.batchNumber,
            rollNumber,
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

interface OffcutUsedInfo {
  sourceRollNumber: string | null;
  rollNumber: string | null;
  sourceJobCardId: number | null;
  sourceJobCard: { jobNumber: string | null } | null;
  widthMm: number | null;
  lengthM: number | null;
  thicknessMm: number | null;
}

export function MaterialBatchSection(props: MaterialBatchSectionProps) {
  const { jobCardId, batchRecords, hasRubber, hasPaint, coatingAnalysis, rubberPlanOverride } =
    props;

  const productRows = useMemo(() => {
    const coats = coatingAnalysis ? coatingAnalysis.coats : null;
    const rawNotes = coatingAnalysis ? coatingAnalysis.rawNotes : null;
    return paintProductRows(coats || null, rawNotes || null);
  }, [coatingAnalysis]);

  const allPaintFieldKeys = useMemo(
    () => productRows.flatMap((row) => row.fields.map((f) => f.fieldKey)),
    [productRows],
  );

  const [solutionDescriptions, setSolutionDescriptions] = useState<string[]>([]);
  const [extraRolls, setExtraRolls] = useState(0);

  useEffect(() => {
    if (!hasRubber) return;
    stockControlApiClient
      .controlPlansForJobCard(jobCardId)
      .then((plans: QcControlPlanRecord[]) => {
        const rubberPlan = plans.find((p) => p.planType === "rubber");
        if (!rubberPlan) return;
        const solutions = rubberPlan.activities
          .filter((a) => SOLUTION_ACTIVITY_PATTERN.test(a.description))
          .map((a) => a.description);
        if (solutions.length > 0) {
          setSolutionDescriptions(solutions);
        }
      })
      .catch(() => {});
  }, [jobCardId, hasRubber]);

  const baseRollCount = useMemo(() => {
    const manualRolls = rubberPlanOverride ? rubberPlanOverride.manualRolls : null;
    if (manualRolls && manualRolls.length > 0) {
      return manualRolls.length;
    }
    const rubberBatchItems = batchRecords.filter((r) => {
      const rawStockName = r.stockItem ? r.stockItem.name : null;
      const name = rawStockName || "";
      return RUBBER_PATTERN.test(name) && !SOLUTION_PATTERN.test(name);
    });
    const uniqueRolls = new Set(
      rubberBatchItems.map((r) => (r.stockItem ? r.stockItem.rollNumber : null)).filter(Boolean),
    );
    if (uniqueRolls.size > 0) return uniqueRolls.size;
    return 1;
  }, [rubberPlanOverride, batchRecords]);

  const rubberRollCount = baseRollCount + extraRolls;

  const rubberFields = useMemo(
    () => rubberManualFields(rubberRollCount, solutionDescriptions),
    [rubberRollCount, solutionDescriptions],
  );

  const [rubberManual, setRubberManual] = useState<ManualEntry[]>(
    rubberFields.map((f) => ({ ...f, value: "" })),
  );

  const [offcutsUsed, setOffcutsUsed] = useState<OffcutUsedInfo[]>([]);
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

  useEffect(() => {
    setRubberManual((prev) => {
      return rubberFields.map((f) => {
        const existing = prev.find((p) => p.fieldKey === f.fieldKey);
        return existing ? { ...f, value: existing.value } : { ...f, value: "" };
      });
    });
  }, [rubberFields]);

  const loadSavedBatches = useCallback(async () => {
    try {
      const saved = await stockControlApiClient.defelskoBatchesForJobCard(jobCardId);
      const materialEntries = (saved || []).filter(
        (b: { category: string }) =>
          b.category === "material_rubber" || b.category === "material_paint",
      );

      if (materialEntries.length > 0) {
        setRubberManual((prev) => {
          const migratedPrev = prev.map((entry) => {
            const match = materialEntries.find(
              (s: QcDefelskoBatchRecord) => s.fieldKey === entry.fieldKey,
            );
            return match ? { ...entry, value: match.batchNumber || "" } : entry;
          });

          const hasNewKeys = materialEntries.some(
            (s: QcDefelskoBatchRecord) => s.fieldKey === "rubber_roll_batch_0",
          );
          if (!hasNewKeys) {
            const oldRollMatch = materialEntries.find(
              (s: QcDefelskoBatchRecord) => s.fieldKey === "rubber_roll_number",
            );
            const oldRollVal = oldRollMatch ? oldRollMatch.batchNumber : "";
            const oldBatchMatch = materialEntries.find(
              (s: QcDefelskoBatchRecord) => s.fieldKey === "rubber_batch_number",
            );
            const oldBatchVal = oldBatchMatch ? oldBatchMatch.batchNumber : "";
            const mergedVal = [oldRollVal, oldBatchVal].filter(Boolean).join(" / ");
            if (mergedVal) {
              return migratedPrev.map((entry) =>
                entry.fieldKey === "rubber_roll_batch_0" ? { ...entry, value: mergedVal } : entry,
              );
            }
          }

          const oldSolutionMatch = materialEntries.find(
            (s: QcDefelskoBatchRecord) => s.fieldKey === "solution_batch_number",
          );
          const oldSolutionVal = oldSolutionMatch ? oldSolutionMatch.batchNumber : null;
          const hasNewSolutionKeys = materialEntries.some(
            (s: QcDefelskoBatchRecord) => s.fieldKey === "solution_batch_0",
          );
          if (oldSolutionVal && !hasNewSolutionKeys) {
            return migratedPrev.map((entry) =>
              entry.fieldKey === "solution_batch_0" ? { ...entry, value: oldSolutionVal } : entry,
            );
          }

          return migratedPrev;
        });
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

  useEffect(() => {
    if (!hasRubber) return;
    stockControlApiClient
      .jobCardOffcutsUsed(jobCardId)
      .then((allocations) => {
        const mapped = (allocations || []).map((a: any) => {
          const si = a.stockItem;
          const sourceRollNumber = si ? si.sourceRollNumber : null;
          const rollNumber = si ? si.rollNumber : null;
          const sourceJobCardId = si ? si.sourceJobCardId : null;
          const sourceJobCard = si ? si.sourceJobCard : null;
          const widthMm = si ? si.widthMm : null;
          const lengthM = si ? si.lengthM : null;
          const thicknessMm = si ? si.thicknessMm : null;
          return {
            sourceRollNumber: sourceRollNumber || null,
            rollNumber: rollNumber || null,
            sourceJobCardId: sourceJobCardId || null,
            sourceJobCard: sourceJobCard || null,
            widthMm: widthMm || null,
            lengthM: lengthM || null,
            thicknessMm: thicknessMm || null,
          };
        });
        setOffcutsUsed(mapped);
      })
      .catch(() => setOffcutsUsed([]));
  }, [jobCardId, hasRubber]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const paintBatches = productRows.flatMap((row) =>
        row.fields.map((f) => {
          const rawPaintVal = paintValues[f.fieldKey];
          return {
            fieldKey: f.fieldKey,
            category: "material_paint",
            label: f.partLabel ? `${row.productName} — ${f.partLabel}` : row.productName,
            batchNumber: rawPaintVal || null,
            notApplicable: false,
          };
        }),
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
      loadSavedBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const rubberRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const rawName = r.stockItem ? r.stockItem.name : null;
        const name = rawName || "";
        return RUBBER_PATTERN.test(name) || SOLUTION_PATTERN.test(name);
      }),
    [batchRecords],
  );

  const paintRecords = useMemo(
    () =>
      batchRecords.filter((r) => {
        const rawName = r.stockItem ? r.stockItem.name : null;
        const name = rawName || "";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 px-3 sm:px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Material Batch Numbers</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-populated from stock issuances, or enter manually
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      <div className="px-3 sm:px-5 py-4">
        <div
          className={
            showRubber && showPaint ? "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8" : ""
          }
        >
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
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Manual Entry
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtraRolls((prev) => prev + 1)}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-200"
                    >
                      + Add Roll
                    </button>
                  </div>
                  {rubberManual.map((entry) => (
                    <div
                      key={entry.fieldKey}
                      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                    >
                      <label className="text-xs text-gray-600 sm:w-36 sm:flex-shrink-0">
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

              {offcutsUsed.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Offcuts Used
                  </div>
                  <div className="space-y-1.5">
                    {offcutsUsed.map((offcut, idx) => {
                      const rollDisplay = offcut.sourceRollNumber || offcut.rollNumber || "—";
                      const sourceJobCard = offcut.sourceJobCard;
                      const jobNumber = sourceJobCard ? sourceJobCard.jobNumber : null;
                      const sourceRef = jobNumber
                        ? `JC ${jobNumber}`
                        : offcut.sourceJobCardId
                          ? `JC #${offcut.sourceJobCardId}`
                          : "—";
                      const dims = [
                        offcut.widthMm ? `${offcut.widthMm}mm W` : null,
                        offcut.lengthM ? `${Number(offcut.lengthM) * 1000}mm L` : null,
                        offcut.thicknessMm ? `${offcut.thicknessMm}mm T` : null,
                      ]
                        .filter(Boolean)
                        .join(" x ");
                      return (
                        <div
                          key={`offcut-used-${idx}`}
                          className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5"
                        >
                          <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                            Offcut
                          </span>
                          <span>Roll: {rollDisplay}</span>
                          <span className="text-gray-400">|</span>
                          <span>From: {sourceRef}</span>
                          {dims && (
                            <>
                              <span className="text-gray-400">|</span>
                              <span>{dims}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Offcut certificates are for internal traceability only and are not included in
                    the data book
                  </p>
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
                        {row.fields.map((field) => {
                          const paintVal = paintValues[field.fieldKey];
                          const paintDisplay = paintVal || "";
                          const rawPartLabel = field.partLabel;
                          const placeholderLabel = rawPartLabel || "Batch";
                          return (
                            <div key={field.fieldKey} className="flex items-center gap-1">
                              <input
                                type="text"
                                value={paintDisplay}
                                onChange={(e) => updatePaintValue(field.fieldKey, e.target.value)}
                                placeholder={
                                  partCount === 1 ? "Enter batch number" : `${placeholderLabel}`
                                }
                                className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              />
                              <CertLinkStatus
                                fieldKey={field.fieldKey}
                                value={paintDisplay}
                                certLinks={certLinks}
                              />
                            </div>
                          );
                        })}
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
