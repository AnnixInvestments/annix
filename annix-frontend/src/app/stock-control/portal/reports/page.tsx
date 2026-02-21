"use client";

import { useEffect, useState } from "react";
import type {
  CostByJob,
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

const REPORT_TABS = ["cost-by-job", "stock-valuation", "movement-history"] as const;
type ReportTab = (typeof REPORT_TABS)[number];

const TAB_LABELS: Record<ReportTab, string> = {
  "cost-by-job": "Cost by Job",
  "stock-valuation": "Stock Valuation",
  "movement-history": "Movement History",
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
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Job Number
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Job Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Customer
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Items Allocated
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Total Cost
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {costByJob.map((job) => (
            <tr key={job.jobCardId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-700">
                {job.jobNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.jobName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {job.customerName || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {job.totalItemsAllocated}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                {formatZAR(job.totalCost)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
              Grand Total
            </td>
            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
              {formatZAR(totalCost)}
            </td>
          </tr>
        </tfoot>
      </table>
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
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              SKU
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Category
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Qty
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Cost/Unit
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Total Value
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {valuation.items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                {item.sku}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.category || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {item.quantity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                {formatZAR(item.costPerUnit)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                {formatZAR(item.totalValue)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={5} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
              Total Valuation
            </td>
            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
              {formatZAR(valuation.totalValue)}
            </td>
          </tr>
        </tfoot>
      </table>
    );
  };

  const renderMovementHistory = () => (
    <>
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={movementFilters.startDate}
              onChange={(e) =>
                setMovementFilters({ ...movementFilters, startDate: e.target.value })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={movementFilters.endDate}
              onChange={(e) => setMovementFilters({ ...movementFilters, endDate: e.target.value })}
              className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={movementFilters.movementType}
              onChange={(e) =>
                setMovementFilters({ ...movementFilters, movementType: e.target.value })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="allocation">Allocation</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
            <select
              value={movementFilters.stockItemId}
              onChange={(e) =>
                setMovementFilters({
                  ...movementFilters,
                  stockItemId: parseInt(e.target.value, 10) || 0,
                })
              }
              className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
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
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-100"
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Item
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Qty
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Reference
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Notes
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements.map((movement) => (
              <tr key={movement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateZA(movement.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {movement.stockItem?.name || "-"}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    {movement.stockItem?.sku || ""}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movementTypeBadge(movement.movementType)}`}
                  >
                    {movement.movementType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {movement.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {movement.referenceType
                    ? `${movement.referenceType} #${movement.referenceId}`
                    : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {movement.notes || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {movement.createdBy || "System"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    }
  };

  const hasExportData =
    (activeTab === "cost-by-job" && costByJob.length > 0) ||
    (activeTab === "stock-valuation" && valuation && valuation.items.length > 0) ||
    (activeTab === "movement-history" && movements.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cost analysis, stock valuation, and movement history
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
      </div>
    </div>
  );
}
