"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { SignOffStatusBadge } from "../../components/accounting/SignOffStatusBadge";
import { Breadcrumb } from "../../components/Breadcrumb";
import { RequirePermission } from "../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../config/pagePermissions";

interface MonthlyAccountSummary {
  id: number;
  periodYear: number;
  periodMonth: number;
  accountType: string;
  status: string;
  generatedAt: string | null;
  signOffs: { id: number; directorName: string; status: string }[];
}

interface AccountData {
  grandTotal: number;
  grandPayable: number;
  companies: { companyId: number }[];
}

export default function AccountingDashboardPage() {
  const { showToast } = useToast();
  const [recentAccounts, setRecentAccounts] = useState<MonthlyAccountSummary[]>([]);
  const [payableSummary, setPayableSummary] = useState<AccountData | null>(null);
  const [receivableSummary, setReceivableSummary] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [accounts, payable, receivable] = await Promise.all([
        auRubberApiClient.accountingMonthlyAccounts(),
        auRubberApiClient.accountingPayable(currentYear, currentMonth),
        auRubberApiClient.accountingReceivable(currentYear, currentMonth),
      ]);
      setRecentAccounts((accounts as MonthlyAccountSummary[]).slice(0, 5));
      setPayableSummary(payable as AccountData);
      setReceivableSummary(receivable as AccountData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString("en-ZA", {
    month: "long",
  });

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Accounting" }]} />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Accounting Dashboard
        </h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/au-rubber/portal/accounting/payable"
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Accounts Payable
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {monthName} {currentYear}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    R{" "}
                    {(payableSummary?.grandPayable || 0).toLocaleString("en-ZA", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({payableSummary?.companies.length || 0} suppliers)
                  </span>
                </div>
              </Link>

              <Link
                href="/au-rubber/portal/accounting/receivable"
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Accounts Receivable
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {monthName} {currentYear}
                </p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    R{" "}
                    {(receivableSummary?.grandPayable || 0).toLocaleString("en-ZA", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({receivableSummary?.companies.length || 0} customers)
                  </span>
                </div>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/au-rubber/portal/accounting/reconciliation"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Reconciliation</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Statement matching</p>
              </Link>
              <Link
                href="/au-rubber/portal/accounting/directors"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Directors</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage sign-off directors
                </p>
              </Link>
              <Link
                href="/au-rubber/portal/accounting/history"
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium text-gray-900 dark:text-gray-100">History</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Generated reports & sign-offs
                </p>
              </Link>
            </div>

            {recentAccounts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Reports</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentAccounts.map((account) => (
                    <Link
                      key={account.id}
                      href={"/au-rubber/portal/accounting/history"}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {account.accountType === "PAYABLE"
                            ? "Accounts Payable"
                            : "Accounts Receivable"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          {account.periodYear}-{String(account.periodMonth).padStart(2, "0")}
                        </span>
                      </div>
                      <SignOffStatusBadge status={account.status} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RequirePermission>
  );
}
