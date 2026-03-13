"use client";

import Link from "next/link";
import { useState } from "react";
import { fromISO, now } from "@/app/lib/datetime";

interface ReportCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function ReportCard({ title, description, href, icon }: ReportCardProps) {
  return (
    <Link
      href={href}
      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}

function QuickDateRangeSelector({
  onSelect,
}: {
  onSelect: (startDate: string, endDate: string) => void;
}) {
  const ranges = [
    {
      label: "This Week",
      dates: () => {
        const start = now().startOf("week");
        const end = now().endOf("week");
        return { start: start.toISODate() ?? "", end: end.toISODate() ?? "" };
      },
    },
    {
      label: "Last Week",
      dates: () => {
        const start = now().minus({ weeks: 1 }).startOf("week");
        const end = now().minus({ weeks: 1 }).endOf("week");
        return { start: start.toISODate() ?? "", end: end.toISODate() ?? "" };
      },
    },
    {
      label: "This Month",
      dates: () => {
        const start = now().startOf("month");
        const end = now().endOf("month");
        return { start: start.toISODate() ?? "", end: end.toISODate() ?? "" };
      },
    },
    {
      label: "Last Month",
      dates: () => {
        const start = now().minus({ months: 1 }).startOf("month");
        const end = now().minus({ months: 1 }).endOf("month");
        return { start: start.toISODate() ?? "", end: end.toISODate() ?? "" };
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Reports</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ranges.map((range) => {
          const { start, end } = range.dates();
          return (
            <button
              key={range.label}
              onClick={() => onSelect(start, end)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              {range.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);

  const handleQuickSelect = (startDate: string, endDate: string) => {
    setSelectedRange({ start: startDate, end: endDate });
  };

  const lastWeekStart = now().minus({ weeks: 1 }).startOf("week").toISODate() ?? "";
  const lastWeekEnd = now().minus({ weeks: 1 }).endOf("week").toISODate() ?? "";
  const currentMonth = now().toFormat("yyyy-MM");

  const getWeeklyUrl = () => {
    if (selectedRange) {
      return `/annix-rep/reports/weekly?startDate=${selectedRange.start}&endDate=${selectedRange.end}`;
    }
    return `/annix-rep/reports/weekly?startDate=${lastWeekStart}&endDate=${lastWeekEnd}`;
  };

  const getTerritoryUrl = () => {
    if (selectedRange) {
      return `/annix-rep/reports/territory?startDate=${selectedRange.start}&endDate=${selectedRange.end}`;
    }
    return `/annix-rep/reports/territory?startDate=${lastWeekStart}&endDate=${lastWeekEnd}`;
  };

  const getMeetingsUrl = () => {
    if (selectedRange) {
      return `/annix-rep/reports/meetings?startDate=${selectedRange.start}&endDate=${selectedRange.end}`;
    }
    return `/annix-rep/reports/meetings?startDate=${lastWeekStart}&endDate=${lastWeekEnd}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/annix-rep"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Generate and export sales activity reports
          </p>
        </div>
      </div>

      <QuickDateRangeSelector onSelect={handleQuickSelect} />

      {selectedRange && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Selected range: {fromISO(selectedRange.start).toFormat("d MMM yyyy")} -{" "}
            {fromISO(selectedRange.end).toFormat("d MMM yyyy")}
          </p>
          <button
            onClick={() => setSelectedRange(null)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard
          title="Weekly Activity Report"
          description="Summary of meetings, visits, and prospect activity for a week"
          href={getWeeklyUrl()}
          icon={
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          }
        />

        <ReportCard
          title="Monthly Sales Report"
          description="Revenue, deals closed, and sales performance for a month"
          href={`/annix-rep/reports/monthly?month=${currentMonth}`}
          icon={
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <ReportCard
          title="Territory Coverage Report"
          description="Map visualization of prospect locations and visit coverage"
          href={getTerritoryUrl()}
          icon={
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
              />
            </svg>
          }
        />

        <ReportCard
          title="Meeting Outcomes Report"
          description="Analysis of meeting completion rates and outcomes"
          href={getMeetingsUrl()}
          icon={
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}
