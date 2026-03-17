"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { CpoCalloffRecord } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import {
  useCpoCalloffRecords,
  useCpoDeliveryHistory,
  useCpoDetail,
  useUpdateCalloffRecordStatus,
  useUpdateCpoStatus,
} from "@/app/lib/query/hooks";

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function calloffStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    called_off: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    invoiced: "bg-purple-100 text-purple-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

function calloffStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    called_off: "Called Off",
    delivered: "Delivered",
    invoiced: "Invoiced",
  };
  return labels[status] || status;
}

function calloffTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    rubber: "Rubber",
    paint: "Paint",
    solution: "Solution",
  };
  return labels[type] || type;
}

const CALLOFF_STATUS_FLOW = ["pending", "called_off", "delivered", "invoiced"] as const;

function nextCalloffStatus(current: string): string | null {
  const idx = CALLOFF_STATUS_FLOW.indexOf(current as (typeof CALLOFF_STATUS_FLOW)[number]);
  if (idx < 0 || idx >= CALLOFF_STATUS_FLOW.length - 1) {
    return null;
  }
  return CALLOFF_STATUS_FLOW[idx + 1];
}

function isCalloffOverdue(record: CpoCalloffRecord): boolean {
  if (record.status !== "delivered" || !record.deliveredAt) return false;
  const deliveredDate = fromISO(record.deliveredAt as string);
  const daysSinceDelivery = now().diff(deliveredDate, "days").days;
  return daysSinceDelivery >= 21;
}

function itemFulfillmentPercent(ordered: number, fulfilled: number): number {
  if (ordered <= 0) return 0;
  return Math.min(100, Math.round((fulfilled / ordered) * 100));
}

