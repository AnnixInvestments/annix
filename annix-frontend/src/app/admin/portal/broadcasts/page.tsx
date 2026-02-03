'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/Toast';
import { formatDateTime, formatRelative } from '@/app/lib/datetime';
import {
  adminMessagingApi,
  BroadcastDetail,
  BroadcastPriority,
  BroadcastTarget,
} from '@/app/lib/api/messagingApi';

function priorityBadge(priority: BroadcastPriority) {
  const styles: Record<BroadcastPriority, string> = {
    [BroadcastPriority.LOW]: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    [BroadcastPriority.NORMAL]: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    [BroadcastPriority.HIGH]: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
    [BroadcastPriority.URGENT]: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  };
  return styles[priority];
}

function targetLabel(target: BroadcastTarget): string {
  const labels: Record<BroadcastTarget, string> = {
    [BroadcastTarget.ALL]: 'All Users',
    [BroadcastTarget.CUSTOMERS]: 'Customers Only',
    [BroadcastTarget.SUPPLIERS]: 'Suppliers Only',
    [BroadcastTarget.SPECIFIC]: 'Specific Users',
  };
  return labels[target];
}

export default function AdminBroadcastsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [broadcasts, setBroadcasts] = useState<BroadcastDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [includeExpired, setIncludeExpired] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await adminMessagingApi.broadcastsAdmin({ includeExpired });
      setBroadcasts(result.broadcasts);
    } catch (error: any) {
      showToast(error.message || 'Failed to load broadcasts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [includeExpired, showToast]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/portal/messages')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Broadcasts
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show expired
          </label>
          <button
            onClick={() => router.push('/admin/portal/broadcasts/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Broadcast
          </button>
        </div>
      </div>

      {broadcasts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
          </svg>
          <p className="text-lg font-medium">No broadcasts yet</p>
          <p className="text-sm">Create your first broadcast to send announcements</p>
        </div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((broadcast) => (
            <div
              key={broadcast.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {broadcast.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${priorityBadge(broadcast.priority)}`}
                    >
                      {broadcast.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {broadcast.contentPreview}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {targetLabel(broadcast.targetAudience)}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  {broadcast.readCount} / {broadcast.totalRecipients} read
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {broadcast.emailSentCount} emails sent
                </span>
                <span>Sent by {broadcast.sentByName}</span>
                <span>{formatRelative(broadcast.createdAt)}</span>
                {broadcast.expiresAt && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Expires: {formatDateTime(broadcast.expiresAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
