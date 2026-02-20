"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { JobCard, StockAllocation, StockItem } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  draft: [
    { label: "Activate", next: "active", color: "bg-green-600 hover:bg-green-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  active: [
    { label: "Complete", next: "completed", color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Cancel", next: "cancelled", color: "bg-red-600 hover:bg-red-700" },
  ],
  completed: [],
  cancelled: [],
};

export default function JobCardDetailPage() {
  const params = useParams();
  const jobId = Number(params.id);

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    stockItemId: 0,
    quantityUsed: 1,
    notes: "",
  });
  const [isAllocating, setIsAllocating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobData, allocationsData] = await Promise.all([
        stockControlApiClient.jobCardById(jobId),
        stockControlApiClient.jobCardAllocations(jobId),
      ]);
      setJobCard(jobData);
      setAllocations(Array.isArray(allocationsData) ? allocationsData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load job card"));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchStockItems = async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stock items"));
    }
  };

  const openAllocateModal = async () => {
    await fetchStockItems();
    setAllocateForm({ stockItemId: 0, quantityUsed: 1, notes: "" });
    setShowAllocateModal(true);
  };

  const handleAllocate = async () => {
    if (!allocateForm.stockItemId) return;
    try {
      setIsAllocating(true);
      await stockControlApiClient.allocateStock(jobId, {
        stockItemId: allocateForm.stockItemId,
        quantityUsed: allocateForm.quantityUsed,
        notes: allocateForm.notes || undefined,
      });
      setShowAllocateModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to allocate stock"));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await stockControlApiClient.updateJobCard(jobId, { status: newStatus });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update status"));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job card...</p>
        </div>
      </div>
    );
  }

  if (error || !jobCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Job card not found"}</p>
          <Link href="/stock-control/portal/job-cards" className="mt-4 inline-block text-teal-600 hover:text-teal-800">
            Back to Job Cards
          </Link>
        </div>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[jobCard.status.toLowerCase()] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/job-cards"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{jobCard.jobNumber}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}>
                {jobCard.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">{jobCard.jobName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {transitions.map((transition) => (
            <button
              key={transition.next}
              onClick={() => handleStatusUpdate(transition.next)}
              disabled={isUpdatingStatus}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${transition.color}`}
            >
              {transition.label}
            </button>
          ))}
          {jobCard.status === "active" && (
            <button
              onClick={openAllocateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Allocate Stock
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Job Card Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Job Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.jobName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{jobCard.customerName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(jobCard.status)}`}>
                  {jobCard.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(jobCard.updatedAt)}</dd>
            </div>
            {jobCard.description && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{jobCard.description}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Allocations</h3>
          <span className="text-sm text-gray-500">{allocations.length} allocations</span>
        </div>
        {allocations.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No allocations</h3>
            <p className="mt-1 text-sm text-gray-500">Allocate stock items to this job card.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Used</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated By</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {allocation.stockItem?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {allocation.stockItem?.sku || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {allocation.quantityUsed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {allocation.allocatedBy || "System"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(allocation.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {allocation.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAllocateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAllocateModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allocate Stock to Job</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Item</label>
                  <select
                    value={allocateForm.stockItemId}
                    onChange={(e) => setAllocateForm({ ...allocateForm, stockItemId: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value={0}>Select an item...</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name} (SOH: {item.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={allocateForm.quantityUsed}
                    onChange={(e) => setAllocateForm({ ...allocateForm, quantityUsed: parseInt(e.target.value) || 1 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={allocateForm.notes}
                    onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={isAllocating || !allocateForm.stockItemId}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isAllocating ? "Allocating..." : "Allocate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
