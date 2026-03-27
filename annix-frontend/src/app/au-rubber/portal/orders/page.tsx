"use client";

import {
  RUBBER_ORDER_STATUS,
  statusColor,
  statusLabel,
} from "@annix/product-data/rubber/orderStatus";
import { FileUp, Loader2, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { type AnalyzeOrderFilesResult, auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useAuRubberCompanies,
  useAuRubberOrders,
  useAuRubberProducts,
} from "@/app/lib/query/hooks";
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
import { CreateOrderModal } from "./components/CreateOrderModal";
import { OrderImportModal } from "./components/OrderImportModal";

type SortColumn =
  | "orderNumber"
  | "companyOrderNumber"
  | "company"
  | "items"
  | "status"
  | "createdAt";

const STATUS_TABS = [
  { value: undefined as number | undefined, label: "All" },
  { value: RUBBER_ORDER_STATUS.DRAFT, label: "Draft" },
  { value: RUBBER_ORDER_STATUS.SUBMITTED, label: "Submitted" },
  { value: RUBBER_ORDER_STATUS.MANUFACTURING, label: "Manufacturing" },
  { value: RUBBER_ORDER_STATUS.DELIVERING, label: "Delivering" },
  { value: RUBBER_ORDER_STATUS.COMPLETE, label: "Complete" },
];

export default function AuRubberOrdersPage() {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const ordersQuery = useAuRubberOrders(statusFilter);
  const companiesQuery = useAuRubberCompanies();
  const productsQuery = useAuRubberProducts();
  const orders = ordersQuery.data || [];
  const companies = (companiesQuery.data || []) as RubberCompanyDto[];
  const products = (productsQuery.data || []) as RubberProductDto[];
  const isLoading = ordersQuery.isLoading;
  const error = ordersQuery.error;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzingDrop, setIsAnalyzingDrop] = useState(false);
  const [dropAnalysis, setDropAnalysis] = useState<AnalyzeOrderFilesResult | null>(null);
  const [dropFiles, setDropFiles] = useState<File[] | null>(null);
  const dragCounter = useRef(0);

  const ACCEPTED_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/tiff",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "message/rfc822",
  ];

  const ACCEPTED_EXTENSIONS = [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".webp",
    ".tiff",
    ".xlsx",
    ".xls",
    ".eml",
  ];

  const isAcceptedFile = useCallback((file: File) => {
    if (ACCEPTED_TYPES.includes(file.type)) return true;
    const nameLower = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  }, []);

  const handlePageDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handlePageDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(isAcceptedFile);

      if (validFiles.length === 0) {
        showToast("No supported files found. Drop PDF, image, Excel, or email files.", "error");
        return;
      }

      setIsAnalyzingDrop(true);
      try {
        const result = await auRubberApiClient.analyzeOrderFiles(validFiles);
        setDropAnalysis(result);
        setDropFiles(validFiles);
        setShowImportModal(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to analyze files";
        showToast(errorMessage, "error");
      } finally {
        setIsAnalyzingDrop(false);
      }
    },
    [isAcceptedFile, showToast],
  );

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortOrders = (ordersToSort: RubberOrderDto[]): RubberOrderDto[] => {
    return [...ordersToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "orderNumber") {
        return direction * (a.orderNumber || "").localeCompare(b.orderNumber || "");
      } else if (sortColumn === "companyOrderNumber") {
        return direction * (a.companyOrderNumber || "").localeCompare(b.companyOrderNumber || "");
      } else if (sortColumn === "company") {
        return direction * (a.companyName || "").localeCompare(b.companyName || "");
      } else if (sortColumn === "items") {
        return direction * ((a.items?.length || 0) - (b.items?.length || 0));
      } else if (sortColumn === "status") {
        return direction * (a.status - b.status);
      } else if (sortColumn === "createdAt") {
        return direction * (a.createdAt || "").localeCompare(b.createdAt || "");
      }
      return 0;
    });
  };

  const filteredOrders = useMemo(() => {
    const searched = orders.filter((order) => {
      if (searchQuery === "") return true;
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(query) ||
        order.companyOrderNumber?.toLowerCase().includes(query) ||
        order.companyName?.toLowerCase().includes(query)
      );
    });
    return sortOrders(searched);
  }, [orders, searchQuery, sortColumn, sortDirection]);

  const effectivePageSize = pageSize === 0 ? filteredOrders.length : pageSize;
  const paginatedOrders = filteredOrders.slice(
    currentPage * effectivePageSize,
    (currentPage + 1) * effectivePageSize,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, statusFilter, pageSize]);

  const handleCreateOrder = async (data: {
    companyId: number;
    companyOrderNumber: string;
    items: {
      productId: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity: number;
    }[];
  }) => {
    setIsCreating(true);
    try {
      const result = await auRubberApiClient.createOrder({
        companyId: data.companyId,
        companyOrderNumber: data.companyOrderNumber || undefined,
        items: data.items,
      });
      showToast(`Order ${result.orderNumber} created`, "success");
      setShowCreateModal(false);
      ordersQuery.refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create order";
      showToast(errorMessage, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await auRubberApiClient.deleteOrder(id);
      showToast("Order deleted", "success");
      setDeleteOrderId(null);
      ordersQuery.refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete order";
      showToast(errorMessage, "error");
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
              onClick={() => ordersQuery.refetch()}
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
      <div
        className="space-y-6 relative"
        onDragEnter={handlePageDragEnter}
        onDragOver={handlePageDragOver}
        onDragLeave={handlePageDragLeave}
        onDrop={handlePageDrop}
      >
        {(isDragOver || isAnalyzingDrop) && (
          <div className="fixed inset-0 z-40 bg-yellow-50/80 backdrop-blur-sm flex items-center justify-center">
            <div className="border-2 border-dashed border-yellow-400 rounded-2xl p-12 text-center bg-white/80 shadow-lg">
              {isAnalyzingDrop ? (
                <>
                  <Loader2 className="w-16 h-16 text-yellow-600 mx-auto mb-4 animate-spin" />
                  <p className="text-xl font-semibold text-yellow-800">
                    Nix is analyzing your PO...
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">Extracting order details</p>
                </>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-yellow-800">Drop PO files to import</p>
                  <p className="text-sm text-yellow-600 mt-2">PDF, images, Excel, or email files</p>
                </>
              )}
            </div>
          </div>
        )}
        <Breadcrumb items={[{ label: "Orders" }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Orders</h1>
            <p className="mt-1 text-sm text-gray-600">Manage rubber roll and pump part orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import Order
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1 border border-gray-200 rounded-lg p-0.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === tab.value
                      ? "bg-yellow-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                searchQuery || statusFilter !== undefined
                  ? "Try adjusting your filters"
                  : "Create your first order to get started."
              }
              action={
                !searchQuery && statusFilter === undefined
                  ? { label: "New Order", onClick: () => setShowCreateModal(true) }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("orderNumber")}
                    >
                      Order #
                      <SortIcon active={sortColumn === "orderNumber"} direction={sortDirection} />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("companyOrderNumber")}
                    >
                      Customer PO
                      <SortIcon
                        active={sortColumn === "companyOrderNumber"}
                        direction={sortDirection}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("company")}
                    >
                      Customer
                      <SortIcon active={sortColumn === "company"} direction={sortDirection} />
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
                      onClick={() => handleSort("status")}
                    >
                      Status
                      <SortIcon active={sortColumn === "status"} direction={sortDirection} />
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
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/au-rubber/portal/orders/${order.id}`}
                          className="text-sm font-medium text-yellow-600 hover:text-yellow-900"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.companyOrderNumber || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.companyName || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt ? formatDateZA(order.createdAt) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <Link
                          href={`/au-rubber/portal/orders/${order.id}`}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          View
                        </Link>
                        {(order.status === RUBBER_ORDER_STATUS.DRAFT ||
                          order.status === RUBBER_ORDER_STATUS.NEW) && (
                          <button
                            onClick={() => setDeleteOrderId(order.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={pageSize}
            itemName="orders"
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        <ConfirmModal
          isOpen={deleteOrderId !== null}
          title="Delete Order"
          message="Are you sure you want to delete this order? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => deleteOrderId && handleDelete(deleteOrderId)}
          onCancel={() => setDeleteOrderId(null)}
        />

        <CreateOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateOrder={handleCreateOrder}
          companies={companies}
          products={products}
          isCreating={isCreating}
        />

        <OrderImportModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setDropAnalysis(null);
            setDropFiles(null);
          }}
          onOrderCreated={(orderId, orderNumber) => {
            showToast(`Order ${orderNumber} imported`, "success");
            setShowImportModal(false);
            setDropAnalysis(null);
            setDropFiles(null);
            ordersQuery.refetch();
          }}
          companies={companies}
          products={products}
          initialAnalysis={dropAnalysis}
          initialFiles={dropFiles || undefined}
        />
      </div>
    </RequirePermission>
  );
}
