"use client";

import { useEffect, useMemo, useState } from "react";
import { fromISO, now } from "@/app/lib/datetime";
import { StockManagementApiClient } from "../api/stockManagementApi";
import { useStockTake, useStockTakeMutations, useStockTakes } from "../hooks/useStockTakeQueries";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";
import type { StockTakeDto, StockTakeLineDto, StockTakeStatus } from "../types/stockTake";

type StockHoldReason = "damaged" | "expired" | "contaminated" | "recalled" | "wrong_spec" | "other";

const STOCK_HOLD_REASON_OPTIONS: ReadonlyArray<{ value: StockHoldReason; label: string }> = [
  { value: "damaged", label: "Damaged (photo required)" },
  { value: "expired", label: "Expired (photo required)" },
  { value: "contaminated", label: "Contaminated (photo required)" },
  { value: "recalled", label: "Recalled by supplier" },
  { value: "wrong_spec", label: "Wrong specification" },
  { value: "other", label: "Other (notes required)" },
];

function buildMonthEndOptions(): Array<{ label: string; value: string }> {
  const current = now();
  const offsets = [1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12];
  return offsets.map((offset) => {
    const month = current.plus({ months: offset });
    const label = `${month.toFormat("MMMM yyyy")} Month-End`;
    return { label, value: label };
  });
}

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
  const isCreatePending = mutations.isPending;
  const monthEndOptions = useMemo(() => buildMonthEndOptions(), []);
  const defaultMonthEnd = monthEndOptions.find((o) => o.value.startsWith(now().toFormat("MMMM")));
  const initialCreateName =
    defaultMonthEnd == null ? monthEndOptions[1].value : defaultMonthEnd.value;
  const [createName, setCreateName] = useState(initialCreateName);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (showCreate) {
      setCreateName(initialCreateName);
    }
  }, [showCreate, initialCreateName]);

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
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
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
          {(stockTakes ?? []).map((st) => {
            const periodLabel = st.periodLabel;
            const periodDisplay = periodLabel == null ? "—" : periodLabel;
            return (
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
                <div className="text-xs text-gray-500 mt-1">{periodDisplay}</div>
              </button>
            );
          })}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold">{config.label("stockTake.startSession")}</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Month-end period
              </label>
              <select
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              >
                {monthEndOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pick the month this stock take will reconcile against. Defaults to the current
                month.
              </p>
            </div>
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
                disabled={isCreatePending || !createName.trim()}
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
  const rawLines = stockTake.lines;
  const lines = rawLines == null ? [] : rawLines;
  const rawPeriodLabel = stockTake.periodLabel;
  const periodDisplay = rawPeriodLabel == null ? "No period label" : rawPeriodLabel;
  const [holdLineId, setHoldLineId] = useState<number | null>(null);
  const [holdReason, setHoldReason] = useState<StockHoldReason>("damaged");
  const [holdNotes, setHoldNotes] = useState("");
  const [holdSubmitting, setHoldSubmitting] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  const apiClient = useMemo(
    () =>
      new StockManagementApiClient({
        baseUrl: config.apiBaseUrl,
        headers: config.authHeaders,
      }),
    [config.apiBaseUrl, config.authHeaders],
  );

  const handleMoveToHold = async (line: StockTakeLineDto) => {
    if (holdNotes.trim() === "") {
      setHoldError("Please enter notes describing the reason");
      return;
    }
    const varianceQty = line.varianceQty;
    const absVariance = varianceQty == null ? 0 : Math.abs(varianceQty);
    setHoldSubmitting(true);
    setHoldError(null);
    try {
      await apiClient.flagStockHold({
        productId: line.productId,
        stockTakeId: stockTake.id,
        quantity: absVariance,
        reason: holdReason,
        reasonNotes: holdNotes,
      });
      setHoldLineId(null);
      setHoldNotes("");
      setHoldReason("damaged");
      // eslint-disable-next-line no-restricted-globals -- legacy sync alert pending modal migration (issue #175)
      alert(`Moved ${line.productId} to hold queue`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setHoldError(message);
    } finally {
      setHoldSubmitting(false);
    }
  };

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
          <span>{periodDisplay}</span>
          {stockTake.snapshotAt && (
            <span>Snapshot: {fromISO(stockTake.snapshotAt).toJSDate().toLocaleString()}</span>
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
                // eslint-disable-next-line no-restricted-globals -- legacy sync prompt pending modal migration (issue #175)
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

      {variances.length > 0 &&
        (stockTake.status === "counting" ||
          stockTake.status === "pending_approval" ||
          stockTake.status === "approved" ||
          stockTake.status === "posted") && (
          <div className="border-t">
            <h3 className="px-4 py-3 text-sm font-semibold bg-amber-50 border-b border-amber-200">
              Variance lines ({variances.length})
            </h3>
            <div className="divide-y">
              {variances.map((line) => {
                const productName = line.product?.name;
                const displayName =
                  productName == null ? `Product #${line.productId}` : productName;
                const countedQty = line.countedQty;
                const countedDisplay = countedQty == null ? "?" : countedQty;
                const varianceQty = line.varianceQty;
                const varianceDisplay = varianceQty == null ? 0 : varianceQty;
                const isHoldOpen = holdLineId === line.id;
                return (
                  <div key={line.id} className="p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{displayName}</div>
                        <div className="text-gray-500 mt-0.5">
                          Expected: <span className="font-mono">{line.expectedQty}</span> · Counted:{" "}
                          <span className="font-mono">{countedDisplay}</span> · Variance:{" "}
                          <span
                            className={`font-mono font-semibold ${
                              varianceDisplay < 0 ? "text-red-600" : "text-amber-700"
                            }`}
                          >
                            {varianceDisplay > 0 ? "+" : ""}
                            {varianceDisplay}
                          </span>
                        </div>
                      </div>
                      {!isHoldOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setHoldLineId(line.id);
                            setHoldReason("damaged");
                            setHoldNotes("");
                            setHoldError(null);
                          }}
                          className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                        >
                          Move to Hold
                        </button>
                      ) : null}
                    </div>
                    {isHoldOpen ? (
                      <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-gray-700 mb-0.5">
                            Hold reason
                          </label>
                          <select
                            value={holdReason}
                            onChange={(e) => setHoldReason(e.target.value as StockHoldReason)}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
                          >
                            {STOCK_HOLD_REASON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-gray-700 mb-0.5">
                            Notes
                          </label>
                          <textarea
                            value={holdNotes}
                            onChange={(e) => setHoldNotes(e.target.value)}
                            rows={2}
                            placeholder="What's wrong with this stock?"
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                          />
                        </div>
                        {holdError != null ? (
                          <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
                            {holdError}
                          </div>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHoldLineId(null);
                              setHoldNotes("");
                              setHoldError(null);
                            }}
                            className="px-3 py-1 text-xs border border-gray-300 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveToHold(line)}
                            disabled={holdSubmitting}
                            className="px-3 py-1 text-xs bg-amber-600 text-white rounded font-medium disabled:opacity-50"
                          >
                            {holdSubmitting ? "Moving…" : "Confirm hold"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              const variance = locLines.filter((l) => {
                const varianceQty = l.varianceQty;
                const resolvedVariance = varianceQty == null ? 0 : varianceQty;
                return resolvedVariance !== 0;
              }).length;
              const locationKey = locationId == null ? "unassigned" : locationId;
              const locationLabel = locationId == null ? "Unassigned" : locationId;
              return (
                <div key={locationKey} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Location #{locationLabel}</span>
                    <span className="text-xs text-gray-500">
                      {counted}/{locLines.length} counted · {variance} variance
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {locLines.slice(0, 5).map((l) => {
                      const productName = l.product?.name;
                      const displayName = productName ? productName : `Product #${l.productId}`;
                      const countedQty = l.countedQty;
                      const countedDisplay = countedQty == null ? "?" : countedQty;
                      return (
                        <div key={l.id} className="flex justify-between py-0.5">
                          <span>{displayName}</span>
                          <span className="font-mono">
                            {countedDisplay} / {l.expectedQty}
                          </span>
                        </div>
                      );
                    })}
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
