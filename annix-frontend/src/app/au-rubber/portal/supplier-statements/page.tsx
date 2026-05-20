"use client";

import { isNumber } from "es-toolkit/compat";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { FileDropZone } from "@/app/au-rubber/components/FileDropZone";
import { RequirePermission } from "@/app/au-rubber/components/RequirePermission";
import { PAGE_PERMISSIONS } from "@/app/au-rubber/config/pagePermissions";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { fromISO, now } from "@/app/lib/datetime";

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

interface SupplierOption {
  id: number;
  name: string;
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
  const { showToast } = useToast();
  const today = now();
  const [recons, setRecons] = useState<ReconciliationItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [periodYear, setPeriodYear] = useState<number>(today.year);
  const [periodMonth, setPeriodMonth] = useState<number>(today.month);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reconsResp, companiesResp] = await Promise.all([
        auRubberApiClient.accountingReconciliations(),
        auRubberApiClient.companies(),
      ]);
      setRecons(reconsResp as ReconciliationItem[]);
      const supplierCompanies = (
        companiesResp as Array<{ id: number; name: string; companyType: string }>
      )
        .filter((c) => c.companyType === "SUPPLIER")
        .map((c) => ({ id: c.id, name: c.name }));
      setSuppliers(supplierCompanies);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load statements";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0 || isUploading) return;
    if (selectedSupplierId === null) {
      showToast("Pick a supplier before dropping the statement", "warning");
      return;
    }
    const file = files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      await auRubberApiClient.accountingUploadStatement(
        selectedSupplierId,
        file,
        periodYear,
        periodMonth,
      );
      showToast(
        "Statement uploaded — extraction and reconciliation will run in the background",
        "success",
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      showToast(msg, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredRecons =
    selectedSupplierId !== null ? recons.filter((r) => r.companyId === selectedSupplierId) : recons;

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/supplier-statements"]}>
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

        {/* Upload area */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Supplier</span>
              <select
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                value={selectedSupplierId !== null ? String(selectedSupplierId) : ""}
                onChange={(e) =>
                  setSelectedSupplierId(e.target.value ? Number(e.target.value) : null)
                }
                disabled={isUploading}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Statement period — Month
              </span>
              <select
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                value={String(periodMonth)}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                disabled={isUploading}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Year</span>
              <input
                type="number"
                min={2020}
                max={today.year + 1}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm focus:ring-yellow-500 focus:border-yellow-500"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value) || today.year)}
                disabled={isUploading}
              />
            </label>
          </div>

          <FileDropZone
            onFilesSelected={handleFilesSelected}
            accept=".pdf,application/pdf"
            multiple={false}
            disabled={isUploading || selectedSupplierId === null}
          />

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
              Uploading and queuing extraction…
            </div>
          )}
        </div>

        {/* Past statements */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedSupplierId !== null ? "Statements for this supplier" : "All statements"}
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
              No statements uploaded yet
              {selectedSupplierId !== null ? " for this supplier" : ""}. Drop one above to get
              started.
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
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/au-rubber/portal/accounting/reconciliation/${r.id}`}
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
