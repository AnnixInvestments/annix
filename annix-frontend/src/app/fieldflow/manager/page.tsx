"use client";

import Link from "next/link";
import { useState } from "react";
import type { TeamActivityType } from "@/app/lib/api/annixRepApi";
import {
  useLeaderboard,
  useManagerDashboard,
  useMyTeamActivityFeed,
  useOrganization,
  useTeamMembers,
  useTeamPerformance,
  useTerritoryPerformance,
} from "@/app/lib/query/hooks";

const ACTIVITY_ICONS: Record<TeamActivityType, string> = {
  member_joined: "UserPlus",
  member_left: "UserMinus",
  prospect_created: "Plus",
  prospect_status_changed: "ArrowPath",
  prospect_handoff: "ArrowsRightLeft",
  meeting_completed: "CheckCircle",
  deal_won: "Trophy",
  deal_lost: "XCircle",
  territory_assigned: "MapPin",
  note_shared: "DocumentText",
};

const ACTIVITY_COLORS: Record<TeamActivityType, string> = {
  member_joined: "text-green-600 bg-green-100 dark:bg-green-900/30",
  member_left: "text-red-600 bg-red-100 dark:bg-red-900/30",
  prospect_created: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  prospect_status_changed: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  prospect_handoff: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  meeting_completed: "text-green-600 bg-green-100 dark:bg-green-900/30",
  deal_won: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  deal_lost: "text-red-600 bg-red-100 dark:bg-red-900/30",
  territory_assigned: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  note_shared: "text-gray-600 bg-gray-100 dark:bg-gray-900/30",
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TeamPerformanceTable() {
  const { data: performance, isLoading } = useTeamPerformance();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    );
  }

  if (!performance || performance.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        No performance data available
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200 dark:border-slate-700">
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Rep</th>
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">
              Prospects
            </th>
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">
              Pipeline
            </th>
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">
              Won
            </th>
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">
              Lost
            </th>
            <th className="py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-right">
              Win Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {performance.map((perf) => (
            <tr
              key={perf.userId}
              className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                {perf.userName}
              </td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                {perf.prospectCount}
              </td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                R{perf.pipelineValue.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                {perf.dealsWon}
              </td>
              <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">
                {perf.dealsLost}
              </td>
              <td className="py-3 px-4 text-right">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    perf.winRate >= 50
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : perf.winRate >= 25
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {perf.winRate.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TerritoryPerformanceSection() {
  const { data: territories, isLoading } = useTerritoryPerformance();

  if (isLoading) {
    return (
      <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    );
  }

  if (!territories || territories.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        No territory data available
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {territories.map((territory) => (
        <div key={territory.territoryId} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {territory.territoryName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {territory.assignedToName || "Unassigned"}
              </p>
            </div>
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
              {territory.dealsWon} won
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Prospects</span>
              <p className="font-medium text-gray-900 dark:text-white">{territory.prospectCount}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Pipeline</span>
              <p className="font-medium text-gray-900 dark:text-white">
                R{territory.pipelineValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardSection() {
  const [metric, setMetric] = useState<
    "deals_won" | "pipeline_value" | "meetings_completed" | "prospects_created"
  >("deals_won");
  const { data: leaderboard, isLoading } = useLeaderboard(metric);

  const metricLabels = {
    deals_won: "Deals Won",
    pipeline_value: "Pipeline Value",
    meetings_completed: "Meetings",
    prospects_created: "Prospects",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leaderboard</h2>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
        >
          <option value="deals_won">Deals Won</option>
          <option value="pipeline_value">Pipeline Value</option>
          <option value="meetings_completed">Meetings</option>
          <option value="prospects_created">Prospects</option>
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No leaderboard data available
        </p>
      ) : (
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                index === 0
                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                  : "bg-gray-50 dark:bg-slate-700/50"
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0
                    ? "bg-amber-500 text-white"
                    : index === 1
                      ? "bg-gray-400 text-white"
                      : index === 2
                        ? "bg-amber-700 text-white"
                        : "bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {metric === "pipeline_value" ? `R${entry.value.toLocaleString()}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityFeedSection() {
  const { data: activities, isLoading } = useMyTeamActivityFeed(10);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        No recent team activity
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ACTIVITY_COLORS[activity.activityType]}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">{activity.userName || "Someone"}</span>{" "}
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatTime(activity.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ManagerDashboardPage() {
  const { data: organization, isLoading: orgLoading } = useOrganization();
  const { data: dashboard, isLoading: dashLoading } = useManagerDashboard();
  const { data: members } = useTeamMembers();

  const isLoading = orgLoading || dashLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Team performance overview</p>
        </div>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Team performance overview</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200">
            You need to be part of an organization to access the manager dashboard.
          </p>
          <Link
            href="/fieldflow/settings/team"
            className="inline-block mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Set Up Organization
          </Link>
        </div>
      </div>
    );
  }

  const currentMember = members?.find((m) => m.userId === organization.ownerId);
  const canAccessDashboard = currentMember?.role === "admin" || currentMember?.role === "manager";

  if (!canAccessDashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Team performance overview</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">
            You need manager or admin permissions to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Team performance overview for {organization.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Team Size"
          value={dashboard?.teamSize || 0}
          color="bg-indigo-50 dark:bg-indigo-900/20"
          icon={
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Pipeline"
          value={`R${(dashboard?.totalPipelineValue || 0).toLocaleString()}`}
          color="bg-emerald-50 dark:bg-emerald-900/20"
          icon={
            <svg
              className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
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
        <StatCard
          label="Meetings This Month"
          value={dashboard?.teamMeetingsThisMonth || 0}
          color="bg-blue-50 dark:bg-blue-900/20"
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
        <StatCard
          label="Deals Won"
          value={dashboard?.teamDealsWonThisMonth || 0}
          color="bg-green-50 dark:bg-green-900/20"
          icon={
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Team Performance
          </h2>
          <TeamPerformanceTable />
        </div>

        <LeaderboardSection />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Territory Performance
          </h2>
          <TerritoryPerformanceSection />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Team Activity
          </h2>
          <ActivityFeedSection />
        </div>
      </div>
    </div>
  );
}
