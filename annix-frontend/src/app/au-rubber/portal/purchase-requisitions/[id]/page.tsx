"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import {
  auRubberApiClient,
  type RequisitionDto,
  type RequisitionStatus,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../../components/Breadcrumb";

const statusColors: Record<RequisitionStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  ORDERED: "bg-purple-100 text-purple-800",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export default function PurchaseRequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuRubberAuth();
  const [requisition, setRequisition] = useState<RequisitionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveAmounts, setReceiveAmounts] = useState<Record<number, string>>({});
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderPoNumber, setOrderPoNumber] = useState("");
  const [orderExpectedDate, setOrderExpectedDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const id = Number(params.id);
  const userEmail = user?.email || "Unknown";

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.purchaseRequisitionById(id);
      setRequisition(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load requisition"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await auRubberApiClient.approveRequisition(id, userEmail);
      showToast("Requisition approved", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    try {
      setIsProcessing(true);
      await auRubberApiClient.rejectRequisition(id, userEmail, rejectReason);
      showToast("Requisition rejected", "success");
      setShowRejectModal(false);
      setRejectReason("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reject", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkOrdered = async () => {
    try {
      setIsProcessing(true);
      await auRubberApiClient.markRequisitionOrdered(id, {
        externalPoNumber: orderPoNumber || undefined,
        expectedDeliveryDate: orderExpectedDate || undefined,
      });
      showToast("Requisition marked as ordered", "success");
      setShowOrderModal(false);
      setOrderPoNumber("");
      setOrderExpectedDate("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceive = async () => {
    const itemReceipts = Object.entries(receiveAmounts)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([itemId, qty]) => ({
        itemId: Number(itemId),
        quantityReceivedKg: Number(qty),
      }));

    if (itemReceipts.length === 0) {
      showToast("Please enter at least one quantity to receive", "error");
      return;
    }

    try {
      setIsProcessing(true);
      await auRubberApiClient.receiveRequisitionItems(id, itemReceipts);
      showToast("Items received", "success");
      setShowReceiveModal(false);
      setReceiveAmounts({});
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to receive", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsProcessing(true);
      await auRubberApiClient.cancelRequisition(id);
      showToast("Requisition cancelled", "success");
      router.push("/au-rubber/portal/purchase-requisitions");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Requisition</div>
          <p className="text-gray-600">{error?.message || "Requisition not found"}</p>
          <button
            onClick={() => router.push("/au-rubber/portal/purchase-requisitions")}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const canApprove = requisition.status === "PENDING";
  const canOrder = requisition.status === "APPROVED";
  const canReceive =
    requisition.status === "ORDERED" || requisition.status === "PARTIALLY_RECEIVED";
  const canCancel = requisition.status !== "RECEIVED" && requisition.status !== "CANCELLED";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Purchase Requisitions", href: "/au-rubber/portal/purchase-requisitions" },
          { label: requisition.requisitionNumber },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{requisition.requisitionNumber}</h1>
          <div className="mt-1 flex items-center space-x-3">
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[requisition.status]}`}
            >
              {requisition.statusLabel}
            </span>
            <span className="text-sm text-gray-500">{requisition.sourceTypeLabel}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          {canApprove && (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {canOrder && (
            <button
              onClick={() => setShowOrderModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              Mark as Ordered
            </button>
          )}
          {canReceive && (
            <button
              onClick={() => setShowReceiveModal(true)}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Receive Items
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Supplier</dt>
              <dd className="text-sm font-medium text-gray-900">
                {requisition.supplierCompanyName || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">External PO #</dt>
              <dd className="text-sm font-medium text-gray-900">
                {requisition.externalPoNumber || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Expected Delivery</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatDate(requisition.expectedDeliveryDate)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created By</dt>
              <dd className="text-sm font-medium text-gray-900">{requisition.createdBy || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm font-medium text-gray-900">
                {formatDate(requisition.createdAt)}
              </dd>
            </div>
            {requisition.approvedBy && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Approved By</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {requisition.approvedBy} ({formatDate(requisition.approvedAt)})
                </dd>
              </div>
            )}
            {requisition.orderedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ordered</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(requisition.orderedAt)}
                </dd>
              </div>
            )}
            {requisition.receivedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Received</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(requisition.receivedAt)}
                </dd>
              </div>
            )}
            {requisition.rejectionReason && (
              <div className="pt-2 border-t">
                <dt className="text-sm text-gray-500">Rejection Reason</dt>
                <dd className="text-sm font-medium text-red-600 mt-1">
                  {requisition.rejectionReason}
                </dd>
              </div>
            )}
          </dl>
          {requisition.notes && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700">Notes</h3>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{requisition.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Items</dt>
              <dd className="text-sm font-medium text-gray-900">{requisition.items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Quantity</dt>
              <dd className="text-sm font-medium text-gray-900">
                {requisition.totalQuantityKg.toFixed(2)} kg
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total Received</dt>
              <dd className="text-sm font-medium text-green-600">
                {requisition.totalReceivedKg.toFixed(2)} kg
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Outstanding</dt>
              <dd className="text-sm font-medium text-orange-600">
                {(requisition.totalQuantityKg - requisition.totalReceivedKg).toFixed(2)} kg
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Items</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Compound
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Quantity (kg)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Received (kg)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Outstanding (kg)
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Unit Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requisition.items.map((item) => {
              const outstanding = item.quantityKg - item.quantityReceivedKg;
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {item.compoundName || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantityKg.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {item.quantityReceivedKg.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${outstanding > 0 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {outstanding.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.unitPrice ? `R ${item.unitPrice.toFixed(2)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowRejectModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Requisition</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  rows={3}
                  placeholder="Please provide a reason for rejection"
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowOrderModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mark as Ordered</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Purchase Order # (Optional)
                  </label>
                  <input
                    type="text"
                    value={orderPoNumber}
                    onChange={(e) => setOrderPoNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="e.g., PO-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={orderExpectedDate}
                    onChange={(e) => setOrderExpectedDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkOrdered}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isProcessing ? "Updating..." : "Mark as Ordered"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowReceiveModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Items</h3>
              <div className="space-y-4">
                {requisition.items
                  .filter((item) => item.quantityKg - item.quantityReceivedKg > 0)
                  .map((item) => {
                    const outstanding = item.quantityKg - item.quantityReceivedKg;
                    return (
                      <div key={item.id} className="flex items-center space-x-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.compoundName}</p>
                          <p className="text-xs text-gray-500">
                            Outstanding: {outstanding.toFixed(2)} kg
                          </p>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={receiveAmounts[item.id] || ""}
                            onChange={(e) =>
                              setReceiveAmounts({
                                ...receiveAmounts,
                                [item.id]: e.target.value,
                              })
                            }
                            max={outstanding}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                            placeholder="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceive}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? "Receiving..." : "Receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
