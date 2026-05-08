"use client";

import { useState } from "react";
import { nixApi } from "@/app/lib/nix";

/**
 * Pop-out editor for the bundle of codes / config strings a quoter
 * commonly needs to correct on an item: paint coating, internal
 * lining, material class, flange / end configuration. Each save
 * goes through the same patch + learning endpoint, so a corrected
 * code feeds the Nix learning system for future extractions.
 */
export function CodesEditor(props: {
  extractionId: number;
  rowKey: { itemNumber?: string; index?: number };
  coating: string;
  lining: string;
  materialClass: string;
  flangeConfig: string;
  display: string;
  onSaved: () => void;
}) {
  const { extractionId, rowKey, coating, lining, materialClass, flangeConfig, display, onSaved } =
    props;
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(coating);
  const [l, setL] = useState(lining);
  const [m, setM] = useState(materialClass);
  const [f, setF] = useState(flangeConfig);
  const [saving, setSaving] = useState(false);

  const cancel = () => {
    setC(coating);
    setL(lining);
    setM(materialClass);
    setF(flangeConfig);
    setOpen(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ops: Array<[string, string]> = [
        ["coatingSystem", c],
        ["liningType", l],
        ["materialClass", m],
        ["flangeConfig", f],
      ];
      const original: Record<string, string> = {
        coatingSystem: coating,
        liningType: lining,
        materialClass,
        flangeConfig,
      };
      for (const [field, val] of ops) {
        if (val !== original[field]) {
          await nixApi.patchExtractionItem(
            extractionId,
            rowKey,
            field,
            val.length === 0 ? null : val,
          );
        }
      }
      onSaved();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left hover:bg-blue-50 rounded px-1 py-0.5"
        title="Click to edit codes"
      >
        {display}
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1 p-2 bg-blue-50 border border-blue-200 rounded">
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Coating
        <input
          type="text"
          value={c}
          disabled={saving}
          onChange={(e) => setC(e.target.value)}
          placeholder="(empty = uncoated)"
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Lining
        <input
          type="text"
          value={l}
          disabled={saving}
          onChange={(e) => setL(e.target.value)}
          placeholder="(empty = unlined)"
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Material class
        <input
          type="text"
          value={m}
          disabled={saving}
          onChange={(e) => setM(e.target.value)}
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[10px] text-gray-600">
        Flange / ends
        <input
          type="text"
          value={f}
          disabled={saving}
          onChange={(e) => setF(e.target.value)}
          className="px-1 py-0.5 border border-gray-300 rounded text-xs"
        />
      </label>
      <div className="col-span-2 flex justify-end gap-2 mt-1">
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
