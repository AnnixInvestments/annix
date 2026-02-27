"use client";

import { Bell, Check, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { stockControlApiClient, WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        stockControlApiClient.unreadNotifications(),
        stockControlApiClient.notificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count.count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = useCallback(async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await stockControlApiClient.markNotificationAsRead(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setIsLoading(true);
    try {
      await stockControlApiClient.markAllNotificationsAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNotificationClick = useCallback(
    (notification: WorkflowNotification) => {
      if (notification.actionUrl) {
        const url = new URL(notification.actionUrl);
        router.push(url.pathname);
      } else if (notification.jobCardId) {
        router.push(`/stock-control/portal/job-cards/${notification.jobCardId}`);
      }
      setIsOpen(false);
    },
    [router],
  );

  const actionTypeLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      approval_required: "Approval Required",
      approval_completed: "Approved",
      approval_rejected: "Rejected",
      stock_allocated: "Stock Allocated",
      dispatch_ready: "Ready for Dispatch",
      dispatch_completed: "Dispatched",
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
    };
    return colors[actionType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-teal-700">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-sm text-teal-600 hover:text-teal-700 flex items-center space-x-1"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No new notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionTypeColor(notification.actionType)}`}
                          >
                            {actionTypeLabel(notification.actionType)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {notification.senderName && (
                            <span className="text-xs text-teal-600">
                              From: {notification.senderName}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDateLongZA(new Date(notification.createdAt))}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded-full"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                router.push("/stock-control/portal/notifications");
                setIsOpen(false);
              }}
              className="text-sm text-teal-600 hover:text-teal-700 w-full text-center"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
