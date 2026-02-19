"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateZA, now } from "@/app/lib/datetime";
import { useExportReportPdf, useMeetingOutcomesReport } from "@/app/lib/query/hooks";

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

const meetingTypeLabels: Record<string, string> = {
  in_person: "In Person",
  phone: "Phone",
  video: "Video",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  no_show: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function MeetingOutcomesReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const defaultStartDate = now().minus({ weeks: 1 }).startOf("week").toISODate() ?? "";
  const defaultEndDate = now().minus({ weeks: 1 }).endOf("week").toISODate() ?? "";

  const [startDate, setStartDate] = useState(startDateParam ?? defaultStartDate);
  const [endDate, setEndDate] = useState(endDateParam ?? defaultEndDate);

  const { data: report, isLoading, error } = useMeetingOutcomesReport(startDate, endDate);
  const exportPdf = useExportReportPdf();

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    router.push(`/annix-rep/reports/meetings?startDate=${newStartDate}&endDate=${newEndDate}`);
  };

  const handleExportPdf = async () => {
    try {
      const blob = await exportPdf.mutateAsync({
        reportType: "meeting-outcomes",
        startDate,
        endDate,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meeting-outcomes-report-${startDate}-${endDate}.pdf`;
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
              Meeting Outcomes Report
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Meetings" value={report.summary.totalMeetings} color="blue" />
            <StatCard
              label="Completed"
              value={report.summary.completed}
              subValue={`${report.summary.completionRate}% completion rate`}
              color="green"
            />
            <StatCard label="Cancelled" value={report.summary.cancelled} color="yellow" />
            <StatCard label="No Show" value={report.summary.noShow} color="red" />
          </div>

          {report.summary.averageDurationMinutes !== null && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Average Meeting Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {report.summary.averageDurationMinutes} minutes
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Outcomes by Meeting Type
            </h3>
            <div className="space-y-4">
              {report.outcomesByType.map((item) => {
                const totalForType = Math.max(item.total, 1);
                return (
                  <div key={item.meetingType}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {meetingTypeLabels[item.meetingType] ?? item.meetingType}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.total} meetings
                      </span>
                    </div>
                    <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      {item.completed > 0 && (
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(item.completed / totalForType) * 100}%` }}
                          title={`Completed: ${item.completed}`}
                        />
                      )}
                      {item.cancelled > 0 && (
                        <div
                          className="h-full bg-gray-400"
                          style={{ width: `${(item.cancelled / totalForType) * 100}%` }}
                          title={`Cancelled: ${item.cancelled}`}
                        />
                      )}
                      {item.total - item.completed - item.cancelled > 0 && (
                        <div
                          className="h-full bg-blue-400"
                          style={{
                            width: `${((item.total - item.completed - item.cancelled) / totalForType) * 100}%`,
                          }}
                          title={`Other: ${item.total - item.completed - item.cancelled}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded" />
                        Completed: {item.completed}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded" />
                        Cancelled: {item.cancelled}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Meeting Details
            </h3>
            {report.detailedMeetings.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No meetings in this period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Meeting
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Prospect
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.detailedMeetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/annix-rep/meetings/${meeting.id}`}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {meeting.title}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {meeting.prospectName ?? "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateZA(meeting.scheduledDate)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${statusColors[meeting.status] ?? "bg-gray-100 text-gray-700"}`}
                          >
                            {statusLabels[meeting.status] ?? meeting.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {meeting.duration !== null ? `${meeting.duration} min` : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function MeetingOutcomesReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <MeetingOutcomesReportContent />
    </Suspense>
  );
}
