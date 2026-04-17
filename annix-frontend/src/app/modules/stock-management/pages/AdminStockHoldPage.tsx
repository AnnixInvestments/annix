"use client";

import { useState } from "react";
import { fromISO } from "@/app/lib/datetime";
import {
  useAdminMutations,
  useStockHoldAging,
  useStockHoldPending,
} from "../hooks/useAdminQueries";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";
import type { ResolveDispositionInput, StockHoldItemDto } from "../types/admin";

const DISPOSITIONS: ReadonlyArray<{
  value: ResolveDispositionInput["status"];
  label: string;
}> = [
  { value: "scrapped", label: "Scrap" },
  { value: "returned_to_supplier", label: "Return to Supplier" },
  { value: "repaired", label: "Repair" },
  { value: "donated", label: "Donate" },
  { value: "other", label: "Other" },
];

export function AdminStockHoldPage() {
  const config = useStockManagementConfig();
  const { data: items, isLoading, refetch } = useStockHoldPending();
  const { data: aging } = useStockHoldAging();
  const mutations = useAdminMutations();
  const [resolving, setResolving] = useState<StockHoldItemDto | null>(null);
  const [draft, setDraft] = useState<ResolveDispositionInput>({
    status: "scrapped",
    action: "",
    notes: "",
  });

  const handleResolve = async () => {
    if (!resolving || !draft.action.trim()) return;
    try {
      await mutations.resolveStockHold(resolving.id, draft);
      setResolving(null);
      setDraft({ status: "scrapped", action: "", notes: "" });
      await refetch();
    } catch (err) {
      console.error("Resolve failed", err);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-500">{config.label("common.loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{config.label("stockHold.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Damaged, expired, contaminated, and recalled stock awaiting disposition
        </p>
      </header>

      {aging && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs text-gray-500">Fresh (≤7 days)</div>
            <div className="mt-1 text-2xl font-bold">{aging.fresh}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="text-xs text-amber-700">Aging (8–30 days)</div>
            <div className="mt-1 text-2xl font-bold text-amber-900">{aging.week}</div>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="text-xs text-orange-700">Stale (31–90 days)</div>
            <div className="mt-1 text-2xl font-bold text-orange-900">{aging.month}</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-xs text-red-700">Critical (90+ days)</div>
            <div className="mt-1 text-2xl font-bold text-red-900">{aging.older}</div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Write-off R
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Notes
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Flagged
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {config.label("common.empty")}
                </td>
              </tr>
            )}
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-xs">{item.reason}</td>
                <td className="px-4 py-3 text-sm">#{item.productId}</td>
                <td className="px-4 py-3 text-xs">
                  {(() => {
                    const rawQuantity = item.quantity;
                    return rawQuantity ?? "—";
                  })()}
                </td>
                <td className="px-4 py-3 text-xs font-mono">R {item.writeOffValueR.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.reasonNotes}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {fromISO(item.flaggedAt).toJSDate().toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setResolving(item);
                      setDraft({ status: "scrapped", action: "", notes: "" });
                    }}
                    className="text-sm text-teal-700 hover:underline"
                  >
                    Resolve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Resolve Stock Hold #{resolving.id}</h2>
            <div className="text-sm text-gray-600">
              <div>Reason: {resolving.reason}</div>
              <div>Notes: {resolving.reasonNotes}</div>
              <div>Write-off value: R {resolving.writeOffValueR.toFixed(2)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Disposition</label>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as ResolveDispositionInput["status"],
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {DISPOSITIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Action Taken</label>
                <input
                  value={draft.action}
                  onChange={(e) => setDraft({ ...draft, action: e.target.value })}
                  placeholder="What was actually done with the stock"
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={(() => {
                    const rawNotes = draft.notes;
                    return rawNotes ?? "";
                  })()}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setResolving(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={(() => {
                  const rawIsPending = mutations.isPending;
                  return rawIsPending || !draft.action.trim();
                })()}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {config.label("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStockHoldPage;
