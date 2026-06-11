"use client";

import { isNumber } from "es-toolkit/compat";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { RequirePermission } from "@/app/au-rubber/components/RequirePermission";
import { PAGE_PERMISSIONS } from "@/app/au-rubber/config/pagePermissions";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";

interface MatchSummary {
  matched: number;
  unmatched: number;
  discrepancies: number;
  dnGaps?: number;
  cocGaps?: number;
}

interface ReconciliationItem {
  id: number;
  companyId: number;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  status: string;
  matchSummary: MatchSummary | null;
  createdAt: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "MATCHED":
      return { label: "Matched", cls: "bg-green-100 text-green-800" };
    case "DISCREPANCY":
      return { label: "Discrepancy", cls: "bg-amber-100 text-amber-800" };
    case "EXTRACTING":
      return { label: "Extracting…", cls: "bg-blue-100 text-blue-800" };
    case "RESOLVED":
      return { label: "Resolved", cls: "bg-slate-100 text-slate-800" };
    default:
      return { label: status || "Pending", cls: "bg-gray-100 text-gray-800" };
  }
}

export default function SupplierStatementsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  const [recons, setRecons] = useState<ReconciliationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const reconsResp = await auRubberApiClient.accountingReconciliations();
      setRecons(reconsResp as ReconciliationItem[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load statements";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (r: ReconciliationItem) => {
    const ok = await confirm({
      title: "Delete statement?",
      message: `This deletes the reconciliation for ${r.companyName} (${
        MONTH_NAMES[r.periodMonth - 1]
      } ${r.periodYear}) and removes the PDF from storage so you can re-upload it from scratch. This can't be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(r.id);
    try {
      await auRubberApiClient.accountingDeleteStatement(r.id);
      showToast("Statement deleted", "success");
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      alert({ message: msg, variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isUploading) return;
    const file = files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const result = await auRubberApiClient.uploadSupplierStatementAutoDetect(file);
      const detectedName = result.detectedSupplierName
        ? result.detectedSupplierName
        : "the supplier";
      showToast(
        `Statement filed under ${detectedName} — Nix is extracting and reconciling now`,
        "success",
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      alert({ message: msg, variant: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredRecons = recons;

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/supplier-statements"]}>
      {ConfirmDialog}
      {AlertDialog}
      <div className="space-y-6">
        <Breadcrumb items={[{ label: "Suppliers" }, { label: "Statements" }]} />

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Supplier Statements
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            Drop a supplier statement (PDF) here. Nix extracts every invoice on the statement and
            audits whether the matching tax invoice, delivery note, and supplier CoC are already
            captured in the system — so you can see at a glance which documents are still missing.
          </p>
        </div>

        {/* Upload area — just drop the statement; Nix detects the supplier
            and period from the letterhead and STATEMENT DATE. */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            accept=".pdf,application/pdf"
            multiple={false}
            disabled={isUploading}
          />

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
              Reading the letterhead and statement date, then queuing extraction…
            </div>
          )}
        </div>

        {/* Past statements */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              All statements
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredRecons.length} record{filteredRecons.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
            </div>
          ) : filteredRecons.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No statements uploaded yet. Drop one above to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/40">
                <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Audit Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 w-12 text-right" />
                </tr>
              </thead>
              <tbody>
                {filteredRecons.map((r) => {
                  const badge = statusBadge(r.status);
                  const s = r.matchSummary;
                  const rawDnGaps = s ? s.dnGaps : undefined;
                  const rawCocGaps = s ? s.cocGaps : undefined;
                  const dnGaps = isNumber(rawDnGaps) ? rawDnGaps : 0;
                  const cocGaps = isNumber(rawCocGaps) ? rawCocGaps : 0;
                  return (
                    <tr
                      key={r.id}
                      onClick={() =>
                        router.push(`/au-rubber/portal/accounting/reconciliation/${r.id}`)
                      }
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/au-rubber/portal/accounting/reconciliation/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-orange-600 hover:text-orange-700"
                        >
                          {r.companyName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {MONTH_NAMES[r.periodMonth - 1]} {r.periodYear}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {r.originalFilename}
                      </td>
                      <td className="px-4 py-3">
                        {s ? (
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-green-600">{s.matched} matched</span>
                            {s.discrepancies > 0 && (
                              <span className="text-amber-600">
                                {s.discrepancies} discrepanc{s.discrepancies === 1 ? "y" : "ies"}
                              </span>
                            )}
                            {s.unmatched > 0 && (
                              <span className="text-red-600">{s.unmatched} missing STI</span>
                            )}
                            {dnGaps > 0 && (
                              <span className="text-red-600">{dnGaps} missing DN</span>
                            )}
                            {cocGaps > 0 && (
                              <span className="text-red-600">{cocGaps} missing SCoC</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {fromISO(r.createdAt).toJSDate().toLocaleDateString("en-ZA")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(r);
                          }}
                          disabled={deletingId === r.id}
                          title="Delete statement — removes the PDF too so you can re-upload"
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
