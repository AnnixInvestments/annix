"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RubberProductionDto,
  type RubberProductionStatus,
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

type SortColumn =
  | "productionNumber"
  | "productTitle"
  | "compoundName"
  | "quantity"
  | "status"
  | "createdAt";

const statusColor = (status: RubberProductionStatus) => {
  const colors: Record<RubberProductionStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export default function ProductionsPage() {
  const { showToast } = useToast();
  const [productions, setProductions] = useState<RubberProductionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<RubberProductionStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.productions(statusFilter || undefined);
      setProductions(Array.isArray(data) ? data : []);
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

  const sortProductions = (items: RubberProductionDto[]): RubberProductionDto[] => {
    return [...items].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "productionNumber")
        return direction * a.productionNumber.localeCompare(b.productionNumber);
      if (sortColumn === "productTitle")
        return direction * (a.productTitle || "").localeCompare(b.productTitle || "");
      if (sortColumn === "compoundName")
        return direction * (a.compoundName || "").localeCompare(b.compoundName || "");
      if (sortColumn === "quantity") return direction * (a.quantity - b.quantity);
      if (sortColumn === "status") return direction * a.status.localeCompare(b.status);
      if (sortColumn === "createdAt") return direction * a.createdAt.localeCompare(b.createdAt);
      return 0;
    });
  };

  const paginatedProductions = sortProductions(productions).slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [statusFilter]);

  const handleStart = async (id: number) => {
    try {
      await auRubberApiClient.startProduction(id);
      showToast("Production started", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to start", "error");
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await auRubberApiClient.completeProduction(id);
      showToast("Production completed", "success");
      setCompleteId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to complete", "error");
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await auRubberApiClient.cancelProduction(id);
      showToast("Production cancelled", "success");
      setCancelId(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel", "error");
    }
  };

  const formatDimensions = (p: RubberProductionDto) => {
    return `${p.thicknessMm}mm × ${p.widthMm}mm × ${p.lengthM}m`;
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
      <Breadcrumb items={[{ label: "Production" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          <p className="mt-1 text-sm text-gray-600">Manage rubber sheet production</p>
        </div>
        <Link
          href="/au-rubber/portal/productions/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Production
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RubberProductionStatus | "")}
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading productions..." />
        ) : productions.length === 0 ? (
          <TableEmptyState
            icon={<TableIcons.document />}
            title="No productions found"
            subtitle={statusFilter ? "Try adjusting your filter" : "Create your first production"}
            action={
              !statusFilter
                ? {
                    label: "New Production",
                    onClick: () => (window.location.href = "/au-rubber/portal/productions/new"),
                  }
                : undefined
            }
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("productionNumber")}
                >
                  Production #
                  <SortIcon active={sortColumn === "productionNumber"} direction={sortDirection} />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("productTitle")}
                >
                  Product
                  <SortIcon active={sortColumn === "productTitle"} direction={sortDirection} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimensions
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("quantity")}
                >
                  Qty
                  <SortIcon active={sortColumn === "quantity"} direction={sortDirection} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compound
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon active={sortColumn === "status"} direction={sortDirection} />
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
              {paginatedProductions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {p.productionNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.productTitle || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDimensions(p)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <span>{p.compoundName || "N/A"}</span>
                      <div className="text-xs text-gray-400">
                        {p.compoundUsedKg !== null
                          ? `Used: ${p.compoundUsedKg.toFixed(2)} kg`
                          : `Required: ${p.compoundRequiredKg.toFixed(2)} kg`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(p.status)}`}
                    >
                      {p.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(p.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {p.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleStart(p.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => setCancelId(p.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {p.status === "IN_PROGRESS" && (
                      <>
                        <button
                          onClick={() => setCompleteId(p.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => setCancelId(p.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={productions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="productions"
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmModal
        isOpen={cancelId !== null}
        title="Cancel Production"
        message="Are you sure you want to cancel this production? The compound will not be deducted."
        confirmLabel="Cancel Production"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={() => cancelId && handleCancel(cancelId)}
        onCancel={() => setCancelId(null)}
      />

      <ConfirmModal
        isOpen={completeId !== null}
        title="Complete Production"
        message="Are you sure you want to complete this production? The compound usage will be deducted from stock."
        confirmLabel="Complete"
        cancelLabel="Not Yet"
        variant="info"
        onConfirm={() => completeId && handleComplete(completeId)}
        onCancel={() => setCompleteId(null)}
      />
    </div>
  );
}
