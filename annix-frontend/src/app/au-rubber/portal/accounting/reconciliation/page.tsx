"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { SignOffStatusBadge } from "../../../components/accounting/SignOffStatusBadge";
import { StatementUploadModal } from "../../../components/accounting/StatementUploadModal";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

interface ReconciliationItem {
  id: number;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  status: string;
  matchSummary: { matched: number; unmatched: number; discrepancies: number } | null;
  createdAt: string;
}

interface SupplierOption {
  id: number;
  name: string;
}

export default function ReconciliationListPage() {
  const { showToast } = useToast();
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recons, companies] = await Promise.all([
        auRubberApiClient.accountingReconciliations(),
        auRubberApiClient.companies(),
      ]);
      setReconciliations(recons as ReconciliationItem[]);
      const supplierCompanies = (
        companies as Array<{ id: number; name: string; companyType: string }>
      ).filter((c) => c.companyType === "SUPPLIER");
      setSuppliers(
        supplierCompanies.map((c) => ({
          id: c.id,
          name: c.name,
        })),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpload = async (companyId: number, file: File, year: number, month: number) => {
    try {
      await auRubberApiClient.accountingUploadStatement(companyId, file, year, month);
      showToast("Statement uploaded", "success");
      setShowUpload(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      showToast(msg, "error");
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Reconciliation" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Statement Reconciliation
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Upload Statement
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : reconciliations.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No reconciliations yet. Upload a supplier statement to start.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Match Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/au-rubber/portal/accounting/reconciliation/${r.id}`}
                        className="font-medium text-yellow-600 hover:text-yellow-700"
                      >
                        {r.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {r.periodYear}-{String(r.periodMonth).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                      {r.originalFilename}
                    </td>
                    <td className="px-4 py-3">
                      {r.matchSummary ? (
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">{r.matchSummary.matched} matched</span>
                          {r.matchSummary.discrepancies > 0 && (
                            <span className="text-amber-600">
                              {r.matchSummary.discrepancies} discrepancies
                            </span>
                          )}
                          {r.matchSummary.unmatched > 0 && (
                            <span className="text-red-600">
                              {r.matchSummary.unmatched} unmatched
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SignOffStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {fromISO(r.createdAt).toJSDate().toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showUpload && (
          <StatementUploadModal
            suppliers={suppliers}
            onUpload={handleUpload}
            onClose={() => setShowUpload(false)}
          />
        )}
      </div>
    </RequirePermission>
  );
}
