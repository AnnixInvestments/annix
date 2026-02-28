"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RubberCompoundOrderDto,
  type RubberCompoundOrderStatus,
  type RubberCompoundStockDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateZA } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "orderNumber" | "compoundName" | "quantityKg" | "status" | "createdAt";

const statusColor = (status: RubberCompoundOrderStatus) => {
  const colors: Record<RubberCompoundOrderStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    ORDERED: "bg-purple-100 text-purple-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function CompoundOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<RubberCompoundOrderDto[]>([]);
  const [stocks, setStocks] = useState<RubberCompoundStockDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<RubberCompoundOrderStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
  const [receiveOrderId, setReceiveOrderId] = useState<number | null>(null);
  const [newCompoundStockId, setNewCompoundStockId] = useState<number | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newExpectedDelivery, setNewExpectedDelivery] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [receiveQty, setReceiveQty] = useState("");
  const [receiveBatch, setReceiveBatch] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ordersData, stocksData] = await Promise.all([
        auRubberApiClient.compoundOrders(statusFilter || undefined),
        auRubberApiClient.compoundStocks(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortOrders = (ordersToSort: RubberCompoundOrderDto[]): RubberCompoundOrderDto[] => {
    return [...ordersToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "orderNumber")
        return direction * a.orderNumber.localeCompare(b.orderNumber);
      if (sortColumn === "compoundName")
        return direction * (a.compoundName || "").localeCompare(b.compoundName || "");
      if (sortColumn === "quantityKg") return direction * (a.quantityKg - b.quantityKg);
      if (sortColumn === "status") return direction * a.status.localeCompare(b.status);
      if (sortColumn === "createdAt") return direction * a.createdAt.localeCompare(b.createdAt);
      return 0;
    });
  };

  const paginatedOrders = sortOrders(orders).slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [statusFilter]);

  const handleCreate = async () => {
    if (!newCompoundStockId || !newQuantity) {
      showToast("Please fill in required fields", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await auRubberApiClient.createCompoundOrder({
        compoundStockId: newCompoundStockId,
        quantityKg: Number(newQuantity),
        supplierName: newSupplier || undefined,
        expectedDelivery: newExpectedDelivery || undefined,
        notes: newNotes || undefined,
      });
      showToast("Order created", "success");
      setShowNewModal(false);
      resetNewForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: RubberCompoundOrderStatus) => {
    try {
      await auRubberApiClient.updateCompoundOrderStatus(id, status);
      showToast("Status updated", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update", "error");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await auRubberApiClient.updateCompoundOrderStatus(id, "CANCELLED");
      showToast("Order cancelled", "success");
      setCancelOrderId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel", "error");
    }
  };

  const handleReceive = async () => {
    if (!receiveOrderId || !receiveQty) {
      showToast("Please enter quantity", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await auRubberApiClient.receiveCompoundOrder(receiveOrderId, {
        actualQuantityKg: Number(receiveQty),
        batchNumber: receiveBatch || undefined,
        notes: receiveNotes || undefined,
      });
      showToast("Order received", "success");
      setShowReceiveModal(false);
      setReceiveOrderId(null);
      setReceiveQty("");
      setReceiveBatch("");
      setReceiveNotes("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to receive", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetNewForm = () => {
    setNewCompoundStockId(null);
    setNewQuantity("");
    setNewSupplier("");
    setNewExpectedDelivery("");
    setNewNotes("");
  };

  const openReceiveModal = (order: RubberCompoundOrderDto) => {
    setReceiveOrderId(order.id);
    setReceiveQty(order.quantityKg.toString());
    setShowReceiveModal(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Compound Orders" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compound Orders</h1>
          <p className="mt-1 text-sm text-gray-600">Manage compound purchase orders</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RubberCompoundOrderStatus | "")}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDERED">Ordered</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading orders..." />
        ) : orders.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title="No orders found"
            subtitle={
              statusFilter ? "Try adjusting your filter" : "Create your first compound order"
            }
            action={
              !statusFilter
                ? { label: "New Order", onClick: () => setShowNewModal(true) }
                : undefined
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("orderNumber")}
                >
                  Order #
                  <SortIcon active={sortColumn === "orderNumber"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("compoundName")}
                >
                  Compound
                  <SortIcon active={sortColumn === "compoundName"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("quantityKg")}
                >
                  Quantity
                  <SortIcon active={sortColumn === "quantityKg"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                  <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNumber}
                    {order.isAutoGenerated && (
                      <span className="ml-2 text-xs text-blue-600">(Auto)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.compoundName || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.quantityKg.toFixed(2)} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}
                    >
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.supplierName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {order.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "APPROVED")}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setCancelOrderId(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === "APPROVED" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, "ORDERED")}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Mark Ordered
                        </button>
                        <button
                          onClick={() => openReceiveModal(order)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Receive
                        </button>
                      </>
                    )}
                    {order.status === "ORDERED" && (
                      <button
                        onClick={() => openReceiveModal(order)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={orders.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="orders"
          onPageChange={setCurrentPage}
        />
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowNewModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Compound Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compound</label>
                  <select
                    value={newCompoundStockId ?? ""}
                    onChange={(e) =>
                      setNewCompoundStockId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="">Select compound</option>
                    {stocks.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.compoundName} (Current: {s.quantityKg.toFixed(2)} kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    value={newExpectedDelivery}
                    onChange={(e) => setNewExpectedDelivery(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    resetNewForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting || !newCompoundStockId || !newQuantity}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create"}
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Actual Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={receiveBatch}
                    onChange={(e) => setReceiveBatch(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  />
                </div>
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
                  disabled={isSubmitting || !receiveQty}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Receiving..." : "Receive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={cancelOrderId !== null}
        title="Cancel Order"
        message="Are you sure you want to cancel this order?"
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        variant="danger"
        onConfirm={() => cancelOrderId && handleCancel(cancelOrderId)}
        onCancel={() => setCancelOrderId(null)}
      />
    </div>
  );
}
