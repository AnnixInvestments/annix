"use client";

import { useEffect, useState } from "react";
import type {
  CostByJob,
  StaffMember,
  StaffStockFilters,
  StaffStockReportResult,
  StockControlDepartment,
  StockItem,
  StockMovement,
  StockValuation,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

function movementTypeBadge(type: string): string {
  const colors: Record<string, string> = {
    delivery: "bg-green-100 text-green-800",
    allocation: "bg-blue-100 text-blue-800",
    adjustment: "bg-amber-100 text-amber-800",
    return: "bg-purple-100 text-purple-800",
  };
  return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const headerLine = headers.map(escapeCSVField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(","));
  const csv = [headerLine, ...dataLines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const REPORT_TABS = ["cost-by-job", "stock-valuation", "movement-history", "staff-stock"] as const;
type ReportTab = (typeof REPORT_TABS)[number];

const TAB_LABELS: Record<ReportTab, string> = {
  "cost-by-job": "Cost by Job",
  "stock-valuation": "Stock Valuation",
  "movement-history": "Movement History",
  "staff-stock": "Staff Stock",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("cost-by-job");
  const [costByJob, setCostByJob] = useState<CostByJob[]>([]);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [movementFilters, setMovementFilters] = useState({
    startDate: "",
    endDate: "",
    movementType: "",
    stockItemId: 0,
  });

  const [staffStockReport, setStaffStockReport] = useState<StaffStockReportResult | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<StockControlDepartment[]>([]);
  const [expandedStaffIds, setExpandedStaffIds] = useState<Set<number>>(new Set());
  const [staffFilters, setStaffFilters] = useState<StaffStockFilters>({
    startDate: "",
    endDate: "",
    staffMemberId: undefined,
    departmentId: undefined,
    stockItemId: undefined,
    anomalyThreshold: 2.0,
  });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (activeTab === "cost-by-job") {
          const data = await stockControlApiClient.costByJob();
          setCostByJob(Array.isArray(data) ? data : []);
        } else if (activeTab === "stock-valuation") {
          const data = await stockControlApiClient.stockValuation();
          setValuation(data);
        } else if (activeTab === "movement-history") {
          const params: Record<string, string | number | undefined> = {};
          if (movementFilters.startDate) params.startDate = movementFilters.startDate;
          if (movementFilters.endDate) params.endDate = movementFilters.endDate;
          if (movementFilters.movementType) params.movementType = movementFilters.movementType;
          if (movementFilters.stockItemId > 0) params.stockItemId = movementFilters.stockItemId;

          const [movementsData, itemsResult] = await Promise.all([
            stockControlApiClient.movementHistory(
              params as {
                startDate?: string;
                endDate?: string;
                movementType?: string;
                stockItemId?: number;
              },
            ),
            stockItems.length === 0
              ? stockControlApiClient.stockItems({ limit: "1000" })
              : Promise.resolve({ items: stockItems, total: stockItems.length }),
          ]);
          setMovements(Array.isArray(movementsData) ? movementsData : []);
          if (stockItems.length === 0) {
            setStockItems(Array.isArray(itemsResult.items) ? itemsResult.items : []);
          }
        } else if (activeTab === "staff-stock") {
          const apiFilters: StaffStockFilters = {};
          if (staffFilters.startDate) apiFilters.startDate = staffFilters.startDate;
          if (staffFilters.endDate) apiFilters.endDate = staffFilters.endDate;
          if (staffFilters.staffMemberId) apiFilters.staffMemberId = staffFilters.staffMemberId;
          if (staffFilters.departmentId) apiFilters.departmentId = staffFilters.departmentId;
          if (staffFilters.stockItemId) apiFilters.stockItemId = staffFilters.stockItemId;
          if (staffFilters.anomalyThreshold)
            apiFilters.anomalyThreshold = staffFilters.anomalyThreshold;

          const [reportData, staffData, deptData, itemsResult] = await Promise.all([
            stockControlApiClient.staffStockReport(apiFilters),
            staffMembers.length === 0
              ? stockControlApiClient.staffMembers({ active: "true" })
              : Promise.resolve(staffMembers),
            departments.length === 0
              ? stockControlApiClient.departments()
              : Promise.resolve(departments),
            stockItems.length === 0
              ? stockControlApiClient.stockItems({ limit: "1000" })
              : Promise.resolve({ items: stockItems, total: stockItems.length }),
          ]);
          setStaffStockReport(reportData);
          if (staffMembers.length === 0) {
            setStaffMembers(Array.isArray(staffData) ? staffData : []);
          }
          if (departments.length === 0) {
            setDepartments(Array.isArray(deptData) ? deptData : []);
          }
          if (stockItems.length === 0) {
            setStockItems(Array.isArray(itemsResult.items) ? itemsResult.items : []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load report"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [
    activeTab,
    movementFilters.startDate,
    movementFilters.endDate,
    movementFilters.movementType,
    movementFilters.stockItemId,
    staffFilters.startDate,
    staffFilters.endDate,
    staffFilters.staffMemberId,
    staffFilters.departmentId,
    staffFilters.stockItemId,
    staffFilters.anomalyThreshold,
  ]);

  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading report...</p>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Report</div>
        <p className="text-gray-600">{error?.message}</p>
      </div>
    </div>
  );

  const renderCostByJob = () => {
    if (isLoading) return renderLoading();
    if (error) return renderError();

    if (costByJob.length === 0) {
      return (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
          <p className="mt-1 text-sm text-gray-500">No cost data available for job cards.</p>
        </div>
      );
    }

    const totalCost = costByJob.reduce((sum, j) => sum + j.totalCost, 0);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
              >
                Job Number
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6"
              >
                Job Name
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell sm:px-6"
              >
                Customer
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
              >
                Items Allocated
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
              >
                Total Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {costByJob.map((job) => (
              <tr key={job.jobCardId} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-teal-700 sm:px-6">
                  {job.jobNumber}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-900 sm:table-cell sm:px-6">
                  {job.jobName}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell sm:px-6">
                  {job.customerName || "-"}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900 lg:table-cell sm:px-6">
                  {job.totalItemsAllocated}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900 sm:px-6">
                  {formatZAR(job.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={4}
                className="px-3 py-4 text-right text-sm font-semibold text-gray-900 sm:px-6"
              >
                Grand Total
              </td>
              <td className="px-3 py-4 text-right text-sm font-bold text-gray-900 sm:px-6">
                {formatZAR(totalCost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderStockValuation = () => {
    if (isLoading) return renderLoading();
    if (error) return renderError();

    if (!valuation || valuation.items.length === 0) {
      return (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data</h3>
          <p className="mt-1 text-sm text-gray-500">No stock valuation data available.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6"
              >
                SKU
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
              >
                Name
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell sm:px-6"
              >
                Category
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
              >
                Qty
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
              >
                Cost/Unit
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
              >
                Total Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {valuation.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="hidden whitespace-nowrap px-3 py-4 font-mono text-sm text-gray-900 sm:table-cell sm:px-6">
                  {item.sku}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 sm:px-6">
                  {item.name}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell sm:px-6">
                  {item.category || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900 sm:px-6">
                  {item.quantity}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900 lg:table-cell sm:px-6">
                  {formatZAR(item.costPerUnit)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900 sm:px-6">
                  {formatZAR(item.totalValue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={5}
                className="px-3 py-4 text-right text-sm font-semibold text-gray-900 sm:px-6"
              >
                Total Valuation
              </td>
              <td className="px-3 py-4 text-right text-sm font-bold text-gray-900 sm:px-6">
                {formatZAR(valuation.totalValue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderMovementHistory = () => (
    <>
      <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={movementFilters.startDate}
              onChange={(e) =>
                setMovementFilters({ ...movementFilters, startDate: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={movementFilters.endDate}
              onChange={(e) => setMovementFilters({ ...movementFilters, endDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
            <select
              value={movementFilters.movementType}
              onChange={(e) =>
                setMovementFilters({ ...movementFilters, movementType: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            >
              <option value="">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="allocation">Allocation</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Item</label>
            <select
              value={movementFilters.stockItemId}
              onChange={(e) =>
                setMovementFilters({
                  ...movementFilters,
                  stockItemId: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            >
              <option value={0}>All Items</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() =>
              setMovementFilters({ startDate: "", endDate: "", movementType: "", stockItemId: 0 })
            }
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:col-span-1"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : movements.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No movements found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                >
                  Item
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell sm:px-6"
                >
                  Reference
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
                >
                  Notes
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
                >
                  By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                    {formatDateZA(movement.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 sm:px-6">
                    <div className="text-sm font-medium text-gray-900">
                      {movement.stockItem?.name || "-"}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {movement.stockItem?.sku || ""}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 sm:px-6">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${movementTypeBadge(movement.movementType)}`}
                    >
                      {movement.movementType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900 sm:px-6">
                    {movement.quantity}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell sm:px-6">
                    {movement.referenceType
                      ? `${movement.referenceType} #${movement.referenceId}`
                      : "-"}
                  </td>
                  <td className="hidden max-w-xs truncate px-3 py-4 text-sm text-gray-500 lg:table-cell sm:px-6">
                    {movement.notes || "-"}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell sm:px-6">
                    {movement.createdBy || "System"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const toggleStaffExpanded = (staffId: number) => {
    setExpandedStaffIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const renderStaffStock = () => (
    <>
      <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={staffFilters.startDate || ""}
              onChange={(e) => setStaffFilters({ ...staffFilters, startDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={staffFilters.endDate || ""}
              onChange={(e) => setStaffFilters({ ...staffFilters, endDate: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Department</label>
            <select
              value={staffFilters.departmentId || ""}
              onChange={(e) =>
                setStaffFilters({
                  ...staffFilters,
                  departmentId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Staff Member</label>
            <select
              value={staffFilters.staffMemberId || ""}
              onChange={(e) =>
                setStaffFilters({
                  ...staffFilters,
                  staffMemberId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            >
              <option value="">All Staff</option>
              {staffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Item</label>
            <select
              value={staffFilters.stockItemId || ""}
              onChange={(e) =>
                setStaffFilters({
                  ...staffFilters,
                  stockItemId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm sm:w-auto"
            >
              <option value="">All Items</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Anomaly Threshold: {staffFilters.anomalyThreshold?.toFixed(1)}x std dev
            </label>
            <input
              type="range"
              min="1.5"
              max="3.0"
              step="0.1"
              value={staffFilters.anomalyThreshold || 2.0}
              onChange={(e) =>
                setStaffFilters({
                  ...staffFilters,
                  anomalyThreshold: Number(e.target.value),
                })
              }
              className="w-full sm:w-32"
            />
          </div>
          <button
            onClick={() =>
              setStaffFilters({
                startDate: "",
                endDate: "",
                staffMemberId: undefined,
                departmentId: undefined,
                stockItemId: undefined,
                anomalyThreshold: 2.0,
              })
            }
            className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 sm:col-span-1"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : !staffStockReport || staffStockReport.summaries.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No staff stock data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No stock has been issued to staff members yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Staff</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {staffStockReport.totals.totalStaff}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Quantity</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {staffStockReport.totals.totalQuantityIssued.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Value</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatZAR(staffStockReport.totals.totalValue)}
              </div>
            </div>
            <div
              className={`rounded-lg border p-4 shadow-sm ${
                staffStockReport.totals.anomalyCount > 0
                  ? "bg-red-50 border-red-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`text-sm font-medium ${
                  staffStockReport.totals.anomalyCount > 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                Anomalies Detected
              </div>
              <div
                className={`mt-1 text-2xl font-semibold ${
                  staffStockReport.totals.anomalyCount > 0 ? "text-red-700" : "text-gray-900"
                }`}
              >
                {staffStockReport.totals.anomalyCount}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                  >
                    Staff Member
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6"
                  >
                    Emp #
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell sm:px-6"
                  >
                    Department
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                  >
                    Total Qty
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
                  >
                    Total Value
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6"
                  >
                    Issuances
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6"
                  >
                    Anomaly Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {staffStockReport.summaries.map((summary) => (
                  <>
                    <tr
                      key={summary.staffMemberId}
                      className={`cursor-pointer ${
                        summary.isAnomaly ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleStaffExpanded(summary.staffMemberId)}
                    >
                      <td className="whitespace-nowrap px-3 py-4 sm:px-6">
                        <div className="flex items-center">
                          <span
                            className={`mr-2 transition-transform ${
                              expandedStaffIds.has(summary.staffMemberId) ? "rotate-90" : ""
                            }`}
                          >
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {summary.isAnomaly && (
                                <span className="mr-1 text-red-500" title="Anomaly detected">
                                  !
                                </span>
                              )}
                              {summary.staffName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 font-mono text-sm text-gray-500 sm:table-cell sm:px-6">
                        {summary.employeeNumber || "-"}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell sm:px-6">
                        {summary.department || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900 sm:px-6">
                        {summary.totalQuantityReceived.toLocaleString()}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-right text-sm text-gray-900 lg:table-cell sm:px-6">
                        {formatZAR(summary.totalValue)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 lg:table-cell sm:px-6">
                        {summary.issuanceCount}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            summary.isAnomaly
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {summary.anomalyScore.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                    {expandedStaffIds.has(summary.staffMemberId) && summary.items.length > 0 && (
                      <tr key={`${summary.staffMemberId}-items`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-3">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Item
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    SKU
                                  </th>
                                  <th className="hidden px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                                    Category
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Quantity
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {summary.items.map((item) => (
                                  <tr key={item.stockItemId} className="hover:bg-gray-100">
                                    <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900">
                                      {item.stockItemName}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 font-mono text-sm text-gray-500">
                                      {item.sku}
                                    </td>
                                    <td className="hidden whitespace-nowrap px-3 py-2 text-sm text-gray-500 sm:table-cell">
                                      {item.category || "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium text-gray-900">
                                      {item.totalQuantity.toLocaleString()}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-900">
                                      {formatZAR(item.totalValue)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );

  const handleExportCSV = () => {
    if (activeTab === "cost-by-job") {
      const headers = ["Job Number", "Job Name", "Customer", "Items Allocated", "Total Cost"];
      const rows = costByJob.map((job) => [
        job.jobNumber,
        job.jobName,
        job.customerName || "",
        String(job.totalItemsAllocated),
        String(job.totalCost),
      ]);
      downloadCSV("cost-by-job.csv", headers, rows);
    } else if (activeTab === "stock-valuation" && valuation) {
      const headers = ["SKU", "Name", "Category", "Qty", "Cost/Unit", "Total Value"];
      const rows = valuation.items.map((item) => [
        item.sku,
        item.name,
        item.category || "",
        String(item.quantity),
        String(item.costPerUnit),
        String(item.totalValue),
      ]);
      downloadCSV("stock-valuation.csv", headers, rows);
    } else if (activeTab === "movement-history") {
      const headers = ["Date", "Item", "SKU", "Type", "Qty", "Reference", "Notes", "By"];
      const rows = movements.map((m) => [
        formatDateZA(m.createdAt),
        m.stockItem?.name || "",
        m.stockItem?.sku || "",
        m.movementType,
        String(m.quantity),
        m.referenceType ? `${m.referenceType} #${m.referenceId}` : "",
        m.notes || "",
        m.createdBy || "System",
      ]);
      downloadCSV("movement-history.csv", headers, rows);
    } else if (activeTab === "staff-stock" && staffStockReport) {
      const headers = [
        "Staff Name",
        "Employee #",
        "Department",
        "Total Quantity",
        "Total Value",
        "Issuance Count",
        "Anomaly Score",
        "Is Anomaly",
      ];
      const rows = staffStockReport.summaries.map((s) => [
        s.staffName,
        s.employeeNumber || "",
        s.department || "",
        String(s.totalQuantityReceived),
        String(s.totalValue),
        String(s.issuanceCount),
        String(s.anomalyScore),
        s.isAnomaly ? "Yes" : "No",
      ]);
      downloadCSV("staff-stock-report.csv", headers, rows);
    }
  };

  const hasExportData =
    (activeTab === "cost-by-job" && costByJob.length > 0) ||
    (activeTab === "stock-valuation" && valuation && valuation.items.length > 0) ||
    (activeTab === "movement-history" && movements.length > 0) ||
    (activeTab === "staff-stock" && staffStockReport && staffStockReport.summaries.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cost analysis, stock valuation, and movement history
        </p>
      </div>

      <div className="overflow-x-auto border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!isLoading && !error && hasExportData && (
          <div className="flex justify-end px-6 pt-4">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
          </div>
        )}
        {activeTab === "cost-by-job" && renderCostByJob()}
        {activeTab === "stock-valuation" && renderStockValuation()}
        {activeTab === "movement-history" && renderMovementHistory()}
        {activeTab === "staff-stock" && renderStaffStock()}
      </div>
    </div>
  );
}
