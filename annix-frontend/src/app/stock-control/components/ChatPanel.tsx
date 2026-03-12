"use client";

import { MessageCircle, Pencil, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ChatMsg {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
  imageUrl: string | null;
  editedAt: string | null;
  createdAt: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function senderInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatPanel() {
  const { user, profile } = useStockControlAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [lastMessageId, setLastMessageId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messagingEnabled = profile?.messagingEnabled ?? false;

  const fetchMessages = useCallback(async () => {
    if (!messagingEnabled) return;

    try {
      const msgs: ChatMsg[] = await stockControlApiClient.chatMessages(lastMessageId);
      if (msgs.length === 0) return;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = msgs.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });

      const lastNew = msgs[msgs.length - 1];
      setLastMessageId(lastNew.id);

      if (!isOpen) {
        setUnreadCount((prev) => prev + msgs.length);
      }
    } catch {
      // Silent fail - polling will retry
    }
  }, [lastMessageId, messagingEnabled, isOpen]);

  useEffect(() => {
    if (!messagingEnabled) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages, messagingEnabled]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (editingId) {
      try {
        const result = await stockControlApiClient.editChatMessage(editingId, trimmed);
        if (result.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingId ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m,
            ),
          );
        }
      } catch {
        // Silent fail
      }
      setEditingId(null);
      setText("");
      return;
    }

    setSending(true);
    try {
      const newMsg = await stockControlApiClient.sendChatMessage(trimmed);
      if (newMsg.id) {
        setMessages((prev) => [...prev, newMsg]);
        setLastMessageId(newMsg.id);
      }
      setText("");
    } catch {
      // Silent fail
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "ArrowUp" && text === "" && !editingId) {
      e.preventDefault();
      const myMessages = messages.filter((m) => m.senderId === user?.id);
      const last = myMessages[myMessages.length - 1];
      if (last) {
        setEditingId(last.id);
        setText(last.text);
      }
    }
    if (e.key === "Escape" && editingId) {
      setEditingId(null);
      setText("");
    }
  };

  if (!messagingEnabled) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-colors"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-80 sm:w-96 h-[480px] rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-teal-600 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Team Chat</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-teal-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${isMe ? "bg-teal-100 text-teal-700" : "bg-gray-200 text-gray-600"}`}
                >
                  {senderInitials(msg.senderName)}
                </div>
              </div>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-teal-600 text-white" : "bg-white border border-gray-200 text-gray-900"}`}
              >
                <div
                  className={`text-xs font-semibold mb-0.5 ${isMe ? "opacity-80" : "text-gray-500"}`}
                >
                  {msg.senderName}
                </div>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="" className="max-w-full rounded mb-1" />
                )}
                {msg.text && <div className="break-words whitespace-pre-wrap">{msg.text}</div>}
                <div className={`text-[10px] mt-1 ${isMe ? "opacity-60" : "text-gray-400"}`}>
                  {formatTime(msg.createdAt)}
                  {msg.editedAt && " (edited)"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t bg-white">
        {editingId && (
          <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-amber-600">
            <Pencil className="h-3 w-3" />
            <span>Editing message</span>
            <button
              onClick={() => {
                setEditingId(null);
                setText("");
              }}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={editingId ? "Edit message..." : "Type a message..."}
            maxLength={500}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${editingId ? "border-amber-400" : "border-gray-300"}`}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
