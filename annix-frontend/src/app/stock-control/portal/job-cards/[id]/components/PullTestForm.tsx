"use client";

import { useCallback, useState } from "react";
import type {
  QcPullTestAreaReading,
  QcPullTestForceGauge,
  QcPullTestRecord,
  QcPullTestSolution,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";

interface PullTestFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcPullTestRecord | null;
  onSaved: () => void;
}

interface SolutionRow {
  product: string;
  batchNumber: string;
  result: "pass" | "fail";
}

interface AreaReadingRow {
  area: string;
  reading: string;
  result: "pass" | "fail";
}

interface ForceGaugeState {
  make: string;
  certificateNumber: string;
  expiryDate: string;
}

const todayString = (): string => now().toFormat("yyyy-MM-dd");

const emptySolution = (): SolutionRow => ({
  product: "",
  batchNumber: "",
  result: "pass",
});

const emptyAreaReading = (index: number): AreaReadingRow => ({
  area: `Area ${index + 1}`,
  reading: "",
  result: "pass",
});

const parseSolutions = (solutions: QcPullTestSolution[]): SolutionRow[] =>
  solutions.map((s) => ({
    product: s.product,
    batchNumber: s.batchNumber ?? "",
    result: s.result,
  }));

const parseAreaReadings = (readings: QcPullTestAreaReading[]): AreaReadingRow[] =>
  readings.map((r) => ({
    area: r.area,
    reading: r.reading,
    result: r.result,
  }));

const parseForceGauge = (fg: QcPullTestForceGauge): ForceGaugeState => ({
  make: fg.make,
  certificateNumber: fg.certificateNumber ?? "",
  expiryDate: fg.expiryDate ? fg.expiryDate.slice(0, 10) : "",
});

const initialSolutions = (existing: QcPullTestRecord | null | undefined): SolutionRow[] =>
  existing ? parseSolutions(existing.solutions) : [emptySolution()];

const initialAreaReadings = (existing: QcPullTestRecord | null | undefined): AreaReadingRow[] =>
  existing
    ? parseAreaReadings(existing.areaReadings)
    : Array.from({ length: 3 }, (_, i) => emptyAreaReading(i));

const initialForceGauge = (existing: QcPullTestRecord | null | undefined): ForceGaugeState =>
  existing
    ? parseForceGauge(existing.forceGauge)
    : { make: "", certificateNumber: "", expiryDate: "" };

