"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BroadcastBanner,
  ConversationList,
  ConversationThread,
  MessageComposer,
} from "@/app/components/messaging";
import { useToast } from "@/app/components/Toast";
import { useCustomerAuth } from "@/app/context/CustomerAuthContext";
import {
  type ConversationDetail,
  type ConversationSummary,
  customerMessagingApi,
} from "@/app/lib/api/messagingApi";
import {
  useArchiveCustomerConversation,
  useCustomerBroadcasts,
  useCustomerConversations,
  useMarkCustomerBroadcastRead,
  useSendCustomerMessage,
} from "@/app/lib/query/hooks";

export default function CustomerMessagesPage() {
  const router = useRouter();
  const { customer, isLoading: authLoading } = useCustomerAuth();
  const { showToast } = useToast();

  const conversationsQuery = useCustomerConversations();
  const broadcastsQuery = useCustomerBroadcasts();
  const sendMessageMutation = useSendCustomerMessage();
  const archiveMutation = useArchiveCustomerConversation();
  const markBroadcastReadMutation = useMarkCustomerBroadcastRead();

  const conversations = conversationsQuery.data?.conversations ?? [];
  const broadcasts = broadcastsQuery.data?.broadcasts ?? [];

  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const handleSelectConversation = async (conversation: ConversationSummary) => {
    try {
      const detail = await customerMessagingApi.conversation(conversation.id);
      setSelectedConversation(detail);
      await customerMessagingApi.markAsRead(conversation.id);
      conversationsQuery.refetch();
    } catch (error: any) {
      showToast(error.message || "Failed to load conversation", "error");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const newMessage = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation.id,
        dto: { content },
      });

      if (currentUserId === 0) {
        setCurrentUserId(newMessage.senderId);
      }

      setSelectedConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : null,
      );
    } catch (error: any) {
      showToast(error.message || "Failed to send message", "error");
    }
  };

  const handleArchive = async (conversationId: number) => {
    try {
      await archiveMutation.mutateAsync(conversationId);
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      showToast("Conversation archived", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to archive conversation", "error");
    }
  };

  const handleMarkBroadcastRead = async (broadcastId: number) => {
    try {
      await markBroadcastReadMutation.mutateAsync(broadcastId);
    } catch (error: any) {
      showToast(error.message || "Failed to mark broadcast as read", "error");
    }
  };

  if (authLoading || conversationsQuery.isLoading || broadcastsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <button
          onClick={() => router.push("/customer/messages/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      <BroadcastBanner broadcasts={broadcasts} onMarkRead={handleMarkBroadcastRead} />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
          <div className="border-r border-gray-200 dark:border-gray-700 lg:col-span-1">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              onArchive={handleArchive}
              isLoading={conversationsQuery.isLoading}
            />
          </div>

          <div className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedConversation.subject}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversation.participantNames.join(", ")}
                  </p>
                </div>

                <ConversationThread
                  messages={selectedConversation.messages}
                  currentUserId={currentUserId}
                />

                <MessageComposer
                  onSend={handleSendMessage}
                  disabled={selectedConversation.isArchived}
                  showAttachments={false}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <svg
                  className="w-16 h-16 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
