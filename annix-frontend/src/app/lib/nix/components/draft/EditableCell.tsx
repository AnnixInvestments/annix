"use client";

import { useState } from "react";
import { nixApi } from "@/app/lib/nix";

/**
 * Single click-to-edit cell for an extracted item field. Hits
 * PATCH /nix/extraction/:id/items which both saves the change and
 * feeds it into Nix's correction-learning system, so identical
 * future extractions converge on the user's value.
 *
 * Empty input → null (so the user can clear a wrongly-applied
 * coatingSystem etc.).
 */
export function EditableCell(props: {
  extractionId: number;
  rowKey: { itemNumber?: string; index?: number };
  field: string;
  value: string;
  onSaved: () => void;
  numeric?: boolean;
}) {
  const { extractionId, rowKey, field, value, onSaved, numeric } = props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(value);
    setEditing(false);
  };

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const payload: string | number | null =
        numeric && draft.length > 0 ? Number(draft) : draft.length === 0 ? null : draft;
      await nixApi.patchExtractionItem(extractionId, rowKey, field, payload);
      onSaved();
    } catch {
      // Failure is surfaced by the row state reverting; the calling page
      // can also subscribe to the React Query error if it wants a toast.
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        type={numeric ? "number" : "text"}
        value={draft}
        autoFocus
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") cancelEdit();
        }}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-left w-full hover:bg-blue-50 rounded px-1 py-0.5 truncate"
      title="Click to edit"
    >
      {value || <span className="text-gray-400">—</span>}
    </button>
  );
}
