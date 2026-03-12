"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { advisorCalendar, advisorClients } from "@/app/comply-sa/lib/api";

type CalendarEntry = Awaited<ReturnType<typeof advisorCalendar>>[number];
type ViewMode = "calendar" | "list";

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

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function urgencyColor(daysRemaining: number): string {
  if (daysRemaining < 0) return "bg-red-500/20 border-red-500/40 text-red-400";
  if (daysRemaining <= 7) return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
  return "bg-green-500/20 border-green-500/40 text-green-400";
}

function urgencyDot(daysRemaining: number): string {
  if (daysRemaining < 0) return "bg-red-500";
  if (daysRemaining <= 7) return "bg-yellow-500";
  return "bg-green-500";
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(month: number, year: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 7 : day;
}

function CalendarGrid({
  entries,
  month,
  year,
}: {
  entries: CalendarEntry[];
  month: number;
  year: number;
}) {
  const totalDays = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);
  const emptyCells = startDay - 1;
  const allCells = Array.from({ length: emptyCells + totalDays }, (_, i) =>
    i < emptyCells ? null : i - emptyCells + 1,
  );

  const entriesByDay = entries.reduce(
    (acc, entry) => {
      const day = new Date(entry.date).getDate();
      return {
        ...acc,
        [day]: [...(acc[day] ?? []), entry],
      };
    },
    {} as Record<number, CalendarEntry[]>,
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-700">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="px-2 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {allCells.map((day, idx) => (
          <div
            key={idx}
            className={`min-h-[100px] border-b border-r border-slate-700/50 p-1.5 ${
              day === null ? "bg-slate-800/50" : "bg-slate-800"
            }`}
          >
            {day !== null && (
              <>
                <span className="text-xs font-medium text-slate-400">{day}</span>
                <div className="mt-1 space-y-1">
                  {(entriesByDay[day] ?? []).map((entry, entryIdx) => (
                    <div
                      key={entryIdx}
                      className={`rounded px-1.5 py-1 border text-[10px] leading-tight ${urgencyColor(entry.daysRemaining)}`}
                    >
                      <p className="font-medium truncate">{entry.requirementName}</p>
                      <p className="truncate opacity-75">{entry.companyName}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({ entries }: { entries: CalendarEntry[] }) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <CalendarDays className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No deadlines this month</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
      {sortedEntries.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-4 p-4">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgencyDot(entry.daysRemaining)}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{entry.requirementName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{entry.companyName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-white">{new Date(entry.date).toLocaleDateString("en-ZA")}</p>
            <p
              className={`text-xs mt-0.5 ${
                entry.daysRemaining < 0
                  ? "text-red-400"
                  : entry.daysRemaining <= 7
                    ? "text-yellow-400"
                    : "text-slate-400"
              }`}
            >
              {entry.daysRemaining < 0
                ? `${Math.abs(entry.daysRemaining)} days overdue`
                : entry.daysRemaining === 0
                  ? "Due today"
                  : `${entry.daysRemaining} days remaining`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdvisorCalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [clients, setClients] = useState<Array<{ companyId: number; companyName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [filterClient, setFilterClient] = useState<number | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await advisorCalendar(month, year);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    advisorClients()
      .then((data) =>
        setClients(
          data.map((c) => ({
            companyId: c.companyId,
            companyName: c.companyName,
          })),
        ),
      )
      .catch(() => null);
  }, []);

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  const filteredEntries =
    filterClient === null ? entries : entries.filter((e) => e.companyId === filterClient);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-teal-400" />
          Deadline Calendar
        </h1>
        <p className="text-slate-400 mt-1">Cross-client compliance deadlines</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-white min-w-[180px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterClient ?? ""}
              onChange={(e) => setFilterClient(e.target.value ? Number(e.target.value) : null)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.companyId} value={c.companyId}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`p-2 transition-colors ${
                viewMode === "calendar"
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors ${
                viewMode === "list"
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
        </div>
      ) : viewMode === "calendar" ? (
        <CalendarGrid entries={filteredEntries} month={month} year={year} />
      ) : (
        <ListView entries={filteredEntries} />
      )}

      <div className="flex items-center gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Overdue
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          {"< 7 days"}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          {"> 7 days"}
        </div>
      </div>
    </div>
  );
}