export default function CpoDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: cpo, isLoading: isLoadingCpo, error: cpoError } = useCpoDetail(id);
  const { data: calloffRecords = [] } = useCpoCalloffRecords(id);
  const { data: deliveryHistory } = useCpoDeliveryHistory(id);

  const updateCpoStatusMutation = useUpdateCpoStatus();
  const updateCalloffRecordStatusMutation = useUpdateCalloffRecordStatus();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null);

  const error = cpoError
    ? cpoError instanceof Error
      ? cpoError.message
      : "Failed to load CPO"
    : mutationError;

  const handleStatusChange = async (newStatus: string) => {
    if (!cpo) return;
    try {
      setMutationError(null);
      await updateCpoStatusMutation.mutateAsync({ id: cpo.id, status: newStatus });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleCalloffAdvance = async (record: CpoCalloffRecord) => {
    const next = nextCalloffStatus(record.status);
    if (!next) return;
    try {
      setUpdatingRecordId(record.id);
      setMutationError(null);
      await updateCalloffRecordStatusMutation.mutateAsync({
        recordId: record.id,
        status: next,
        cpoId: id,
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to update calloff status");
    } finally {
      setUpdatingRecordId(null);
    }
  };

  if (isLoadingCpo) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (error || !cpo) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error || "CPO not found"}</p>
          <Link
            href="/stock-control/portal/purchase-orders"
            className="mt-4 inline-block px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const totalQty = Number(cpo.totalQuantity) || 0;
  const fulfilledQty = Number(cpo.fulfilledQuantity) || 0;
  const overallPct = totalQty > 0 ? Math.min(100, Math.round((fulfilledQty / totalQty) * 100)) : 0;

  const sortedItems = [...(cpo.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const recordsByJobCard = calloffRecords.reduce<Record<string, CpoCalloffRecord[]>>(
    (acc, record) => {
      const key = record.jobCardId ? `jc-${record.jobCardId}` : "unlinked";
      return {
        ...acc,
        [key]: [...(acc[key] || []), record],
      };
    },
    {},
  );

  const overdueRecords = calloffRecords.filter(isCalloffOverdue);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link href="/stock-control/portal/purchase-orders" className="hover:text-teal-600">
              Purchase Orders
            </Link>
            <span>/</span>
            <span className="text-gray-900">{cpo.cpoNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{cpo.cpoNumber}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${statusBadgeColor(cpo.status)}`}
          >
            {cpo.status}
          </span>
          {cpo.status === "active" && (
            <>
              <button
                onClick={() => handleStatusChange("fulfilled")}
                disabled={updateCpoStatusMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Fulfilled
              </button>
              <button
                onClick={() => handleStatusChange("cancelled")}
                disabled={updateCpoStatusMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <dt className="text-xs font-medium text-gray-500 uppercase">Job Number</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.jobNumber}</dd>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <dt className="text-xs font-medium text-gray-500 uppercase">Customer</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.customerName || "-"}</dd>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <dt className="text-xs font-medium text-gray-500 uppercase">PO Number</dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.poNumber || "-"}</dd>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <dt className="text-xs font-medium text-gray-500 uppercase">Overall Fulfilment</dt>
          <dd className="mt-1">
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${overallPct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">{overallPct}%</span>
            </div>
          </dd>
        </div>
      </div>

      {(cpo.jobName ||
        cpo.siteLocation ||
        cpo.contactPerson ||
        cpo.dueDate ||
        cpo.notes ||
        cpo.reference) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {cpo.jobName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Job Name</dt>
                <dd className="text-sm text-gray-900">{cpo.jobName}</dd>
              </div>
            )}
            {cpo.siteLocation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Site Location</dt>
                <dd className="text-sm text-gray-900">{cpo.siteLocation}</dd>
              </div>
            )}
            {cpo.contactPerson && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="text-sm text-gray-900">{cpo.contactPerson}</dd>
              </div>
            )}
            {cpo.dueDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="text-sm text-gray-900">{cpo.dueDate}</dd>
              </div>
            )}
            {cpo.reference && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference</dt>
                <dd className="text-sm text-gray-900">{cpo.reference}</dd>
              </div>
            )}
            {cpo.notes && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{cpo.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {overdueRecords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <svg
            className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-800">
              Overdue Invoice{overdueRecords.length > 1 ? "s" : ""}
            </h3>
            <p className="text-sm text-red-700 mt-0.5">
              {overdueRecords.length} call-off{overdueRecords.length > 1 ? "s have" : " has"} been
              delivered for more than 21 days without an invoice.
            </p>
          </div>
        </div>
      )}

      {calloffRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Call-Off Tracking</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {Object.entries(recordsByJobCard).map(([key, records]) => {
              const jobCard = records[0]?.jobCard;
              return (
                <div key={key} className="px-6 py-4">
                  <div className="flex items-center space-x-2 mb-3">
                    {jobCard ? (
                      <Link
                        href={`/stock-control/portal/job-cards/${jobCard.id}`}
                        className="text-sm font-medium text-teal-700 hover:text-teal-900"
                      >
                        JC {jobCard.jobNumber}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-500">Unlinked</span>
                    )}
                    {jobCard?.jobName && (
                      <span className="text-sm text-gray-500">{jobCard.jobName}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {records.map((record) => {
                      const next = nextCalloffStatus(record.status);
                      const overdue = isCalloffOverdue(record);
                      return (
                        <div
                          key={record.id}
                          className={`border rounded-lg p-3 flex flex-col space-y-2 ${overdue ? "border-red-300 bg-red-50" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">
                              {calloffTypeLabel(record.calloffType)}
                            </span>
                            <div className="flex items-center space-x-1">
                              {overdue && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Overdue
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${calloffStatusColor(record.status)}`}
                              >
                                {calloffStatusLabel(record.status)}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            {record.calledOffAt && (
                              <div>Called off: {formatDateZA(record.calledOffAt)}</div>
                            )}
                            {record.deliveredAt && (
                              <div>Delivered: {formatDateZA(record.deliveredAt)}</div>
                            )}
                            {record.invoicedAt && (
                              <div>Invoiced: {formatDateZA(record.invoicedAt)}</div>
                            )}
                          </div>
                          {next && (
                            <button
                              onClick={() => handleCalloffAdvance(record)}
                              disabled={updatingRecordId === record.id}
                              className="mt-auto text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              {updatingRecordId === record.id
                                ? "Updating..."
                                : `Mark ${calloffStatusLabel(next)}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deliveryHistory &&
        deliveryHistory.runningTotals.length > 0 &&
        deliveryHistory.deliveries.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Delivery History ({deliveryHistory.deliveries.length} JT
                {deliveryHistory.deliveries.length !== 1 ? "s" : ""})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered
                    </th>
                    {deliveryHistory.deliveries.map((d) => (
                      <th
                        key={d.jobCardId}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <Link
                          href={`/stock-control/portal/job-cards/${d.jobCardId}`}
                          className="text-teal-600 hover:text-teal-800"
                        >
                          {d.jtDnNumber || d.jobNumber}
                        </Link>
                        <div className="text-[10px] text-gray-400 font-normal normal-case">
                          {formatDateZA(d.importedAt)}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Fulfilled
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveryHistory.runningTotals.map((rt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        <span className="font-mono font-medium">{rt.itemCode || "-"}</span>
                        {rt.description && (
                          <span className="ml-2 text-gray-500 text-xs truncate max-w-[200px] inline-block align-bottom">
                            {rt.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                        {rt.ordered}
                      </td>
                      {deliveryHistory.deliveries.map((d) => {
                        const delivery = rt.deliveries.find((rd) => rd.jtDnNumber === d.jtDnNumber);
                        return (
                          <td key={d.jobCardId} className="px-4 py-3 text-sm text-right">
                            {delivery ? (
                              <span className="font-medium text-teal-700">{delivery.quantity}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                        {rt.fulfilled}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold">
                        <span className={rt.remaining > 0 ? "text-amber-600" : "text-green-600"}>
                          {rt.remaining}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">Total</td>
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                      {deliveryHistory.runningTotals.reduce((sum, rt) => sum + rt.ordered, 0)}
                    </td>
                    {deliveryHistory.deliveries.map((d) => (
                      <td
                        key={d.jobCardId}
                        className="px-4 py-3 text-sm text-right font-semibold text-teal-700"
                      >
                        {d.totalQuantity || "-"}
                      </td>
                    ))}
                    <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                      {deliveryHistory.runningTotals.reduce((sum, rt) => sum + rt.fulfilled, 0)}
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-semibold">
                      {(() => {
                        const totalRemaining = deliveryHistory.runningTotals.reduce(
                          (sum, rt) => sum + rt.remaining,
                          0,
                        );
                        return (
                          <span
                            className={totalRemaining > 0 ? "text-amber-600" : "text-green-600"}
                          >
                            {totalRemaining}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Line Items ({sortedItems.length})</h2>
        </div>
        {sortedItems.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No line items</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JT No
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fulfilled
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    m2
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems.map((item, idx) => {
                  const ordered = Number(item.quantityOrdered) || 0;
                  const fulfilled = Number(item.quantityFulfilled) || 0;
                  const remaining = Math.max(0, ordered - fulfilled);
                  const pct = itemFulfillmentPercent(ordered, fulfilled);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.itemCode || "-"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {item.itemDescription || "-"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.jtNo || "-"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {ordered}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fulfilled}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-right">
                        <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
                          {remaining}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.m2 != null ? Number(item.m2).toFixed(2) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        Created {formatDateZA(cpo.createdAt)}
        {cpo.createdBy && ` by ${cpo.createdBy}`}
        {cpo.sourceFileName && ` from ${cpo.sourceFileName}`}
      </div>
    </div>
  );
}
