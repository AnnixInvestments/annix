"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import { useRef } from "react";
import type { ChatConversationResponse, ChatMessageResponse } from "@/app/lib/api/stockControlApi";
import { useChatState } from "../lib/useChatState";

type ChatMsg = ChatMessageResponse;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

import { staffInitials as senderInitials } from "../lib/formatting";

function conversationDisplayName(conv: ChatConversationResponse, currentUserId: number): string {
  if (conv.name) {
    return conv.name;
  }
  const otherParticipants = conv.participants.filter((p) => p.userId !== currentUserId);
  if (otherParticipants.length === 0) {
    return "Just you";
  }
  return otherParticipants.map((p) => p.name).join(", ");
}

function MessageBubble({
  msg,
  isMe,
  onStartEdit,
}: {
  msg: ChatMsg;
  isMe: boolean;
  onStartEdit: (msg: ChatMsg) => void;
}) {
  return (
    <div className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
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
          className={`text-xs font-semibold mb-0.5 flex items-center gap-1 ${isMe ? "opacity-80" : "text-gray-500"}`}
        >
          {msg.senderName}
          {isMe && (
            <button
              type="button"
              onClick={() => onStartEdit(msg)}
              className="opacity-50 hover:opacity-100"
              aria-label="Edit message"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        {msg.imageUrl && (
          <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.imageUrl}
              alt=""
              className="max-w-full max-h-48 rounded mb-1 cursor-pointer"
            />
          </a>
        )}
        {msg.text && <div className="break-words whitespace-pre-wrap">{msg.text}</div>}
        <div className={`text-[10px] mt-1 ${isMe ? "opacity-60" : "text-gray-400"}`}>
          {formatTime(msg.createdAt)}
          {msg.editedAt && " (edited)"}
        </div>
      </div>
    </div>
  );
}

function MessageInput({
  text,
  setText,
  editingId,
  setEditingId,
  sending,
  onSend,
  onKeyDown,
  onPhotoSelect,
  uploading,
  inputRef,
}: {
  text: string;
  setText: (t: string) => void;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  sending: boolean;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPhotoSelect: (file: File) => void;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-2 border-t bg-white">
      {editingId && (
        <div className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-amber-600">
          <Pencil className="h-3 w-3" />
          <span>Editing message</span>
          <button
            type="button"
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !!editingId}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          aria-label="Upload photo"
        >
          <Camera className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onPhotoSelect(file);
              e.target.value = "";
            }
          }}
        />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={editingId ? "Edit message..." : "Type a message..."}
          maxLength={500}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${editingId ? "border-amber-400" : "border-gray-300"}`}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {uploading && <div className="text-xs text-gray-400 px-2 pt-1">Uploading photo...</div>}
    </div>
  );
}

export function ChatPanel() {
  const id = user?.id;
  const {
    user,
    messagingEnabled,
    state,
    scrollRef,
    inputRef,
    currentMessages,
    totalDmUnread,
    totalUnread,
    filteredTeamMembers,
    open,
    close,
    navigateTo,
    setView,
    setText,
    setEditingId,
    setSearchQuery,
    setGroupName,
    dismissError,
    sendMessage,
    uploadPhoto,
    handleKeyDown,
    startEdit,
    openConversation,
    openNewConversation,
    createConversation,
    toggleUserSelection,
  } = useChatState();

  if (!messagingEnabled) return null;

  if (!state.isOpen) {
    return (
      <button
        type="button"
        onClick={open}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-colors"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-80 sm:w-96 h-[480px] rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-teal-600 text-white">
        <div className="flex items-center gap-2">
          {(state.view === "conversation" || state.view === "new-conversation") && (
            <button
              type="button"
              onClick={() => navigateTo("conversations")}
              className="p-0.5 rounded hover:bg-teal-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">
            {state.view === "general" && "Team Chat"}
            {state.view === "conversations" && "Messages"}
            {state.view === "conversation" &&
              state.activeConversation &&
              conversationDisplayName(state.activeConversation, id || 0)}
            {state.view === "new-conversation" && "New Message"}
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          className="p-1 rounded hover:bg-teal-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {state.view === "general" && (
        <>
          <div className="flex border-b bg-white">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-xs font-semibold text-teal-700 border-b-2 border-teal-600"
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setView("conversations")}
              className="flex-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 relative"
            >
              Direct
              {totalDmUnread > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {totalDmUnread > 99 ? "99+" : totalDmUnread}
                </span>
              )}
            </button>
          </div>
          {state.chatError && (
            <div className="px-3 py-2 bg-red-50 text-red-700 text-xs flex items-center justify-between">
              <span>{state.chatError}</span>
              <button type="button" onClick={dismissError} className="ml-2 font-bold">
                &times;
              </button>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {state.messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">
                No messages yet. Start the conversation!
              </p>
            )}
            {state.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={msg.senderId === user?.id}
                onStartEdit={startEdit}
              />
            ))}
          </div>
          <MessageInput
            text={state.text}
            setText={setText}
            editingId={state.editingId}
            setEditingId={setEditingId}
            sending={state.sending}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
            onPhotoSelect={uploadPhoto}
            uploading={state.uploading}
            inputRef={inputRef}
          />
        </>
      )}

      {state.view === "conversations" && (
        <>
          <div className="flex border-b bg-white">
            <button
              type="button"
              onClick={() => setView("general")}
              className="flex-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 relative"
            >
              General
              {state.unreadCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {state.unreadCount > 99 ? "99+" : state.unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 text-xs font-semibold text-teal-700 border-b-2 border-teal-600"
            >
              Direct
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <button
              type="button"
              onClick={openNewConversation}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 border-b border-gray-100 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-teal-700">New message</span>
            </button>
            {state.conversations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No conversations yet</p>
            )}
            {state.conversations.map((conv) => {
              const displayName = conversationDisplayName(conv, user?.id || 0);
              const rawValue = state.convUnreadCounts[String(conv.id)];
              const unread = rawValue || 0;
              return (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 border-b border-gray-100 transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {conv.type === "group" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      senderInitials(displayName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{displayName}</div>
                    <div className="text-xs text-gray-400">
                      {conv.participants.length} participant
                      {conv.participants.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {state.view === "conversation" && state.activeConversation && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {state.convMessages.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">
                No messages yet. Start the conversation!
              </p>
            )}
            {state.convMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={msg.senderId === user?.id}
                onStartEdit={startEdit}
              />
            ))}
          </div>
          <MessageInput
            text={state.text}
            setText={setText}
            editingId={state.editingId}
            setEditingId={setEditingId}
            sending={state.sending}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
            onPhotoSelect={uploadPhoto}
            uploading={state.uploading}
            inputRef={inputRef}
          />
        </>
      )}

      {state.view === "new-conversation" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 space-y-2 border-b bg-white">
            <input
              type="text"
              value={state.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {state.selectedUserIds.length > 1 && (
              <input
                type="text"
                value={state.groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (optional)"
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {filteredTeamMembers.map((member) => {
              const isSelected = state.selectedUserIds.includes(member.id);
              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => toggleUserSelection(member.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors text-left ${isSelected ? "bg-teal-50" : "hover:bg-gray-100"}`}
                >
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-gray-300"}`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {senderInitials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                    <div className="text-xs text-gray-400 truncate">{member.email}</div>
                  </div>
                </button>
              );
            })}
            {filteredTeamMembers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No team members found</p>
            )}
          </div>
          <div className="p-3 border-t bg-white">
            <button
              type="button"
              onClick={createConversation}
              disabled={state.selectedUserIds.length === 0}
              className="w-full py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
            >
              {state.selectedUserIds.length <= 1
                ? "Start conversation"
                : `Create group (${state.selectedUserIds.length} people)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
