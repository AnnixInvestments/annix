"use client";

import { ChevronDown, ChevronRight, Package, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  CpoBatchChildJobCard,
  CpoBatchIssueContext,
  CustomerPurchaseOrder,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { useCpoBatchIssueContext } from "@/app/lib/query/hooks/stock-control";

interface CpoBatchPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    context: CpoBatchIssueContext,
    selectedJobCardIds: number[],
    selectedLineItemsByJc: Record<number, number[]>,
  ) => void;
}

export function CpoBatchPicker(props: CpoBatchPickerProps) {
  const { isOpen, onClose, onConfirm } = props;
  const [cpoSearch, setCpoSearch] = useState("");
  const [cpoList, setCpoList] = useState<CustomerPurchaseOrder[]>([]);
  const [isLoadingCpos, setIsLoadingCpos] = useState(false);
  const [selectedCpoId, setSelectedCpoId] = useState<number | null>(null);
  const [selectedJobCardIds, setSelectedJobCardIds] = useState<Set<number>>(new Set());
  const [selectedLineItemsByJc, setSelectedLineItemsByJc] = useState<Record<number, Set<number>>>(
    {},
  );
  const [expandedJcIds, setExpandedJcIds] = useState<Set<number>>(new Set());

  const {
    data: context,
    isLoading: isLoadingContext,
    error: contextError,
  } = useCpoBatchIssueContext(selectedCpoId ?? 0);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingCpos(true);
    stockControlApiClient
      .cpos()
      .then((data) => {
        const active = data.filter((cpo) => cpo.status === "active");
        setCpoList(active);
      })
      .catch((err) => {
        console.error("Failed to load CPOs:", err);
        setCpoList([]);
      })
      .finally(() => setIsLoadingCpos(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCpoId(null);
      setSelectedJobCardIds(new Set());
      setSelectedLineItemsByJc({});
      setExpandedJcIds(new Set());
      setCpoSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (context && context.jobCards.length > 0) {
      const allIds = new Set(context.jobCards.map((jc) => jc.id));
      setSelectedJobCardIds(allIds);
      const lineItemsInit: Record<number, Set<number>> = {};
      context.jobCards.forEach((jc) => {
        lineItemsInit[jc.id] = new Set(jc.lineItems.map((li) => li.id));
      });
      setSelectedLineItemsByJc(lineItemsInit);
    }
  }, [context]);

  const filteredCpos = cpoList.filter((cpo) => {
    const needle = cpoSearch.toLowerCase().trim();
    if (!needle) return true;
    const jobName = cpo.jobName;
    const customerName = cpo.customerName;
    const jobNumber = cpo.jobNumber;
    const jobNameStr = jobName || "";
    const customerNameStr = customerName || "";
    const jobNumberStr = jobNumber || "";
    return (
      cpo.cpoNumber.toLowerCase().includes(needle) ||
      jobNameStr.toLowerCase().includes(needle) ||
      customerNameStr.toLowerCase().includes(needle) ||
      jobNumberStr.toLowerCase().includes(needle)
    );
  });

  const toggleJobCard = (jc: CpoBatchChildJobCard) => {
    setSelectedJobCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(jc.id)) {
        next.delete(jc.id);
        setSelectedLineItemsByJc((prevItems) => ({ ...prevItems, [jc.id]: new Set() }));
      } else {
        next.add(jc.id);
        setSelectedLineItemsByJc((prevItems) => ({
          ...prevItems,
          [jc.id]: new Set(jc.lineItems.map((li) => li.id)),
        }));
      }
      return next;
    });
  };

  const toggleExpand = (jcId: number) => {
    setExpandedJcIds((prev) => {
      const next = new Set(prev);
      if (next.has(jcId)) {
        next.delete(jcId);
      } else {
        next.add(jcId);
      }
      return next;
    });
  };

  const toggleLineItem = (jcId: number, lineItemId: number) => {
    setSelectedLineItemsByJc((prev) => {
      const current = prev[jcId] ? new Set(prev[jcId]) : new Set<number>();
      if (current.has(lineItemId)) {
        current.delete(lineItemId);
      } else {
        current.add(lineItemId);
      }
      const next = { ...prev, [jcId]: current };
      setSelectedJobCardIds((jcPrev) => {
        const jcNext = new Set(jcPrev);
        if (current.size === 0) {
          jcNext.delete(jcId);
        } else {
          jcNext.add(jcId);
        }
        return jcNext;
      });
      return next;
    });
  };

  const toggleAll = () => {
    if (!context) return;
    if (selectedJobCardIds.size === context.jobCards.length) {
      setSelectedJobCardIds(new Set());
      setSelectedLineItemsByJc({});
    } else {
      setSelectedJobCardIds(new Set(context.jobCards.map((jc) => jc.id)));
      const all: Record<number, Set<number>> = {};
      context.jobCards.forEach((jc) => {
        all[jc.id] = new Set(jc.lineItems.map((li) => li.id));
      });
      setSelectedLineItemsByJc(all);
    }
  };

  const allJobCards = context ? context.jobCards : [];
  const selectedJobCards = allJobCards.filter((jc) => selectedJobCardIds.has(jc.id));

  const computeSelectedM2 = (jc: CpoBatchChildJobCard) => {
    const selected = selectedLineItemsByJc[jc.id];
    if (!selected || selected.size === 0) return 0;
    return jc.lineItems
      .filter((li) => selected.has(li.id))
      .reduce((sum, li) => sum + (li.m2 || 0), 0);
  };

  const computeTotalM2 = (jc: CpoBatchChildJobCard) => {
    return jc.lineItems.reduce((sum, li) => sum + (li.m2 || 0), 0);
  };

  const jcSelectionRatio = (jc: CpoBatchChildJobCard) => {
    const total = computeTotalM2(jc);
    if (total <= 0) {
      const selected = selectedLineItemsByJc[jc.id];
      const selectedCount = selected ? selected.size : 0;
      return jc.lineItems.length > 0 ? selectedCount / jc.lineItems.length : 1;
    }
    return computeSelectedM2(jc) / total;
  };

  const selectedM2Total = selectedJobCards.reduce((sum, jc) => sum + computeSelectedM2(jc), 0);

  const aggregatedCoatsForSelection = aggregateForSelection(context, selectedJobCardIds, (jc) =>
    jcSelectionRatio(jc),
  );

  const handleConfirm = () => {
    if (!context || selectedJobCardIds.size === 0) return;
    const lineItemRecord: Record<number, number[]> = {};
    Object.entries(selectedLineItemsByJc).forEach(([jcId, ids]) => {
      lineItemRecord[Number(jcId)] = Array.from(ids);
    });
    onConfirm(context, Array.from(selectedJobCardIds), lineItemRecord);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5" />
              CPO Batch Issuing
            </h2>
            <p className="text-sm text-gray-600">
              Pick a CPO and select the JCs (and line items) you are painting / lining together
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedCpoId && (
            <div className="space-y-3">
              <input
                type="text"
                value={cpoSearch}
                onChange={(e) => setCpoSearch(e.target.value)}
                placeholder="Search by CPO number, job, or customer..."
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              {isLoadingCpos && (
                <div className="text-sm text-gray-500 text-center py-6">Loading CPOs...</div>
              )}
              {!isLoadingCpos && filteredCpos.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-6">No active CPOs found</div>
              )}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredCpos.map((cpo) => (
                  <button
                    type="button"
                    key={cpo.id}
                    onClick={() => setSelectedCpoId(cpo.id)}
                    className="w-full text-left border rounded p-3 hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{cpo.cpoNumber}</div>
                        <div className="text-sm text-gray-600">
                          {cpo.jobName || "—"} · {cpo.customerName || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {cpo.totalItems} items · {Number(cpo.totalQuantity)} qty
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCpoId && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedCpoId(null)}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Back to CPO list
              </button>

              {isLoadingContext && (
                <div className="text-sm text-gray-500 py-6 text-center">Loading JCs...</div>
              )}

              {contextError && (
                <div className="text-sm text-red-600 p-3 border border-red-300 bg-red-50 rounded">
                  {contextError instanceof Error
                    ? contextError.message
                    : "Failed to load CPO context"}
                </div>
              )}

              {context && context.jobCards.length === 0 && (
                <div className="text-sm text-gray-500 py-6 text-center">
                  No active job cards linked to this CPO
                </div>
              )}

              {context && context.jobCards.length > 0 && (
                <>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="font-semibold">{context.cpo.cpoNumber}</div>
                    <div className="text-sm text-gray-600">
                      {context.cpo.jobName || "—"} · {context.cpo.customerName || "—"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-700">
                      Child Job Cards ({context.jobCards.length})
                    </h3>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedJobCardIds.size === context.jobCards.length
                        ? "Deselect all"
                        : "Select all"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[45vh] overflow-y-auto border rounded">
                    {context.jobCards.map((jc) => (
                      <JobCardRow
                        key={jc.id}
                        jobCard={jc}
                        selectedLineItemIds={selectedLineItemsByJc[jc.id] || new Set<number>()}
                        isJcSelected={selectedJobCardIds.has(jc.id)}
                        isExpanded={expandedJcIds.has(jc.id)}
                        onToggleJc={() => toggleJobCard(jc)}
                        onToggleExpand={() => toggleExpand(jc.id)}
                        onToggleLineItem={(lineItemId) => toggleLineItem(jc.id, lineItemId)}
                      />
                    ))}
                  </div>

                  <div className="border rounded p-3 bg-gray-50">
                    <h4 className="font-semibold text-sm mb-2">
                      Aggregated Paint Requirements ({selectedJobCardIds.size} JCs)
                    </h4>
                    {aggregatedCoatsForSelection.length === 0 && (
                      <div className="text-xs text-gray-500">
                        No coating analysis data available for the selected JCs
                      </div>
                    )}
                    {aggregatedCoatsForSelection.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {aggregatedCoatsForSelection.map((aggregate) => (
                          <div
                            key={aggregate.product}
                            className="flex items-center justify-between bg-white rounded px-2 py-1 border"
                          >
                            <span className="truncate pr-2">{aggregate.product}</span>
                            <span className="font-mono font-semibold whitespace-nowrap">
                              {aggregate.litresRequired.toFixed(1)}L
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t text-xs text-gray-600 flex items-center gap-4">
                      <span>
                        Selected m²: <strong>{selectedM2Total.toFixed(1)}</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!context || selectedJobCardIds.size === 0}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use these {selectedJobCardIds.size} JCs
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function JobCardRow(props: {
  jobCard: CpoBatchChildJobCard;
  selectedLineItemIds: Set<number>;
  isJcSelected: boolean;
  isExpanded: boolean;
  onToggleJc: () => void;
  onToggleExpand: () => void;
  onToggleLineItem: (lineItemId: number) => void;
}) {
  const {
    jobCard,
    selectedLineItemIds,
    isJcSelected,
    isExpanded,
    onToggleJc,
    onToggleExpand,
    onToggleLineItem,
  } = props;
  const analysis = jobCard.coatingAnalysis;
  const coats = analysis ? analysis.coats : [];
  const totalLitres = coats.reduce((sum, coat) => {
    const required = Number(coat.litersRequired);
    return sum + (Number.isFinite(required) ? required : 0);
  }, 0);
  const coatingStatus = analysis ? analysis.status : "none";
  const totalM2 = jobCard.lineItems.reduce((sum, li) => sum + (li.m2 || 0), 0);
  const selectedM2 = jobCard.lineItems
    .filter((li) => selectedLineItemIds.has(li.id))
    .reduce((sum, li) => sum + (li.m2 || 0), 0);
  const allSelected =
    jobCard.lineItems.length > 0 && selectedLineItemIds.size === jobCard.lineItems.length;
  const partial = selectedLineItemIds.size > 0 && !allSelected;

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-start gap-2 p-3 hover:bg-blue-50">
        <input
          type="checkbox"
          checked={isJcSelected}
          onChange={onToggleJc}
          className="mt-1 h-4 w-4 text-blue-600 rounded"
        />
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-0.5 text-gray-400 hover:text-gray-700"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{jobCard.jcNumber || jobCard.jobNumber}</span>
            <span className="text-xs text-gray-500 truncate">{jobCard.jobName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {jobCard.lineItemCount} items · Selected {selectedLineItemIds.size}/
            {jobCard.lineItemCount} · {selectedM2.toFixed(1)}/{totalM2.toFixed(1)} m² · Paint{" "}
            {totalLitres.toFixed(1)}L
            {partial && <span className="ml-2 text-amber-700 font-medium">Partial</span>}
          </div>
        </div>
        <div className="text-xs">
          <CoatingStatusBadge status={coatingStatus} />
        </div>
      </div>
      {isExpanded && jobCard.lineItems.length > 0 && (
        <div className="pl-10 pr-3 pb-3 space-y-1 bg-gray-50">
          {jobCard.lineItems.map((li) => {
            const isChecked = selectedLineItemIds.has(li.id);
            const label = li.itemNo || li.itemCode || `#${li.id}`;
            const description = li.itemDescription || "";
            return (
              <label
                key={li.id}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer ${
                  isChecked ? "bg-blue-100" : "bg-white border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleLineItem(li.id)}
                  className="h-3.5 w-3.5 text-blue-600 rounded"
                />
                <span className="font-mono text-gray-700 w-16 truncate">{label}</span>
                <span className="flex-1 truncate text-gray-700">{description}</span>
                {li.jtNo && <span className="text-gray-400">JT {li.jtNo}</span>}
                {li.m2 !== null && (
                  <span className="text-gray-600 font-mono whitespace-nowrap">
                    {li.m2.toFixed(2)} m²
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
      {isExpanded && jobCard.lineItems.length === 0 && (
        <div className="pl-10 pr-3 pb-3 text-xs text-gray-400 italic">
          No line items on this job card
        </div>
      )}
    </div>
  );
}

function CoatingStatusBadge({ status }: { status: string }) {
  const label = status === "accepted" ? "PM OK" : status === "analysed" ? "Analysed" : status;
  const cls =
    status === "accepted"
      ? "bg-green-100 text-green-800"
      : status === "analysed"
        ? "bg-amber-100 text-amber-800"
        : status === "failed"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function aggregateForSelection(
  context: CpoBatchIssueContext | undefined,
  selectedIds: Set<number>,
  ratioForJc: (jc: CpoBatchChildJobCard) => number,
): { product: string; litresRequired: number }[] {
  if (!context) return [];
  const scaledEntries = context.jobCards
    .filter((jc) => selectedIds.has(jc.id))
    .flatMap((jc) => {
      const analysis = jc.coatingAnalysis;
      const coats = analysis ? analysis.coats : [];
      const ratio = ratioForJc(jc);
      return coats.map((coat) => {
        const base = Number(coat.litersRequired);
        const safe = Number.isFinite(base) ? base : 0;
        return { product: coat.product, scaled: safe * ratio };
      });
    });

  const byProduct = scaledEntries.reduce((acc, entry) => {
    const key = entry.product.trim();
    const existing = acc.get(key);
    const previous = existing === undefined ? 0 : existing;
    acc.set(key, previous + entry.scaled);
    return acc;
  }, new Map<string, number>());

  return Array.from(byProduct.entries())
    .map(([product, litresRequired]) => ({ product, litresRequired }))
    .sort((a, b) => a.product.localeCompare(b.product));
}
