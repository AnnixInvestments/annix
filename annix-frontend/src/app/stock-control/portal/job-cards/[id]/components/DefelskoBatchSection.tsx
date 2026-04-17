"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  IssuanceBatchRecord,
  QcDefelskoBatchRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

const PAINT_CATEGORY_PATTERN = /paint|primer|coat|epoxy|polyurethane|topcoat|finish/i;
const RUBBER_CATEGORY_PATTERN = /rubber|lining|liner|ebonite|neoprene|butyl|natural/i;
const ABRASIVE_CATEGORY_PATTERN = /abrasive|grit|garnet|sand|blast|steel\s*shot/i;

const matchIssuanceBatch = (
  records: IssuanceBatchRecord[],
  field: BatchField,
  coatingAnalysis: CoatingAnalysis | null,
): string => {
  if (records.length === 0) return "";

  if (field.fieldKey === "paint_blast_profile" || field.fieldKey === "rubber_blast_profile") {
    const abrasiveRecord = records.find(
      (r) => r.stockItem?.name && ABRASIVE_CATEGORY_PATTERN.test(r.stockItem.name),
    );
    const abrasiveBatch = abrasiveRecord ? abrasiveRecord.batchNumber : null;
    return abrasiveBatch || "";
  }

  if (field.fieldKey === "rubber_shore_hardness") {
    const rubberRecord = records.find(
      (r) => r.stockItem?.name && RUBBER_CATEGORY_PATTERN.test(r.stockItem.name),
    );
    const rubberBatch = rubberRecord ? rubberRecord.batchNumber : null;
    return rubberBatch || "";
  }

  if (field.fieldKey.startsWith("paint_dft_")) {
    const coatIndex = Number.parseInt(field.fieldKey.replace("paint_dft_", ""), 10);
    const coat = coatingAnalysis?.coats?.[coatIndex];
    if (coat) {
      const productLower = coat.product.toLowerCase();
      const paintRecords = records.filter(
        (r) => r.stockItem?.name && PAINT_CATEGORY_PATTERN.test(r.stockItem.name),
      );
      const match =
        paintRecords.find((r) => r.stockItem?.name?.toLowerCase().includes(productLower)) ||
        paintRecords.find((r) => productLower.includes(r.stockItem?.name?.toLowerCase() || "")) ||
        paintRecords[coatIndex];
      const matchBatch = match ? match.batchNumber : null;
      return matchBatch || "";
    }
    const paintRecords = records.filter(
      (r) => r.stockItem?.name && PAINT_CATEGORY_PATTERN.test(r.stockItem.name),
    );
    const paintEntry = paintRecords[coatIndex];
    const paintBatch = paintEntry ? paintEntry.batchNumber : null;
    return paintBatch || "";
  }

  return "";
};

interface DefelskoBatchSectionProps {
  jobCardId: number;
  coatingAnalysis: CoatingAnalysis | null;
  batchRecords: IssuanceBatchRecord[];
  onComplete: (() => void) | null;
}

interface BatchField {
  fieldKey: string;
  category: "paint" | "rubber";
  label: string;
  allowNA: boolean;
}

interface BatchState {
  batchNumber: string;
  notApplicable: boolean;
}

