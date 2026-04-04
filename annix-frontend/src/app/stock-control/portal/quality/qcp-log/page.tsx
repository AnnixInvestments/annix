"use client";

import { useCallback, useEffect, useState } from "react";
import type { QcControlPlanRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

const PLAN_TYPE_LABELS: Record<string, string> = {
  paint_external: "Paint External",
  paint_internal: "Paint Internal",
  rubber: "Rubber",
  hdpe: "HDPE",
};

const PLAN_TYPE_BADGE_COLORS: Record<string, string> = {
  paint_external: "bg-blue-100 text-blue-800",
  paint_internal: "bg-indigo-100 text-indigo-800",
  rubber: "bg-green-100 text-green-800",
  hdpe: "bg-orange-100 text-orange-800",
};

export default function QcpLogPage() {
  const [plans, setPlans] = useState<QcControlPlanRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const result = await stockControlApiClient.qcpLog(searchTerm || undefined);
      setPlans(result);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans("");
  }, [loadPlans]);

  const handleSearch = useCallback(() => {
    loadPlans(search);
  }, [search, loadPlans]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleClear = useCallback(() => {
    setSearch("");
    loadPlans("");
  }, [loadPlans]);

  const handleViewPdf = useCallback(async (plan: QcControlPlanRecord) => {
    try {
      await stockControlApiClient.openControlPlanPdf(plan.jobCardId, plan.id);
    } catch {
      // PDF not available
    }
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">QCP Log</h1>
        <p className="mt-1 text-sm text-gray-500">All Quality Control Plans across all job cards</p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by QCP or job number..."
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {plans.length} record{plans.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                QCP Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Job Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Doc Ref
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Rev
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Job Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                PDF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  {search ? "No QCPs found matching your search" : "No QCPs created yet"}
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {plan.qcpNumber || `QCP #${plan.id}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-700">
                    {plan.jobNumber || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_TYPE_BADGE_COLORS[plan.planType] || "bg-gray-100 text-gray-800"}`}
                    >
                      {PLAN_TYPE_LABELS[plan.planType] || plan.planType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {plan.documentRef || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    v{plan.revision || "01"}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-500">
                    {plan.customerName || "-"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500">
                    {plan.jobName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {plan.createdByName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {plan.createdAt ? formatDateZA(plan.createdAt) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => handleViewPdf(plan)}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
