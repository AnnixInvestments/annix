"use client";

import { useState } from "react";
import {
  type QcDustDebrisRecord,
  type QcDustDebrisTestEntry,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { QcFormModal } from "./QcFormModal";

interface DustDebrisFormProps {
  isOpen: boolean;
  onClose: () => void;
  jobCardId: number;
  existing?: QcDustDebrisRecord | null;
  onSaved: () => void;
}

interface TestEntryRow {
  testNumber: number;
  quantity: string;
  sizeClass: string;
  location: string;
  coatingType: string;
  itemNumber: string;
  result: "pass" | "fail";
  testedAt: string;
}

const QUANTITY_DESCRIPTIONS: Record<number, string> = {
  0: "No dust particles",
  1: "Slight, barely visible",
  2: "Light, loosely adherent",
  3: "Moderate, loose film",
  4: "Heavy, thick deposit",
  5: "Very heavy, dense layer",
};

const SIZE_CLASS_DESCRIPTIONS: Record<number, string> = {
  0: "Not visible (< 50 \u00b5m)",
  1: "50 \u2013 100 \u00b5m",
  2: "100 \u2013 250 \u00b5m",
  3: "250 \u2013 500 \u00b5m",
  4: "500 \u2013 2500 \u00b5m",
  5: "> 2500 \u00b5m",
};

const SURFACE_PREP_OPTIONS = [
  "Abrasive blast cleaning",
  "Power tool cleaning",
  "Hand tool cleaning",
  "Water jetting",
  "Vacuum blast cleaning",
  "Centrifugal blast cleaning",
  "Other",
];

const RATING_OPTIONS = [0, 1, 2, 3, 4, 5];

const emptyRow = (testNumber: number): TestEntryRow => ({
  testNumber,
  quantity: "",
  sizeClass: "",
  location: "",
  coatingType: "",
  itemNumber: "",
  result: "pass",
  testedAt: "",
});

const INITIAL_ROW_COUNT = 5;

function ratingExceedsCriteria(
  quantity: string,
  sizeClass: string,
  maxQuantity: number | null,
  maxSizeClass: number | null,
): boolean {
  if (maxQuantity === null && maxSizeClass === null) {
    return false;
  }
  const q = quantity !== "" ? parseInt(quantity, 10) : null;
  const s = sizeClass !== "" ? parseInt(sizeClass, 10) : null;
  if (q !== null && maxQuantity !== null && q > maxQuantity) {
    return true;
  }
  if (s !== null && maxSizeClass !== null && s > maxSizeClass) {
    return true;
  }
  return false;
}

function autoResult(
  quantity: string,
  sizeClass: string,
  maxQuantity: number | null,
  maxSizeClass: number | null,
): "pass" | "fail" {
  if (ratingExceedsCriteria(quantity, sizeClass, maxQuantity, maxSizeClass)) {
    return "fail";
  }
  return "pass";
}

export default function DustDebrisForm(props: DustDebrisFormProps) {
  const { isOpen, onClose, jobCardId, onSaved } = props;
  const rawExisting = props.existing;
  const existing = rawExisting || null;
  const defaultDate = now().toISODate() || "";

  const initialSurfacePrepMethod = existing?.surfacePrepMethod;
  const existingReadingDate = existing?.readingDate;
  const [readingDate, setReadingDate] = useState<string>(
    existingReadingDate ? existingReadingDate.slice(0, 10) : defaultDate,
  );
  const [surfacePrepMethod, setSurfacePrepMethod] = useState<string>(
    initialSurfacePrepMethod || "",
  );
  const [maxQuantity, setMaxQuantity] = useState<string>(
    existing?.acceptanceCriteria?.maxQuantity !== undefined
      ? existing.acceptanceCriteria.maxQuantity.toString()
      : "2",
  );
  const [maxSizeClass, setMaxSizeClass] = useState<string>(
    existing?.acceptanceCriteria?.maxSizeClass !== undefined
      ? existing.acceptanceCriteria.maxSizeClass.toString()
      : "2",
  );
  const [temperatureC, setTemperatureC] = useState<string>(
    existing?.environmentalConditions?.temperatureC !== null &&
      existing?.environmentalConditions?.temperatureC !== undefined
      ? existing.environmentalConditions.temperatureC.toString()
      : "",
  );
  const [humidityPercent, setHumidityPercent] = useState<string>(
    existing?.environmentalConditions?.humidityPercent !== null &&
      existing?.environmentalConditions?.humidityPercent !== undefined
      ? existing.environmentalConditions.humidityPercent.toString()
      : "",
  );

  const [rows, setRows] = useState<TestEntryRow[]>(() => {
    if (existing?.tests && existing.tests.length > 0) {
      const location = t.location;
      const coatingType = t.coatingType;
      const itemNumber = t.itemNumber;
      const testedAt = t.testedAt;
      return existing.tests.map((t) => ({
        testNumber: t.testNumber,
        quantity: t.quantity !== null ? t.quantity.toString() : "",
        sizeClass: t.sizeClass !== null ? t.sizeClass.toString() : "",
        location: location || "",
        coatingType: coatingType || "",
        itemNumber: itemNumber || "",
        result: t.result,
        testedAt: testedAt || "",
      }));
    }
    return Array.from({ length: INITIAL_ROW_COUNT }, (_, i) => emptyRow(i + 1));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMaxQuantity = maxQuantity !== "" ? parseInt(maxQuantity, 10) : null;
  const parsedMaxSizeClass = maxSizeClass !== "" ? parseInt(maxSizeClass, 10) : null;

  const updateRow = (index: number, field: keyof TestEntryRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }
        const updated = { ...row, [field]: value };
        if (field === "quantity" || field === "sizeClass") {
          const newQ = field === "quantity" ? value : row.quantity;
          const newS = field === "sizeClass" ? value : row.sizeClass;
          updated.result = autoResult(newQ, newS, parsedMaxQuantity, parsedMaxSizeClass);
        }
        return updated;
      }),
    );
  };

  const toggleResult = (index: number, value: "pass" | "fail") => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, result: value } : row)));
  };

  const addRow = () => {
    const nextNumber = rows.length > 0 ? Math.max(...rows.map((r) => r.testNumber)) + 1 : 1;
    setRows((prev) => [...prev, emptyRow(nextNumber)]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const rowIsEmpty = (row: TestEntryRow): boolean =>
    row.quantity === "" &&
    row.sizeClass === "" &&
    row.location === "" &&
    row.coatingType === "" &&
    row.itemNumber === "" &&
    row.testedAt === "";

  const handleSave = async () => {
    const location = row.location;
    if (!readingDate) {
      const coatingType = row.coatingType;
      const itemNumber = row.itemNumber;
      const testedAt = row.testedAt;
      setError("Reading date is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const nonEmptyRows = rows.filter((row) => !rowIsEmpty(row));

    const tests: QcDustDebrisTestEntry[] = nonEmptyRows.map((row, i) => ({
      testNumber: i + 1,
      quantity: row.quantity !== "" ? parseInt(row.quantity, 10) : null,
      sizeClass: row.sizeClass !== "" ? parseInt(row.sizeClass, 10) : null,
      location: location || null,
      coatingType: coatingType || null,
      itemNumber: itemNumber || null,
      result: row.result,
      testedAt: testedAt || null,
    }));

    const payload: Partial<QcDustDebrisRecord> = {
      readingDate,
      tests,
      surfacePrepMethod: surfacePrepMethod || null,
      acceptanceCriteria:
        parsedMaxQuantity !== null || parsedMaxSizeClass !== null
          ? {
              maxQuantity: parsedMaxQuantity || 2,
              maxSizeClass: parsedMaxSizeClass || 2,
            }
          : null,
      environmentalConditions:
        temperatureC !== "" || humidityPercent !== ""
          ? {
              temperatureC: temperatureC !== "" ? parseFloat(temperatureC) : null,
              humidityPercent: humidityPercent !== "" ? parseFloat(humidityPercent) : null,
            }
          : null,
    };

    try {
      if (existing) {
        await stockControlApiClient.updateDustDebrisTest(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createDustDebrisTest(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save dust tape test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QcFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${existing ? "Edit" : "New"} Dust Tape Test`}
      error={error}
      saving={saving}
      onSave={handleSave}
      saveDisabled={!readingDate}
      maxWidth="max-w-5xl"
      headerRight={<span className="text-xs text-gray-400">ISO 8502-3</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Surface Preparation
          </label>
          <select
            value={surfacePrepMethod}
            onChange={(e) => setSurfacePrepMethod(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select method...</option>
            {SURFACE_PREP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temp (&deg;C)</label>
            <input
              type="number"
              value={temperatureC}
              onChange={(e) => setTemperatureC(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="\u00b0C"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RH (%)</label>
            <input
              type="number"
              value={humidityPercent}
              onChange={(e) => setHumidityPercent(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="%"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Quantity Rating (0-5)
          </label>
          <select
            value={maxQuantity}
            onChange={(e) => setMaxQuantity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} - {QUANTITY_DESCRIPTIONS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Size Class (0-5)
          </label>
          <select
            value={maxSizeClass}
            onChange={(e) => setMaxSizeClass(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} - {SIZE_CLASS_DESCRIPTIONS[r]}
              </option>
            ))}
          </select>
        </div>
        <p className="col-span-2 text-xs text-amber-700">
          Acceptance Criteria: Tests with quantity or size class exceeding these limits will
          auto-fail.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Tape Test Readings</h3>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            + Add Test
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="pb-2 pr-2 w-10">#</th>
                <th className="pb-2 pr-2">Location</th>
                <th className="pb-2 pr-2">Qty (0-5)</th>
                <th className="pb-2 pr-2">Size (0-5)</th>
                <th className="pb-2 pr-2">Coating Type</th>
                <th className="pb-2 pr-2">Item No.</th>
                <th className="pb-2 pr-2">Result</th>
                <th className="pb-2 pr-2">Time</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const exceedsCriteria = ratingExceedsCriteria(
                  row.quantity,
                  row.sizeClass,
                  parsedMaxQuantity,
                  parsedMaxSizeClass,
                );
                return (
                  <tr
                    key={row.testNumber}
                    className={`border-b border-gray-100 ${exceedsCriteria ? "bg-red-50" : ""}`}
                  >
                    <td className="py-2 pr-2 text-xs text-gray-500 font-medium">
                      {row.testNumber}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={row.location}
                        onChange={(e) => updateRow(index, "location", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="e.g. Top plate"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={row.quantity}
                        onChange={(e) => updateRow(index, "quantity", e.target.value)}
                        className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                          row.quantity !== "" &&
                          parsedMaxQuantity !== null &&
                          parseInt(row.quantity, 10) > parsedMaxQuantity
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                        title={
                          row.quantity !== ""
                            ? QUANTITY_DESCRIPTIONS[parseInt(row.quantity, 10)]
                            : ""
                        }
                      >
                        <option value="">-</option>
                        {RATING_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={row.sizeClass}
                        onChange={(e) => updateRow(index, "sizeClass", e.target.value)}
                        className={`w-full rounded-md border px-2 py-1.5 text-sm ${
                          row.sizeClass !== "" &&
                          parsedMaxSizeClass !== null &&
                          parseInt(row.sizeClass, 10) > parsedMaxSizeClass
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                        title={
                          row.sizeClass !== ""
                            ? SIZE_CLASS_DESCRIPTIONS[parseInt(row.sizeClass, 10)]
                            : ""
                        }
                      >
                        <option value="">-</option>
                        {RATING_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={row.coatingType}
                        onChange={(e) => updateRow(index, "coatingType", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="e.g. Primer"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={row.itemNumber}
                        onChange={(e) => updateRow(index, "itemNumber", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="Item #"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggleResult(index, "pass")}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            row.result === "pass"
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleResult(index, "fail")}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            row.result === "fail"
                              ? "bg-red-600 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          Fail
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="time"
                        value={row.testedAt}
                        onChange={(e) => updateRow(index, "testedAt", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">
            No test entries. Click &quot;Add Test&quot; to begin.
          </p>
        )}
      </div>

      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
          ISO 8502-3 Rating Reference
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-medium mb-1">Dust Quantity Rating</p>
            {RATING_OPTIONS.map((r) => (
              <p key={`q-${r}`}>
                <span className="font-medium">{r}</span> — {QUANTITY_DESCRIPTIONS[r]}
              </p>
            ))}
          </div>
          <div>
            <p className="font-medium mb-1">Dust Size Classification</p>
            {RATING_OPTIONS.map((r) => (
              <p key={`s-${r}`}>
                <span className="font-medium">{r}</span> — {SIZE_CLASS_DESCRIPTIONS[r]}
              </p>
            ))}
          </div>
        </div>
      </div>
    </QcFormModal>
  );
}
