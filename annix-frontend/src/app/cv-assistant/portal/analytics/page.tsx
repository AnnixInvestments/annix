"use client";

import { useState } from "react";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { fromISO, now } from "@/app/lib/datetime";
import {
  useCvConversionFunnel,
  useCvMarketTrends,
  useCvMatchAccuracy,
  useCvTimeToFill,
} from "@/app/lib/query/hooks";

type DatePreset = "this_month" | "last_30" | "last_90" | "all_time";

function presetDates(preset: DatePreset): { from: string | null; to: string | null } {
  const today = now();
  if (preset === "this_month") {
    return {
      from: today.startOf("month").toISODate(),
      to: today.toISODate(),
    };
  } else if (preset === "last_30") {
    return {
      from: today.minus({ days: 30 }).toISODate(),
      to: today.toISODate(),
    };
  } else if (preset === "last_90") {
    return {
      from: today.minus({ days: 90 }).toISODate(),
      to: today.toISODate(),
    };
  } else {
    return { from: null, to: null };
  }
}

function downloadCsv(csvText: string, filename: string) {
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function accuracyBarColor(accuracy: number): string {
  if (accuracy >= 75) return "bg-green-500";
  if (accuracy >= 50) return "bg-yellow-500";
  if (accuracy >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function funnelStageColor(index: number): string {
  const colors = ["bg-violet-600", "bg-violet-500", "bg-teal-500", "bg-teal-400", "bg-emerald-500"];
  return colors[index] || "bg-gray-400";
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function SkeletonSection() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-1/4 mb-6" />
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded w-4/5" />
        <div className="h-10 bg-gray-200 rounded w-3/5" />
        <div className="h-10 bg-gray-200 rounded w-2/5" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activePreset, setActivePreset] = useState<DatePreset>("all_time");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportingFunnel, setExportingFunnel] = useState(false);
  const [exportingTimeToFill, setExportingTimeToFill] = useState(false);

  const { data: funnel, isLoading: isFunnelLoading } = useCvConversionFunnel(
    dateFrom || null,
    dateTo || null,
  );
  const { data: matchAccuracy, isLoading: isMatchAccuracyLoading } = useCvMatchAccuracy();
  const { data: timeToFill, isLoading: isTimeToFillLoading } = useCvTimeToFill();
  const { data: marketTrends, isLoading: isMarketTrendsLoading } = useCvMarketTrends();

  const isLoading = isMatchAccuracyLoading && isTimeToFillLoading && isMarketTrendsLoading;

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const dates = presetDates(preset);
    setDateFrom(dates.from || "");
    setDateTo(dates.to || "");
  };

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setActivePreset("all_time");
  };

  const handleExportFunnel = async () => {
    setExportingFunnel(true);
    try {
      const csv = await cvAssistantApiClient.analyticsExportFunnelCsv(
        dateFrom || null,
        dateTo || null,
      );
      const filename = `conversion-funnel-${now().toISODate()}.csv`;
      downloadCsv(csv, filename);
    } catch (error) {
      console.error("Failed to export funnel CSV:", error);
    } finally {
      setExportingFunnel(false);
    }
  };

  const handleExportTimeToFill = async () => {
    setExportingTimeToFill(true);
    try {
      const csv = await cvAssistantApiClient.analyticsExportTimeToFillCsv();
      const filename = `time-to-fill-${now().toISODate()}.csv`;
      downloadCsv(csv, filename);
    } catch (error) {
      console.error("Failed to export time-to-fill CSV:", error);
    } finally {
      setExportingTimeToFill(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-72 mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonSection />
        <SkeletonSection />
      </div>
    );
  }

  const maxFunnelCount =
    funnel && funnel.stages.length > 0 ? Math.max(...funnel.stages.map((s) => s.count), 1) : 1;

  const maxCategoryCount =
    marketTrends && marketTrends.byCategory.length > 0
      ? Math.max(...marketTrends.byCategory.map((c) => c.count), 1)
      : 1;

  const maxLocationCount =
    marketTrends && marketTrends.byLocation.length > 0
      ? Math.max(...marketTrends.byLocation.map((l) => l.count), 1)
      : 1;

  const maxMonthlyCount =
    marketTrends && marketTrends.monthlyTrend.length > 0
      ? Math.max(...marketTrends.monthlyTrend.map((m) => m.count), 1)
      : 1;

  const maxSkillCount =
    marketTrends && marketTrends.topSkills.length > 0
      ? Math.max(...marketTrends.topSkills.map((s) => s.count), 1)
      : 1;

  const sortedTimeToFillJobs = timeToFill
    ? [...timeToFill.byJob].sort((a, b) => a.averageDays - b.averageDays)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">
            Insights into your recruitment pipeline and market trends
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportFunnel}
            disabled={exportingFunnel}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {exportingFunnel ? "Exporting..." : "Export Funnel CSV"}
          </button>
          <button
            onClick={handleExportTimeToFill}
            disabled={exportingTimeToFill}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {exportingTimeToFill ? "Exporting..." : "Export Time-to-Fill CSV"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Date Range:</span>
          <div className="flex gap-1">
            {(
              [
                { key: "this_month", label: "This Month" },
                { key: "last_30", label: "Last 30 Days" },
                { key: "last_90", label: "Last 90 Days" },
                { key: "all_time", label: "All Time" },
              ] as Array<{ key: DatePreset; label: string }>
            ).map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activePreset === preset.key
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Conversion Funnel</h2>
          {funnel?.dateFrom && funnel?.dateTo && (
            <p className="text-sm text-gray-500 mt-1">
              {fromISO(funnel.dateFrom).toFormat("dd MMM yyyy")} -{" "}
              {fromISO(funnel.dateTo).toFormat("dd MMM yyyy")}
            </p>
          )}
        </div>
        <div className="p-6">
          {isFunnelLoading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`funnel-skeleton-${i}`} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          ) : funnel && funnel.stages.length > 0 ? (
            <div className="space-y-3">
              {funnel.stages.map((stage, index) => {
                const widthPercent = Math.max((stage.count / maxFunnelCount) * 100, 8);
                return (
                  <div key={stage.label} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 text-right shrink-0">
                      {stage.label}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className={`${funnelStageColor(index)} rounded-lg h-10 flex items-center justify-end pr-3 transition-all duration-500`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        <span className="text-sm font-bold text-white">{stage.count}</span>
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-500 shrink-0">
                      {stage.rate !== null ? `${stage.rate.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No funnel data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Match Accuracy</h2>
        </div>
        <div className="p-6">
          {matchAccuracy ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0 w-32 h-32 rounded-full border-8 border-violet-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {matchAccuracy.overall.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Overall</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Total Evaluated</div>
                    <div className="text-xl font-bold text-gray-900">
                      {matchAccuracy.overall.total}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-500">Accepted</div>
                    <div className="text-xl font-bold text-emerald-600">
                      {matchAccuracy.overall.accepted}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Accuracy by Match Score Band
                </div>
                {matchAccuracy.bands.map((band) => (
                  <div key={band.range} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600 shrink-0">{band.range}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${accuracyBarColor(band.accuracy)} h-full rounded-full flex items-center pl-2 transition-all duration-500`}
                        style={{ width: `${Math.max(band.accuracy, 3)}%` }}
                      >
                        {band.accuracy >= 15 && (
                          <span className="text-xs font-medium text-white">
                            {band.accuracy.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-32 text-xs text-gray-500 shrink-0 text-right">
                      {band.accepted}/{band.total} accepted
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No match accuracy data available
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Time-to-Fill Metrics</h2>
        </div>
        <div className="p-6">
          {timeToFill ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-violet-50 rounded-lg p-4">
                  <div className="text-sm text-violet-600 font-medium">Average Days to Fill</div>
                  <div className="text-3xl font-bold text-violet-900 mt-1">
                    {timeToFill.overall.averageDays.toFixed(1)}
                  </div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4">
                  <div className="text-sm text-teal-600 font-medium">Median Days to Fill</div>
                  <div className="text-3xl font-bold text-teal-900 mt-1">
                    {timeToFill.overall.medianDays.toFixed(1)}
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="text-sm text-emerald-600 font-medium">Total Jobs Filled</div>
                  <div className="text-3xl font-bold text-emerald-900 mt-1">
                    {timeToFill.overall.count}
                  </div>
                </div>
              </div>

              {sortedTimeToFillJobs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg. Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Candidates
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedTimeToFillJobs.map((job) => (
                        <tr key={job.title} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {job.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span>{job.averageDays.toFixed(1)}</span>
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-violet-500 h-full rounded-full"
                                  style={{
                                    width: `${Math.min((job.averageDays / (timeToFill.overall.averageDays * 2)) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {job.candidateCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No time-to-fill data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">SA Labour Market Trends</h2>
          {marketTrends && (
            <p className="text-sm text-gray-500 mt-1">
              Based on {marketTrends.totalJobs.toLocaleString()} total job listings
            </p>
          )}
        </div>
        {marketTrends ? (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Top Categories
                </h3>
                {marketTrends.byCategory.length > 0 ? (
                  <div className="space-y-2">
                    {marketTrends.byCategory.slice(0, 10).map((cat) => (
                      <div key={cat.category} className="flex items-center gap-3">
                        <div className="w-36 text-sm text-gray-700 truncate shrink-0">
                          {cat.category.replace(/-jobs$/, "").replace(/-/g, " ")}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-violet-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-gray-500 text-right shrink-0">
                          {cat.count}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No category data</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Top Locations
                </h3>
                {marketTrends.byLocation.length > 0 ? (
                  <div className="space-y-2">
                    {marketTrends.byLocation.slice(0, 10).map((loc) => (
                      <div key={loc.location} className="flex items-center gap-3">
                        <div className="w-36 text-sm text-gray-700 truncate shrink-0">
                          {loc.location}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-teal-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(loc.count / maxLocationCount) * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-gray-500 text-right shrink-0">
                          {loc.count}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No location data</p>
                )}
              </div>
            </div>

            {marketTrends.salaryByCategory.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Salary by Category
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sample Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {marketTrends.salaryByCategory.slice(0, 10).map((sal) => (
                        <tr key={sal.category} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sal.category.replace(/-jobs$/, "").replace(/-/g, " ")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {sal.currency === "ZAR" ? "R " : ""}
                            {sal.averageSalary.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sal.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sal.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {marketTrends.monthlyTrend.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Monthly Job Posting Trend
                </h3>
                <div className="flex items-end gap-1 h-40">
                  {marketTrends.monthlyTrend.map((month) => {
                    const heightPercent = Math.max((month.count / maxMonthlyCount) * 100, 4);
                    return (
                      <div
                        key={month.month}
                        className="flex-1 flex flex-col items-center justify-end"
                      >
                        <div className="text-xs text-gray-500 mb-1">{month.count}</div>
                        <div
                          className="w-full bg-violet-400 rounded-t transition-all duration-500 min-w-[12px]"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                          {month.month.length > 7
                            ? fromISO(`${month.month}-01`).toFormat("MMM")
                            : month.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {marketTrends.topSkills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Top Skills in Demand
                </h3>
                <div className="space-y-2">
                  {marketTrends.topSkills.slice(0, 15).map((skill) => (
                    <div key={skill.skill} className="flex items-center gap-3">
                      <div className="w-36 text-sm text-gray-700 truncate shrink-0">
                        {skill.skill}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(skill.count / maxSkillCount) * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-sm text-gray-500 text-right shrink-0">
                        {skill.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-400 text-center py-8">
              No market trends data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