export function DefelskoBatchSection(props: DefelskoBatchSectionProps) {
  const { jobCardId, coatingAnalysis, batchRecords, onComplete } = props;
  const [savedBatches, setSavedBatches] = useState<QcDefelskoBatchRecord[]>([]);
  const [batchValues, setBatchValues] = useState<Record<string, BatchState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envDateRange, setEnvDateRange] = useState<{
    requiredDates: string[];
    coveredDates: string[];
    missingDates: string[];
    earliestDate: string | null;
    latestDate: string | null;
  } | null>(null);

  const paintFields = useMemo((): BatchField[] => {
    const fields: BatchField[] = [];

    fields.push({
      fieldKey: "paint_blast_profile",
      category: "paint",
      label: "Blast Profile",
      allowNA: true,
    });

    const coats = coatingAnalysis ? coatingAnalysis.coats : null;
    if (coats) {
      const rawNotes = coatingAnalysis ? coatingAnalysis.rawNotes : null;
      const notesUpper = rawNotes ? rawNotes.toUpperCase() : "";
      const bandingIdx = notesUpper.indexOf("BANDING");
      const preBanding = bandingIdx >= 0 ? notesUpper.substring(0, bandingIdx) : notesUpper;
      const postBanding = bandingIdx >= 0 ? notesUpper.substring(bandingIdx) : "";

      coats.forEach((coat, idx) => {
        const productUpper = coat.product ? coat.product.toUpperCase() : "";
        const inBandingOnly =
          postBanding.length > 0 &&
          productUpper.length > 0 &&
          postBanding.includes(productUpper) &&
          !preBanding.includes(productUpper);
        if (inBandingOnly) return;
        const key = `paint_dft_${idx}`;
        const coatProduct = coat.product;
        const label = coatProduct || `Coat ${idx + 1}`;
        fields.push({
          fieldKey: key,
          category: "paint",
          label: `DFT - ${label}`,
          allowNA: false,
        });
      });
    }

    return fields;
  }, [coatingAnalysis]);

  const hasLining = coatingAnalysis ? coatingAnalysis.hasInternalLining : false;

  const rubberFields = useMemo(
    (): BatchField[] =>
      hasLining
        ? [
            {
              fieldKey: "rubber_blast_profile",
              category: "rubber",
              label: "Blast Profile",
              allowNA: true,
            },
            {
              fieldKey: "rubber_shore_hardness",
              category: "rubber",
              label: "Shore Hardness",
              allowNA: true,
            },
          ]
        : [],
    [hasLining],
  );

  const allFields = useMemo(() => [...paintFields, ...rubberFields], [paintFields, rubberFields]);

  const fetchBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      const batches = await stockControlApiClient.defelskoBatchesForJobCard(jobCardId);
      setSavedBatches(batches);

      const initialValues: Record<string, BatchState> = {};
      allFields.forEach((f) => {
        const saved = batches.find((b) => b.fieldKey === f.fieldKey);
        const savedBatch = saved ? saved.batchNumber : null;
        const savedNA = saved ? saved.notApplicable : false;
        const issuanceDefault =
          !savedBatch && !savedNA ? matchIssuanceBatch(batchRecords, f, coatingAnalysis) : "";
        initialValues[f.fieldKey] = {
          batchNumber: savedBatch || issuanceDefault,
          notApplicable: savedNA || false,
        };
      });
      setBatchValues(initialValues);
    } catch {
      const initialValues: Record<string, BatchState> = {};
      allFields.forEach((f) => {
        initialValues[f.fieldKey] = {
          batchNumber: matchIssuanceBatch(batchRecords, f, coatingAnalysis),
          notApplicable: false,
        };
      });
      setBatchValues(initialValues);
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId, allFields, batchRecords, coatingAnalysis]);

  const fetchEnvDateRange = useCallback(() => {
    stockControlApiClient
      .environmentalDateRange(jobCardId)
      .then((data) => setEnvDateRange(data))
      .catch(() => setEnvDateRange(null));
  }, [jobCardId]);

  useEffect(() => {
    fetchBatches();
    fetchEnvDateRange();
  }, [fetchBatches]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const batches = allFields.map((f) => {
        const entry = batchValues[f.fieldKey];
        const entryBatch = entry ? entry.batchNumber : null;
        const entryNA = entry ? entry.notApplicable : false;
        return {
          fieldKey: f.fieldKey,
          category: f.category,
          label: f.label,
          batchNumber: entryBatch || null,
          notApplicable: entryNA || false,
        };
      });

      await stockControlApiClient.saveDefelskoBatches(jobCardId, { batches });
      setSaveSuccess(true);
      fetchEnvDateRange();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch numbers");
    } finally {
      setIsSaving(false);
    }
  };

  const allFieldsComplete = useMemo(() => {
    return allFields.every((f) => {
      const batchNumber = state.batchNumber;
      const state = batchValues[f.fieldKey];
      if (!state) return false;
      const notApplicable = state.notApplicable;
      return notApplicable || (batchNumber || "").trim().length > 0;
    });
  }, [allFields, batchValues]);

  const handleSaveAndComplete = async () => {
    if (!allFieldsComplete) {
      setError("Please fill in all batch numbers or mark fields as N/A before completing");
      return;
    }

    try {
      setIsCompleting(true);
      setError(null);

      const batches = allFields.map((f) => {
        const entry = batchValues[f.fieldKey];
        const entryBatch = entry ? entry.batchNumber : null;
        const entryNA = entry ? entry.notApplicable : false;
        return {
          fieldKey: f.fieldKey,
          category: f.category,
          label: f.label,
          batchNumber: entryBatch || null,
          notApplicable: entryNA || false,
        };
      });

      await stockControlApiClient.saveDefelskoBatches(jobCardId, { batches });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save batch numbers");
    } finally {
      setIsCompleting(false);
    }
  };

  const updateField = (fieldKey: string, updates: Partial<BatchState>) => {
    setBatchValues((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        ...updates,
      },
    }));
  };

  if (isLoading) {
    return null;
  }

  const renderFieldRow = (field: BatchField) => {
    const rawState = batchValues[field.fieldKey];
    const state = rawState || { batchNumber: "", notApplicable: false };

    return (
      <tr key={field.fieldKey} className="border-b border-gray-50 last:border-0">
        <td className="px-3 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap">
          {field.label}
        </td>
        <td className="px-3 py-1.5">
          <input
            type="text"
            value={state.notApplicable ? "" : state.batchNumber}
            onChange={(e) => updateField(field.fieldKey, { batchNumber: e.target.value })}
            disabled={state.notApplicable}
            placeholder={state.notApplicable ? "N/A" : "Enter batch number"}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 disabled:text-gray-400"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          {field.allowNA ? (
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={state.notApplicable}
                onChange={(e) =>
                  updateField(field.fieldKey, {
                    notApplicable: e.target.checked,
                    batchNumber: e.target.checked ? "" : state.batchNumber,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="text-[10px] text-gray-500">N/A</span>
            </label>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <div
      id="defelsko-batch-section"
      className="rounded-lg border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 px-3 sm:px-4 py-2">
        <h3 className="text-xs font-semibold text-gray-900">Defelsko Batch Numbers</h3>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="text-xs text-green-600 font-medium">Saved</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="px-3 sm:px-4 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paintFields.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Paint
              </h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase w-24 sm:w-32">
                      Item
                    </th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase">
                      Batch #
                    </th>
                    <th className="px-1 py-1 text-center text-[10px] font-medium text-gray-500 uppercase w-10"></th>
                  </tr>
                </thead>
                <tbody>{paintFields.map(renderFieldRow)}</tbody>
              </table>
            </div>
          )}

          {hasLining && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Rubber
              </h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase w-24 sm:w-32">
                      Item
                    </th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase">
                      Batch #
                    </th>
                    <th className="px-1 py-1 text-center text-[10px] font-medium text-gray-500 uppercase w-10"></th>
                  </tr>
                </thead>
                <tbody>{rubberFields.map(renderFieldRow)}</tbody>
              </table>
            </div>
          )}
        </div>

        {envDateRange && envDateRange.requiredDates.length > 0 && (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
            <h4 className="text-xs font-semibold text-blue-800 mb-1">
              Environmental Readings Required
            </h4>
            <p className="text-[10px] text-blue-700 mb-2">
              Based on uploaded Defelsko documents, environmental probe readings are needed from{" "}
              <span className="font-semibold">{envDateRange.earliestDate}</span> to{" "}
              <span className="font-semibold">{envDateRange.latestDate}</span> (
              {envDateRange.requiredDates.length} day
              {envDateRange.requiredDates.length === 1 ? "" : "s"})
            </p>
            <div className="flex flex-wrap gap-1">
              {envDateRange.requiredDates.map((date) => {
                const covered = envDateRange.coveredDates.includes(date);
                return (
                  <span
                    key={date}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      covered ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {date.slice(5)}
                    {covered ? " \u2713" : " \u2717"}
                  </span>
                );
              })}
            </div>
            {envDateRange.missingDates.length > 0 && (
              <p className="mt-1 text-[10px] text-red-700 font-medium">
                {envDateRange.missingDates.length} missing date
                {envDateRange.missingDates.length === 1 ? "" : "s"} — please add environmental
                records for these dates
              </p>
            )}
            {envDateRange.missingDates.length === 0 && (
              <p className="mt-1 text-[10px] text-green-700 font-medium">
                All required environmental dates are covered
              </p>
            )}
          </div>
        )}

        {onComplete && (
          <div className="pt-3 mt-3 border-t border-gray-200">
            <button
              onClick={handleSaveAndComplete}
              disabled={isCompleting || isSaving}
              className="w-full rounded-md bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCompleting ? "Saving..." : "Save & Complete Batch Numbers"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
