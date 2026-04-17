"use client";

import { keys, values } from "es-toolkit/compat";
import { useEffect, useState } from "react";
import type {
  AllocationPlanItem,
  AllocationPlanResponse,
  StockAllocation,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface AllocationPlanSectionProps {
  jobId: number;
  allocations: StockAllocation[];
  onRefresh: () => void;
}

export function AllocationPlanSection(props: AllocationPlanSectionProps) {
  const jobId = props.jobId;
  const allocations = props.allocations;
  const onRefresh = props.onRefresh;

  const [plan, setPlan] = useState<AllocationPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packCounts, setPackCounts] = useState<Record<number, number>>({});
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [jobId]);

  const fetchPlan = () => {
    setLoading(true);
    setError(null);
    stockControlApiClient
      .allocationPlan(jobId)
      .then((response) => {
        setPlan(response);
        const initialCounts = response.items.reduce(
          (acc, item) => {
            const recommendedPacks = item.recommendedPacks;
            return {
              ...acc,
              [item.stockItemId]: recommendedPacks || 0,
            };
          },
          {} as Record<number, number>,
        );
        setPackCounts(initialCounts);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load allocation plan");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const activeAllocations = allocations.filter((a) => !a.undone && a.issuedAt === null);

  const allocatedStockItemIds = new Set(
    activeAllocations.map((a) => a.stockItem?.id).filter((id) => id != null),
  );

  const adjustPackCount = (stockItemId: number, delta: number) => {
    setPackCounts((prev) => {
      const raw = prev[stockItemId];
      const current = raw == null ? 0 : raw;
      const next = Math.max(0, current + delta);
      return { ...prev, [stockItemId]: next };
    });
  };

  const totalLitresForItem = (item: AllocationPlanItem): number => {
    const raw = packCounts[item.stockItemId];
    const count = raw == null ? 0 : raw;
    const packSize = item.packSizeLitres;
    return count * (packSize == null ? 0 : packSize);
  };

  const isOverAllocated = (item: AllocationPlanItem): boolean => {
    return totalLitresForItem(item) > item.requiredLitres;
  };

  const isInsufficientStock = (item: AllocationPlanItem): boolean => {
    return totalLitresForItem(item) > item.availableQuantity;
  };

  const handleAllocateSelected = () => {
    const planItems = plan == null ? [] : plan.items == null ? [] : plan.items;
    const itemsToAllocate = planItems
      .filter((item) => {
        const raw = packCounts[item.stockItemId];
        return (raw == null ? 0 : raw) > 0;
      })
      .map((item) => {
        const rawCount = packCounts[item.stockItemId];
        const suggestion = item.leftoverSuggestion;
        const suggestedId = suggestion == null ? null : suggestion.stockItemId;
        return {
          stockItemId: item.stockItemId,
          packCount: rawCount == null ? 0 : rawCount,
          sourceLeftoverItemId: suggestedId == null ? null : suggestedId,
        };
      });

    if (itemsToAllocate.length === 0) {
      return;
    }

    setAllocating(true);
    stockControlApiClient
      .allocatePacks(jobId, itemsToAllocate)
      .then(() => {
        onRefresh();
        fetchPlan();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to allocate packs");
      })
      .finally(() => {
        setAllocating(false);
      });
  };

  const handleDeallocate = (allocationId: number) => {
    stockControlApiClient
      .deallocateAllocation(jobId, allocationId)
      .then(() => {
        onRefresh();
        fetchPlan();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to deallocate");
      });
  };

  const groupedItems = (items: AllocationPlanItem[]) => {
    return items.reduce(
      (acc, item) => {
        const cg = item.componentGroup;
        const group = cg == null ? "__standalone__" : cg;
        const existing = acc[group];
        const arr = existing == null ? [] : existing;
        return {
          ...acc,
          [group]: [...arr, item],
        };
      },
      {} as Record<string, AllocationPlanItem[]>,
    );
  };

  const allocationForStockItem = (stockItemId: number): StockAllocation | null => {
    const found = activeAllocations.find((a) => {
      const si = a.stockItem;
      return si != null && si.id === stockItemId;
    });
    return found == null ? null : found;
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-8 w-8 text-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-3 text-sm text-gray-500">Loading allocation plan...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={fetchPlan}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!plan || plan.items.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No allocation plan</h3>
          <p className="mt-1 text-sm text-gray-500">
            No items require allocation for this job card.
          </p>
        </div>
      </div>
    );
  }

  const groups = groupedItems(plan.items);
  const groupKeys = keys(groups).sort((a, b) => {
    if (a === "__standalone__") return 1;
    if (b === "__standalone__") return -1;
    return a.localeCompare(b);
  });

  const hasSelectedItems = values(packCounts).some((count) => count > 0);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Allocation Plan</h3>
        <button
          type="button"
          onClick={handleAllocateSelected}
          disabled={allocating || !hasSelectedItems}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {allocating ? "Allocating..." : "Allocate Selected"}
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {groupKeys.map((groupKey) => {
          const rawItems = groups[groupKey];
          const items = rawItems == null ? [] : rawItems;
          return (
            <div key={groupKey}>
              {groupKey !== "__standalone__" && (
                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                  <h4 className="text-sm font-semibold text-gray-700">{groupKey}</h4>
                </div>
              )}
              <div className={groupKey !== "__standalone__" ? "pl-4" : ""}>
                {items.map((item, itemIdx) => {
                  const existingAllocation = allocationForStockItem(item.stockItemId);
                  const isAllocated = allocatedStockItemIds.has(item.stockItemId);
                  const rawPackCount = packCounts[item.stockItemId];
                  const currentPackCount = rawPackCount == null ? 0 : rawPackCount;
                  const currentTotalLitres = totalLitresForItem(item);
                  const overAllocated = isOverAllocated(item);
                  const insufficient = isInsufficientStock(item);
                  const isLeftover = item.leftoverSuggestion != null;

                  const rowBg = isLeftover
                    ? "bg-amber-50"
                    : isAllocated
                      ? "bg-green-50"
                      : "bg-white";

                  return (
                    <div
                      key={`${groupKey}-${item.stockItemId}-${itemIdx}`}
                      className={`${rowBg} px-4 py-4 sm:px-6 border-b border-gray-100 last:border-b-0`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isAllocated && (
                            <svg
                              className="h-5 w-5 text-green-600 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">
                              {item.product}
                            </p>
                            <p className="text-xs text-gray-500 break-words">
                              {item.stockItemName}
                            </p>
                          </div>
                          {isLeftover && item.leftoverSuggestion && (
                            <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Leftover from JC-{item.leftoverSuggestion.sourceJobCardId}
                            </span>
                          )}
                          {item.componentRole &&
                            (() => {
                              const ratio = item.mixRatio;
                              const label = ratio
                                ? `${item.componentRole} (${ratio})`
                                : item.componentRole;
                              return (
                                <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  {label}
                                </span>
                              );
                            })()}
                        </div>

                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            {item.unitOfMeasure === "rolls" ? (
                              (() => {
                                const rawRollsReq = item.rubberRollsRequired;
                                const rollsReq = rawRollsReq || 1;
                                const rollW = item.rubberRollWidthMm;
                                const rollL = item.rubberRollLengthM;
                                const avail = item.availableQuantity;
                                return (
                                  <>
                                    <span className="text-gray-500">
                                      Rolls:{" "}
                                      <span className="font-medium text-gray-900">{rollsReq}</span>
                                    </span>
                                    {rollW && rollL && (
                                      <span className="text-gray-500">
                                        Size:{" "}
                                        <span className="font-medium text-gray-900">
                                          {rollW}mm x {rollL}m
                                        </span>
                                      </span>
                                    )}
                                    <span className="text-gray-500">
                                      Available:{" "}
                                      <span className="font-medium text-gray-900">
                                        {avail > 0 ? `${avail} in stock` : "None"}
                                      </span>
                                    </span>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                <span className="text-gray-500">
                                  Required:{" "}
                                  <span className="font-medium text-gray-900">
                                    {item.requiredLitres.toFixed(1)}L
                                  </span>
                                </span>
                                <span className="text-gray-500">
                                  Available:{" "}
                                  <span className="font-medium text-gray-900">
                                    {item.availableQuantity.toFixed(1)}L
                                  </span>
                                </span>
                                {item.packSizeLitres && (
                                  <span className="text-gray-500">
                                    Pack:{" "}
                                    <span className="font-medium text-gray-900">
                                      {item.packSizeLitres}L
                                    </span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isAllocated && existingAllocation ? (
                              <button
                                type="button"
                                onClick={() => handleDeallocate(existingAllocation.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Deallocate
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => adjustPackCount(item.stockItemId, -1)}
                                  disabled={currentPackCount <= 0}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-gray-900">
                                  {currentPackCount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustPackCount(item.stockItemId, 1)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </>
                            )}

                            {!isAllocated && currentPackCount > 0 && (
                              <div className="text-right ml-2">
                                <span className="text-xs text-gray-500">
                                  Total: {currentTotalLitres.toFixed(1)}L
                                </span>
                                {overAllocated && !insufficient && (
                                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                                    Over: +{(currentTotalLitres - item.requiredLitres).toFixed(1)}L
                                  </p>
                                )}
                                {insufficient && (
                                  <p className="text-xs text-red-600 font-medium mt-0.5">
                                    Insufficient
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
