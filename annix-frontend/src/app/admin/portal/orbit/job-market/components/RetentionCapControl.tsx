"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAdminOrbitRetentionCap, useAdminSetOrbitRetentionCap } from "@/app/lib/query/hooks";

export function RetentionCapControl() {
  const capQuery = useAdminOrbitRetentionCap();
  const setCap = useAdminSetOrbitRetentionCap();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const data = capQuery.data;
  const current = data ? data.cap : null;

  const openEdit = () => {
    setValue(current != null ? String(current) : "");
    setEditing(true);
  };

  const save = () => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      showToast("Enter a valid cap (0 or more).", "error");
      return;
    }
    setCap.mutate(parsed, {
      onSuccess: () => {
        setEditing(false);
        showToast(`Retention cap set to ${parsed.toLocaleString()}.`, "success");
      },
      onError: () => showToast("Couldn't update the cap — please try again.", "error"),
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Job retention cap (this environment)
          </h3>
          <p className="text-xs text-gray-500">
            Oldest jobs beyond this count are trimmed on each poll. Set per environment (e.g. 0 on
            prod for on-demand, 15k on test).
          </p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/15 dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={save}
              disabled={setCap.isPending}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {current != null ? current.toLocaleString() : "…"}
            </span>
            <button
              type="button"
              onClick={openEdit}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
