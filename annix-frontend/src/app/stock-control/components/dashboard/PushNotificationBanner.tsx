"use client";

import { useEffect, useState } from "react";
import { nowMillis } from "@/app/lib/datetime";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const DISMISS_KEY = "stock-control-push-dismissed";
const DISMISS_DAYS = 7;

export function PushNotificationBanner() {
  const { permissionState, isSubscribed, isLoading, requestPermissionAndSubscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = nowMillis() - Number(dismissedAt);
      if (elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (
    isLoading ||
    dismissed ||
    (isSubscribed && permissionState === "granted") ||
    permissionState === "denied" ||
    permissionState === "unsupported"
  ) {
    return null;
  }

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-teal-800">Enable Push Notifications</p>
          <p className="text-xs text-teal-600">
            Get instant alerts for approvals, dispatches, and more
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(nowMillis()));
            setDismissed(true);
          }}
          className="text-sm text-teal-600 hover:text-teal-800 px-3 py-1.5"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={requestPermissionAndSubscribe}
          className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-1.5 rounded-md"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
