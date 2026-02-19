"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateZA, now } from "@/app/lib/datetime";
import { useExportReportPdf, useTerritoryCoverageReport } from "@/app/lib/query/hooks";

const TerritoryMap = dynamic(() => import("../components/TerritoryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  ),
});

function StatCard({
  label,
  value,
  subValue,
  color = "blue",
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: "blue" | "green" | "red" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20",
    green: "bg-green-50 dark:bg-green-900/20",
    red: "bg-red-50 dark:bg-red-900/20",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20",
  };

  return (
    <div
      className={`${colorClasses[color]} rounded-xl p-4 border border-gray-100 dark:border-slate-700`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

function TerritoryCoverageReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const defaultStartDate = now().minus({ months: 1 }).startOf("month").toISODate() ?? "";
  const defaultEndDate = now().minus({ months: 1 }).endOf("month").toISODate() ?? "";

  const [startDate, setStartDate] = useState(startDateParam ?? defaultStartDate);
  const [endDate, setEndDate] = useState(endDateParam ?? defaultEndDate);

  const { data: report, isLoading, error } = useTerritoryCoverageReport(startDate, endDate);
  const exportPdf = useExportReportPdf();

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    router.push(`/annix-rep/reports/territory?startDate=${newStartDate}&endDate=${newEndDate}`);
  };

  const handleExportPdf = async () => {
    try {
      const blob = await exportPdf.mutateAsync({
        reportType: "territory-coverage",
        startDate,
        endDate,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `territory-coverage-report-${startDate}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/annix-rep/reports"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Territory Coverage Report
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {formatDateZA(startDate)} - {formatDateZA(endDate)}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={exportPdf.isPending || !report}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exportPdf.isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          )}
          Export PDF
        </button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleDateChange(e.target.value, endDate)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <span className="text-gray-500">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleDateChange(startDate, e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load report</p>
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Prospects with Location"
              value={report.coverage.totalProspectsWithLocation}
              color="blue"
            />
            <StatCard
              label="Visited Prospects"
              value={report.coverage.visitedProspects}
              color="green"
            />
            <StatCard
              label="Coverage Rate"
              value={`${report.coverage.coveragePercentage}%`}
              color={report.coverage.coveragePercentage >= 50 ? "green" : "yellow"}
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Territory Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {report.prospects.length} prospects and {report.visits.length} visits
              </p>
            </div>
            <TerritoryMap report={report} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Prospect Locations
            </h3>
            {report.prospects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No prospects with location data
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Company
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Visits
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Last Visit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.prospects
                      .sort((a, b) => b.visitCount - a.visitCount)
                      .slice(0, 20)
                      .map((prospect) => (
                        <tr
                          key={prospect.id}
                          className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          <td className="py-3 px-4">
                            <Link
                              href={`/annix-rep/prospects/${prospect.id}`}
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {prospect.companyName}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                prospect.status === "won"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                  : prospect.status === "lost"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {statusLabels[prospect.status] ?? prospect.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {prospect.visitCount}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {prospect.lastVisitDate
                                ? formatDateZA(prospect.lastVisitDate)
                                : "Never"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {report.prospects.length > 20 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Showing top 20 of {report.prospects.length} prospects
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function TerritoryCoverageReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <TerritoryCoverageReportContent />
    </Suspense>
  );
}
