"use client";

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
          (acc, item) => ({
            ...acc,
            [item.stockItemId]: item.recommendedPacks || 0,
          }),
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
      const current = prev[stockItemId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [stockItemId]: next };
    });
  };

  const totalLitresForItem = (item: AllocationPlanItem): number => {
    const count = packCounts[item.stockItemId] || 0;
    return count * (item.packSizeLitres || 0);
  };

  const isOverAllocated = (item: AllocationPlanItem): boolean => {
    return totalLitresForItem(item) > item.requiredLitres;
  };

  const isInsufficientStock = (item: AllocationPlanItem): boolean => {
    return totalLitresForItem(item) > item.availableQuantity;
  };

  const handleAllocateSelected = () => {
    const itemsToAllocate = (plan?.items || [])
      .filter((item) => (packCounts[item.stockItemId] || 0) > 0)
      .map((item) => ({
        stockItemId: item.stockItemId,
        packCount: packCounts[item.stockItemId] || 0,
        sourceLeftoverItemId: item.leftoverSuggestion?.stockItemId || null,
      }));

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
        const group = item.componentGroup || "__standalone__";
        return {
          ...acc,
          [group]: [...(acc[group] || []), item],
        };
      },
      {} as Record<string, AllocationPlanItem[]>,
    );
  };

  const allocationForStockItem = (stockItemId: number): StockAllocation | null => {
    return activeAllocations.find((a) => a.stockItem?.id === stockItemId) || null;
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
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "__standalone__") return 1;
    if (b === "__standalone__") return -1;
    return a.localeCompare(b);
  });

  const hasSelectedItems = Object.values(packCounts).some((count) => count > 0);

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
          const items = groups[groupKey] || [];
          return (
            <div key={groupKey}>
              {groupKey !== "__standalone__" && (
                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                  <h4 className="text-sm font-semibold text-gray-700">{groupKey}</h4>
                </div>
              )}
              <div className={groupKey !== "__standalone__" ? "pl-4" : ""}>
                {items.map((item) => {
                  const existingAllocation = allocationForStockItem(item.stockItemId);
                  const isAllocated = allocatedStockItemIds.has(item.stockItemId);
                  const currentPackCount = packCounts[item.stockItemId] || 0;
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
                      key={item.stockItemId}
                      className={`${rowBg} px-4 py-4 sm:px-6 border-b border-gray-100 last:border-b-0`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
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
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{item.stockItemName}</p>
                          {isLeftover && item.leftoverSuggestion && (
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Leftover from JC-{item.leftoverSuggestion.sourceJobCardId}
                            </span>
                          )}
                          {item.componentRole && (
                            <span className="inline-flex items-center mt-1 ml-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {item.componentRole}
                              {item.mixRatio ? ` (${item.mixRatio})` : ""}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1 text-sm">
                          {item.unitOfMeasure === "rolls" ? (
                            <>
                              <div className="text-gray-500">
                                Rolls:{" "}
                                <span className="font-medium text-gray-900">
                                  {item.rubberRollsRequired || 1}
                                </span>
                              </div>
                              {item.rubberRollWidthMm && item.rubberRollLengthM && (
                                <div className="text-gray-500">
                                  Size:{" "}
                                  <span className="font-medium text-gray-900">
                                    {item.rubberRollWidthMm}mm x {item.rubberRollLengthM}m
                                  </span>
                                </div>
                              )}
                              <div className="text-gray-500">
                                Available:{" "}
                                <span className="font-medium text-gray-900">
                                  {item.availableQuantity > 0
                                    ? `${item.availableQuantity} in stock`
                                    : "None"}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-gray-500">
                                Required:{" "}
                                <span className="font-medium text-gray-900">
                                  {item.requiredLitres.toFixed(1)}L
                                </span>
                              </div>
                              <div className="text-gray-500">
                                Available:{" "}
                                <span className="font-medium text-gray-900">
                                  {item.availableQuantity.toFixed(1)}L
                                </span>
                              </div>
                              {item.packSizeLitres && (
                                <div className="text-gray-500">
                                  Pack:{" "}
                                  <span className="font-medium text-gray-900">
                                    {item.packSizeLitres}L
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {isAllocated && existingAllocation ? (
                            <button
                              type="button"
                              onClick={() => handleDeallocate(existingAllocation.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Deallocate
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => adjustPackCount(item.stockItemId, -1)}
                                disabled={currentPackCount <= 0}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                -
                              </button>
                              <span className="w-10 text-center text-sm font-medium text-gray-900">
                                {currentPackCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustPackCount(item.stockItemId, 1)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                              >
                                +
                              </button>
                            </div>
                          )}

                          {!isAllocated && currentPackCount > 0 && (
                            <div className="text-right">
                              <span className="text-xs text-gray-500">
                                Total: {currentTotalLitres.toFixed(1)}L
                              </span>
                              {overAllocated && !insufficient && (
                                <p className="text-xs text-amber-600 font-medium mt-0.5">
                                  Over-allocation: +
                                  {(currentTotalLitres - item.requiredLitres).toFixed(1)}L
                                </p>
                              )}
                              {insufficient && (
                                <p className="text-xs text-red-600 font-medium mt-0.5">
                                  Insufficient stock
                                </p>
                              )}
                            </div>
                          )}
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
