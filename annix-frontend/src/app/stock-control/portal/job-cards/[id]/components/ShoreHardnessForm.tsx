"use client";

import { useCallback, useMemo, useState } from "react";
import type { QcShoreHardnessRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";

interface ShoreHardnessFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcShoreHardnessRecord | null;
  onSaved: () => void;
}

type ColumnKey = "column1" | "column2" | "column3" | "column4";

const COLUMNS: ColumnKey[] = ["column1", "column2", "column3", "column4"];
const COLUMN_LABELS = ["Col 1", "Col 2", "Col 3", "Col 4"];
const ROW_INDICES = Array.from({ length: 12 }, (_, i) => i);

const emptyReadings = (): Record<ColumnKey, (number | null)[]> => ({
  column1: Array.from({ length: 12 }, () => null),
  column2: Array.from({ length: 12 }, () => null),
  column3: Array.from({ length: 12 }, () => null),
  column4: Array.from({ length: 12 }, () => null),
});

const parseExistingReadings = (
  readings: QcShoreHardnessRecord["readings"]
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

export function ShoreHardnessForm({
  isOpen,
  onClose,
  jobCardId,
  existing = null,
  onSaved,
}: ShoreHardnessFormProps) {
  const [rubberSpec, setRubberSpec] = useState(existing?.rubberSpec ?? "");
  const [rubberBatchNumber, setRubberBatchNumber] = useState(existing?.rubberBatchNumber ?? "");
  const [requiredShore, setRequiredShore] = useState<number | null>(existing?.requiredShore ?? null);
  const [readingDate, setReadingDate] = useState(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : todayString()
  );
  const [readings, setReadings] = useState<Record<ColumnKey, (number | null)[]>>(
    existing ? parseExistingReadings(existing.readings) : emptyReadings()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateReading = useCallback((col: ColumnKey, rowIndex: number, value: string) => {
    setReadings((prev) => ({
      ...prev,
      [col]: prev[col].map((v, i) => (i === rowIndex ? (value === "" ? null : Number(value)) : v)),
    }));
  }, []);

  const averages = useMemo(() => {
    const colAverages = COLUMNS.reduce(
      (acc, col) => ({ ...acc, [col]: columnAverage(readings[col]) }),
      {} as Record<ColumnKey, number | null>
    );
    const validAverages = COLUMNS.map((col) => colAverages[col]).filter(
      (v): v is number => v !== null
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
    [requiredShore]
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
      {} as Record<ColumnKey, number[]>
    );

    const payload = {
      rubberSpec: rubberSpec.trim(),
      rubberBatchNumber: rubberBatchNumber.trim() || null,
      requiredShore,
      readingDate,
      readings: filteredReadings,
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
  }, [rubberSpec, rubberBatchNumber, requiredShore, readingDate, readings, averages, existing, jobCardId, onSaved, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {existing ? "Edit Shore Hardness Record" : "New Shore Hardness Record"}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Rubber Spec <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rubberSpec}
              onChange={(e) => setRubberSpec(e.target.value)}
              placeholder='e.g. NR/SBR 60 Shore'
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
                  <td className="px-2 py-1 text-center font-medium text-gray-500">{rowIdx + 1}</td>
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
