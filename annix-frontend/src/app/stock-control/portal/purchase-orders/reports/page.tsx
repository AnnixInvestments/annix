"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  CpoCalloffBreakdown,
  CpoFulfillmentReportItem,
  CpoOverdueInvoiceItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

type ReportTab = "fulfillment" | "calloff" | "overdue";

function calloffTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    rubber: "Rubber",
    paint: "Paint",
    solution: "Solution",
  };
  return labels[type] || type;
}

export default function CpoReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("fulfillment");
  const [fulfillment, setFulfillment] = useState<CpoFulfillmentReportItem[]>([]);
  const [calloffBreakdown, setCalloffBreakdown] = useState<CpoCalloffBreakdown | null>(null);
  const [overdueItems, setOverdueItems] = useState<CpoOverdueInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (activeTab === "fulfillment") {
        const data = await stockControlApiClient.cpoFulfillmentReport();
        setFulfillment(data);
      } else if (activeTab === "calloff") {
        const data = await stockControlApiClient.cpoCalloffBreakdown();
        setCalloffBreakdown(data);
      } else if (activeTab === "overdue") {
        const data = await stockControlApiClient.cpoOverdueInvoices();
        setOverdueItems(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await stockControlApiClient.cpoExportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cpo-tracking-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link href="/stock-control/portal/purchase-orders" className="hover:text-teal-600">
              Purchase Orders
            </Link>
            <span>/</span>
            <span className="text-gray-900">Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CPO Reports</h1>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isExporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="flex space-x-2">
        {(
          [
            { key: "fulfillment", label: "Fulfillment" },
            { key: "calloff", label: "Call-Off Breakdown" },
            { key: "overdue", label: "Overdue Invoices" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === tab.key
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          {activeTab === "fulfillment" && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {fulfillment.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No CPOs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          CPO
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Job / Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Ordered
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Fulfilled
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fulfillment.map((cpo) => (
                        <tr key={cpo.cpoId} className="hover:bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <Link
                              href={`/stock-control/portal/purchase-orders/${cpo.cpoId}`}
                              className="text-teal-600 font-medium hover:underline"
                            >
                              {cpo.cpoNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <div className="font-medium text-gray-900">{cpo.jobNumber}</div>
                            {cpo.customerName && (
                              <div className="text-gray-500">{cpo.customerName}</div>
                            )}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {cpo.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            {cpo.totalOrdered}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            {cpo.totalFulfilled}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                            <span
                              className={
                                cpo.totalRemaining > 0 ? "text-amber-600 font-medium" : "text-green-600"
                              }
                            >
                              {cpo.totalRemaining}
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${cpo.percentComplete >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                                  style={{ width: `${cpo.percentComplete}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{cpo.percentComplete}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "calloff" && calloffBreakdown && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(
                  [
                    { label: "Pending", value: calloffBreakdown.summary.pending, color: "yellow" },
                    { label: "Called Off", value: calloffBreakdown.summary.calledOff, color: "blue" },
                    { label: "Delivered", value: calloffBreakdown.summary.delivered, color: "green" },
                    { label: "Invoiced", value: calloffBreakdown.summary.invoiced, color: "purple" },
                    { label: "Total", value: calloffBreakdown.summary.total, color: "gray" },
                  ] as const
                ).map((stat) => (
                  <div key={stat.label} className="bg-white rounded-lg shadow p-4 text-center">
                    <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white shadow rounded-lg overflow-hidden">
                {calloffBreakdown.byCpo.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No call-off records found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            CPO
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-yellow-600 uppercase">
                            Pending
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase">
                            Called Off
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase">
                            Delivered
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-purple-600 uppercase">
                            Invoiced
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {calloffBreakdown.byCpo.map((row) => (
                          <tr key={row.cpoId} className="hover:bg-gray-50">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <Link
                                href={`/stock-control/portal/purchase-orders/${row.cpoId}`}
                                className="text-teal-600 font-medium hover:underline"
                              >
                                {row.cpoNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-3 text-center text-sm">{row.pending}</td>
                            <td className="px-6 py-3 text-center text-sm">{row.calledOff}</td>
                            <td className="px-6 py-3 text-center text-sm">{row.delivered}</td>
                            <td className="px-6 py-3 text-center text-sm">{row.invoiced}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "overdue" && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {overdueItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No overdue invoices found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          CPO
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Job Card
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Delivered
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Days Overdue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {overdueItems.map((item) => (
                        <tr key={item.recordId} className="hover:bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.cpoNumber}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {item.jobCardNumber || "-"}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {calloffTypeLabel(item.calloffType)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {item.deliveredAt ? formatDateZA(item.deliveredAt) : "-"}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                            <span className="text-red-600 font-semibold">
                              {item.daysSinceDelivery} days
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
