"use client";

import Link from "next/link";
import type { Requisition } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

interface RequisitionTabProps {
  requisition: Requisition | null;
  jobId: number;
}

function requisitionStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const rawValue = colors[status.toLowerCase()];
  return rawValue || "bg-gray-100 text-gray-800";
}

export function RequisitionTab({ requisition }: RequisitionTabProps) {
  if (!requisition) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0h.375a.375.375 0 0 1 .375.375v.375m0 0H9.75m3.75 0v.375A.375.375 0 0 1 13.125 16.5H9.75m0 0v-.375c0-.207.168-.375.375-.375h2.625M6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-500">
          No requisition has been created for this job card yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-x-auto">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Requisition {requisition.requisitionNumber}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${requisitionStatusBadge(requisition.status)}`}
          >
            {requisition.status}
          </span>
        </div>
        <Link
          href={`/stock-control/portal/requisitions/${requisition.id}`}
          className="text-sm text-teal-600 hover:text-teal-800 font-medium"
        >
          View full requisition
        </Link>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{requisition.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDateZA(requisition.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDateZA(requisition.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      {requisition.items && requisition.items.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 sm:px-6 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700">
              Line Items ({requisition.items.length})
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Unit
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requisition.items.map((item) => {
                  const productName = item.productName;
                  const quantityRequired = item.quantityRequired;
                  const packsToOrder = item.packsToOrder;
                  const reqNumber = item.reqNumber;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">{productName || "-"}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-900">
                        {quantityRequired || packsToOrder || "-"}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {item.packSizeLitres ? `${item.packSizeLitres}L` : "-"}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{reqNumber || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {requisition.notes && (
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{requisition.notes}</p>
        </div>
      )}

      <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
        <Link
          href={`/stock-control/portal/requisitions/${requisition.id}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          Open Requisition
        </Link>
      </div>
    </div>
  );
}
