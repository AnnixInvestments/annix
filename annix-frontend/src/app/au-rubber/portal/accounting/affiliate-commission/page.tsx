"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

export default function AffiliateCommissionDashboardPage() {
  const { alert, AlertDialog } = useAlert();
  const [repCount, setRepCount] = useState(0);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reps, affiliates, payouts] = await Promise.all([
        auRubberApiClient.affiliateCommissionSalesReps(),
        auRubberApiClient.affiliateCommissionAffiliates(),
        auRubberApiClient.affiliateCommissionPayouts("PENDING"),
      ]);
      setRepCount((reps as unknown[]).length);
      setAffiliateCount((affiliates as unknown[]).length);
      setPendingPayouts(payouts as unknown[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
                <div className="mt-2 text-3xl font-bold text-yellow-600">{repCount}</div>
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
          </>
        )}
      </div>
    </RequirePermission>
  );
}
