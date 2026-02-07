"use client";

import { useState } from "react";
import {
  ConversationSummary,
  ConversationType,
  RelatedEntityType,
} from "@/app/lib/api/messagingApi";
import { formatRelative } from "@/app/lib/datetime";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId?: number;
  onSelect: (conversation: ConversationSummary) => void;
  onArchive?: (conversationId: number) => void;
  isLoading?: boolean;
}

function conversationTypeLabel(type: ConversationType): string {
  const labels: Record<ConversationType, string> = {
    [ConversationType.DIRECT]: "Direct",
    [ConversationType.GROUP]: "Group",
    [ConversationType.SUPPORT]: "Support",
  };
  return labels[type] || type;
}

function relatedEntityLabel(type: RelatedEntityType, id: number | null): string | null {
  if (type === RelatedEntityType.GENERAL || !id) return null;
  return `${type} #${id}`;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onArchive,
  isLoading,
}: ConversationListProps) {
  const [showArchived, setShowArchived] = useState(false);

  const filteredConversations = conversations.filter((c) => showArchived || !c.isArchived);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
        <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show archived
        </label>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p>No conversations yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                selectedId === conversation.id
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              } ${conversation.isArchived ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conversation.subject}
                    </h3>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {conversation.participantNames.join(", ") || "No participants"}
                  </p>
                  {conversation.lastMessagePreview && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                      {conversation.lastMessagePreview}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end ml-2">
                  {conversation.lastMessageAt && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {formatRelative(conversation.lastMessageAt)}
                    </span>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {conversationTypeLabel(conversation.conversationType)}
                    </span>
                    {relatedEntityLabel(
                      conversation.relatedEntityType,
                      conversation.relatedEntityId,
                    ) && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {relatedEntityLabel(
                          conversation.relatedEntityType,
                          conversation.relatedEntityId,
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {onArchive && !conversation.isArchived && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(conversation.id);
                  }}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Archive
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
