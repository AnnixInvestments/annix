"use client";

import { CalendarDays, Grid3X3, List, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import { useCompanyProfile, useTaxCalendar } from "@/app/lib/query/hooks";

type Deadline = {
  name: string;
  date: string;
  type: string;
  description: string;
};

const TYPE_COLORS: Record<string, string> = {
  "income tax": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  vat: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  paye: "bg-green-500/20 text-green-400 border-green-500/30",
  emp501: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  provisional: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  coida: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  "income tax": "bg-blue-400",
  vat: "bg-purple-400",
  paye: "bg-green-400",
  emp501: "bg-orange-400",
  provisional: "bg-cyan-400",
  coida: "bg-rose-400",
};

const MONTHS = [
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

function TypeBadge({ type }: { type: string }) {
  const typeLower = type.toLowerCase();
  const colorLookup = TYPE_COLORS[typeLower];
  const colorClass = colorLookup || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
    >
      {type}
    </span>
  );
}

function isUpcoming(dateStr: string): boolean {
  const today = now();
  const deadline = fromISO(dateStr);
  const diffDays = deadline.diff(today, "days").days;
  return diffDays >= 0 && diffDays <= 30;
}

function isPast(dateStr: string): boolean {
  return fromISO(dateStr) < now();
}

function MonthCard({ month, deadlines }: { month: string; deadlines: Deadline[] }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-800/80">
        <h3 className="text-sm font-semibold text-white">{month}</h3>
      </div>
      <div className="p-3 min-h-[80px]">
        {deadlines.length > 0 ? (
          <div className="space-y-2">
            {deadlines.map((d, i) => {
              const deadlineTypeLower = d.type.toLowerCase();
              const dotLookup = TYPE_DOT_COLORS[deadlineTypeLower];
              const dotColor = dotLookup || "bg-slate-400";
              const upcoming = isUpcoming(d.date);
              return (
                <div
                  key={`${d.name}-${i}`}
                  className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                    upcoming
                      ? "bg-teal-500/10 border border-teal-500/30"
                      : isPast(d.date)
                        ? "opacity-50"
                        : ""
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotColor}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{d.name}</p>
                    <p className="text-slate-400">
                      {fromISO(d.date).toLocaleString({
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">No deadlines</p>
        )}
      </div>
    </div>
  );
}

function ListView({ deadlines }: { deadlines: Deadline[] }) {
  const sorted = [...deadlines].sort(
    (a, b) => fromISO(a.date).toMillis() - fromISO(b.date).toMillis(),
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
      {sorted.map((d, i) => {
        const upcoming = isUpcoming(d.date);
        return (
          <div
            key={`${d.name}-${i}`}
            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 ${
              upcoming ? "bg-teal-500/5" : isPast(d.date) ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {upcoming && (
                <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 animate-pulse" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{d.name}</p>
                <p className="text-xs text-slate-400">{d.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 sm:ml-4">
              <TypeBadge type={d.type} />
              <span className="text-sm text-slate-300">{formatDateZA(d.date)}</span>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <div className="p-8 text-center text-slate-500 text-sm">No deadlines found</div>
      )}
    </div>
  );
}

export default function TaxCalendarPage() {
  const [yearEndMonth, setYearEndMonth] = useState(2);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: profile } = useCompanyProfile();
  const profileYearEnd = profile?.financialYearEndMonth;
  const resolvedYearEndMonth = profileYearEnd || yearEndMonth;
  const { data: deadlines = [], isLoading: loading } = useTaxCalendar(resolvedYearEndMonth);

  const deadlinesByMonth = MONTHS.reduce(
    (acc, month, index) => ({
      ...acc,
      [month]: deadlines.filter((d) => fromISO(d.date).month - 1 === index),
    }),
    {} as Record<string, Deadline[]>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-teal-400" />
          Tax Calendar
        </h1>
        <p className="text-slate-400 mt-1">Key tax deadlines for your financial year</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-300">Financial Year End:</label>
          <select
            value={resolvedYearEndMonth}
            onChange={(e) => setYearEndMonth(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {MONTHS.map((month, i) => (
              <option key={month} value={i + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-teal-500/20 text-teal-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-teal-500/20 text-teal-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, colorClass]) => (
          <span
            key={type}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${colorClass}`}
          >
            <div className={`w-2 h-2 rounded-full ${TYPE_DOT_COLORS[type]}`} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((month) => (
            <MonthCard key={month} month={month} deadlines={deadlinesByMonth[month]} />
          ))}
        </div>
      ) : (
        <ListView deadlines={deadlines} />
      )}
    </div>
  );
}
