"use client";

import { Bell, Check, CheckCheck, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { stockControlApiClient, WorkflowNotification } from "@/app/lib/api/stockControlApi";
import { formatDateTimeZA } from "@/app/lib/datetime";
import { useNotificationCount } from "../hooks/useNotificationCount";

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { count: unreadCount, refetch: refetchCount } = useNotificationCount();

  const fetchNotifications = useCallback(async () => {
    try {
      const notifs = await stockControlApiClient.unreadNotifications();
      setNotifications(notifs);
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

  const handleMarkAsRead = useCallback(
    async (notificationId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await stockControlApiClient.markNotificationAsRead(notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        refetchCount();
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [refetchCount],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    setIsLoading(true);
    try {
      await stockControlApiClient.markAllNotificationsAsRead();
      setNotifications([]);
      refetchCount();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  }, [refetchCount]);

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

  const [completingBgStep, setCompletingBgStep] = useState<number | null>(null);
  const [bgNotes, setBgNotes] = useState("");
  const [bgSaving, setBgSaving] = useState(false);

  const handleCompleteBackgroundStep = useCallback(
    async (notification: WorkflowNotification) => {
      if (!notification.jobCardId || !notification.message) return;
      const match = notification.message.match(/\[step:([^\]]+)\]/);
      if (!match) return;

      setBgSaving(true);
      try {
        await stockControlApiClient.completeBackgroundStep(
          notification.jobCardId,
          match[1],
          bgNotes || undefined,
        );
        await stockControlApiClient.markNotificationAsRead(notification.id);
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        refetchCount();
        setCompletingBgStep(null);
        setBgNotes("");
      } catch (error) {
        console.error("Failed to complete background step:", error);
      } finally {
        setBgSaving(false);
      }
    },
    [bgNotes, refetchCount],
  );

  const actionTypeLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      approval_required: "Approval Required",
      approval_completed: "Approved",
      approval_rejected: "Rejected",
      stock_allocated: "Stock Allocated",
      dispatch_ready: "Ready for Dispatch",
      dispatch_completed: "Dispatched",
      job_cards_imported: "Job Cards Imported",
      background_step_required: "Background Task",
      background_step_completed: "Task Completed",
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
      job_cards_imported: "bg-indigo-100 text-indigo-800",
      background_step_required: "bg-amber-100 text-amber-800",
      background_step_completed: "bg-emerald-100 text-emerald-800",
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
                            {formatDateTimeZA(notification.createdAt)}
                          </span>
                        </div>
                        {notification.actionType === "background_step_required" && (
                          <div className="mt-2">
                            {completingBgStep === notification.id ? (
                              <div
                                className="flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={bgNotes}
                                  onChange={(e) => setBgNotes(e.target.value)}
                                  placeholder="Notes (optional)"
                                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteBackgroundStep(notification);
                                  }}
                                  disabled={bgSaving}
                                  className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                                >
                                  {bgSaving ? "..." : "Done"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompletingBgStep(null);
                                    setBgNotes("");
                                  }}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCompletingBgStep(notification.id);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100"
                              >
                                <ClipboardCheck className="h-3 w-3" />
                                Mark Complete
                              </button>
                            )}
                          </div>
                        )}
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
