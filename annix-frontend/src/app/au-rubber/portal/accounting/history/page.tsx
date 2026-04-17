"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { SignOffStatusBadge } from "../../../components/accounting/SignOffStatusBadge";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

interface SignOff {
  id: number;
  directorName: string;
  directorEmail: string;
  status: string;
  signedAt: string | null;
}

interface MonthlyAccount {
  id: number;
  periodYear: number;
  periodMonth: number;
  accountType: string;
  status: string;
  generatedAt: string | null;
  generatedBy: string | null;
  signOffs: SignOff[];
}

export default function AccountingHistoryPage() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<MonthlyAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await auRubberApiClient.accountingMonthlyAccounts();
      setAccounts(result as MonthlyAccount[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load history";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDownloadPdf = async (id: number) => {
    try {
      await auRubberApiClient.accountingDownloadPdf(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download PDF";
      showToast(msg, "error");
    }
  };

  const handleRequestSignOff = async (id: number) => {
    try {
      await auRubberApiClient.accountingRequestSignOff(id);
      showToast("Sign-off requests sent", "success");
      fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send sign-off requests";
      showToast(msg, "error");
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "History" },
          ]}
        />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Report History</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No reports generated yet.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {account.accountType === "PAYABLE"
                        ? "Accounts Payable"
                        : "Accounts Receivable"}{" "}
                      - {account.periodYear}-{String(account.periodMonth).padStart(2, "0")}
                    </h3>
                    {account.generatedAt && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Generated{" "}
                        {fromISO(account.generatedAt).toJSDate().toLocaleDateString("en-ZA")}
                        {account.generatedBy && ` by ${account.generatedBy}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <SignOffStatusBadge status={account.status} />
                    <button
                      onClick={() => handleDownloadPdf(account.id)}
                      className="px-3 py-1.5 text-sm font-medium text-yellow-600 border border-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    >
                      Download PDF
                    </button>
                    {(account.status === "GENERATED" || account.status === "PENDING_SIGNOFF") && (
                      <button
                        onClick={() => handleRequestSignOff(account.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        {account.status === "PENDING_SIGNOFF"
                          ? "Resend Sign-Off"
                          : "Request Sign-Off"}
                      </button>
                    )}
                  </div>
                </div>

                {account.signOffs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Director Sign-Offs
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {account.signOffs.map((so) => (
                        <div key={so.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {so.directorName}
                          </span>
                          <SignOffStatusBadge status={so.status} />
                          {so.signedAt && (
                            <span className="text-xs text-gray-400">
                              {fromISO(so.signedAt).toJSDate().toLocaleDateString("en-ZA")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
