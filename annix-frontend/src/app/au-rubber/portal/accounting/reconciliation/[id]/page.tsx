"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { ReconciliationMatchView } from "../../../../components/accounting/ReconciliationMatchView";
import { SignOffStatusBadge } from "../../../../components/accounting/SignOffStatusBadge";
import { Breadcrumb } from "../../../../components/Breadcrumb";
import { RequirePermission } from "../../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../../config/pagePermissions";

interface ExtractedLine {
  invoiceNumber: string;
  invoiceDate: string | null;
  amount: number;
  isCredit: boolean;
  balance: number | null;
}

interface MatchItem {
  invoiceNumber: string;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: string;
  difference: number | null;
}

interface ReconciliationDetail {
  id: number;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  extractedData: ExtractedLine[] | null;
  status: string;
  matchSummary: { matched: number; unmatched: number; discrepancies: number } | null;
  matchItems: MatchItem[];
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
}

export default function ReconciliationDetailPage() {
  const rawLineInvoiceDate = line.invoiceDate;
  const params = useParams();
  const id = Number(params.id);
  const { showToast } = useToast();
  const [data, setData] = useState<ReconciliationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolve, setShowResolve] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await auRubberApiClient.accountingReconciliationById(id);
      setData(result as ReconciliationDetail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const result = await auRubberApiClient.accountingExtractStatement(id);
      setData(result as ReconciliationDetail);
      showToast("Statement extracted successfully", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      showToast(msg, "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const result = await auRubberApiClient.accountingReconcileStatement(id);
      setData(result as ReconciliationDetail);
      showToast("Reconciliation complete", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reconciliation failed";
      showToast(msg, "error");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleResolve = async () => {
    try {
      const result = await auRubberApiClient.accountingResolveDiscrepancy(
        id,
        "admin",
        resolveNotes,
      );
      setData(result as ReconciliationDetail);
      setShowResolve(false);
      showToast("Marked as resolved", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve";
      showToast(msg, "error");
    }
  };

  if (isLoading) {
    return (
      <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
        </div>
      </RequirePermission>
    );
  }

  if (!data) {
    return (
      <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
        <div className="text-center py-12 text-gray-500">Reconciliation not found.</div>
      </RequirePermission>
    );
  }

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Reconciliation", href: "/au-rubber/portal/accounting/reconciliation" },
            { label: data.companyName },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.companyName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.periodYear}-{String(data.periodMonth).padStart(2, "0")} |{" "}
              {data.originalFilename}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SignOffStatusBadge status={data.status} />
            {data.status === "PENDING" && !data.extractedData && (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isExtracting ? "Extracting..." : "Extract Statement"}
              </button>
            )}
            {data.extractedData &&
              data.extractedData.length > 0 &&
              (data.status === "PENDING" || data.status === "EXTRACTING") && (
                <button
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {isReconciling ? "Reconciling..." : "Run Reconciliation"}
                </button>
              )}
            {data.status === "DISCREPANCY" && (
              <button
                onClick={() => setShowResolve(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark Resolved
              </button>
            )}
          </div>
        </div>

        {data.matchSummary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {data.matchSummary.matched}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">Matched</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {data.matchSummary.discrepancies}
              </div>
              <div className="text-sm text-amber-600 dark:text-amber-500">Discrepancies</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {data.matchSummary.unmatched}
              </div>
              <div className="text-sm text-red-600 dark:text-red-500">Unmatched</div>
            </div>
          </div>
        )}

        {data.matchItems.length > 0 && <ReconciliationMatchView matchItems={data.matchItems} />}

        {data.extractedData && data.extractedData.length > 0 && data.matchItems.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Extracted Statement Lines ({data.extractedData.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-2">Invoice No</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.extractedData.map((line, idx) => (
                    <tr
                      key={`${line.invoiceNumber}-${idx}`}
                      className="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {line.invoiceNumber}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {rawLineInvoiceDate || "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                        R {line.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        {line.isCredit ? (
                          <span className="text-red-600 text-xs">Credit</span>
                        ) : (
                          <span className="text-gray-600 text-xs">Invoice</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.notes && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resolution Notes
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{data.notes}</p>
          </div>
        )}

        {showResolve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Resolve Discrepancy
                </h2>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Explain why this discrepancy is being resolved..."
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowResolve(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
