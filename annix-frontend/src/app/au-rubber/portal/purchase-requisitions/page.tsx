"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RequisitionDto,
  type RequisitionSourceType,
  type RequisitionStatus,
  type RubberCompoundStockDto,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
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

type SortColumn = "requisitionNumber" | "sourceType" | "status" | "totalQuantityKg" | "createdAt";

const statusColors: Record<RequisitionStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  ORDERED: "bg-purple-100 text-purple-800",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const sourceColors: Record<RequisitionSourceType, string> = {
  LOW_STOCK: "bg-red-100 text-red-800",
  MANUAL: "bg-blue-100 text-blue-800",
  EXTERNAL_PO: "bg-purple-100 text-purple-800",
};

export default function PurchaseRequisitionsPage() {
  const { showToast } = useToast();
  const [requisitions, setRequisitions] = useState<RequisitionDto[]>([]);
  const [compoundStocks, setCompoundStocks] = useState<RubberCompoundStockDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<RequisitionSourceType | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [cancelReqId, setCancelReqId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isCheckingLowStock, setIsCheckingLowStock] = useState(false);

  const [formSupplierCompanyId, setFormSupplierCompanyId] = useState<number | null>(null);
  const [formExpectedDeliveryDate, setFormExpectedDeliveryDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<
    { compoundStockId: number | null; quantityKg: string }[]
  >([{ compoundStockId: null, quantityKg: "" }]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [reqData, stocksData, companiesData] = await Promise.all([
        auRubberApiClient.purchaseRequisitions({
          status: statusFilter || undefined,
          sourceType: sourceFilter || undefined,
        }),
        auRubberApiClient.compoundStocks(),
        auRubberApiClient.companies(),
      ]);
      setRequisitions(Array.isArray(reqData) ? reqData : []);
      setCompoundStocks(Array.isArray(stocksData) ? stocksData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sourceFilter]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "createdAt" ? "desc" : "asc");
    }
  };

  const sortRequisitions = (reqs: RequisitionDto[]): RequisitionDto[] => {
    return [...reqs].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "requisitionNumber") {
        return direction * a.requisitionNumber.localeCompare(b.requisitionNumber);
      }
      if (sortColumn === "sourceType") {
        return direction * a.sourceType.localeCompare(b.sourceType);
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      }
      if (sortColumn === "totalQuantityKg") {
        return direction * (a.totalQuantityKg - b.totalQuantityKg);
      }
      if (sortColumn === "createdAt") {
        return direction * new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });
  };

  const filteredRequisitions = sortRequisitions(
    requisitions.filter((req) => {
      const matchesSearch =
        searchQuery === "" ||
        req.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.externalPoNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedRequisitions = filteredRequisitions.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, sourceFilter]);

  const handleCancel = async (id: number) => {
    try {
      await auRubberApiClient.cancelRequisition(id);
      showToast("Requisition cancelled", "success");
      setCancelReqId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel", "error");
    }
  };

  const handleCheckLowStock = async () => {
    try {
      setIsCheckingLowStock(true);
      const created = await auRubberApiClient.checkLowStockRequisitions();
      if (created.length > 0) {
        showToast(`Created ${created.length} low-stock requisition(s)`, "success");
        fetchData();
      } else {
        showToast("No low-stock items found", "info");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to check", "error");
    } finally {
      setIsCheckingLowStock(false);
    }
  };

  const addFormItem = () => {
    setFormItems([...formItems, { compoundStockId: null, quantityKg: "" }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateFormItem = (
    index: number,
    field: "compoundStockId" | "quantityKg",
    value: string | number | null,
  ) => {
    const newItems = [...formItems];
    if (field === "compoundStockId") {
      newItems[index].compoundStockId = value as number | null;
    } else {
      newItems[index].quantityKg = value as string;
    }
    setFormItems(newItems);
  };

  const handleCreate = async () => {
    const validItems = formItems.filter((item) => item.compoundStockId && item.quantityKg);
    if (validItems.length === 0) {
      showToast("Please add at least one item with compound and quantity", "error");
      return;
    }
    try {
      setIsCreating(true);
      await auRubberApiClient.createManualRequisition({
        supplierCompanyId: formSupplierCompanyId || undefined,
        expectedDeliveryDate: formExpectedDeliveryDate || undefined,
        notes: formNotes || undefined,
        items: validItems.map((item) => {
          const stock = compoundStocks.find((s) => s.id === item.compoundStockId);
          return {
            itemType: "COMPOUND" as const,
            compoundStockId: item.compoundStockId || undefined,
            compoundCodingId: stock?.compoundCodingId,
            compoundName: stock?.compoundName || undefined,
            quantityKg: Number(item.quantityKg),
          };
        }),
      });
      showToast("Requisition created", "success");
      setShowNewModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormSupplierCompanyId(null);
    setFormExpectedDeliveryDate("");
    setFormNotes("");
    setFormItems([{ compoundStockId: null, quantityKg: "" }]);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
      <Breadcrumb items={[{ label: "Purchase Requisitions" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage purchase requisitions for compound stock
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCheckLowStock}
            disabled={isCheckingLowStock}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {isCheckingLowStock ? "Checking..." : "Check Low Stock"}
          </button>
          <button
            onClick={() => setShowNewModal(true)}
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
            New Requisition
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
              placeholder="Requisition # or PO #"
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RequisitionStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIALLY_RECEIVED">Partial</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Source:</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as RequisitionSourceType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Sources</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="MANUAL">Manual</option>
              <option value="EXTERNAL_PO">External PO</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading requisitions..." />
        ) : filteredRequisitions.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.document}
            title="No requisitions found"
            subtitle={
              searchQuery || statusFilter || sourceFilter
                ? "Try adjusting your filters"
                : "Get started by creating a requisition or checking low stock"
            }
            action={
              !searchQuery && !statusFilter && !sourceFilter
                ? { label: "New Requisition", onClick: () => setShowNewModal(true) }
                : undefined
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("requisitionNumber")}
                >
                  Requisition #
                  <SortIcon active={sortColumn === "requisitionNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("sourceType")}
                >
                  Source
                  <SortIcon active={sortColumn === "sourceType"} direction={sortDirection} />
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("totalQuantityKg")}
                >
                  Total Qty (kg)
                  <SortIcon active={sortColumn === "totalQuantityKg"} direction={sortDirection} />
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
              {paginatedRequisitions.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/purchase-requisitions/${req.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {req.requisitionNumber}
                    </Link>
                    {req.externalPoNumber && (
                      <span className="ml-2 text-xs text-gray-500">
                        (PO: {req.externalPoNumber})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sourceColors[req.sourceType]}`}
                    >
                      {req.sourceTypeLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[req.status]}`}
                    >
                      {req.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {req.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {req.totalQuantityKg.toFixed(2)}
                    {req.totalReceivedKg > 0 && (
                      <span className="ml-1 text-xs text-green-600">
                        ({req.totalReceivedKg.toFixed(2)} received)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(req.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/au-rubber/portal/purchase-requisitions/${req.id}`}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      View
                    </Link>
                    {req.status !== "RECEIVED" && req.status !== "CANCELLED" && (
                      <button
                        onClick={() => setCancelReqId(req.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
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
          totalItems={filteredRequisitions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="requisitions"
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Purchase Requisition</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Supplier (Optional)
                    </label>
                    <select
                      value={formSupplierCompanyId ?? ""}
                      onChange={(e) =>
                        setFormSupplierCompanyId(e.target.value ? Number(e.target.value) : null)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    >
                      <option value="">Select supplier</option>
                      {companies
                        .filter((c) => c.isCompoundOwner)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Expected Delivery
                    </label>
                    <input
                      type="date"
                      value={formExpectedDeliveryDate}
                      onChange={(e) => setFormExpectedDeliveryDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      type="button"
                      onClick={addFormItem}
                      className="text-sm text-yellow-600 hover:text-yellow-800"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          value={item.compoundStockId ?? ""}
                          onChange={(e) =>
                            updateFormItem(
                              index,
                              "compoundStockId",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                        >
                          <option value="">Select compound</option>
                          {compoundStocks.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.compoundName} ({s.compoundCode})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={item.quantityKg}
                          onChange={(e) => updateFormItem(index, "quantityKg", e.target.value)}
                          placeholder="Qty (kg)"
                          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                          step="0.01"
                        />
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFormItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNewModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Requisition"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={cancelReqId !== null}
        title="Cancel Requisition"
        message="Are you sure you want to cancel this requisition?"
        confirmLabel="Cancel Requisition"
        cancelLabel="Go Back"
        variant="danger"
        onConfirm={() => cancelReqId && handleCancel(cancelReqId)}
        onCancel={() => setCancelReqId(null)}
      />
    </div>
  );
}
