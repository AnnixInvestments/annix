'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/components/Toast';
import {
  ConversationList,
  ConversationThread,
  MessageComposer,
  BroadcastBanner,
} from '@/app/components/messaging';
import {
  supplierMessagingApi,
  ConversationSummary,
  ConversationDetail,
  BroadcastSummary,
} from '@/app/lib/api/messagingApi';

export default function SupplierMessagesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetail | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [convResult, broadcastResult] = await Promise.all([
        supplierMessagingApi.conversations(),
        supplierMessagingApi.broadcasts({ unreadOnly: true }),
      ]);
      setConversations(convResult.conversations);
      setBroadcasts(broadcastResult.broadcasts);
    } catch (error: any) {
      showToast(error.message || 'Failed to load messages', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectConversation = async (conversation: ConversationSummary) => {
    try {
      const detail = await supplierMessagingApi.conversation(conversation.id);
      setSelectedConversation(detail);
      await supplierMessagingApi.markAsRead(conversation.id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation.id ? { ...c, unreadCount: 0 } : c,
        ),
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to load conversation', 'error');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const newMessage = await supplierMessagingApi.sendMessage(
        selectedConversation.id,
        { content },
      );

      if (currentUserId === 0) {
        setCurrentUserId(newMessage.senderId);
      }

      setSelectedConversation((prev) =>
        prev
          ? { ...prev, messages: [...prev.messages, newMessage] }
          : null,
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessageAt: newMessage.sentAt,
                lastMessagePreview: newMessage.content.substring(0, 100),
              }
            : c,
        ),
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
    }
  };

  const handleArchive = async (conversationId: number) => {
    try {
      await supplierMessagingApi.archiveConversation(conversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, isArchived: true } : c,
        ),
      );
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      showToast('Conversation archived', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to archive conversation', 'error');
    }
  };

  const handleMarkBroadcastRead = async (broadcastId: number) => {
    try {
      await supplierMessagingApi.markBroadcastRead(broadcastId);
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === broadcastId ? { ...b, isRead: true } : b)),
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to mark broadcast as read', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Messages
        </h1>
      </div>

      <BroadcastBanner
        broadcasts={broadcasts}
        onMarkRead={handleMarkBroadcastRead}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[600px]">
          <div className="border-r border-gray-200 dark:border-gray-700 lg:col-span-1">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              onArchive={handleArchive}
              isLoading={isLoading}
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
                    {selectedConversation.participantNames.join(', ')}
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
                <p className="text-sm">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
