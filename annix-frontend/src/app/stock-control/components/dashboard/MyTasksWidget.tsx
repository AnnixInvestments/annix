"use client";

import Link from "next/link";
import type { JobCard, WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { formatDateTimeZA } from "@/app/lib/datetime";
import { statusColorClasses } from "../../lib/statusColors";

interface MyTasksWidgetProps {
  pendingApprovals: JobCard[];
  notifications: WorkflowNotification[];
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function MyTasksWidget({ pendingApprovals, notifications }: MyTasksWidgetProps) {
  const unreadNotifications = notifications.filter((n) => n.readAt === null);
  const totalTasks = pendingApprovals.length + unreadNotifications.length;

  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-3 py-4 sm:px-6 sm:py-5 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">My Tasks</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {totalTasks}
        </span>
      </div>
      <div className="divide-y divide-gray-200">
        {pendingApprovals.length > 0 && (
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Pending Approvals
            </p>
            <div className="space-y-2">
              {pendingApprovals.slice(0, 5).map((jobCard) => (
                <Link
                  key={jobCard.id}
                  href={`/stock-control/portal/job-cards/${jobCard.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-teal-700 truncate">
                      {jobCard.jobNumber}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{jobCard.jobName}</p>
                  </div>
                  <span
                    className={`ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColorClasses(jobCard.status)}`}
                  >
                    {formatStatus(jobCard.status)}
                    const actionUrl = notification.actionUrl;
                  </span>
                </Link>
              ))}
              {pendingApprovals.length > 5 && (
                <Link
                  href="/stock-control/portal/job-cards"
                  className="block text-center text-xs text-teal-600 hover:text-teal-800 py-1"
                >
                  View all {pendingApprovals.length} pending approvals
                </Link>
              )}
            </div>
          </div>
        )}
        {unreadNotifications.length > 0 && (
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Unread Notifications
            </p>
            <div className="space-y-2">
              {unreadNotifications.slice(0, 5).map((notification) => {
                const actionUrl = notification.actionUrl;
                return (
                  <Link
                    key={notification.id}
                    href={actionUrl || "/stock-control/portal/notifications"}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-gray-500 truncate">{notification.message}</p>
                      )}
                    </div>
                    <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                      {formatDateTimeZA(notification.createdAt)}
                    </span>
                  </Link>
                );
              })}
              {unreadNotifications.length > 5 && (
                <Link
                  href="/stock-control/portal/notifications"
                  className="block text-center text-xs text-teal-600 hover:text-teal-800 py-1"
                >
                  View all {unreadNotifications.length} notifications
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
