"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import { useExportReportPdf, useWeeklyActivityReport } from "@/app/lib/query/hooks";

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

interface BarChartProps {
  data: Array<{ date: string; count: number; secondary: number }>;
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryColor: string;
  secondaryColor: string;
}

function BarChart({
  data,
  title,
  primaryLabel,
  secondaryLabel,
  primaryColor,
  secondaryColor,
}: BarChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((item) => (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center">
              <div
                className={`w-full ${primaryColor} rounded-t`}
                style={{
                  height: `${(item.count / maxCount) * 100}%`,
                  minHeight: item.count > 0 ? "4px" : "0",
                }}
              />
              {item.secondary > 0 && (
                <div
                  className={`w-full ${secondaryColor} rounded-t absolute bottom-0`}
                  style={{
                    height: `${(item.secondary / maxCount) * 100}%`,
                    minHeight: "2px",
                  }}
                />
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {fromISO(item.date).toFormat("EEE")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 ${primaryColor} rounded`} />
          <span>{primaryLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 ${secondaryColor} rounded`} />
          <span>{secondaryLabel}</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyActivityReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const defaultStartDate = now().minus({ weeks: 1 }).startOf("week").toISODate() ?? "";
  const defaultEndDate = now().minus({ weeks: 1 }).endOf("week").toISODate() ?? "";

  const [startDate, setStartDate] = useState(startDateParam ?? defaultStartDate);
  const [endDate, setEndDate] = useState(endDateParam ?? defaultEndDate);

  const { data: report, isLoading, error } = useWeeklyActivityReport(startDate, endDate);
  const exportPdf = useExportReportPdf();

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    router.push(`/annix-rep/reports/weekly?startDate=${newStartDate}&endDate=${newEndDate}`);
  };

  const handlePreviousWeek = () => {
    const newStart = fromISO(startDate).minus({ weeks: 1 });
    const newEnd = fromISO(endDate).minus({ weeks: 1 });
    handleDateChange(newStart.toISODate() ?? "", newEnd.toISODate() ?? "");
  };

  const handleNextWeek = () => {
    const newStart = fromISO(startDate).plus({ weeks: 1 });
    const newEnd = fromISO(endDate).plus({ weeks: 1 });
    handleDateChange(newStart.toISODate() ?? "", newEnd.toISODate() ?? "");
  };

  const handleExportPdf = async () => {
    try {
      const blob = await exportPdf.mutateAsync({
        reportType: "weekly-activity",
        startDate,
        endDate,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `weekly-activity-report-${startDate}-${endDate}.pdf`;
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
              Weekly Activity Report
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
        <button
          onClick={handlePreviousWeek}
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
        <div className="flex items-center gap-2">
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
        <button
          onClick={handleNextWeek}
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load report</p>
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Total Meetings"
              value={report.summary.totalMeetings}
              subValue={`${report.summary.completedMeetings} completed`}
              color="blue"
            />
            <StatCard
              label="Total Visits"
              value={report.summary.totalVisits}
              subValue={`${report.summary.successfulVisits} successful`}
              color="green"
            />
            <StatCard label="New Prospects" value={report.summary.newProspects} color="blue" />
            <StatCard
              label="Deals Won"
              value={report.summary.dealsWon}
              subValue={`R${formatCurrency(report.summary.revenueWon)}`}
              color="green"
            />
            <StatCard label="Deals Lost" value={report.summary.dealsLost} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChart
              data={report.meetingsByDay.map((d) => ({
                date: d.date,
                count: d.count,
                secondary: d.completed,
              }))}
              title="Meetings by Day"
              primaryLabel="Total"
              secondaryLabel="Completed"
              primaryColor="bg-blue-500"
              secondaryColor="bg-green-500"
            />
            <BarChart
              data={report.visitsByDay.map((d) => ({
                date: d.date,
                count: d.count,
                secondary: d.successful,
              }))}
              title="Visits by Day"
              primaryLabel="Total"
              secondaryLabel="Successful"
              primaryColor="bg-purple-500"
              secondaryColor="bg-green-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Prospect Status Changes
            </h3>
            {report.prospectStatusChanges.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No status changes this week
              </p>
            ) : (
              <div className="space-y-3">
                {report.prospectStatusChanges.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {change.companyName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateZA(change.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300">
                        {change.fromStatus}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          change.toStatus === "won"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : change.toStatus === "lost"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {change.toStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function WeeklyActivityReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <WeeklyActivityReportContent />
    </Suspense>
  );
}
