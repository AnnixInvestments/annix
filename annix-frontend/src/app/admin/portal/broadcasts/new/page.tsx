'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/Toast';
import {
  BroadcastTarget,
  BroadcastPriority,
} from '@/app/lib/api/messagingApi';
import { useCreateBroadcast } from '@/app/lib/query/hooks';

export default function NewBroadcastPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const createMutation = useCreateBroadcast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<BroadcastTarget>(
    BroadcastTarget.ALL,
  );
  const [priority, setPriority] = useState<BroadcastPriority>(
    BroadcastPriority.NORMAL,
  );
  const [expiresAt, setExpiresAt] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('Please enter content', 'error');
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        content: content.trim(),
        targetAudience,
        priority,
        expiresAt: expiresAt || undefined,
        sendEmail,
      },
      {
        onSuccess: () => {
          showToast('Broadcast created successfully', 'success');
          router.push('/admin/portal/broadcasts');
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to create broadcast';
          showToast(message, 'error');
        },
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/portal/broadcasts')}
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
          New Broadcast
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="targetAudience"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Target Audience
              </label>
              <select
                id="targetAudience"
                value={targetAudience}
                onChange={(e) =>
                  setTargetAudience(e.target.value as BroadcastTarget)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={createMutation.isPending}
              >
                <option value={BroadcastTarget.ALL}>All Users</option>
                <option value={BroadcastTarget.CUSTOMERS}>Customers Only</option>
                <option value={BroadcastTarget.SUPPLIERS}>Suppliers Only</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as BroadcastPriority)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={createMutation.isPending}
              >
                <option value={BroadcastPriority.LOW}>Low</option>
                <option value={BroadcastPriority.NORMAL}>Normal</option>
                <option value={BroadcastPriority.HIGH}>High</option>
                <option value={BroadcastPriority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Expiration Date (optional)
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={createMutation.isPending}
            />
            <label
              htmlFor="sendEmail"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Also send email notifications to recipients
            </label>
          </div>

          {priority === BroadcastPriority.URGENT && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
              <strong>Warning:</strong> Urgent broadcasts will appear prominently
              to all targeted users and may trigger immediate notifications.
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/portal/broadcasts')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim() || !content.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Publishing...
                </>
              ) : (
                'Publish Broadcast'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
