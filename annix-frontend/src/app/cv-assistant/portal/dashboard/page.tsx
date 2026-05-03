"use client";

import Link from "next/link";
import type { Candidate } from "@/app/lib/api/cvAssistantApi";
import {
  useCvDashboardStats,
  useCvMarketInsights,
  useCvTopCandidates,
} from "@/app/lib/query/hooks";

const POST_JOB_HREF = "/cv-assistant/portal/jobs/new";

function PostJobButton({
  size = "md",
  variant = "orange",
}: {
  size?: "md" | "lg";
  variant?: "orange" | "navy";
}) {
  const sizing = size === "lg" ? "px-6 py-3 text-base" : "px-5 py-2.5 text-sm";
  const iconSize = size === "lg" ? "w-6 h-6 mr-2" : "w-5 h-5 mr-2";
  const palette =
    variant === "navy"
      ? "bg-[#252560] text-white hover:bg-[#1a1a40]"
      : "bg-[#FFA500] text-[#1a1a40] hover:bg-[#FFB733]";
  return (
    <Link
      href={POST_JOB_HREF}
      className={`inline-flex items-center ${sizing} ${palette} font-semibold rounded-lg shadow-md hover:shadow-lg transition-all`}
    >
      <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
      Post a New Job
    </Link>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useCvDashboardStats();
  const { data: topCandidates = [], isLoading: candidatesLoading } = useCvTopCandidates();
  const { data: marketInsights } = useCvMarketInsights();

  const isLoading = statsLoading || candidatesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288]"></div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      screening: "bg-yellow-100 text-yellow-800",
      shortlisted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      reference_check: "bg-[#e0e0f5] text-[#1a1a40]",
      accepted: "bg-emerald-100 text-emerald-800",
    };
    const color = colors[status];
    return color || "bg-gray-100 text-gray-800";
  };

  const totalCandidates = stats?.totalCandidates;
  const activeJobPostings = stats?.activeJobPostings;
  const averageScore = stats?.averageScore;
  const pendingReferences = stats?.pendingReferences;

  const hasActiveJobs = (activeJobPostings ?? 0) > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/70 mt-1">Overview of your candidate screening</p>
      </div>

      {!hasActiveJobs && (
        <div className="rounded-xl bg-gradient-to-br from-[#FFA500] to-[#FFB733] shadow-lg p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a1a40]">
              Ready to find your next hire?
            </h2>
            <p className="text-[#1a1a40]/80">
              Post your first job vacancy and let CV Assistant screen candidates for you.
            </p>
          </div>
          <PostJobButton size="lg" variant="navy" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-[#e0e0f5] rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[#323288]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Candidates</p>
              <p className="text-2xl font-bold text-[#252560]">{totalCandidates || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Jobs</p>
              <p className="text-2xl font-bold text-[#252560]">{activeJobPostings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Match Score</p>
              <p className="text-2xl font-bold text-[#252560]">{averageScore || "-"}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5] p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending References</p>
              <p className="text-2xl font-bold text-[#252560]">{pendingReferences || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5]">
        <div className="px-6 py-4 border-b border-[#e0e0f5] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Top Candidates</h2>
          <Link
            href="/cv-assistant/portal/candidates"
            className="text-sm text-[#323288] hover:text-[#252560] font-medium"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topCandidates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No candidates yet. Upload CVs to get started.
                  </td>
                </tr>
              ) : (
                topCandidates.map((candidate) => (
                  <CandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    statusColor={statusColor}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {marketInsights && marketInsights.totalActiveJobs > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e0e0f5]">
          <div className="px-6 py-4 border-b border-[#e0e0f5]">
            <h2 className="text-lg font-semibold text-gray-900">SA Market Insights</h2>
            <p className="text-sm text-gray-500 mt-1">
              Based on {marketInsights.totalActiveJobs.toLocaleString()} active job listings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Salary Benchmarks (ZAR/year)
              </h3>
              {marketInsights.salaryBenchmarks.length === 0 ? (
                <p className="text-sm text-gray-400">No salary data available</p>
              ) : (
                <div className="space-y-3">
                  {marketInsights.salaryBenchmarks.slice(0, 5).map((bench) => (
                    <div key={bench.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate mr-2">
                        {bench.category.replace(/-jobs$/, "").replace(/-/g, " ")}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-medium text-gray-900">
                          {bench.averageSalary
                            ? `R ${(bench.averageSalary / 1000).toFixed(0)}k`
                            : "-"}
                        </span>
                        {bench.salaryBand && (
                          <span className="text-xs text-gray-500 ml-1">({bench.salaryBand})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Demand Trends (7-day)
              </h3>
              {marketInsights.demandTrends.length === 0 ? (
                <p className="text-sm text-gray-400">No trend data yet</p>
              ) : (
                <div className="space-y-3">
                  {marketInsights.demandTrends.slice(0, 5).map((trend) => (
                    <div key={trend.category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate mr-2">
                        {trend.category.replace(/-jobs$/, "").replace(/-/g, " ")}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-gray-900">{trend.currentCount}</span>
                        <span
                          className={`text-xs font-medium ${
                            trend.trend === "rising"
                              ? "text-green-600"
                              : trend.trend === "falling"
                                ? "text-red-600"
                                : "text-gray-500"
                          }`}
                        >
                          {trend.trend === "rising"
                            ? `+${trend.changePercent}%`
                            : trend.trend === "falling"
                              ? `${trend.changePercent}%`
                              : "stable"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Top Locations
              </h3>
              {marketInsights.topLocations.length === 0 ? (
                <p className="text-sm text-gray-400">No location data yet</p>
              ) : (
                <div className="space-y-3">
                  {marketInsights.topLocations.slice(0, 5).map((loc) => (
                    <div key={loc.location} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate mr-2">{loc.location}</span>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-medium text-gray-900">
                          {loc.jobCount} jobs
                        </span>
                        {loc.costOfLivingIndex !== 1.0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            CoL: {loc.costOfLivingIndex.toFixed(2)}x
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {marketInsights.topSkills.length > 0 && (
            <div className="px-6 py-4 border-t border-[#e0e0f5]">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                In-Demand Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {marketInsights.topSkills.slice(0, 15).map((skill) => (
                  <span
                    key={skill.skill}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#f0f0fc] text-[#252560]"
                  >
                    {skill.skill}
                    <span className="ml-1 text-[#7373c2]">({skill.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  statusColor,
}: {
  candidate: Candidate;
  statusColor: (status: string) => string;
}) {
  const candidateName = candidate.name;
  const candidateEmail = candidate.email;
  const candidateJobTitle = candidate.jobPosting?.title;
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{candidateName || "Unknown"}</div>
        <div className="text-sm text-gray-500">{candidateEmail || "-"}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{candidateJobTitle || "-"}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {candidate.matchScore !== null ? (
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-900">{candidate.matchScore}%</span>
            <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  candidate.matchScore >= 80
                    ? "bg-green-500"
                    : candidate.matchScore >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${candidate.matchScore}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(candidate.status)}`}
        >
          {candidate.status.replace(/_/g, " ")}
        </span>
      </td>
    </tr>
  );
}
