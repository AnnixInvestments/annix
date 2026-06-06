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
import { ClusterUsagePanel } from "./components/ClusterUsagePanel";

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

function SessionCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
      </div>
    </div>
  );
}

const LINK_COLORS: Record<
  string,
  {
    iconBg: string;
    iconBgHover: string;
    iconText: string;
    iconTextHover: string;
    border: string;
    arrow: string;
  }
> = {
  indigo: {
    iconBg: "bg-indigo-600/10",
    iconBgHover: "group-hover:bg-indigo-600",
    iconText: "text-indigo-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-indigo-500",
    arrow: "group-hover:text-indigo-600",
  },
  blue: {
    iconBg: "bg-blue-600/10",
    iconBgHover: "group-hover:bg-blue-600",
    iconText: "text-blue-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-blue-500",
    arrow: "group-hover:text-blue-600",
  },
  orange: {
    iconBg: "bg-orange-500/10",
    iconBgHover: "group-hover:bg-orange-500",
    iconText: "text-orange-500",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-orange-500",
    arrow: "group-hover:text-orange-500",
  },
  emerald: {
    iconBg: "bg-emerald-600/10",
    iconBgHover: "group-hover:bg-emerald-600",
    iconText: "text-emerald-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-emerald-500",
    arrow: "group-hover:text-emerald-600",
  },
  violet: {
    iconBg: "bg-violet-600/10",
    iconBgHover: "group-hover:bg-violet-600",
    iconText: "text-violet-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-violet-500",
    arrow: "group-hover:text-violet-600",
  },
  slate: {
    iconBg: "bg-slate-600/10",
    iconBgHover: "group-hover:bg-slate-600",
    iconText: "text-slate-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-slate-500",
    arrow: "group-hover:text-slate-600",
  },
  amber: {
    iconBg: "bg-amber-600/10",
    iconBgHover: "group-hover:bg-amber-600",
    iconText: "text-amber-600",
    iconTextHover: "group-hover:text-white",
    border: "hover:border-amber-500",
    arrow: "group-hover:text-amber-600",
  },
};

