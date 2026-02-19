"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import { useExportReportPdf, useMonthlySalesReport } from "@/app/lib/query/hooks";
import { ReportSkeleton } from "../../components/Skeleton";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-ZA");
}

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

const statusColors: Record<string, string> = {
  new: "bg-gray-400",
  contacted: "bg-blue-400",
  qualified: "bg-yellow-400",
  proposal: "bg-purple-400",
  won: "bg-green-500",
  lost: "bg-red-400",
};

function MonthlySalesReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const monthParam = searchParams.get("month");
  const defaultMonth = now().toFormat("yyyy-MM");

  const [month, setMonth] = useState(monthParam ?? defaultMonth);

  const { data: report, isLoading, error } = useMonthlySalesReport(month);
  const exportPdf = useExportReportPdf();

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    router.push(`/annix-rep/reports/monthly?month=${newMonth}`);
  };

  const handlePreviousMonth = () => {
    const newMonth = fromISO(`${month}-01`).minus({ months: 1 }).toFormat("yyyy-MM");
    handleMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = fromISO(`${month}-01`).plus({ months: 1 }).toFormat("yyyy-MM");
    handleMonthChange(newMonth);
  };

  const handleExportPdf = async () => {
    try {
      const blob = await exportPdf.mutateAsync({
        reportType: "monthly-sales",
        month,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `monthly-sales-report-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  };

  const monthDisplay = fromISO(`${month}-01`).toFormat("MMMM yyyy");

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
              Monthly Sales Report
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{monthDisplay}</p>
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
        <button
          onClick={handlePreviousMonth}
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
        </button>
        <input
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load report</p>
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={`R${formatCurrency(report.summary.totalRevenue)}`}
              color="green"
            />
            <StatCard
              label="Deals Closed"
              value={report.summary.dealsClosed}
              subValue={`Avg: R${formatCurrency(report.summary.averageDealSize)}`}
              color="blue"
            />
            <StatCard
              label="Win Rate"
              value={`${report.summary.winRate}%`}
              color={report.summary.winRate >= 50 ? "green" : "yellow"}
            />
            <StatCard
              label="Pipeline Value"
              value={`R${formatCurrency(report.summary.pipelineValue)}`}
              color="blue"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Meetings Held" value={report.summary.meetingsHeld} color="blue" />
            <StatCard
              label="Visits Completed"
              value={report.summary.visitsCompleted}
              color="blue"
            />
            <StatCard
              label="New Prospects"
              value={report.summary.newProspectsAdded}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue by Week
              </h3>
              <div className="space-y-3">
                {report.revenueByWeek.map((week) => {
                  const maxRevenue = Math.max(...report.revenueByWeek.map((w) => w.revenue), 1);
                  return (
                    <div key={week.week}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {week.week}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          R{formatCurrency(week.revenue)} ({week.deals} deals)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${(week.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Prospects by Status
              </h3>
              <div className="space-y-3">
                {report.prospectsByStatus.map((item) => {
                  const maxCount = Math.max(...report.prospectsByStatus.map((p) => p.count), 1);
                  return (
                    <div key={item.status} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {statusLabels[item.status] ?? item.status}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${statusColors[item.status] ?? "bg-gray-400"} flex items-center justify-end px-2`}
                          style={{
                            width: `${(item.count / maxCount) * 100}%`,
                            minWidth: "fit-content",
                          }}
                        >
                          <span className="text-xs font-medium text-white">{item.count}</span>
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">
                        R{formatCurrency(item.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Deals</h3>
            {report.topDeals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No deals closed this month
              </p>
            ) : (
              <div className="space-y-3">
                {report.topDeals.map((deal, index) => (
                  <Link
                    key={deal.prospectId}
                    href={`/annix-rep/prospects/${deal.prospectId}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xs font-medium text-green-600 dark:text-green-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {deal.companyName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Closed: {formatDateZA(deal.closedDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        R{formatCurrency(deal.value)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function MonthlySalesReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <MonthlySalesReportContent />
    </Suspense>
  );
}