export function PullTestForm({
  isOpen,
  onClose,
  jobCardId,
  existing = null,
  onSaved,
}: PullTestFormProps) {
  const [itemDescription, setItemDescription] = useState(existing?.itemDescription ?? "");
  const [quantity, setQuantity] = useState<number | null>(existing?.quantity ?? null);
  const [readingDate, setReadingDate] = useState(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : todayString(),
  );
  const [solutions, setSolutions] = useState<SolutionRow[]>(initialSolutions(existing));
  const [forceGauge, setForceGauge] = useState<ForceGaugeState>(initialForceGauge(existing));
  const [areaReadings, setAreaReadings] = useState<AreaReadingRow[]>(initialAreaReadings(existing));
  const [comments, setComments] = useState(existing?.comments ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSolution = useCallback((index: number, field: keyof SolutionRow, value: string) => {
    setSolutions((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }, []);

  const removeSolution = useCallback((index: number) => {
    setSolutions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addSolution = useCallback(() => {
    setSolutions((prev) => [...prev, emptySolution()]);
  }, []);

  const updateAreaReading = useCallback(
    (index: number, field: keyof AreaReadingRow, value: string) => {
      setAreaReadings((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      );
    },
    [],
  );

  const removeAreaReading = useCallback((index: number) => {
    setAreaReadings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addAreaReading = useCallback(() => {
    setAreaReadings((prev) => [...prev, emptyAreaReading(prev.length)]);
  }, []);

  const updateForceGaugeField = useCallback((field: keyof ForceGaugeState, value: string) => {
    setForceGauge((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);

    if (!readingDate) {
      setError("Reading date is required");
      return;
    }

    if (!forceGauge.make.trim()) {
      setError("Force gauge make is required");
      return;
    }

    const invalidSolution = solutions.find((s) => !s.product.trim());
    if (invalidSolution) {
      setError("All solutions must have a product name");
      return;
    }

    const invalidReading = areaReadings.find((r) => !r.area.trim() || !r.reading.trim());
    if (invalidReading) {
      setError("All area readings must have an area name and reading value");
      return;
    }

    const payload = {
      itemDescription: itemDescription.trim() || null,
      quantity,
      readingDate,
      solutions: solutions.map((s) => ({
        product: s.product.trim(),
        batchNumber: s.batchNumber.trim() || null,
        result: s.result,
      })),
      forceGauge: {
        make: forceGauge.make.trim(),
        certificateNumber: forceGauge.certificateNumber.trim() || null,
        expiryDate: forceGauge.expiryDate || null,
      },
      areaReadings: areaReadings.map((r) => ({
        area: r.area.trim(),
        reading: r.reading.trim(),
        result: r.result,
      })),
      comments: comments.trim() || null,
    };

    try {
      setIsSaving(true);
      if (existing) {
        await stockControlApiClient.updatePullTest(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createPullTest(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pull test record");
    } finally {
      setIsSaving(false);
    }
  }, [
    readingDate,
    forceGauge,
    solutions,
    areaReadings,
    itemDescription,
    quantity,
    comments,
    existing,
    jobCardId,
    onSaved,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {existing ? "Edit Pull Test (Adhesion)" : "New Pull Test (Adhesion)"}
        </h2>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">
            General Info
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Item Description
              </label>
              <input
                type="text"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. Pipe Spool 200NB"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                value={quantity ?? ""}
                onChange={(e) => setQuantity(e.target.value === "" ? null : Number(e.target.value))}
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
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Solutions Used
            </h3>
            <button
              type="button"
              onClick={addSolution}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
            >
              Add Solution
            </button>
          </div>
          <div className="space-y-3">
            {solutions.map((solution, idx) => (
              <div key={idx} className="flex items-end gap-3 rounded-md border border-gray-200 p-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={solution.product}
                    onChange={(e) => updateSolution(idx, "product", e.target.value)}
                    placeholder="e.g. Chemosil 211"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={solution.batchNumber}
                    onChange={(e) => updateSolution(idx, "batchNumber", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSolution(idx, "result", solution.result === "pass" ? "fail" : "pass")
                    }
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      solution.result === "pass"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {solution.result === "pass" ? "PASS" : "FAIL"}
                  </button>
                  {solutions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSolution(idx)}
                      className="rounded-md px-2 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Force Gauge Details
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={forceGauge.make}
                onChange={(e) => updateForceGaugeField("make", e.target.value)}
                placeholder="e.g. Elcometer"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Certificate Number
              </label>
              <input
                type="text"
                value={forceGauge.certificateNumber}
                onChange={(e) => updateForceGaugeField("certificateNumber", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="date"
                value={forceGauge.expiryDate}
                onChange={(e) => updateForceGaugeField("expiryDate", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
              Area Readings
            </h3>
            <button
              type="button"
              onClick={addAreaReading}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
            >
              Add Reading
            </button>
          </div>
          <div className="space-y-3">
            {areaReadings.map((reading, idx) => (
              <div key={idx} className="flex items-end gap-3 rounded-md border border-gray-200 p-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reading.area}
                    onChange={(e) => updateAreaReading(idx, "area", e.target.value)}
                    placeholder="e.g. Area 1, Flange Face"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Reading <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reading.reading}
                    onChange={(e) => updateAreaReading(idx, "reading", e.target.value)}
                    placeholder="e.g. 15.2 kg"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateAreaReading(idx, "result", reading.result === "pass" ? "fail" : "pass")
                    }
                    className={`rounded-md px-3 py-2 text-xs font-semibold ${
                      reading.result === "pass"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {reading.result === "pass" ? "PASS" : "FAIL"}
                  </button>
                  {areaReadings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAreaReading(idx)}
                      className="rounded-md px-2 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Comments
          </h3>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
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
