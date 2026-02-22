"use client";

import { memo } from "react";
import { Attachment, Message } from "@/app/lib/api/messagingApi";
import { formatDateTime } from "@/app/lib/datetime";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSender?: boolean;
  onDownloadAttachment?: (attachment: Attachment) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/"))
    return "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z";
  if (mimeType === "application/pdf")
    return "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z";
  return "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
}

function MessageBubbleComponent({
  message,
  isOwnMessage,
  showSender = true,
  onDownloadAttachment,
}: MessageBubbleProps) {
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-2`}>
        <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 italic text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  if (message.messageType === "SYSTEM") {
    return (
      <div className="flex justify-center mb-2">
        <div className="px-4 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] ${
          isOwnMessage
            ? "bg-blue-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm"
        }`}
      >
        {showSender && !isOwnMessage && (
          <div className="px-4 pt-2 pb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {message.senderName}
            </span>
          </div>
        )}

        <div className="px-4 py-2">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.attachments.length > 0 && (
          <div className="px-4 pb-2 space-y-1">
            {message.attachments.map((attachment) => (
              <button
                key={attachment.id}
                onClick={() => onDownloadAttachment?.(attachment)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${
                  isOwnMessage
                    ? "bg-blue-500 hover:bg-blue-400"
                    : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                } transition-colors`}
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={fileIcon(attachment.mimeType)}
                  />
                </svg>
                <span className="truncate flex-1 text-left">{attachment.fileName}</span>
                <span
                  className={`text-xs ${isOwnMessage ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {formatFileSize(attachment.fileSize)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`px-4 pb-2 flex items-center gap-2 ${
            isOwnMessage ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className={`text-xs ${
              isOwnMessage ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {formatDateTime(message.sentAt)}
          </span>
          {message.editedAt && (
            <span
              className={`text-xs ${
                isOwnMessage ? "text-blue-200" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              (edited)
            </span>
          )}
          {isOwnMessage && message.readByUserIds.length > 1 && (
            <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
