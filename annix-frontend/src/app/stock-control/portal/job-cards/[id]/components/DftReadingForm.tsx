"use client";

import { useMemo, useState } from "react";
import type { QcDftReadingEntry, QcDftReadingRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";

interface DftReadingFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcDftReadingRecord | null;
  onSaved: () => void;
}

const READING_ROWS = Array.from({ length: 20 }, (_, i) => i + 1);

const todayDateString = (): string => now().toFormat("yyyy-MM-dd");

const initialReadings = (existing: QcDftReadingRecord | null): Record<number, string> => {
  if (!existing) {
    return {};
  }
  return existing.readings.reduce(
    (acc, entry) => ({ ...acc, [entry.itemNumber]: String(entry.reading) }),
    {} as Record<number, string>,
  );
};

export default function DftReadingForm({
  isOpen,
  onClose,
  jobCardId,
  existing = null,
  onSaved,
}: DftReadingFormProps) {
  const [coatType, setCoatType] = useState<"primer" | "final">(existing?.coatType ?? "primer");
  const [paintProduct, setPaintProduct] = useState(existing?.paintProduct ?? "");
  const [batchNumber, setBatchNumber] = useState(existing?.batchNumber ?? "");
  const [specMinMicrons, setSpecMinMicrons] = useState(
    existing?.specMinMicrons != null ? String(existing.specMinMicrons) : "",
  );
  const [specMaxMicrons, setSpecMaxMicrons] = useState(
    existing?.specMaxMicrons != null ? String(existing.specMaxMicrons) : "",
  );
  const [readingDate, setReadingDate] = useState(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : todayDateString(),
  );
  const [readings, setReadings] = useState<Record<number, string>>(
    initialReadings(existing ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMin = Number(specMinMicrons);
  const parsedMax = Number(specMaxMicrons);
  const hasValidSpec = !Number.isNaN(parsedMin) && !Number.isNaN(parsedMax) && parsedMin > 0;

  const filledReadings = useMemo(
    () =>
      READING_ROWS.map((num) => ({
        itemNumber: num,
        value: readings[num] ?? "",
      })).filter((r) => r.value !== "" && !Number.isNaN(Number(r.value))),
    [readings],
  );

  const average = useMemo(() => {
    if (filledReadings.length === 0) {
      return null;
    }
    const sum = filledReadings.reduce((acc, r) => acc + Number(r.value), 0);
    return Math.round((sum / filledReadings.length) * 10) / 10;
  }, [filledReadings]);

  const readingOutOfSpec = (value: string): boolean => {
    if (!hasValidSpec || value === "" || Number.isNaN(Number(value))) {
      return false;
    }
    const num = Number(value);
    return num < parsedMin || num > parsedMax;
  };

  const updateReading = (itemNumber: number, value: string) => {
    setReadings((prev) => ({ ...prev, [itemNumber]: value }));
  };

  const handleSave = async () => {
    if (!paintProduct.trim()) {
      setError("Paint product is required.");
      return;
    }
    if (!specMinMicrons || Number.isNaN(parsedMin)) {
      setError("Spec min microns is required.");
      return;
    }
    if (!specMaxMicrons || Number.isNaN(parsedMax)) {
      setError("Spec max microns is required.");
      return;
    }
    if (!readingDate) {
      setError("Reading date is required.");
      return;
    }

    const entries: QcDftReadingEntry[] = filledReadings.map((r) => ({
      itemNumber: r.itemNumber,
      reading: Number(r.value),
    }));

    const payload: Partial<QcDftReadingRecord> = {
      coatType,
      paintProduct: paintProduct.trim(),
      batchNumber: batchNumber.trim() || null,
      specMinMicrons: parsedMin,
      specMaxMicrons: parsedMax,
      readings: entries,
      averageMicrons: average,
      readingDate,
    };

    setSaving(true);
    setError(null);

    try {
      if (existing) {
        await stockControlApiClient.updateDftReading(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createDftReading(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save DFT reading.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {existing ? "Edit DFT Reading" : "New DFT Reading"}
        </h2>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              coatType === "primer"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setCoatType("primer")}
          >
            Primer
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              coatType === "final"
                ? "bg-teal-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setCoatType("final")}
          >
            Final
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Paint Product</label>
            <input
              type="text"
              value={paintProduct}
              onChange={(e) => setPaintProduct(e.target.value)}
              placeholder="e.g. Sigma EP Universal Primer"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reading Date</label>
            <input
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spec Min (μm)</label>
            <input
              type="number"
              value={specMinMicrons}
              onChange={(e) => setSpecMinMicrons(e.target.value)}
              placeholder="240"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spec Max (μm)</label>
            <input
              type="number"
              value={specMaxMicrons}
              onChange={(e) => setSpecMaxMicrons(e.target.value)}
              placeholder="250"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {hasValidSpec && (
          <div className="mb-2 text-sm font-medium text-gray-600">
            Spec: {parsedMin}-{parsedMax} μm
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1">
          {READING_ROWS.map((num) => (
            <div key={num} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm text-gray-500">{num}</span>
              <input
                type="number"
                value={readings[num] ?? ""}
                onChange={(e) => updateReading(num, e.target.value)}
                placeholder="μm"
                className={`w-full rounded-md border px-3 py-1.5 text-sm ${
                  readingOutOfSpec(readings[num] ?? "")
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-300"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Average:</span>
          <span className="font-semibold text-gray-900">
            {average != null ? `${average} μm` : "—"}
          </span>
          <span className="text-gray-500">
            ({filledReadings.length} reading
            {filledReadings.length !== 1 ? "s" : ""})
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
