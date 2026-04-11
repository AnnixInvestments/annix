"use client";

import { useState } from "react";
import { useStockTake, useStockTakeMutations, useStockTakes } from "../hooks/useStockTakeQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { StockTakeDto, StockTakeLineDto, StockTakeStatus } from "../types/stockTake";

const STATUS_BADGE: Record<StockTakeStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  counting: "bg-blue-100 text-blue-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  posted: "bg-emerald-100 text-emerald-800",
  archived: "bg-gray-100 text-gray-500",
};

export function StockTakePage() {
  const config = useStockManagementConfig();
  const isEnabled = useStockManagementFeature("STOCK_TAKE");
  const { data: stockTakes, isLoading, refetch } = useStockTakes();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: selected, refetch: refetchSelected } = useStockTake(selectedId);
  const mutations = useStockTakeMutations();
  const [createName, setCreateName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  if (!isEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">{config.label("stockTake.title")}</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const created = await mutations.create({ name: createName });
      setShowCreate(false);
      setCreateName("");
      await refetch();
      setSelectedId((created as StockTakeDto).id);
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  const handleAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await refetch();
      await refetchSelected();
    } catch (err) {
      console.error("Action failed", err);
      alert(err instanceof Error ? err.message : "Action failed");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <div className="lg:col-span-1 space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{config.label("stockTake.title")}</h1>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium"
          >
            + New
          </button>
        </header>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm divide-y">
          {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
          {(stockTakes ?? []).length === 0 && !isLoading && (
            <div className="p-4 text-sm text-gray-500">No stock takes yet</div>
          )}
          {(stockTakes ?? []).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedId(st.id)}
              className={`w-full text-left p-3 hover:bg-gray-50 ${
                selectedId === st.id ? "bg-teal-50 border-l-4 border-teal-600" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{st.name}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${STATUS_BADGE[st.status]}`}
                >
                  {st.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{st.periodLabel ?? "—"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selected ? (
          <StockTakeDetail
            stockTake={selected}
            mutations={mutations}
            onAction={handleAction}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Select a stock take to view details
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{config.label("stockTake.startSession")}</h2>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. April 2026 Month-End"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded"
              >
                {config.label("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={mutations.isPending || !createName.trim()}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded font-medium disabled:opacity-50"
              >
                {config.label("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  stockTake: StockTakeDto;
  mutations: ReturnType<typeof useStockTakeMutations>;
  onAction: (fn: () => Promise<unknown>) => Promise<void>;
  onClose: () => void;
}

function StockTakeDetail(props: DetailProps) {
  const { stockTake, mutations, onAction } = props;
  const config = useStockManagementConfig();
  const lines = stockTake.lines ?? [];

  const linesByLocation = lines.reduce<Map<number | null, StockTakeLineDto[]>>((acc, line) => {
    const key = line.locationId;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)?.push(line);
    return acc;
  }, new Map());

  const variances = lines.filter((l) => l.varianceQty !== null && l.varianceQty !== 0);
  const totalCounted = lines.filter((l) => l.countedQty !== null).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <header className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{stockTake.name}</h2>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded ${STATUS_BADGE[stockTake.status]}`}
          >
            {stockTake.status}
          </span>
        </div>
        <div className="mt-2 text-xs text-gray-500 space-x-3">
          <span>{stockTake.periodLabel ?? "No period label"}</span>
          {stockTake.snapshotAt && (
            <span>Snapshot: {new Date(stockTake.snapshotAt).toLocaleString()}</span>
          )}
        </div>
      </header>

      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="rounded border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Lines</div>
          <div className="text-lg font-bold">{lines.length}</div>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Counted</div>
          <div className="text-lg font-bold">{totalCounted}</div>
        </div>
        <div className="rounded border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Variances</div>
          <div className="text-lg font-bold">{variances.length}</div>
        </div>
      </div>

      <div className="p-4 border-t flex flex-wrap gap-2">
        {stockTake.status === "draft" && (
          <button
            type="button"
            onClick={() => onAction(() => mutations.captureSnapshot(stockTake.id))}
            disabled={mutations.isPending}
            className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs font-medium"
          >
            Capture Snapshot
          </button>
        )}
        {stockTake.status === "counting" && (
          <button
            type="button"
            onClick={() => onAction(() => mutations.submit(stockTake.id))}
            disabled={mutations.isPending}
            className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium"
          >
            Submit for Approval
          </button>
        )}
        {stockTake.status === "pending_approval" && (
          <>
            <button
              type="button"
              onClick={() => onAction(() => mutations.approve(stockTake.id))}
              disabled={mutations.isPending}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                const reason = prompt("Rejection reason?");
                if (reason) onAction(() => mutations.reject(stockTake.id, reason));
              }}
              disabled={mutations.isPending}
              className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium"
            >
              Reject
            </button>
          </>
        )}
        {stockTake.status === "approved" && (
          <button
            type="button"
            onClick={() => onAction(() => mutations.post(stockTake.id))}
            disabled={mutations.isPending}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium"
          >
            Post Adjustments
          </button>
        )}
      </div>

      {(stockTake.status === "counting" ||
        stockTake.status === "pending_approval" ||
        stockTake.status === "approved" ||
        stockTake.status === "posted") && (
        <div className="border-t">
          <h3 className="px-4 py-3 text-sm font-semibold bg-gray-50 border-b">
            {config.label("stockTake.section.locations")} ({linesByLocation.size})
          </h3>
          <div className="divide-y">
            {Array.from(linesByLocation.entries()).map(([locationId, locLines]) => {
              const counted = locLines.filter((l) => l.countedQty !== null).length;
              const variance = locLines.filter((l) => (l.varianceQty ?? 0) !== 0).length;
              return (
                <div key={locationId ?? "unassigned"} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Location #{locationId ?? "Unassigned"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {counted}/{locLines.length} counted · {variance} variance
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {locLines.slice(0, 5).map((l) => (
                      <div key={l.id} className="flex justify-between py-0.5">
                        <span>{l.product?.name ?? `Product #${l.productId}`}</span>
                        <span className="font-mono">
                          {l.countedQty ?? "?"} / {l.expectedQty}
                        </span>
                      </div>
                    ))}
                    {locLines.length > 5 && (
                      <div className="text-gray-400">…and {locLines.length - 5} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StockTakePage;
