"use client";

import { useState } from "react";
import type { QcEnvironmentalRecordResponse } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { QcFormModal } from "./QcFormModal";

interface EnvironmentalRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing: QcEnvironmentalRecordResponse | null;
  onSaved: () => void;
}

export function EnvironmentalRecordForm(props: EnvironmentalRecordFormProps) {
  const { isOpen, onClose, jobCardId, onSaved } = props;
  const existing = props.existing;
  const defaultDate = now().toISODate() || "";

  const initialNotes = existing?.notes;
  const existingRecordDate = existing?.recordDate;
  const existingTempC = existing?.temperatureC;
  const existingHumidity = existing?.humidity;
  const existingDewPoint = existing?.dewPointC;
  const [recordDate, setRecordDate] = useState(
    existingRecordDate ? existingRecordDate.slice(0, 10) : defaultDate,
  );
  const [temperatureC, setTemperatureC] = useState(
    existingTempC != null ? String(existingTempC) : "",
  );
  const [humidity, setHumidity] = useState(
    existingHumidity != null ? String(existingHumidity) : "",
  );
  const [dewPointC, setDewPointC] = useState(
    existingDewPoint != null ? String(existingDewPoint) : "",
  );
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!recordDate) {
      setError("Date is required.");
      return;
    }
    if (!temperatureC || Number.isNaN(Number(temperatureC))) {
      setError("Temperature is required.");
      return;
    }
    if (!humidity || Number.isNaN(Number(humidity))) {
      setError("Humidity is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Partial<QcEnvironmentalRecordResponse> = {
      recordDate,
      temperatureC: Number(temperatureC),
      humidity: Number(humidity),
      dewPointC: dewPointC ? Number(dewPointC) : null,
      notes: notes.trim() || null,
    };

    try {
      if (existing) {
        await stockControlApiClient.updateEnvironmentalRecord(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createEnvironmentalRecord(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save environmental record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QcFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={existing ? "Edit Environmental Record" : "New Environmental Record"}
      error={error}
      saving={saving}
      onSave={handleSave}
      saveDisabled={!recordDate || !temperatureC || !humidity}
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Temperature (°C) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={temperatureC}
            onChange={(e) => setTemperatureC(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Humidity (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dew Point (°C)</label>
          <input
            type="number"
            step="0.1"
            value={dewPointC}
            onChange={(e) => setDewPointC(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </QcFormModal>
  );
}
