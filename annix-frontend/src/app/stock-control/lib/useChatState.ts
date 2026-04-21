"use client";

import { values } from "es-toolkit/compat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import type {
  ChatConversationResponse,
  ChatMessageResponse,
  StockControlTeamMember,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { nowISO } from "@/app/lib/datetime";
import { log } from "@/app/lib/logger";

type ChatMsg = ChatMessageResponse;

type ChatView = "conversations" | "general" | "conversation" | "new-conversation";

interface ChatState {
  isOpen: boolean;
  view: ChatView;
  messages: ChatMsg[];
  lastMessageId: number | null;
  unreadCount: number;
  text: string;
  sending: boolean;
  editingId: number | null;
  uploading: boolean;
  conversations: ChatConversationResponse[];
  activeConversation: ChatConversationResponse | null;
  convMessages: ChatMsg[];
  convLastMessageId: number | null;
  convUnreadCounts: Record<string, number>;
  teamMembers: StockControlTeamMember[];
  selectedUserIds: number[];
  groupName: string;
  searchQuery: string;
  chatError: string | null;
}

const INITIAL_STATE: ChatState = {
  isOpen: false,
  view: "general",
  messages: [],
  lastMessageId: null,
  unreadCount: 0,
  text: "",
  sending: false,
  editingId: null,
  uploading: false,
  conversations: [],
  activeConversation: null,
  convMessages: [],
  convLastMessageId: null,
  convUnreadCounts: {},
  teamMembers: [],
  selectedUserIds: [],
  groupName: "",
  searchQuery: "",
  chatError: null,
};

