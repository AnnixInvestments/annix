"use client";

import { Bell, Check, CheckCheck, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { stockControlApiClient, WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

type FilterType = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        filter === "unread"
          ? await stockControlApiClient.unreadNotifications()
          : await stockControlApiClient.workflowNotifications(100);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: number) => {
    try {
      await stockControlApiClient.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      await stockControlApiClient.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsMarkingAll(false);
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notification: WorkflowNotification) => {
      if (!notification.readAt) {
        handleMarkAsRead(notification.id);
      }
      if (notification.actionUrl) {
        const url = new URL(notification.actionUrl);
        router.push(url.pathname);
      } else if (notification.jobCardId) {
        router.push(`/stock-control/portal/job-cards/${notification.jobCardId}`);
      }
    },
    [router, handleMarkAsRead],
  );

  const actionTypeLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      approval_required: "Approval Required",
      approval_completed: "Approved",
      approval_rejected: "Rejected",
      stock_allocated: "Stock Allocated",
      dispatch_ready: "Ready for Dispatch",
      dispatch_completed: "Dispatched",
      over_allocation_approval: "Over-Allocation",
    };
    return labels[actionType] || actionType;
  };

  const actionTypeColor = (actionType: string): string => {
    const colors: Record<string, string> = {
      approval_required: "bg-yellow-100 text-yellow-800",
      approval_completed: "bg-green-100 text-green-800",
      approval_rejected: "bg-red-100 text-red-800",
      stock_allocated: "bg-blue-100 text-blue-800",
      dispatch_ready: "bg-purple-100 text-purple-800",
      dispatch_completed: "bg-teal-100 text-teal-800",
      over_allocation_approval: "bg-orange-100 text-orange-800",
    };
    return colors[actionType] || "bg-gray-100 text-gray-800";
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
            </select>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent mx-auto mb-3" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "unread"
                ? "You have no unread notifications"
                : "You have not received any notifications yet"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.readAt ? "bg-teal-50/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionTypeColor(notification.actionType)}`}
                      >
                        {actionTypeLabel(notification.actionType)}
                      </span>
                      {!notification.readAt && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-teal-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {notification.senderName && (
                        <span className="text-xs text-teal-600 font-medium">
                          From: {notification.senderName}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDateLongZA(new Date(notification.createdAt))}
                      </span>
                      {notification.jobCard && (
                        <span className="text-xs text-gray-500">
                          Job: {notification.jobCard.jobNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  {!notification.readAt && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
