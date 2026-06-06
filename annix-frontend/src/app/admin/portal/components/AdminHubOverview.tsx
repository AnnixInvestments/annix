"use client";

import Link from "next/link";
import type {
  ActivityItem,
  AppAttention,
  FeedbackItem,
  ScheduledJobDto,
} from "@/app/lib/api/adminApi";
import { fromISO, now } from "@/app/lib/datetime";
import { useAdminDashboard, useAdminFeedback, useScheduledJobs } from "@/app/lib/query/hooks";
import { useAdminAttention } from "@/app/lib/query/hooks/admin/useAdminAttention";
import { AdminToolsGrid } from "./AdminToolsGrid";

function formatRelativeDate(dateString: string) {
  const date = fromISO(dateString);
  const currentTime = now();
  const diffMs = currentTime.toMillis() - date.toMillis();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleString({ year: "numeric", month: "short", day: "numeric" });
}

function isPaused(job: ScheduledJobDto): boolean {
  return !job.active;
}

function SessionCard(props: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${props.color}`} />
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{props.label}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{props.count}</p>
      </div>
    </div>
  );
}

function FeedbackSummary(props: { feedback: FeedbackItem[] }) {
  const feedback = props.feedback;
  const submitted = feedback.filter((f) => f.status === "submitted").length;
  const triaged = feedback.filter((f) => f.status === "triaged").length;
  const inProgress = feedback.filter((f) => f.status === "in_progress").length;
  const resolved = feedback.filter((f) => f.status === "resolved").length;

  const statuses = [
    { label: "New", count: submitted, color: "bg-blue-500" },
    { label: "Triaged", count: triaged, color: "bg-yellow-500" },
    { label: "In Progress", count: inProgress, color: "bg-purple-500" },
    { label: "Resolved", count: resolved, color: "bg-green-500" },
  ];

  return (
    <Link
      href="/admin/portal/feedback"
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:border-[#323288] hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Feedback</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{feedback.length} total</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {statuses.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.count}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

function ScheduledJobsSummary(props: { jobs: ScheduledJobDto[] }) {
  const jobs = props.jobs;
  const active = jobs.filter((j) => j.active && !isPaused(j)).length;
  const paused = jobs.filter((j) => isPaused(j)).length;
  const total = jobs.length;

  return (
    <Link
      href="/admin/portal/scheduled-jobs"
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:border-[#323288] hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scheduled Jobs</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{total} total</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-xl font-bold text-green-600">{active}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-yellow-600">{paused}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Paused</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActivityFeed(props: { activities: ActivityItem[] }) {
  const activities = props.activities;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {activities.slice(0, 10).map((activity) => {
          const entityId = activity.entityId ? ` #${activity.entityId}` : "";
          return (
            <div key={activity.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-750">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#323288]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-[#323288]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.userName}</span>{" "}
                    <span className="text-gray-500 dark:text-gray-400">
                      {activity.action} {activity.entityType}
                      {entityId}
                    </span>
                  </p>
                  {activity.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {activity.details}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {formatRelativeDate(activity.timestamp)}
                  </span>
                  {activity.ipAddress && (
                    <span className="text-xs text-gray-300">{activity.ipAddress}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NeedsAttentionPanel(props: { app: AppAttention }) {
  const app = props.app;
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Needs Attention — {app.total} item{app.total === 1 ? "" : "s"}
        </h2>
      </div>
      <ul className="space-y-2">
        {app.items.map((item) => {
          const severityColor = item.severity === "urgent" ? "bg-red-500" : "bg-amber-500";
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-amber-200 dark:border-slate-700 hover:border-amber-400 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                  <span
                    className={`min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-full text-white text-xs font-bold ${severityColor}`}
                  >
                    {item.count}
                  </span>
                  {item.label}
                </span>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
                  Review →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminHubOverview() {
  const dashboardQuery = useAdminDashboard();
  const feedbackQuery = useAdminFeedback();
  const jobsQuery = useScheduledJobs();
  const attentionQuery = useAdminAttention();

  const stats = dashboardQuery.data;
  const rawFeedback = feedbackQuery.data;
  const feedback = rawFeedback || [];
  const rawJobs = jobsQuery.data;
  const jobs = (rawJobs || []) as ScheduledJobDto[];

  const openFeedbackCount = feedback.filter((f) => f.status !== "resolved").length;
  const attentionApps = attentionQuery.data?.apps;
  const rfqAttention = attentionApps ? attentionApps.find((a) => a.appCode === "rfq") : undefined;
  const showAttention = rfqAttention !== undefined && rfqAttention.total > 0;

  const systemHealth = stats?.systemHealth;
  const recentActivity = stats?.recentActivity;
  const hasActivity = recentActivity !== undefined && recentActivity.length > 0;

  return (
    <div className="space-y-6 pt-2 border-t border-gray-200 dark:border-slate-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Platform overview</h2>

      {showAttention && rfqAttention && <NeedsAttentionPanel app={rfqAttention} />}

      {systemHealth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SessionCard
            label="Active Customer Sessions"
            count={systemHealth.activeCustomerSessions}
            color="bg-blue-500"
          />
          <SessionCard
            label="Active Supplier Sessions"
            count={systemHealth.activeSupplierSessions}
            color="bg-green-500"
          />
          <SessionCard
            label="Active Admin Sessions"
            count={systemHealth.activeAdminSessions}
            color="bg-purple-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {feedback.length > 0 && <FeedbackSummary feedback={feedback} />}
        {jobs.length > 0 && <ScheduledJobsSummary jobs={jobs} />}
      </div>

      <AdminToolsGrid badgeCounts={{ "/admin/portal/feedback": openFeedbackCount }} />

      <button
        type="button"
        onClick={() => window.open("/codebase-evolution-stats.html", "_blank")}
        className="w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-[#323288] hover:shadow-md transition-all text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#323288] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Codebase Evolution Report
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Auto-generated on every deploy &middot; LOC, commits, growth charts &amp; cost
                analysis
              </p>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      </button>

      {hasActivity && recentActivity && <ActivityFeed activities={recentActivity} />}
    </div>
  );
}
