"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  CoatingAnalysis,
  IssuanceBatchRecord,
  QcShoreHardnessRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { QcFormModal } from "./QcFormModal";

interface ShoreHardnessFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcShoreHardnessRecord | null;
  onSaved: () => void;
  batchRecords?: IssuanceBatchRecord[];
  coatingAnalysis?: CoatingAnalysis | null;
}

type ColumnKey = "column1" | "column2" | "column3" | "column4";

const COLUMNS: ColumnKey[] = ["column1", "column2", "column3", "column4"];
const COLUMN_LABELS = ["Col 1", "Col 2", "Col 3", "Col 4"];
const ROW_INDICES = Array.from({ length: 12 }, (_, i) => i);

const emptyItemLabels = (): string[] => Array.from({ length: 12 }, () => "");

const emptyReadings = (): Record<ColumnKey, (number | null)[]> => ({
  column1: Array.from({ length: 12 }, () => null),
  column2: Array.from({ length: 12 }, () => null),
  column3: Array.from({ length: 12 }, () => null),
  column4: Array.from({ length: 12 }, () => null),
});

const parseExistingReadings = (
  readings: QcShoreHardnessRecord["readings"],
): Record<ColumnKey, (number | null)[]> => ({
  column1: ROW_INDICES.map((i) => readings.column1[i] ?? null),
  column2: ROW_INDICES.map((i) => readings.column2[i] ?? null),
  column3: ROW_INDICES.map((i) => readings.column3[i] ?? null),
  column4: ROW_INDICES.map((i) => readings.column4[i] ?? null),
});

const columnAverage = (values: (number | null)[]): number | null => {
  const filled = values.filter((v): v is number => v !== null);
  if (filled.length === 0) {
    return null;
  }
  return Math.round((filled.reduce((sum, v) => sum + v, 0) / filled.length) * 100) / 100;
};

const todayString = (): string => now().toFormat("yyyy-MM-dd");

const SHORE_PATTERN = /(\d+)\s*shore/i;

const coatingAnalysisDefaults = (
  analysis: CoatingAnalysis | null | undefined,
): { rubberSpec: string; requiredShore: number | null } => {
  if (!analysis?.rawNotes) return { rubberSpec: "", requiredShore: null };

  const intParts = analysis.rawNotes
    .split(/(?=\bINT\s*:)/i)
    .filter((p) => p.trim().toUpperCase().startsWith("INT"))
    .map((p) => p.trim());

  const intPartsAt0 = intParts[0];
  const intSpec = intPartsAt0 || analysis.rawNotes;
  const shoreMatch = intSpec.match(SHORE_PATTERN);
  const requiredShore = shoreMatch ? parseInt(shoreMatch[1], 10) : null;

  return { rubberSpec: intSpec, requiredShore };
};

const rubberBatchDefaults = (
  records: IssuanceBatchRecord[],
): { spec: string; batchNumber: string } => {
  const rubberRecord = records.find(
    (r) => r.stockItem?.name && /rubber|lining|nr\/sbr|neoprene|epdm/i.test(r.stockItem.name),
  );
  if (rubberRecord) {
    const name = rubberRecord.stockItem?.name;
    return {
      spec: name || "",
      batchNumber: rubberRecord.batchNumber,
    };
  }
  return { spec: "", batchNumber: "" };
};

