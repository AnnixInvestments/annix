"use client";

import { useCallback, useMemo, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type { QcControlPlanRecord } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useOpenControlPlanPdf, useQcpLog } from "@/app/lib/query/hooks";

const PLAN_TYPE_LABELS: Record<string, string> = {
  paint_external: "Paint External",
  paint_internal: "Paint Internal",
  rubber: "Rubber",
  hdpe: "HDPE",
};

const PLAN_TYPE_BADGE_COLORS: Record<string, string> = {
  paint_external: "bg-blue-100 text-blue-800",
  paint_internal: "bg-indigo-100 text-indigo-800",
  rubber: "bg-green-100 text-green-800",
  hdpe: "bg-orange-100 text-orange-800",
};

type SortKey =
  | "qcpNumber"
  | "jobNumber"
  | "planType"
  | "documentRef"
  | "revision"
  | "customerName"
  | "jobName"
  | "createdByName"
  | "createdAt";

type SortDir = "asc" | "desc";

function sortValue(plan: QcControlPlanRecord, key: SortKey): string {
  if (key === "qcpNumber") return (plan.qcpNumber || `QCP #${plan.id}`).toLowerCase();
  if (key === "planType") {
    const typeLabel = PLAN_TYPE_LABELS[plan.planType];
    return (typeLabel ? typeLabel : plan.planType).toLowerCase();
  }
  if (key === "createdAt") return plan.createdAt || "";
  const val = plan[key as keyof QcControlPlanRecord];
  return (typeof val === "string" ? val : "").toLowerCase();
}

function SortIcon(props: { active: boolean; direction: SortDir }) {
  if (!props.active) {
    return (
      <svg className="ml-1 inline h-3 w-3 text-gray-400" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1.5L9.5 5.5H2.5L6 1.5Z" opacity="0.4" />
        <path d="M6 10.5L2.5 6.5H9.5L6 10.5Z" opacity="0.4" />
      </svg>
    );
  }
  if (props.direction === "asc") {
    return (
      <svg className="ml-1 inline h-3 w-3 text-teal-600" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1.5L9.5 5.5H2.5L6 1.5Z" />
      </svg>
    );
  }
  return (
    <svg className="ml-1 inline h-3 w-3 text-teal-600" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 10.5L2.5 6.5H9.5L6 10.5Z" />
    </svg>
  );
}

export default function QcpLogPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const pdfPreview = usePdfPreview();
  const openPdfMutation = useOpenControlPlanPdf();

  const { data: plans = [], isLoading: loading } = useQcpLog(appliedSearch);

  const handleSearch = useCallback(() => {
    setAppliedSearch(search);
  }, [search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleClear = useCallback(() => {
    setSearch("");
    setAppliedSearch("");
  }, []);

  const handleViewPdf = useCallback(
    (plan: QcControlPlanRecord) => {
      const qcpNum = plan.qcpNumber;
      const label = qcpNum ? qcpNum : `QCP-${plan.id}`;
      const jobCardId = plan.jobCardId;
      const jcId = jobCardId ? jobCardId : 0;
      pdfPreview.openWithFetch(
        () => openPdfMutation.mutateAsync({ jobCardId: jcId, planId: plan.id }),
        `${label}.pdf`,
      );
    },
    [pdfPreview, openPdfMutation],
  );

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        if (sortDir === "asc") {
          setSortDir("desc");
        } else {
          setSortKey(null);
          setSortDir("asc");
        }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  const sortedPlans = useMemo(() => {
    if (!sortKey) return plans;
    return [...plans].sort((a, b) => {
      const aVal = sortValue(a, sortKey);
      const bVal = sortValue(b, sortKey);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [plans, sortKey, sortDir]);

  const thClass =
    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors";

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "qcpNumber", label: "QCP Number" },
    { key: "jobNumber", label: "Job Number" },
    { key: "planType", label: "Type" },
    { key: "documentRef", label: "Doc Ref" },
    { key: "revision", label: "Rev" },
    { key: "customerName", label: "Customer" },
    { key: "jobName", label: "Job Name" },
    { key: "createdByName", label: "Created By" },
    { key: "createdAt", label: "Date" },
  ];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">QCP Log</h1>
        <p className="mt-1 text-sm text-gray-500">All Quality Control Plans across all job cards</p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by QCP or job number..."
          className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {plans.length} record{plans.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={thClass} onClick={() => handleSort(col.key)}>
                  {col.label}
                  <SortIcon active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                PDF
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : sortedPlans.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                  {search ? "No QCPs found matching your search" : "No QCPs created yet"}
                </td>
              </tr>
            ) : (
              sortedPlans.map((plan) => {
                const qcpNumber = plan.qcpNumber;
                const jobNumber = plan.jobNumber;
                const documentRef = plan.documentRef;
                const revision = plan.revision;
                const customerName = plan.customerName;
                const jobName = plan.jobName;
                const createdByName = plan.createdByName;
                return (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {qcpNumber || `QCP #${plan.id}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-700">
                      {jobNumber || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={(() => {
                          const badgeColor = PLAN_TYPE_BADGE_COLORS[plan.planType];
                          return `inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor ? badgeColor : "bg-gray-100 text-gray-800"}`;
                        })()}
                      >
                        {(() => {
                          const tLabel = PLAN_TYPE_LABELS[plan.planType];
                          return tLabel ? tLabel : plan.planType;
                        })()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {documentRef || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      v{revision || "01"}
                    </td>
                    <td className="max-w-[180px] px-4 py-3 text-sm text-gray-500">
                      <div className="overflow-x-auto whitespace-nowrap scrollbar-thin">
                        {customerName || "-"}
                      </div>
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-sm text-gray-500">
                      <div className="overflow-x-auto whitespace-nowrap scrollbar-thin">
                        {jobName || "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {createdByName || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {plan.createdAt ? formatDateZA(plan.createdAt) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleViewPdf(plan)}
                        className="text-teal-600 hover:text-teal-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
