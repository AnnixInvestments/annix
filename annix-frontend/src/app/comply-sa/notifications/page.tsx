"use client";

import { AlertTriangle, Bell, BellOff, CheckCircle, Clock, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { notifications as fetchNotifications, markNotificationRead } from "@/app/comply-sa/lib/api";

type Notification = {
  id: string;
  type: string;
  message: string;
  requirementName: string | null;
  read: boolean;
  createdAt: string;
};

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  overdue: AlertTriangle,
  compliant: CheckCircle,
  reminder: Clock,
  info: Info,
};

function notificationIcon(type: string): React.ElementType {
  return NOTIFICATION_ICONS[type] ?? Bell;
}

const NOTIFICATION_COLORS: Record<string, string> = {
  warning: "text-yellow-400",
  overdue: "text-red-400",
  compliant: "text-green-400",
  reminder: "text-teal-400",
  info: "text-blue-400",
};

function notificationColor(type: string): string {
  return NOTIFICATION_COLORS[type] ?? "text-slate-400";
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await fetchNotifications();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      setItems(items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch {
      setError("Failed to mark notification as read");
    }
  }

  const unreadCount = items.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 bg-slate-700 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        {unreadCount > 0 && (
          <span className="bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const color = notificationColor(notification.type);

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.read) handleMarkRead(notification.id);
                }}
                className={`w-full text-left bg-slate-800 border rounded-xl p-4 transition-colors ${
                  notification.read
                    ? "border-slate-700 opacity-60"
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        notification.read ? "text-slate-400" : "text-white font-medium"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {notification.requirementName && (
                        <span className="text-xs text-teal-400">
                          {notification.requirementName}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(notification.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-teal-400 absolute top-4 right-4" />
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-2" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <BellOff className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No notifications yet</p>
          <p className="text-slate-500 text-xs mt-1">
            You will receive notifications about upcoming deadlines and compliance changes
          </p>
        </div>
      )}
    </div>
  );
}
