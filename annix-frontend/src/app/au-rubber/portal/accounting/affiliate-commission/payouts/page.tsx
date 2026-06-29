"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface Payout {
  id: number;
  commissionType: string;
  salesRepId: number | null;
  affiliateId: number | null;
  customerName: string;
  invoiceNumber: string;
  invoiceTotal: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  releaseSource: string;
  paidAt: string | null;
  paidBy: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "PAID", "CANCELLED"] as const;

export default function PayoutsPage() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchPayouts = async (filter?: string) => {
    setIsLoading(true);
    try {
      const data =
        filter && filter !== "ALL"
          ? await auRubberApiClient.affiliateCommissionPayouts(filter)
          : await auRubberApiClient.affiliateCommissionPayouts();
      setPayouts(data as Payout[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load payouts";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    fetchPayouts(filter);
  };

  const handleApprove = async (id: number) => {
    const ok = await confirm({
      title: "Approve payout?",
      message: "This will move the payout to APPROVED status.",
      confirmLabel: "Approve",
      cancelLabel: "Cancel",
      variant: "info",
    });
    if (!ok) return;
    try {
      await auRubberApiClient.affiliateCommissionUpdatePayoutStatus(id, { status: "APPROVED" });
      showToast("Payout approved", "success");
      fetchPayouts(statusFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve";
      alert({ message: msg, variant: "error" });
    }
  };

  const handleMarkPaid = async (id: number) => {
    const ok = await confirm({
      title: "Mark as paid?",
      message: "This will move the payout to PAID status.",
      confirmLabel: "Mark as Paid",
      cancelLabel: "Cancel",
      variant: "info",
    });
    if (!ok) return;
    try {
      await auRubberApiClient.affiliateCommissionUpdatePayoutStatus(id, { status: "PAID" });
      showToast("Payout marked as paid", "success");
      fetchPayouts(statusFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      alert({ message: msg, variant: "error" });
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      HELD: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    const colorLookup = colors[status];
    const colorClass = colorLookup || "bg-gray-100 text-gray-600";
    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
        {status}
      </span>
    );
  };

  const totalAmount = payouts.reduce((s, p) => {
    const rawAmt = p.commissionAmount;
    return s + (rawAmt || 0);
  }, 0);

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      {ConfirmDialog}
      {AlertDialog}
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            {
              label: "Affiliate & Commission",
              href: "/au-rubber/portal/accounting/affiliate-commission",
            },
            { label: "Payouts" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Commission Payouts
          </h1>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total displayed</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              R {totalAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === f
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No payouts found.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Invoice Total</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.commissionType === "SALES_REP"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
                        }`}
                      >
                        {p.commissionType === "SALES_REP" ? "Rep" : "Affiliate"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {p.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                      {p.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">
                      R {p.invoiceTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                      {p.commissionType === "SALES_REP" ? `${p.commissionRate}%` : "Margin"}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-gray-100">
                      R {p.commissionAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {p.createdAt
                        ? fromISO(p.createdAt).toJSDate().toLocaleDateString("en-ZA")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "PENDING" && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleApprove(p.id)}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                          >
                            Pay
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
