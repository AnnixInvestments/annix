"use client";

import Link from "next/link";
import { formatDateZA } from "@/app/lib/datetime";
import { useRequisitions } from "@/app/lib/query/hooks";
import { StatusBadge } from "../../components/StatusBadge";

export default function RequisitionsPage() {
  const { data: requisitionsData, isLoading, error } = useRequisitions();
  const requisitions = requisitionsData ? requisitionsData : [];

  if (isLoading && requisitions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requisitions...</p>
        </div>
      </div>
    );
  }

  if (error && requisitions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Requisitions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Paint and coating requisitions from job cards and automatic low-stock reorders
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {requisitions.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No requisitions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Requisitions are created automatically when a job card is activated.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Req Number
                </th>
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
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requisitions.map((req) => {
                const createdBy = req.createdBy;
                return (
                  <tr key={req.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/stock-control/portal/requisitions/${req.id}`}
                        className="text-sm font-medium text-teal-700 hover:text-teal-900"
                      >
                        {req.requisitionNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {req.source === "reorder" ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Low Stock Reorder
                          </span>
                        ) : req.source === "cpo" ? (
                          <Link
                            href={`/stock-control/portal/purchase-orders/${req.cpoId}`}
                            className="text-purple-700 hover:text-purple-900"
                          >
                            CPO Call-Off
                          </Link>
                        ) : req.jobCard ? (
                          <Link
                            href={`/stock-control/portal/job-cards/${req.jobCardId}`}
                            className="text-teal-700 hover:text-teal-900"
                          >
                            {req.jobCard.jobNumber}
                          </Link>
                        ) : (
                          "-"
                        )}
                        {req.isCalloffOrder ? (
                          <span className="px-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            Call-Off
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {req.items ? req.items.length : 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {createdBy || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
