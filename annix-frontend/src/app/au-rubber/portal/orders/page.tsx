"use client";

import { ORDER_STATUS_OPTIONS, statusColor } from "@annix/product-data/rubber/orderStatus";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import { Breadcrumb } from "../../components/Breadcrumb";
import { ConfirmModal } from "../../components/ConfirmModal";
import { RequirePermission } from "../../components/RequirePermission";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";
import { PAGE_PERMISSIONS } from "../../config/pagePermissions";
import { OrderImportModal } from "./components/OrderImportModal";

type SortColumn =
  | "orderNumber"
  | "companyOrderNumber"
  | "companyName"
  | "status"
  | "items"
  | "createdAt";

const exportOrdersToCSV = (orders: RubberOrderDto[]) => {
  const headers = ["Order Number", "Company Order #", "Company", "Status", "Items", "Created"];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.companyOrderNumber || "",
    order.companyName || "",
    order.statusLabel,
    order.items.length.toString(),
    order.createdAt,
  ]);
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `rubber-orders-${now().toISODate()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AuRubberOrdersPage() {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<number | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderCompanyId, setNewOrderCompanyId] = useState<number | undefined>(undefined);
  const [newOrderCompanyOrderNumber, setNewOrderCompanyOrderNumber] = useState("");
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  const [orders, setOrders] = useState<RubberOrderDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const statuses = ORDER_STATUS_OPTIONS;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchOrders = async (status?: number) => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.orders(status);
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load orders"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await auRubberApiClient.companies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load companies:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await auRubberApiClient.products();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    fetchCompanies();
    fetchProducts();
  }, []);

  const handleOrderImported = (orderId: number, orderNumber: string) => {
    showToast(`Order ${orderNumber} imported successfully`, "success");
    fetchOrders(statusFilter);
  };

  const sortOrders = (ordersToSort: RubberOrderDto[]): RubberOrderDto[] => {
    return [...ordersToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "orderNumber")
        return direction * a.orderNumber.localeCompare(b.orderNumber);
      if (sortColumn === "companyOrderNumber")
        return direction * (a.companyOrderNumber || "").localeCompare(b.companyOrderNumber || "");
      if (sortColumn === "companyName")
        return direction * (a.companyName || "").localeCompare(b.companyName || "");
      if (sortColumn === "status") return direction * (a.status - b.status);
      if (sortColumn === "items") return direction * (a.items.length - b.items.length);
      if (sortColumn === "createdAt") return direction * a.createdAt.localeCompare(b.createdAt);
      return 0;
    });
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) newSelected.delete(orderId);
    else newSelected.add(orderId);
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(paginatedOrders.map((o) => o.id)));
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    const ids = Array.from(selectedOrders);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await auRubberApiClient.deleteOrder(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) {
      showToast(
        `Deleted ${successCount} order${successCount > 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} failed` : ""}`,
        failCount > 0 ? "warning" : "success",
      );
      setSelectedOrders(new Set());
      fetchOrders(statusFilter);
    } else if (failCount > 0) {
      showToast(`Failed to delete ${failCount} order${failCount > 1 ? "s" : ""}`, "error");
    }
  };

  const filteredOrders = sortOrders(
    orders.filter((order) => {
      const matchesSearch =
        searchQuery === "" ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.companyOrderNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = companyFilter === undefined || order.companyId === companyFilter;
      const orderDate = fromISO(order.createdAt);
      const matchesDateFrom = dateFrom === "" || orderDate >= fromISO(dateFrom).startOf("day");
      const matchesDateTo = dateTo === "" || orderDate <= fromISO(dateTo).endOf("day");
      return matchesSearch && matchesCompany && matchesDateFrom && matchesDateTo;
    }),
  );

  const paginatedOrders = filteredOrders.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
    setSelectedOrders(new Set());
  }, [searchQuery, companyFilter, dateFrom, dateTo, statusFilter]);

  const handleCreateOrder = async () => {
    try {
      setIsCreating(true);
      const order = await auRubberApiClient.createOrder({
        companyId: newOrderCompanyId,
        companyOrderNumber: newOrderCompanyOrderNumber || undefined,
      });
      showToast(`Order ${order.orderNumber} created`, "success");
      setShowNewOrderModal(false);
      setNewOrderCompanyId(undefined);
      setNewOrderCompanyOrderNumber("");
      fetchOrders(statusFilter);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create order", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    try {
      await auRubberApiClient.deleteOrder(id);
      showToast("Order deleted", "success");
      setDeleteOrderId(null);
      fetchOrders(statusFilter);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete order", "error");
    }
  };

  if (error) {
    return (
      <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/orders"]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Orders</div>
            <p className="text-gray-600">{error.message}</p>
            <button
              onClick={() => fetchOrders(statusFilter)}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Retry
            </button>
          </div>
        </div>
      </RequirePermission>
    );
  }

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/orders"]}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Orders" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rubber Lining Orders</h1>
            <p className="mt-1 text-sm text-gray-600">Manage rubber lining orders and deliveries</p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedOrders.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                Delete ({selectedOrders.size})
              </button>
            )}
            <button
              onClick={() => exportOrdersToCSV(filteredOrders)}
              disabled={filteredOrders.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import Order
            </button>
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Order
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Search:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order # or Company Order #"
                className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Company:</label>
              <select
                value={companyFilter ?? ""}
                onChange={(e) =>
                  setCompanyFilter(e.target.value ? Number(e.target.value) : undefined)
                }
                className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter ?? ""}
                onChange={(e) =>
                  setStatusFilter(e.target.value ? Number(e.target.value) : undefined)
                }
                className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="block w-40 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="block w-40 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <TableLoadingState message="Loading orders..." />
          ) : filteredOrders.length === 0 ? (
            <TableEmptyState
              icon={<TableIcons.document />}
              title="No orders found"
              subtitle={
                searchQuery ||
                companyFilter !== undefined ||
                statusFilter !== undefined ||
                dateFrom ||
                dateTo
                  ? "Try adjusting your filters"
                  : "Get started by creating a new order"
              }
              action={
                !(
                  searchQuery ||
                  companyFilter !== undefined ||
                  statusFilter !== undefined ||
                  dateFrom ||
                  dateTo
                )
                  ? { label: "New Order", onClick: () => setShowNewOrderModal(true) }
                  : undefined
              }
            />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={
                        paginatedOrders.length > 0 && selectedOrders.size === paginatedOrders.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("orderNumber")}
                  >
                    Order Number
                    <SortIcon active={sortColumn === "orderNumber"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("companyOrderNumber")}
                  >
                    Company Order #
                    <SortIcon
                      active={sortColumn === "companyOrderNumber"}
                      direction={sortDirection}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("companyName")}
                  >
                    Company
                    <SortIcon active={sortColumn === "companyName"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("items")}
                  >
                    Items
                    <SortIcon active={sortColumn === "items"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created
                    <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? "bg-yellow-50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/au-rubber/portal/orders/${order.id}`}
                        className="text-yellow-600 hover:text-yellow-800 font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.companyOrderNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.companyName || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}
                      >
                        {order.statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setDeleteOrderId(order.id)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={ITEMS_PER_PAGE}
            itemName="orders"
            onPageChange={setCurrentPage}
          />
        </div>

        {showNewOrderModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75"
                onClick={() => setShowNewOrderModal(false)}
              />
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Order</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <select
                      value={newOrderCompanyId ?? ""}
                      onChange={(e) =>
                        setNewOrderCompanyId(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company Order Number (optional)
                    </label>
                    <input
                      type="text"
                      value={newOrderCompanyOrderNumber}
                      onChange={(e) => setNewOrderCompanyOrderNumber(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                      placeholder="PO-12345"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowNewOrderModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrder}
                    disabled={isCreating}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create Order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <OrderImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onOrderCreated={handleOrderImported}
          companies={companies}
          products={products}
        />
        <ConfirmModal
          isOpen={deleteOrderId !== null}
          title="Delete Order"
          message="Are you sure you want to delete this order? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => deleteOrderId && handleDeleteOrder(deleteOrderId)}
          onCancel={() => setDeleteOrderId(null)}
        />
        <ConfirmModal
          isOpen={showBulkDeleteModal}
          title="Delete Selected Orders"
          message={`Are you sure you want to delete ${selectedOrders.size} order${selectedOrders.size > 1 ? "s" : ""}? This action cannot be undone.`}
          confirmLabel={`Delete ${selectedOrders.size}`}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      </div>
    </RequirePermission>
  );
}
