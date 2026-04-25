"use client";

import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient, type TaxInvoiceType } from "@/app/lib/api/auRubberApi";

export interface LineItemRoll {
  rollNumber: string;
  weightKg: number | null;
}

interface LineItemRollsPanelProps {
  invoiceId: number;
  invoiceType: TaxInvoiceType;
  lineIdx: number;
  description: string;
  rolls: LineItemRoll[] | null;
  isApproved: boolean;
  onSaved: () => void;
}

function productCodeFromDescription(description: string): string | null {
  const match = description.match(/^([A-Z]{2,5}\d{2})\b/);
  return match ? match[1] : null;
}

export function LineItemRollsPanel(props: LineItemRollsPanelProps) {
  const { invoiceId, invoiceType, lineIdx, description, rolls, isApproved, onSaved } = props;
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LineItemRoll[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [available, setAvailable] = useState<
    Array<{ id: number; rollNumber: string; weightKg: number }>
  >([]);
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setDraft(rolls ? rolls.map((r) => ({ ...r })) : []);
  }, [rolls]);

  const productCode = productCodeFromDescription(description);
  const rollCount = rolls ? rolls.length : 0;

  const startEdit = () => {
    setDraft(rolls ? rolls.map((r) => ({ ...r })) : []);
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = () => {
    setDraft(rolls ? rolls.map((r) => ({ ...r })) : []);
    setEditing(false);
  };

  const updateRow = (idx: number, key: "rollNumber" | "weightKg", value: string) => {
    setDraft((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (key === "weightKg") {
          const parsed = value === "" ? null : Number(value);
          return { ...row, weightKg: Number.isNaN(parsed) ? null : parsed };
        }
        return { ...row, rollNumber: value };
      }),
    );
  };

  const addRow = () => {
    setDraft((prev) => [...prev, { rollNumber: "", weightKg: null }]);
  };

  const removeRow = (idx: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = draft.filter((r) => r.rollNumber.trim() !== "");
      await auRubberApiClient.updateTaxInvoiceLineItemRolls(invoiceId, lineIdx, cleaned);
      showToast("Rolls saved", "success");
      setEditing(false);
      onSaved();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save rolls", "error");
    } finally {
      setSaving(false);
    }
  };

  const openPicker = async () => {
    if (!productCode) {
      showToast("Cannot determine product code from description", "error");
      return;
    }
    setPicking(true);
    try {
      const list = await auRubberApiClient.availableRollsForProductCode(productCode);
      setAvailable(list);
      const existingNumbers = new Set(draft.map((d) => d.rollNumber));
      const preSelected = new Set(
        list.filter((r) => existingNumbers.has(r.rollNumber)).map((r) => r.id),
      );
      setPickedIds(preSelected);
      setPickerOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load available rolls", "error");
    } finally {
      setPicking(false);
    }
  };

  const togglePick = (id: number) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPick = () => {
    const picked = available.filter((r) => pickedIds.has(r.id));
    setDraft(picked.map((r) => ({ rollNumber: r.rollNumber, weightKg: r.weightKg })));
    setEditing(true);
    setExpanded(true);
    setPickerOpen(false);
  };

  if (!editing && rollCount === 0) {
    if (invoiceType === "CUSTOMER" && !isApproved) {
      return (
        <div className="px-3 py-2 bg-gray-50 text-xs text-gray-600 border-t border-gray-100">
          <button
            type="button"
            onClick={openPicker}
            disabled={picking || !productCode}
            className="text-orange-600 hover:text-orange-800 font-medium disabled:opacity-40"
          >
            {picking ? "Loading…" : "Pick rolls from stock"}
          </button>
          {!productCode && (
            <span className="ml-2 text-gray-500">
              (description must start with a product code, e.g. "BSCA38 6x1250x12.5")
            </span>
          )}
          {pickerOpen && (
            <RollPickerModal
              productCode={productCode || ""}
              available={available}
              picked={pickedIds}
              onTogglePick={togglePick}
              onConfirm={confirmPick}
              onCancel={() => setPickerOpen(false)}
            />
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          <span className={`inline-block w-3 transition-transform ${expanded ? "rotate-90" : ""}`}>
            ▶
          </span>{" "}
          Rolls ({rollCount})
        </button>
        {!isApproved && !editing && (
          <div className="flex items-center gap-2">
            {invoiceType === "CUSTOMER" && (
              <button
                type="button"
                onClick={openPicker}
                disabled={picking || !productCode}
                className="text-[10px] text-orange-600 hover:text-orange-800 font-medium disabled:opacity-40"
              >
                {picking ? "Loading…" : "Pick from stock"}
              </button>
            )}
            <button
              type="button"
              onClick={startEdit}
              className="text-[10px] text-gray-600 hover:text-gray-800 font-medium"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      {expanded && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left font-normal py-1 pr-2 w-24">Roll #</th>
              <th className="text-right font-normal py-1 px-2 w-20">Weight kg</th>
              {editing && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {(editing ? draft : rolls || []).map((row, idx) => {
              const rollNumber = row.rollNumber;
              const rawWeight = row.weightKg;
              const weightDisplay = rawWeight === null || rawWeight === undefined ? "-" : rawWeight;
              const weightInput = rawWeight === null || rawWeight === undefined ? "" : rawWeight;
              return (
                <tr key={`${rollNumber}:${idx}`} className="border-t border-gray-100">
                  <td className="py-1 pr-2">
                    {editing ? (
                      <input
                        value={rollNumber}
                        onChange={(e) => updateRow(idx, "rollNumber", e.target.value)}
                        className="w-full px-1 py-0.5 border border-gray-300 rounded"
                      />
                    ) : (
                      rollNumber
                    )}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {editing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={weightInput}
                        onChange={(e) => updateRow(idx, "weightKg", e.target.value)}
                        className="w-20 px-1 py-0.5 border border-gray-300 rounded text-right"
                      />
                    ) : (
                      weightDisplay
                    )}
                  </td>
                  {editing && (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove roll"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={addRow}
            className="text-[10px] text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add roll
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={cancelEdit}
            className="text-[10px] text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="text-[10px] px-2 py-0.5 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {pickerOpen && (
        <RollPickerModal
          productCode={productCode || ""}
          available={available}
          picked={pickedIds}
          onTogglePick={togglePick}
          onConfirm={confirmPick}
          onCancel={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

interface RollPickerModalProps {
  productCode: string;
  available: Array<{ id: number; rollNumber: string; weightKg: number }>;
  picked: Set<number>;
  onTogglePick: (id: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function RollPickerModal(props: RollPickerModalProps) {
  const { productCode, available, picked, onTogglePick, onConfirm, onCancel } = props;
  const totalKg = available
    .filter((r) => picked.has(r.id))
    .reduce((sum, r) => {
      const w = r.weightKg;
      const wNum = w === null || w === undefined ? 0 : Number(w);
      return sum + wNum;
    }, 0);
  const docRef = globalThis.document;
  if (!docRef) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Pick rolls — {productCode || "(no product code)"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-xs text-gray-500">No rolls in stock for this product code.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="w-6" />
                  <th className="text-left font-normal py-1">Roll #</th>
                  <th className="text-right font-normal py-1">Weight kg</th>
                </tr>
              </thead>
              <tbody>
                {available.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-1">
                      <input
                        type="checkbox"
                        checked={picked.has(r.id)}
                        onChange={() => onTogglePick(r.id)}
                      />
                    </td>
                    <td className="py-1">{r.rollNumber}</td>
                    <td className="py-1 text-right">{r.weightKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {picked.size} selected · {totalKg.toFixed(2)} kg
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={picked.size === 0}
              className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-40"
            >
              Use selected
            </button>
          </div>
        </div>
      </div>
    </div>,
    docRef.body,
  );
}
