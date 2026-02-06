'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/components/Toast';
import { ConversationThread, MessageComposer } from '@/app/components/messaging';
import type { ConversationDetail } from '@/app/lib/api/messagingApi';
import { messagingKeys } from '@/app/lib/query/keys';
import {
  useAdminConversationDetail,
  useSendAdminMessage,
} from '@/app/lib/query/hooks';

export default function AdminConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const conversationId = Number(params.id);

  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const conversationQuery = useAdminConversationDetail(conversationId);
  const sendMutation = useSendAdminMessage();

  const conversation = conversationQuery.data ?? null;

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    sendMutation.mutate(
      { conversationId: conversation.id, dto: { content } },
      {
        onSuccess: (newMessage) => {
          if (currentUserId === 0) {
            setCurrentUserId(newMessage.senderId);
          }

          queryClient.setQueryData<ConversationDetail>(
            messagingKeys.conversations.detail(conversation.id),
            (old) =>
              old
                ? { ...old, messages: [...old.messages, newMessage] }
                : old,
          );
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Failed to send message';
          showToast(message, 'error');
        },
      },
    );
  };

  if (conversationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (conversationQuery.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <p>{conversationQuery.error instanceof Error ? conversationQuery.error.message : 'Failed to load conversation'}</p>
        <button
          onClick={() => router.push('/admin/portal/messages')}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to Messages
        </button>
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
