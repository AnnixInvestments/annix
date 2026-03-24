"use client";

import { useCallback, useEffect, useState } from "react";
import type { IssuanceBatchRecord, StockAllocation } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { AllocationPlanSection } from "./AllocationPlanSection";
import { ReturnLeftoverModal } from "./ReturnLeftoverModal";

interface StockIssuesTabProps {
  jobId: number;
  allocations: StockAllocation[];
  onRefresh: () => void;
}

export function StockIssuesTab(props: StockIssuesTabProps) {
  const jobId = props.jobId;
  const allocations = props.allocations;
  const onRefresh = props.onRefresh;
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchRecords, setBatchRecords] = useState<IssuanceBatchRecord[]>([]);
  const [returnAllocation, setReturnAllocation] = useState<StockAllocation | null>(null);

  const fetchBatchRecords = useCallback(async () => {
    try {
      const records = await stockControlApiClient.batchRecordsForJobCard(jobId);
      setBatchRecords(Array.isArray(records) ? records : []);
    } catch {
      setBatchRecords([]);
    }
  }, [jobId]);

  useEffect(() => {
    fetchBatchRecords();
  }, [fetchBatchRecords]);

  const batchForStockItem = (stockItem: StockAllocation["stockItem"]): string | null => {
    if (!stockItem) return null;
    const record = batchRecords.find((r) => r.stockItemId === stockItem.id);
    return record?.batchNumber || null;
  };

  const issuedAllocations = allocations.filter((a) => !a.undone && a.issuedAt);
  const undoneAllocations = allocations.filter((a) => a.undone);

  const handleDelete = async (allocationId: number) => {
    try {
      setDeletingId(allocationId);
      setError(null);
      await stockControlApiClient.undoAllocation(jobId, allocationId);
      onRefresh();
      fetchBatchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete allocation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReturnSuccess = () => {
    setReturnAllocation(null);
    onRefresh();
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <AllocationPlanSection jobId={jobId} allocations={allocations} onRefresh={onRefresh} />

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Issued Stock</h3>
          <span className="text-sm text-gray-500">{issuedAllocations.length} issued item(s)</span>
        </div>

        {issuedAllocations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">No stock has been issued to this job card yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty Issued
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issuedAllocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {alloc.stockItem ? alloc.stockItem.name : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                      {alloc.stockItem ? alloc.stockItem.sku : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                      {alloc.totalLitres || alloc.quantityUsed}
                      {alloc.packCount ? (
                        <span className="text-gray-400 font-normal ml-1">
                          ({alloc.packCount} packs)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-mono">
                      {batchForStockItem(alloc.stockItem) || (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {alloc.issuedByName || alloc.allocatedBy || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {alloc.issuedAt
                        ? formatDateZA(alloc.issuedAt)
                        : formatDateZA(alloc.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {alloc.notes || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setReturnAllocation(alloc)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                        >
                          Return Leftover
                        </button>
                        <button
                          onClick={() => handleDelete(alloc.id)}
                          disabled={deletingId === alloc.id}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingId === alloc.id ? "Removing..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {undoneAllocations.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Deleted Allocations ({undoneAllocations.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Deleted By
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Deleted At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {undoneAllocations.map((alloc) => (
                  <tr key={alloc.id} className="opacity-50">
                    <td className="px-4 py-2 text-sm text-gray-400 line-through">
                      {alloc.stockItem ? alloc.stockItem.name : "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400 line-through">
                      {alloc.quantityUsed}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-400">{alloc.undoneByName || "-"}</td>
                    <td className="px-4 py-2 text-sm text-gray-400">
                      {alloc.undoneAt ? formatDateZA(alloc.undoneAt) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {returnAllocation && (
        <ReturnLeftoverModal
          jobId={jobId}
          allocation={returnAllocation}
          onClose={() => setReturnAllocation(null)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </div>
  );
}
