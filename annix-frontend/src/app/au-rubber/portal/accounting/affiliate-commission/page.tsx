"use client";

import { toPairs as entries } from "es-toolkit/compat";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auRubberApiClient, type CtiRow } from "@/app/lib/api/auRubberApi";
import { DateTime } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

interface QuotationRow {
  id: number;
  customerName: string;
  createdAt: string;
  grandTotal: number;
  profit?: number;
  status?: string;
}

const STATUS_OPTIONS = ["Unpaid", "Paid", "Awaiting PO", "PO Received", "Cancelled"];

const STATUS_STYLES: Record<string, string> = {
  Unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Awaiting PO": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "PO Received": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AffiliateCommissionDashboardPage() {
  const { alert, AlertDialog } = useAlert();
  const [reps, setReps] = useState<{ id: number; name: string }[]>([]);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState<unknown[]>([]);
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ctiRows, setCtiRows] = useState<CtiRow[]>([]);
  const [ctiLoading, setCtiLoading] = useState(true);
  const [assigningCtis, setAssigningCtis] = useState(false);
  const [fixingLinks, setFixingLinks] = useState(false);
  const [fixingInvoices, setFixingInvoices] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [repsRaw, affiliates, payouts] = await Promise.all([
        auRubberApiClient.affiliateCommissionSalesReps(),
        auRubberApiClient.affiliateCommissionAffiliates(),
        auRubberApiClient.affiliateCommissionPayouts("PENDING"),
      ]);
      const repList = repsRaw as { id: number; name: string }[];
      setReps(repList);
      setAffiliateCount((affiliates as unknown[]).length);
      setPendingPayouts(payouts as unknown[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuotations = useCallback(async () => {
    setQuotationsLoading(true);
    try {
      const list = (await auRubberApiClient.quotationList()) as QuotationRow[];
      const now = DateTime.now().toISO();
      const sorted = [...list]
        .map((q) => {
          const customerName = q.customerName;
          const createdAt = q.createdAt;
          const grandTotal = q.grandTotal;
          const profit = q.profit;
          const status = q.status;
          return {
            id: q.id,
            customerName: customerName ?? "",
            createdAt: createdAt ?? now,
            grandTotal: grandTotal ?? 0,
            profit: profit ?? 0,
            status: status ?? "Unpaid",
          };
        })
        .sort(
          (a, b) =>
            DateTime.fromISO(b.createdAt).toMillis() - DateTime.fromISO(a.createdAt).toMillis(),
        );
      setQuotations(sorted);
    } catch {
      // silently fail
    } finally {
      setQuotationsLoading(false);
    }
  }, []);

  const fetchCtis = useCallback(async () => {
    setCtiLoading(true);
    try {
      const rows = (await auRubberApiClient.affiliateCommissionCtiList()) as CtiRow[];
      setCtiRows(rows);
    } catch {
      // silently fail
    } finally {
      setCtiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchQuotations();
    fetchCtis();
  }, [fetchQuotations, fetchCtis]);

  const handleStatusChange = useCallback(
    async (id: number, newStatus: string) => {
      setUpdatingStatus(id);
      try {
        await auRubberApiClient.quotationUpdate(id, { status: newStatus } as never);
        setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q)));
      } catch {
        alert({ message: "Failed to update status", variant: "error" });
      } finally {
        setUpdatingStatus(null);
      }
    },
    [alert],
  );

  const handleBackfill = useCallback(async () => {
    setBackfilling(true);
    try {
      const result = await auRubberApiClient.quotationBackfillCostPrice();
      alert({
        message: `Recalculated profit for ${result.updated} quotation(s)`,
        variant: "success",
      });
      fetchQuotations();
    } catch {
      alert({ message: "Failed to recalculate profit", variant: "error" });
    } finally {
      setBackfilling(false);
    }
  }, [alert, fetchQuotations]);

  const handleAutoAssignCtis = useCallback(async () => {
    if (reps.length === 0) {
      alert({ message: "No sales reps available. Create one first.", variant: "error" });
      return;
    }
    const repId = reps[0].id;
    setAssigningCtis(true);
    try {
      const result = (await auRubberApiClient.affiliateCommissionAutoAssign({
        salesRepId: repId,
      })) as { assigned: number; skipped: number };
      alert({
        message: `Assigned ${result.assigned} CTI(s) to ${reps[0].name}${result.skipped > 0 ? `, ${result.skipped} skipped (already assigned)` : ""}`,
        variant: "success",
      });
      fetchCtis();
    } catch {
      alert({ message: "Failed to auto-assign CTIs", variant: "error" });
    } finally {
      setAssigningCtis(false);
    }
  }, [reps, alert, fetchCtis]);

  const handleFixCompanyLinks = useCallback(async () => {
    setFixingLinks(true);
    try {
      const result = (await auRubberApiClient.affiliateCommissionFixCompanyLinks()) as {
        moved: number;
      };
      alert({
        message: `Re-linked ${result.moved} CTI(s) from AU Industries to Polymer Lining System`,
        variant: "success",
      });
      fetchCtis();
    } catch {
      alert({ message: "Failed to fix company links", variant: "error" });
    } finally {
      setFixingLinks(false);
    }
  }, [alert, fetchCtis]);

  const handleFixInvoiceCustomer = useCallback(async () => {
    setFixingInvoices(true);
    try {
      const result = (await auRubberApiClient.affiliateCommissionFixInvoiceCustomer([
        "1350",
        "1345",
      ])) as { fixed: Record<string, string>; errors: Record<string, string> };
      const fixedList = entries(result.fixed);
      const errs = entries(result.errors);
      let msg = fixedList.map(([k, v]) => `#${k} → ${v}`).join("; ");
      if (errs.length > 0)
        msg += (msg ? " | " : "") + errs.map(([k, v]) => `#${k}: ${v}`).join("; ");
      alert({ message: msg || "No changes", variant: errs.length > 0 ? "warning" : "success" });
      fetchCtis();
    } catch {
      alert({ message: "Failed to fix invoice customers", variant: "error" });
    } finally {
      setFixingInvoices(false);
    }
  }, [alert, fetchCtis]);

  const displayedQuotations = useMemo(() => {
    if (!statusFilter) return quotations;
    return quotations.filter((q) => q.status === statusFilter);
  }, [quotations, statusFilter]);

  const totalPendingAmount = (pendingPayouts as Array<{ commissionAmount: number }>).reduce(
    (s, p) => {
      const rawAmt = p.commissionAmount;
      return s + (rawAmt || 0);
    },
    0,
  );

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        {AlertDialog}
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Affiliate & Commission" },
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Affiliate & Commission
        </h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/au-rubber/portal/accounting/affiliate-commission/sales-reps"
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Sales Reps
                </h2>
                <div className="mt-2 text-3xl font-bold text-yellow-600">{reps.length}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage reps and commission rates
                </p>
              </Link>

              <Link
                href="/au-rubber/portal/accounting/affiliate-commission/affiliates"
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Affiliates
                </h2>
                <div className="mt-2 text-3xl font-bold text-yellow-600">{affiliateCount}</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage affiliates and price lists
                </p>
              </Link>

              <Link
                href="/au-rubber/portal/accounting/affiliate-commission/payouts"
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Pending Payouts
                </h2>
                <div className="mt-2 text-3xl font-bold text-yellow-600">
                  R {totalPendingAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pendingPayouts.length} payout{pendingPayouts.length !== 1 ? "s" : ""} awaiting
                  release
                </p>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/au-rubber/portal/accounting/affiliate-commission/price-lists"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Price Lists</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upload and manage affiliate PDF price lists
                </p>
              </Link>
              <Link
                href="/au-rubber/portal/accounting/affiliate-commission/payouts"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">All Payouts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  View and manage all commission payouts
                </p>
              </Link>
            </div>

            {/* Quotations full-width section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Quotations
                </h2>
                <div className="flex items-center gap-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBackfill}
                    disabled={backfilling}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {backfilling ? "Recalculating..." : "Recalculate Profit"}
                  </button>
                  <Link
                    href="/au-rubber/portal/accounting/affiliate-commission/quotations"
                    className="px-4 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                  >
                    + New Quotation
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Quote #</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {quotationsLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : displayedQuotations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                          {statusFilter
                            ? `No quotations with status "${statusFilter}"`
                            : "No quotations yet"}
                        </td>
                      </tr>
                    ) : (
                      displayedQuotations.map((q) => {
                        const custName = q.customerName;
                        const created = q.createdAt;
                        const profit = q.profit;
                        const status = q.status;
                        const dateStr = created
                          ? DateTime.fromISO(created).toLocaleString({
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—";
                        const statusStyleKey = STATUS_STYLES[status ?? "Unpaid"];
                        const statusStyle = statusStyleKey || "bg-gray-100 text-gray-800";
                        return (
                          <tr
                            key={q.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`/au-rubber/portal/accounting/affiliate-commission/quotations?id=${q.id}`}
                                className="font-mono text-yellow-600 hover:underline font-medium"
                              >
                                #{q.id}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                              {custName || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                              {dateStr}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                              R
                              {q.grandTotal.toLocaleString("en-ZA", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                              R
                              {(profit ?? 0).toLocaleString("en-ZA", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <select
                                value={status ?? "Unpaid"}
                                disabled={updatingStatus === q.id}
                                onChange={(e) => handleStatusChange(q.id, e.target.value)}
                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${statusStyle}`}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/au-rubber/portal/accounting/affiliate-commission/quotations?id=${q.id}`}
                                className="text-xs text-yellow-600 hover:underline"
                              >
                                Open
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTI (Customer Tax Invoices) full-width section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Customer Tax Invoices (CTI)
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFixInvoiceCustomer}
                    disabled={fixingInvoices}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {fixingInvoices ? "Fixing..." : "Fix #1350, #1345"}
                  </button>
                  <button
                    onClick={handleFixCompanyLinks}
                    disabled={fixingLinks}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {fixingLinks ? "Fixing..." : "Fix Customer Links"}
                  </button>
                  {reps.length > 0 && (
                    <button
                      onClick={handleAutoAssignCtis}
                      disabled={assigningCtis}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {assigningCtis ? "Assigning..." : `Assign All to ${reps[0].name}`}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Invoice #</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Total Excl. VAT</th>
                      <th className="px-4 py-3 text-right">Total Incl. VAT</th>
                      <th className="px-4 py-3 text-right">Profit / Commission</th>
                      <th className="px-4 py-3 text-left">Sales Rep / Affiliate</th>
                      <th className="px-4 py-3 text-center">Invoice Status</th>
                      <th className="px-4 py-3 text-center">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {ctiLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                          Loading...
                        </td>
                      </tr>
                    ) : ctiRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                          No customer tax invoices found
                        </td>
                      </tr>
                    ) : (
                      ctiRows.map((row) => {
                        const salesRep = row.salesRepName;
                        const affiliate = row.affiliateName;
                        const invStatus = row.status;
                        const payoutStatus = row.payoutStatus;
                        const person = salesRep ?? affiliate ?? null;
                        const invDate = row.invoiceDate;
                        return (
                          <tr
                            key={row.invoiceId}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200 text-xs">
                              {row.invoiceNumber}
                            </td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                              {row.customerName}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                              {invDate
                                ? DateTime.fromISO(invDate).toLocaleString({
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                              R
                              {row.totalExVat.toLocaleString("en-ZA", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                              R
                              {row.totalAmount.toLocaleString("en-ZA", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-200">
                              {row.commissionAmount > 0 ? (
                                <>
                                  R
                                  {row.commissionAmount.toLocaleString("en-ZA", {
                                    minimumFractionDigits: 2,
                                  })}
                                </>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                              {person ?? <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                  invStatus === "APPROVED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : invStatus === "EXTRACTED"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                }`}
                              >
                                {invStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                  payoutStatus === "APPROVED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : payoutStatus === "PAID"
                                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
                                      : payoutStatus === "PENDING"
                                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                        : payoutStatus === "HELD"
                                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                          : "bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400"
                                }`}
                              >
                                {payoutStatus ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
