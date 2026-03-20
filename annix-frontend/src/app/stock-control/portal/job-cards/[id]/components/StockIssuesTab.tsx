"use client";

import { useState } from "react";
import type { StockAllocation } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface StockIssuesTabProps {
  jobId: number;
  allocations: StockAllocation[];
  onRefresh: () => void;
}

export function StockIssuesTab(props: StockIssuesTabProps) {
  const { jobId, allocations, onRefresh } = props;
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAllocations = allocations.filter((a) => !a.undone);
  const undoneAllocations = allocations.filter((a) => a.undone);

  const handleDelete = async (allocationId: number) => {
    try {
      setDeletingId(allocationId);
      setError(null);
      await stockControlApiClient.undoAllocation(jobId, allocationId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete allocation");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Stock Issues</h3>
        <span className="text-sm text-gray-500">
          {activeAllocations.length} active allocation(s)
        </span>
      </div>

      {activeAllocations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No stock has been issued to this job card yet</p>
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
                  Issued To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
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
              {activeAllocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {alloc.stockItem ? alloc.stockItem.name : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                    {alloc.stockItem ? alloc.stockItem.sku : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                    {alloc.quantityUsed}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {alloc.staffMember ? alloc.staffMember.name : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {alloc.allocatedBy || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateZA(alloc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                    {alloc.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(alloc.id)}
                      disabled={deletingId === alloc.id}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deletingId === alloc.id ? (
                        "Removing..."
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {undoneAllocations.length > 0 && (
        <div className="mt-6">
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
                    <td className="px-4 py-2 text-sm text-gray-400">
                      {alloc.undoneByName || "-"}
                    </td>
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
    </div>
  );
}
