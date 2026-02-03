'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/app/components/Toast';
import { ConversationThread, MessageComposer } from '@/app/components/messaging';
import {
  adminMessagingApi,
  ConversationDetail,
} from '@/app/lib/api/messagingApi';

export default function AdminConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const conversationId = Number(params.id);

  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const fetchConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      const detail = await adminMessagingApi.conversation(conversationId);
      setConversation(detail);
    } catch (error: any) {
      showToast(error.message || 'Failed to load conversation', 'error');
      router.push('/admin/portal/messages');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, router, showToast]);

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId, fetchConversation]);

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    try {
      const newMessage = await adminMessagingApi.sendMessage(conversation.id, {
        content,
      });

      if (currentUserId === 0) {
        setCurrentUserId(newMessage.senderId);
      }

      setConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : null,
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to send message', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p>Conversation not found</p>
        <button
          onClick={() => router.push('/admin/portal/messages')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/portal/messages')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {conversation.subject}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {conversation.participantNames.join(', ')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="flex flex-col min-h-[600px]">
          <ConversationThread
            messages={conversation.messages}
            currentUserId={currentUserId}
          />

          <MessageComposer
            onSend={handleSendMessage}
            disabled={conversation.isArchived}
            showAttachments={false}
          />
        </div>
      </div>
    </div>
  );
}