function mergeNewMessages(prev: ChatMsg[], incoming: ChatMsg[]): ChatMsg[] {
  const existingIds = new Set(prev.map((m) => m.id));
  const fresh = incoming.filter((m) => !existingIds.has(m.id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh];
}

export function useChatState() {
  const { user, profile } = useStockControlAuth();
  const rawMessagingEnabled = profile?.messagingEnabled;
  const messagingEnabled = rawMessagingEnabled || false;

  const [state, setState] = useState<ChatState>(INITIAL_STATE);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastMessageIdRef = useRef(state.lastMessageId);
  lastMessageIdRef.current = state.lastMessageId;
  const isOpenRef = useRef(state.isOpen);
  isOpenRef.current = state.isOpen;
  const viewRef = useRef(state.view);
  viewRef.current = state.view;
  const convLastMessageIdRef = useRef(state.convLastMessageId);
  convLastMessageIdRef.current = state.convLastMessageId;
  const activeConversationRef = useRef(state.activeConversation);
  activeConversationRef.current = state.activeConversation;

  const updateState = useCallback((patch: Partial<ChatState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const fetchGeneralMessages = useCallback(async () => {
    if (!messagingEnabled) return;

    try {
      const msgs = await stockControlApiClient.chatMessages(lastMessageIdRef.current);
      if (msgs.length === 0) return;

      setState((prev) => {
        const merged = mergeNewMessages(prev.messages, msgs);
        const lastNew = msgs[msgs.length - 1];
        const additionalUnread =
          !isOpenRef.current || viewRef.current !== "general" ? msgs.length : 0;
        return merged === prev.messages
          ? prev
          : {
              ...prev,
              messages: merged,
              lastMessageId: lastNew.id,
              unreadCount: prev.unreadCount + additionalUnread,
            };
      });
    } catch (e) {
      log.debug("Chat poll failed:", extractErrorMessage(e, "Unknown error"));
    }
  }, [messagingEnabled]);

  const fetchConvMessages = useCallback(async () => {
    if (!messagingEnabled || !activeConversationRef.current) return;

    try {
      const msgs = await stockControlApiClient.chatMessages(
        convLastMessageIdRef.current,
        activeConversationRef.current.id,
      );
      if (msgs.length === 0) return;

      setState((prev) => {
        const merged = mergeNewMessages(prev.convMessages, msgs);
        const lastNew = msgs[msgs.length - 1];
        return merged === prev.convMessages
          ? prev
          : { ...prev, convMessages: merged, convLastMessageId: lastNew.id };
      });
    } catch (e) {
      log.debug("Conversation poll failed:", extractErrorMessage(e, "Unknown error"));
    }
  }, [messagingEnabled]);

  useEffect(() => {
    if (!messagingEnabled) return;

    fetchGeneralMessages();
    const interval = setInterval(fetchGeneralMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchGeneralMessages, messagingEnabled]);

  useEffect(() => {
    if (!messagingEnabled || !state.activeConversation) return;

    fetchConvMessages();
    const interval = setInterval(fetchConvMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchConvMessages, messagingEnabled, state.activeConversation]);

  useEffect(() => {
    if (!messagingEnabled || !state.isOpen) return;

    const fetchConversations = async () => {
      try {
        const convs = await stockControlApiClient.chatConversations();
        updateState({ conversations: convs });
      } catch (e) {
        log.debug("Fetch conversations failed:", extractErrorMessage(e, "Unknown error"));
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [messagingEnabled, state.isOpen, updateState]);

  useEffect(() => {
    if (!messagingEnabled || !state.isOpen) return;

    const fetchUnread = async () => {
      try {
        const counts = await stockControlApiClient.chatUnreadCounts();
        updateState({ convUnreadCounts: counts });
      } catch (e) {
        log.debug("Fetch unread counts failed:", extractErrorMessage(e, "Unknown error"));
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [messagingEnabled, state.isOpen, updateState]);

  useEffect(() => {
    if (state.isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages.length, state.convMessages.length, state.isOpen, state.view]);

  useEffect(() => {
    if (state.isOpen) {
      if (state.view === "general") {
        updateState({ unreadCount: 0 });
      }
      if (state.view === "conversation" && state.activeConversation) {
        stockControlApiClient
          .markConversationRead(state.activeConversation.id)
          .catch((e) =>
            log.debug("Failed to mark conversation read:", extractErrorMessage(e, "Unknown error")),
          );
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.isOpen, state.view, state.activeConversation, updateState]);

  const currentMessages = state.view === "conversation" ? state.convMessages : state.messages;

  const totalDmUnread = values(state.convUnreadCounts).reduce((a, b) => a + b, 0);
  const totalUnread = state.unreadCount + totalDmUnread;

  const open = useCallback(() => {
    updateState({ isOpen: true });
  }, [updateState]);

  const close = useCallback(() => {
    updateState({ isOpen: false });
  }, [updateState]);

  const navigateTo = useCallback(
    (view: ChatView) => {
      updateState({
        view,
        activeConversation: null,
        editingId: null,
        text: "",
      });
    },
    [updateState],
  );

  const setView = useCallback(
    (view: ChatView) => {
      updateState({ view });
    },
    [updateState],
  );

  const setText = useCallback(
    (text: string) => {
      updateState({ text });
    },
    [updateState],
  );

  const setEditingId = useCallback(
    (editingId: number | null) => {
      updateState({ editingId });
    },
    [updateState],
  );

  const setSearchQuery = useCallback(
    (searchQuery: string) => {
      updateState({ searchQuery });
    },
    [updateState],
  );

  const setGroupName = useCallback(
    (groupName: string) => {
      updateState({ groupName });
    },
    [updateState],
  );

  const dismissError = useCallback(() => {
    updateState({ chatError: null });
  }, [updateState]);

  const sendMessage = useCallback(async () => {
    const trimmed = state.text.trim();
    if (!trimmed || state.sending) return;

    if (state.editingId) {
      try {
        const result = await stockControlApiClient.editChatMessage(state.editingId, trimmed);
        if (result.success) {
          const editId = state.editingId;
          const updateMsg = (m: ChatMsg) =>
            m.id === editId ? { ...m, text: trimmed, editedAt: nowISO() } : m;
          setState((prev) =>
            prev.view === "conversation"
              ? {
                  ...prev,
                  convMessages: prev.convMessages.map(updateMsg),
                  editingId: null,
                  text: "",
                }
              : { ...prev, messages: prev.messages.map(updateMsg), editingId: null, text: "" },
          );
        }
      } catch (e) {
        updateState({ chatError: extractErrorMessage(e, "Failed to edit message") });
      }
      updateState({ editingId: null, text: "" });
      return;
    }

    updateState({ sending: true });
    try {
      const conversationId =
        state.view === "conversation" && state.activeConversation
          ? state.activeConversation.id
          : null;
      const newMsg = await stockControlApiClient.sendChatMessage(trimmed, null, conversationId);
      if (newMsg.id) {
        setState((prev) =>
          prev.view === "conversation"
            ? {
                ...prev,
                convMessages: [...prev.convMessages, newMsg],
                convLastMessageId: newMsg.id,
                text: "",
                sending: false,
              }
            : {
                ...prev,
                messages: [...prev.messages, newMsg],
                lastMessageId: newMsg.id,
                text: "",
                sending: false,
              },
        );
        return;
      }
      updateState({ text: "", sending: false });
    } catch (e) {
      updateState({ chatError: extractErrorMessage(e, "Failed to send message"), sending: false });
    }
  }, [
    state.text,
    state.sending,
    state.editingId,
    state.view,
    state.activeConversation,
    updateState,
  ]);

  const uploadPhoto = useCallback(
    async (file: File) => {
      updateState({ uploading: true });
      try {
        const { imageUrl } = await stockControlApiClient.uploadChatImage(file);
        const conversationId =
          state.view === "conversation" && state.activeConversation
            ? state.activeConversation.id
            : null;
        const newMsg = await stockControlApiClient.sendChatMessage("", imageUrl, conversationId);
        if (newMsg.id) {
          setState((prev) =>
            prev.view === "conversation"
              ? {
                  ...prev,
                  convMessages: [...prev.convMessages, newMsg],
                  convLastMessageId: newMsg.id,
                  uploading: false,
                }
              : {
                  ...prev,
                  messages: [...prev.messages, newMsg],
                  lastMessageId: newMsg.id,
                  uploading: false,
                },
          );
          return;
        }
        updateState({ uploading: false });
      } catch (e) {
        updateState({
          chatError: extractErrorMessage(e, "Failed to upload photo"),
          uploading: false,
        });
      }
    },
    [state.view, state.activeConversation, updateState],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      if (e.key === "ArrowUp" && state.text === "" && !state.editingId) {
        e.preventDefault();
        const myMessages = currentMessages.filter((m) => m.senderId === user?.id);
        const last = myMessages[myMessages.length - 1];
        if (last) {
          updateState({ editingId: last.id, text: last.text });
        }
      }
      if (e.key === "Escape" && state.editingId) {
        updateState({ editingId: null, text: "" });
      }
    },
    [sendMessage, state.text, state.editingId, currentMessages, user?.id, updateState],
  );

  const startEdit = useCallback(
    (msg: ChatMsg) => {
      updateState({ editingId: msg.id, text: msg.text });
    },
    [updateState],
  );

  const openConversation = useCallback(
    (conv: ChatConversationResponse) => {
      updateState({
        activeConversation: conv,
        convMessages: [],
        convLastMessageId: null,
        view: "conversation",
        editingId: null,
        text: "",
      });
    },
    [updateState],
  );

  const openNewConversation = useCallback(async () => {
    try {
      const members = await stockControlApiClient.chatTeamMembers();
      updateState({
        teamMembers: members.filter((m) => m.id !== user?.id),
        selectedUserIds: [],
        groupName: "",
        searchQuery: "",
        view: "new-conversation",
      });
    } catch (e) {
      updateState({ chatError: extractErrorMessage(e, "Failed to load team members") });
    }
  }, [user?.id, updateState]);

  const createConversation = useCallback(async () => {
    if (state.selectedUserIds.length === 0) return;

    try {
      const name = state.selectedUserIds.length > 1 ? state.groupName.trim() || null : null;
      const conv = await stockControlApiClient.createChatConversation(state.selectedUserIds, name);
      setState((prev) => ({
        ...prev,
        conversations: [conv, ...prev.conversations],
        activeConversation: conv,
        convMessages: [],
        convLastMessageId: null,
        view: "conversation" as ChatView,
        editingId: null,
        text: "",
      }));
    } catch (e) {
      updateState({ chatError: extractErrorMessage(e, "Failed to create conversation") });
    }
  }, [state.selectedUserIds, state.groupName, updateState]);

  const toggleUserSelection = useCallback((userId: number) => {
    setState((prev) => ({
      ...prev,
      selectedUserIds: prev.selectedUserIds.includes(userId)
        ? prev.selectedUserIds.filter((id) => id !== userId)
        : [...prev.selectedUserIds, userId],
    }));
  }, []);

  const filteredTeamMembers = state.teamMembers.filter(
    (m) =>
      state.searchQuery === "" ||
      m.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(state.searchQuery.toLowerCase()),
  );

  return {
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
  };
}
