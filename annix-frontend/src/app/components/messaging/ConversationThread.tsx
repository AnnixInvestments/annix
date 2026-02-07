"use client";

import { useEffect, useRef } from "react";
import { Attachment, Message } from "@/app/lib/api/messagingApi";
import { fromISO } from "@/app/lib/datetime";
import { MessageBubble } from "./MessageBubble";

interface ConversationThreadProps {
  messages: Message[];
  currentUserId: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onDownloadAttachment?: (attachment: Attachment) => void;
}

export function ConversationThread({
  messages,
  currentUserId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onDownloadAttachment,
}: ConversationThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;

    const { scrollTop } = containerRef.current;
    if (scrollTop < 100) {
      onLoadMore();
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm">Start the conversation by sending a message</p>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
      {hasMore && (
        <div className="flex justify-center mb-4">
          {isLoadingMore ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Load older messages
            </button>
          )}
        </div>
      )}

      {groupedMessages.map(({ date, messages: dayMessages }) => (
        <div key={date}>
          <div className="flex items-center justify-center my-4">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
            <span className="px-3 text-xs text-gray-500 dark:text-gray-400">{date}</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          {dayMessages.map((message, index) => {
            const isOwnMessage = message.senderId === currentUserId;
            const prevMessage = index > 0 ? dayMessages[index - 1] : null;
            const showSender =
              !isOwnMessage && (!prevMessage || prevMessage.senderId !== message.senderId);

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={isOwnMessage}
                showSender={showSender}
                onDownloadAttachment={onDownloadAttachment}
              />
            );
          })}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Map<string, Message[]> = new Map();

  messages.forEach((message) => {
    const date = fromISO(message.sentAt).toLocaleString({
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const existing = groups.get(date) || [];
    groups.set(date, [...existing, message]);
  });

  return Array.from(groups.entries()).map(([date, msgs]) => ({
    date,
    messages: msgs,
  }));
}