export function ShoreHardnessForm(props: ShoreHardnessFormProps) {
  const rubberSpec = existing?.rubberSpec;
  const rubberBatchNumber = existing?.rubberBatchNumber;
  const requiredShore = existing?.requiredShore;
  const rawBatchRecords = ps.batchRecords;
  const rawValue = existing.readings.itemLabels?.[i];
  const { isOpen, onClose, jobCardId, onSaved } = props;
  const rawExisting = props.existing;
  const existing = rawExisting || null;
  const batchRecords = prorawBatchRecords || [];
  const rawCoatingAnalysis = props.coatingAnalysis;
  const coatingAnalysis = rawCoatingAnalysis || null;

  const batchDefaults = existing ? null : rubberBatchDefaults(batchRecords);
  const coatingDefaults = existing ? null : coatingAnalysisDefaults(coatingAnalysis);
  const [rubberSpec, setRubberSpec] = useState(
    rubberSpec || coatingDefaults?.rubberSpec || batchDefaults?.spec || "",
  );
  const [rubberBatchNumber, setRubberBatchNumber] = useState(
    rubberBatchNumber || batchDefaults?.batchNumber || "",
  );
  const [requiredShore, setRequiredShore] = useState<number | null>(
    requiredShore || coatingDefaults?.requiredShore || null,
  );
  const [readingDate, setReadingDate] = useState(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : todayString(),
  );
  const [readings, setReadings] = useState<Record<ColumnKey, (number | null)[]>>(
    existing ? parseExistingReadings(existing.readings) : emptyReadings(),
  );
  const [itemLabels, setItemLabels] = useState<string[]>(
    existing?.readings.itemLabels ? ROW_INDICES.map((i) => rawValue || "") : emptyItemLabels(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateReading = useCallback((col: ColumnKey, rowIndex: number, value: string) => {
    setReadings((prev) => ({
      ...prev,
      [col]: prev[col].map((v, i) => (i === rowIndex ? (value === "" ? null : Number(value)) : v)),
    }));
  }, []);

  const updateItemLabel = useCallback((rowIndex: number, value: string) => {
    setItemLabels((prev) => prev.map((v, i) => (i === rowIndex ? value : v)));
  }, []);

  const averages = useMemo(() => {
    const colAverages = COLUMNS.reduce(
      (acc, col) => ({ ...acc, [col]: columnAverage(readings[col]) }),
      {} as Record<ColumnKey, number | null>,
    );
    const validAverages = COLUMNS.map((col) => colAverages[col]).filter(
      (v): v is number => v !== null,
    );
    const overall =
      validAverages.length > 0
        ? Math.round((validAverages.reduce((s, v) => s + v, 0) / validAverages.length) * 100) / 100
        : null;
    return { ...colAverages, overall };
  }, [readings]);

  const isOutOfRange = useCallback(
    (value: number | null): boolean => {
      if (value === null || requiredShore === null) {
        return false;
      }
      return Math.abs(value - requiredShore) > 5;
    },
    [requiredShore],
  );

  const handleSave = useCallback(async () => {
    setError(null);

    if (!rubberSpec.trim()) {
      setError("Rubber spec is required");
      return;
    }
    if (requiredShore === null) {
      setError("Required shore hardness is required");
      return;
    }
    if (!readingDate) {
      setError("Reading date is required");
      return;
    }

    const filteredReadings = COLUMNS.reduce(
      (acc, col) => ({
        ...acc,
        [col]: readings[col].filter((v): v is number => v !== null),
      }),
      {} as Record<ColumnKey, number[]>,
    );

    const hasAnyLabel = itemLabels.some((l) => l.trim() !== "");

    const payload = {
      rubberSpec: rubberSpec.trim(),
      rubberBatchNumber: rubberBatchNumber.trim() || null,
      requiredShore,
      readingDate,
      readings: {
        ...filteredReadings,
        ...(hasAnyLabel ? { itemLabels: itemLabels.map((l) => l.trim()) } : {}),
      },
      averages: {
        column1: averages.column1,
        column2: averages.column2,
        column3: averages.column3,
        column4: averages.column4,
        overall: averages.overall,
      },
    };

    try {
      setIsSaving(true);
      if (existing) {
        await stockControlApiClient.updateShoreHardness(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createShoreHardness(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shore hardness record");
    } finally {
      setIsSaving(false);
    }
  }, [
    rubberSpec,
    rubberBatchNumber,
    requiredShore,
    readingDate,
    readings,
    averages,
    existing,
    jobCardId,
    onSaved,
    onClose,
  ]);

  return (
    <QcFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? "Edit Shore Hardness Record" : "New Shore Hardness Record"}
      error={error}
      saving={isSaving}
      onSave={handleSave}
      maxWidth="max-w-3xl"
    >
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Rubber Spec <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={rubberSpec}
            onChange={(e) => setRubberSpec(e.target.value)}
            placeholder="e.g. NR/SBR 60 Shore"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Rubber Batch Number
          </label>
          <input
            type="text"
            value={rubberBatchNumber}
            onChange={(e) => setRubberBatchNumber(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Required Shore <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={requiredShore ?? ""}
            onChange={(e) =>
              setRequiredShore(e.target.value === "" ? null : Number(e.target.value))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Reading Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left font-medium text-gray-700">Item</th>
              {COLUMN_LABELS.map((label) => (
                <th key={label} className="px-2 py-2 text-center font-medium text-gray-700">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_INDICES.map((rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100">
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={itemLabels[rowIdx]}
                    onChange={(e) => updateItemLabel(rowIdx, e.target.value)}
                    placeholder={String(rowIdx + 1)}
                    className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm text-center text-gray-600 placeholder:text-gray-400"
                  />
                </td>
                {COLUMNS.map((col) => (
                  <td key={col} className="px-2 py-1">
                    <input
                      type="number"
                      value={readings[col][rowIdx] ?? ""}
                      onChange={(e) => updateReading(col, rowIdx, e.target.value)}
                      className={`w-full rounded-md border px-3 py-2 text-sm text-center ${
                        isOutOfRange(readings[col][rowIdx])
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-gray-300"
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="px-2 py-2 font-semibold text-gray-700">Avg</td>
              {COLUMNS.map((col) => (
                <td
                  key={col}
                  className={`px-2 py-2 text-center font-semibold ${
                    isOutOfRange(averages[col]) ? "text-red-700" : "text-gray-900"
                  }`}
                >
                  {averages[col] !== null ? averages[col] : "—"}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Overall Average:</span>
        <span
          className={`font-semibold ${
            isOutOfRange(averages.overall) ? "text-red-700" : "text-gray-900"
          }`}
        >
          {averages.overall !== null ? averages.overall : "—"}
        </span>
      </div>
    </QcFormModal>
  );
}
