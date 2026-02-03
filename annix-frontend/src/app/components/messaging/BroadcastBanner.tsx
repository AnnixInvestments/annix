'use client';

import { useState } from 'react';
import { formatRelative } from '@/app/lib/datetime';
import { BroadcastSummary, BroadcastPriority } from '@/app/lib/api/messagingApi';

interface BroadcastBannerProps {
  broadcasts: BroadcastSummary[];
  onMarkRead: (broadcastId: number) => void;
  onViewAll?: () => void;
}

function priorityStyles(priority: BroadcastPriority): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const styles: Record<
    BroadcastPriority,
    { bg: string; border: string; text: string; icon: string }
  > = {
    [BroadcastPriority.LOW]: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    [BroadcastPriority.NORMAL]: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-400',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    [BroadcastPriority.HIGH]: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    },
    [BroadcastPriority.URGENT]: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };
  return styles[priority];
}

export function BroadcastBanner({
  broadcasts,
  onMarkRead,
  onViewAll,
}: BroadcastBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const unreadBroadcasts = broadcasts.filter(
    (b) => !b.isRead && !dismissedIds.has(b.id),
  );

  if (unreadBroadcasts.length === 0) return null;

  const handleDismiss = (broadcast: BroadcastSummary) => {
    setDismissedIds((prev) => new Set(prev).add(broadcast.id));
    onMarkRead(broadcast.id);
  };

  return (
    <div className="space-y-2 mb-4">
      {unreadBroadcasts.slice(0, 3).map((broadcast) => {
        const styles = priorityStyles(broadcast.priority);

        return (
          <div
            key={broadcast.id}
            className={`${styles.bg} ${styles.border} border rounded-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <svg
                className={`w-5 h-5 ${styles.text} flex-shrink-0 mt-0.5`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={styles.icon}
                />
              </svg>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${styles.text}`}>
                    {broadcast.title}
                  </h4>
                  {(broadcast.priority === BroadcastPriority.HIGH ||
                    broadcast.priority === BroadcastPriority.URGENT) && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        broadcast.priority === BroadcastPriority.URGENT
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {broadcast.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {broadcast.contentPreview}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>From: {broadcast.sentByName}</span>
                  <span>{formatRelative(broadcast.createdAt)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDismiss(broadcast)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {unreadBroadcasts.length > 3 && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View {unreadBroadcasts.length - 3} more announcements
        </button>
      )}
    </div>
  );
}
