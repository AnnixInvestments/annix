"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApiClient, BroadcastDetailDto, ConversationSummaryDto } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";

type TabType = "conversations" | "broadcasts";

function ConversationCard({ conversation }: { conversation: ConversationSummaryDto }) {
  const participantNames = conversation.participants
    .map((p) => `${p.firstName} ${p.lastName}`)
    .join(", ");

  return (
    <Link
      href={`/admin/portal/messages/conversations/${conversation.id}`}
      className="block bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:border-[#323288] hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {conversation.subject}
            </h3>
            {conversation.unreadCount > 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-[#323288] text-white rounded-full">
                {conversation.unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
            {participantNames}
          </p>
          {conversation.lastMessagePreview && (
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {conversation.lastMessagePreview}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              conversation.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : conversation.status === "archived"
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {conversation.status}
          </span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-gray-400">
              {formatDateZA(conversation.lastMessageAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function BroadcastCard({ broadcast }: { broadcast: BroadcastDetailDto }) {
  return (
    <Link
      href={`/admin/portal/messages/broadcasts/${broadcast.id}`}
      className="block bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:border-purple-500 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
            {broadcast.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
            {broadcast.content}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {broadcast.targetAudience}
            </span>
            <span>
              {broadcast.readCount}/{broadcast.totalRecipients} read
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              broadcast.status === "sent"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : broadcast.status === "scheduled"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : broadcast.status === "draft"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {broadcast.status}
          </span>
          <span className="text-xs text-gray-400">
            {broadcast.sentAt
              ? formatDateZA(broadcast.sentAt)
              : broadcast.scheduledAt
                ? `Scheduled: ${formatDateZA(broadcast.scheduledAt)}`
                : formatDateZA(broadcast.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ type }: { type: TabType }) {
  return (
    <div className="text-center py-12">
      <svg
        className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {type === "conversations" ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        )}
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        No {type === "conversations" ? "conversations" : "broadcasts"} yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        {type === "conversations"
          ? "Messages from customers and suppliers will appear here."
          : "System-wide announcements and notifications will appear here."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
            </div>
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GlobalMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("conversations");
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastDetailDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [conversationsRes, broadcastsRes] = await Promise.all([
        adminApiClient.conversations({ limit: 50 }),
        adminApiClient.broadcasts({ limit: 50 }),
      ]);

      setConversations(conversationsRes.conversations);
      setBroadcasts(broadcastsRes.broadcasts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage messages across all Annix applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <Link
            href="/admin/portal/messages"
            className="px-4 py-2 text-sm font-medium text-white bg-[#323288] hover:bg-[#4a4da3] rounded-lg transition-colors"
          >
            Open Messages Portal
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {conversations.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Conversations</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-orange-600 dark:text-orange-400"
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
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUnread}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unread Messages</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {broadcasts.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Broadcasts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab("conversations")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "conversations"
                  ? "text-[#323288] dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Conversations
                {totalUnread > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-[#323288] text-white rounded-full">
                    {totalUnread}
                  </span>
                )}
              </span>
              {activeTab === "conversations" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#323288]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("broadcasts")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "broadcasts"
                  ? "text-[#323288] dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
                Broadcasts
              </span>
              {activeTab === "broadcasts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#323288]" />
              )}
            </button>
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <LoadingState />
          ) : activeTab === "conversations" ? (
            conversations.length > 0 ? (
              <div className="space-y-3">
                {conversations.map((conversation) => (
                  <ConversationCard key={conversation.id} conversation={conversation} />
                ))}
              </div>
            ) : (
              <EmptyState type="conversations" />
            )
          ) : broadcasts.length > 0 ? (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <BroadcastCard key={broadcast.id} broadcast={broadcast} />
              ))}
            </div>
          ) : (
            <EmptyState type="broadcasts" />
          )}
        </div>
      </div>
    </div>
  );
}
