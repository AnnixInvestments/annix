"use client";

import { useState } from "react";
import {
  type QcDustDebrisRecord,
  type QcDustDebrisTestEntry,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";

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
  coatingType: string;
  itemNumber: string;
  result: "pass" | "fail";
  testedAt: string;
}

const emptyRow = (testNumber: number): TestEntryRow => ({
  testNumber,
  quantity: "",
  coatingType: "",
  itemNumber: "",
  result: "pass",
  testedAt: "",
});

const INITIAL_ROW_COUNT = 5;

export default function DustDebrisForm({
  isOpen,
  onClose,
  jobCardId,
  existing = null,
  onSaved,
}: DustDebrisFormProps) {
  const defaultDate = now().toISODate() || "";

  const [readingDate, setReadingDate] = useState<string>(
    existing?.readingDate ? existing.readingDate.slice(0, 10) : defaultDate,
  );
  const [rows, setRows] = useState<TestEntryRow[]>(() => {
    if (existing?.tests && existing.tests.length > 0) {
      return existing.tests.map((t) => ({
        testNumber: t.testNumber,
        quantity: t.quantity !== null ? t.quantity.toString() : "",
        coatingType: t.coatingType ?? "",
        itemNumber: t.itemNumber ?? "",
        result: t.result,
        testedAt: t.testedAt ?? "",
      }));
    }
    return Array.from({ length: INITIAL_ROW_COUNT }, (_, i) => emptyRow(i + 1));
  });
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, field: keyof TestEntryRow, value: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
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
    row.quantity === "" && row.coatingType === "" && row.itemNumber === "" && row.testedAt === "";

  const handleSave = async () => {
    if (!readingDate) {
      return;
    }

    setSaving(true);

    const nonEmptyRows = rows.filter((row) => !rowIsEmpty(row));

    const tests: QcDustDebrisTestEntry[] = nonEmptyRows.map((row, i) => ({
      testNumber: i + 1,
      quantity: row.quantity !== "" ? parseFloat(row.quantity) : null,
      coatingType: row.coatingType || null,
      itemNumber: row.itemNumber || null,
      result: row.result,
      testedAt: row.testedAt || null,
    }));

    const payload: Partial<QcDustDebrisRecord> = {
      readingDate,
      tests,
    };

    try {
      if (existing) {
        await stockControlApiClient.updateDustDebrisTest(jobCardId, existing.id, payload);
      } else {
        await stockControlApiClient.createDustDebrisTest(jobCardId, payload);
      }
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {existing ? "Edit Dust & Debris Test" : "New Dust & Debris Test"}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reading Date *</label>
          <input
            type="date"
            value={readingDate}
            onChange={(e) => setReadingDate(e.target.value)}
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Test Entries</h3>
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
                  <th className="pb-2 pr-2">Quantity</th>
                  <th className="pb-2 pr-2">Coating Type</th>
                  <th className="pb-2 pr-2">Item No.</th>
                  <th className="pb-2 pr-2">Result</th>
                  <th className="pb-2 pr-2">Time</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.testNumber} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-xs text-gray-500 font-medium">
                      {row.testNumber}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateRow(index, "quantity", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={row.coatingType}
                        onChange={(e) => updateRow(index, "coatingType", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="e.g. Primer"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={row.itemNumber}
                        onChange={(e) => updateRow(index, "itemNumber", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Item #"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => toggleResult(index, "pass")}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              No test entries. Click "Add Test" to begin.
            </p>
          )}
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
            disabled={saving || !readingDate}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
