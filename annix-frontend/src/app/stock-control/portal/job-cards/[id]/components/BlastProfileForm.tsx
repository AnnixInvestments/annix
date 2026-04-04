"use client";

import { useMemo, useState } from "react";
import type { CoatingAnalysis, IssuanceBatchRecord } from "@/app/lib/api/stockControlApi";
import {
  type QcBlastProfileEntry,
  type QcBlastProfileRecord,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { QcFormModal } from "./QcFormModal";

interface BlastProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcBlastProfileRecord | null;
  onSaved: () => void;
  coatingAnalysis?: CoatingAnalysis | null;
  batchRecords?: IssuanceBatchRecord[];
}

const READING_ROWS = Array.from({ length: 20 }, (_, i) => i + 1);

const BLAST_PROFILE_DEFAULTS: Record<string, number> = {
  sa3_blast: 75,
  blast: 75,
};

const blastSpecDefault = (coatingAnalysis: CoatingAnalysis | null | undefined): string => {
  if (!coatingAnalysis?.surfacePrep) {
    return "";
  }
  const spec = BLAST_PROFILE_DEFAULTS[coatingAnalysis.surfacePrep];
  return spec ? String(spec) : "";
};

const ABRASIVE_PATTERN = /abrasive|grit|garnet|steel shot|blast media|blasting/i;

const abrasiveBatchRecords = (records: IssuanceBatchRecord[]): IssuanceBatchRecord[] =>
  records.filter(
    (r) =>
      (r.stockItem?.category && ABRASIVE_PATTERN.test(r.stockItem.category)) ||
      (r.stockItem?.name && ABRASIVE_PATTERN.test(r.stockItem.name)),
  );

const abrasiveBatchDefault = (records: IssuanceBatchRecord[]): string =>
  abrasiveBatchRecords(records)[0]?.batchNumber || "";

export default function BlastProfileForm(props: BlastProfileFormProps) {
  const { isOpen, onClose, jobCardId, onSaved } = props;
  const existing = props.existing ?? null;
  const coatingAnalysis = props.coatingAnalysis ?? null;
  const batchRecords = props.batchRecords ?? [];
  const defaultDate = now().toISODate() || "";

  const [specMicrons, setSpecMicrons] = useState<string>(
    existing?.specMicrons?.toString() || blastSpecDefault(coatingAnalysis),
  );
  const [abrasiveBatchNumber, setAbrasiveBatchNumber] = useState<string>(
    existing?.abrasiveBatchNumber || (existing ? "" : abrasiveBatchDefault(batchRecords)),
  );
  const [temperature, setTemperature] = useState<string>(existing?.temperature?.toString() || "");
  const [humidity, setHumidity] = useState<string>(existing?.humidity?.toString() || "");
  const [readingDate, setReadingDate] = useState<string>(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : defaultDate,
  );
  const [readings, setReadings] = useState<Record<number, string>>(() =>
    existing?.readings
      ? existing.readings.reduce(
          (acc, entry) => ({
            ...acc,
            [entry.itemNumber]: entry.reading.toString(),
          }),
          {} as Record<number, string>,
        )
      : {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specValue = parseFloat(specMicrons) || 0;

  const filledReadings = useMemo(
    () =>
      READING_ROWS.map((rowNum) => ({
        itemNumber: rowNum,
        value: readings[rowNum] ?? "",
        numeric: parseFloat(readings[rowNum] ?? ""),
      })).filter((r) => !Number.isNaN(r.numeric)),
    [readings],
  );

  const average = useMemo(() => {
    if (filledReadings.length === 0) {
      return null;
    }
    const sum = filledReadings.reduce((acc, r) => acc + r.numeric, 0);
    return Math.round((sum / filledReadings.length) * 100) / 100;
  }, [filledReadings]);

  const updateReading = (rowNum: number, value: string) => {
    setReadings((prev) => ({ ...prev, [rowNum]: value }));
  };

  const handleSave = async () => {
    if (!specMicrons || !readingDate) {
      setError("Spec target and reading date are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const entries: QcBlastProfileEntry[] = READING_ROWS.map((rowNum) => ({
      itemNumber: rowNum,
      reading: parseFloat(readings[rowNum] ?? ""),
    })).filter((entry) => !Number.isNaN(entry.reading));

    const calculatedAverage =
      entries.length > 0
        ? Math.round((entries.reduce((acc, e) => acc + e.reading, 0) / entries.length) * 100) / 100
        : null;

    const payload: Partial<QcBlastProfileRecord> = {
      specMicrons: parseFloat(specMicrons),
      abrasiveBatchNumber: abrasiveBatchNumber.trim() || null,
      temperature: temperature ? parseFloat(temperature) : null,
      humidity: humidity ? parseFloat(humidity) : null,
      readingDate: readingDate,
      readings: entries,
      averageMicrons: calculatedAverage,
    };

    try {
      if (existing) {
        await stockControlApiClient.updateBlastProfile(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createBlastProfile(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blast profile record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QcFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? "Edit Blast Profile" : "New Blast Profile"}
      error={error}
      saving={saving}
      onSave={handleSave}
      saveDisabled={!specMicrons || !readingDate}
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spec Target (μm) *</label>
          <input
            type="number"
            value={specMicrons}
            onChange={(e) => setSpecMicrons(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abrasive Batch Number
          </label>
          <input
            type="text"
            list="blast-batch-options"
            value={abrasiveBatchNumber}
            onChange={(e) => setAbrasiveBatchNumber(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {batchRecords.length > 0 && (
            <datalist id="blast-batch-options">
              {abrasiveBatchRecords(batchRecords).map((r) => (
                <option key={r.id} value={r.batchNumber}>
                  {r.stockItem?.name || r.batchNumber}
                </option>
              ))}
            </datalist>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reading Date *</label>
          <input
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
          <input
            type="number"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {specValue > 0 && (
        <p className="text-sm font-medium text-teal-700 mb-3">Spec Target: {specValue} μm</p>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Readings</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {READING_ROWS.map((rowNum) => {
            const val = readings[rowNum] ?? "";
            const numeric = parseFloat(val);
            const isBelowSpec =
              val !== "" && !Number.isNaN(numeric) && specValue > 0 && numeric < specValue;

            return (
              <div key={rowNum} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-gray-500">{rowNum}</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => updateReading(rowNum, e.target.value)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${
                    isBelowSpec ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300"
                  }`}
                  placeholder="μm"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 rounded-md bg-gray-50 px-4 py-3 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Average: </span>
        <span
          className={`text-sm font-semibold ${
            average !== null && specValue > 0 && average < specValue ? "text-red-700" : ""
          }`}
        >
          {average !== null ? `${average} μm` : "—"}
        </span>
        <span className="text-xs text-gray-500">
          ({filledReadings.length} reading{filledReadings.length !== 1 ? "s" : ""})
        </span>
        {average !== null && specValue > 0 && average < specValue && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Below spec
          </span>
        )}
      </div>
    </QcFormModal>
  );
}