function AdminQuickLink({
  href,
  icon,
  label,
  description,
  badgeCount,
  badgeColor,
  color = "indigo",
}: {
  href: string;
  icon: string;
  label: string;
  description: string;
  badgeCount?: number;
  badgeColor?: string;
  color?: string;
}) {
  const colorEntry = LINK_COLORS[color];
  const c = colorEntry ? colorEntry : LINK_COLORS.indigo;
  return (
    <Link
      href={href}
      className={`group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${c.border} hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${c.iconBg} ${c.iconBgHover} flex items-center justify-center flex-shrink-0 transition-colors`}
        >
          <svg
            className={`w-5 h-5 ${c.iconText} ${c.iconTextHover} transition-colors`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span
                className={`px-1.5 py-0.5 text-xs font-medium rounded-full text-white ${badgeColor || "bg-[#323288]"}`}
              >
                {badgeCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 ${c.arrow} group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

function FeedbackSummary({ feedback }: { feedback: FeedbackItem[] }) {
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

function ScheduledJobsSummary({ jobs }: { jobs: ScheduledJobDto[] }) {
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

function isPaused(job: ScheduledJobDto): boolean {
  return !job.active;
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {activities.slice(0, 10).map((activity) => (
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
                    {activity.entityId ? ` #${activity.entityId}` : ""}
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
        ))}
      </div>
    </div>
  );
}

function NeedsAttentionPanel({ app }: { app: AppAttention }) {
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
        {app.items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-amber-200 dark:border-slate-700 hover:border-amber-400 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                <span
                  className={`min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-full text-white text-xs font-bold ${
                    item.severity === "urgent" ? "bg-red-500" : "bg-amber-500"
                  }`}
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
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboard();
  const feedbackQuery = useAdminFeedback();
  const jobsQuery = useScheduledJobs();
  const attentionQuery = useAdminAttention();

  const stats = dashboardQuery.data;
  const rawData = feedbackQuery.data;
  const feedback = rawData || [];
  const jobs = (() => {
    const rawData = jobsQuery.data;
    return rawData || [];
  })() as ScheduledJobDto[];

  const openFeedbackCount = feedback.filter((f) => f.status !== "resolved").length;
  const rfqAttention = attentionQuery.data?.apps.find((a) => a.appCode === "rfq");

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#323288] mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardQuery.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-red-700">{dashboardQuery.error.message}</p>
        <button
          onClick={() => dashboardQuery.refetch()}
          className="mt-3 text-sm font-medium text-red-800 hover:text-red-900 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform overview and administration
          </p>
        </div>
        <button
          onClick={() => {
            dashboardQuery.refetch();
            feedbackQuery.refetch();
            jobsQuery.refetch();
            attentionQuery.refetch();
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      <ClusterUsagePanel />

      {rfqAttention && rfqAttention.total > 0 && <NeedsAttentionPanel app={rfqAttention} />}

      {stats.systemHealth && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SessionCard
            label="Active Customer Sessions"
            count={stats.systemHealth.activeCustomerSessions}
            color="bg-blue-500"
          />
          <SessionCard
            label="Active Supplier Sessions"
            count={stats.systemHealth.activeSupplierSessions}
            color="bg-green-500"
          />
          <SessionCard
            label="Active Admin Sessions"
            count={stats.systemHealth.activeAdminSessions}
            color="bg-purple-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {feedback.length > 0 && <FeedbackSummary feedback={feedback} />}
        {jobs.length > 0 && <ScheduledJobsSummary jobs={jobs} />}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Administration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminQuickLink
            href="/admin/portal/rfqs"
            icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            label="RFQs"
            description="Requests for quotation, quotes and procurement"
            color="blue"
          />
          <AdminQuickLink
            href="/admin/portal/users"
            icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            label="Admin Users"
            description="Manage admin accounts and roles"
            color="indigo"
          />
          <AdminQuickLink
            href="/admin/portal/global-messages"
            icon="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-6.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-6.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
            label="Global Messages"
            description="View and manage messages across apps"
            color="blue"
          />
          <AdminQuickLink
            href="/admin/portal/feedback"
            icon="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            label="Feedback"
            description="User feedback and issue tracking"
            badgeCount={openFeedbackCount}
            badgeColor="bg-orange-500"
            color="orange"
          />
          <AdminQuickLink
            href="/admin/portal/secure-documents"
            icon="M16.5 10.5V6.75C16.5 4.26472 14.4853 2.25 12 2.25C9.51472 2.25 7.5 4.26472 7.5 6.75V10.5M6.75 21.75H17.25C18.4926 21.75 19.5 20.7426 19.5 19.5V12.75C19.5 11.5074 18.4926 10.5 17.25 10.5H6.75C5.50736 10.5 4.5 11.5074 4.5 12.75V19.5C4.5 20.7426 5.50736 21.75 6.75 21.75Z"
            label="Secure Documents"
            description="Encrypted document management"
            color="emerald"
          />
          <AdminQuickLink
            href="/admin/portal/ai-usage"
            icon="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            label="AI Usage"
            description="AI provider usage and token analytics"
            color="violet"
          />
          <AdminQuickLink
            href="/admin/portal/extraction-metrics"
            icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            label="Extraction Metrics"
            description="Per-operation runs, durations, payload bytes — where Neon usage goes"
            color="amber"
          />
          <AdminQuickLink
            href="/admin/portal/scheduled-jobs"
            icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            label="Scheduled Jobs"
            description="Background task monitoring"
            color="slate"
          />
          <AdminQuickLink
            href="/admin/portal/polling-jobs"
            icon="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
            label="Polling Jobs"
            description="Frontend query refetch intervals"
            color="indigo"
          />
          <AdminQuickLink
            href="/admin/portal/reference-data"
            icon="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
            label="Reference Data"
            description="Manage lookup tables and reference values"
            color="amber"
          />
          <AdminQuickLink
            href="/admin/portal/branding/annix-investments"
            icon="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
            label="Company Branding"
            description="Annix Investments holding-company brand — logo, colours and identity"
            color="indigo"
          />
        </div>
      </div>

      <button
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

      {stats.recentActivity.length > 0 && <ActivityFeed activities={stats.recentActivity} />}
    </div>
  );
}
