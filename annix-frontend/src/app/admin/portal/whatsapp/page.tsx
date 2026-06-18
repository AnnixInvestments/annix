"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { WhatsAppConversation, WhatsAppMessage } from "@/app/lib/api/adminApi";
import { formatDateTime } from "@/app/lib/datetime";
import {
  useAdminMarkWhatsAppRead,
  useAdminSendWhatsAppReply,
  useAdminWhatsAppConversations,
  useAdminWhatsAppMessages,
  useAdminWhatsAppStatus,
} from "@/app/lib/query/hooks";
import { BroadcastComposer } from "./BroadcastComposer";

function displayName(conversation: WhatsAppConversation): string {
  const profileName = conversation.profileName;
  return profileName && profileName.trim().length > 0 ? profileName : `+${conversation.waId}`;
}

function appContextLabel(context: string | null): string | null {
  if (!context) return null;
  if (context === "admin-inbox") return "Admin";
  return context
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminWhatsAppPage() {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const statusQuery = useAdminWhatsAppStatus();
  const conversationsQuery = useAdminWhatsAppConversations(page);
  const messagesQuery = useAdminWhatsAppMessages(selectedId);
  const sendReply = useAdminSendWhatsAppReply();
  const markRead = useAdminMarkWhatsAppRead();

  const status = statusQuery.data;
  const configured = status ? status.configured : true;
  const conversationData = conversationsQuery.data;
  const conversations = conversationData ? conversationData.items : [];
  const total = conversationData ? conversationData.total : 0;
  const pageSize = conversationData ? conversationData.pageSize : 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const messagesData = messagesQuery.data;
  const messages = messagesData ? messagesData : [];

  const selectedMatch = conversations.find((c) => c.id === selectedId);
  const selectedConversation = selectedMatch ? selectedMatch : null;

  const threadEndRef = useRef<HTMLDivElement>(null);
  const messageCount = messages.length;
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);

  const openConversation = (conversation: WhatsAppConversation) => {
    setSelectedId(conversation.id);
    setDraft("");
    if (conversation.unreadCount > 0) {
      markRead.mutate(conversation.id);
    }
  };

  const sending = sendReply.isPending;
  const draftEmpty = draft.trim().length === 0;

  const handleSend = () => {
    const body = draft.trim();
    if (!selectedId || body.length === 0 || sending) {
      return;
    }
    sendReply.mutate(
      { conversationId: selectedId, body },
      {
        onSuccess: () => setDraft(""),
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Couldn't send the message — please try again.";
          showToast(message, "error");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">WhatsApp</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Platform-wide inbox for the global Annix WhatsApp number — conversations from every app
            land here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBroadcastOpen(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-navbar,#323288)] text-white text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)]"
        >
          New broadcast
        </button>
      </div>

      <BroadcastComposer
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        configured={configured}
      />

      {!configured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          WhatsApp isn't connected in this environment. Set the WHATSAPP_ACCESS_TOKEN,
          WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_WEBHOOK_VERIFY_TOKEN secrets to go live.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:h-[calc(100vh-16rem)]">
        <div
          className={`md:w-80 md:shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-col ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{total}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                No conversations yet. Inbound messages to the global number will appear here.
              </p>
            ) : (
              conversations.map((conversation) => {
                const isSelected = conversation.id === selectedId;
                const context = appContextLabel(conversation.appContext);
                const previewText = conversation.lastMessagePreview;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => openConversation(conversation)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 transition-colors ${
                      isSelected
                        ? "bg-[var(--brand-navbar-50,#f0f0fc)] dark:bg-gray-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {displayName(conversation)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-green-600 text-white text-[11px] font-semibold">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastDirection === "outbound" ? "You: " : ""}
                        {previewText ? previewText : ""}
                      </span>
                      {context && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {context}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                ← Newer
              </button>
              <span className="text-gray-500 dark:text-gray-400">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Older →
              </button>
            </div>
          )}
        </div>

        <div
          className={`flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-col ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation === null ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Select a conversation to view the thread.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="md:hidden text-gray-500 dark:text-gray-300"
                  aria-label="Back to conversations"
                >
                  ←
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {displayName(selectedConversation)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    +{selectedConversation.waId}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50 dark:bg-gray-900/40 min-h-[16rem]">
                {messagesQuery.isLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages…</p>
                ) : (
                  messages.map((message: WhatsAppMessage) => {
                    const isOutbound = message.direction === "outbound";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                            isOutbound
                              ? "bg-[var(--brand-navbar,#323288)] text-white rounded-br-sm"
                              : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-sm"
                          }`}
                        >
                          <p>{message.body}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isOutbound ? "text-white/60" : "text-gray-400 dark:text-gray-400"
                            }`}
                          >
                            {formatDateTime(message.sentAt)}
                            {isOutbound && message.status ? ` · ${message.status}` : ""}
                            {message.errorDetail ? ` · ${message.errorDetail}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    configured ? "Type a reply…" : "WhatsApp is not connected in this environment"
                  }
                  disabled={!configured || sending}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[var(--brand-navbar,#323288)] focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!configured || sending || draftEmpty}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-navbar,#323288)] text-white text-sm font-medium hover:bg-[var(--brand-navbar-active,#252560)] disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
