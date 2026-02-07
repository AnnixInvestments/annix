"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConversationThread, MessageComposer } from "@/app/components/messaging";
import { useToast } from "@/app/components/Toast";
import { supplierMessagingApi } from "@/app/lib/api/messagingApi";
import {
  useArchiveSupplierConversation,
  useSendSupplierMessage,
  useSupplierConversationDetail,
} from "@/app/lib/query/hooks";

export default function SupplierConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();

  const conversationId = Number(params.id);
  const conversationQuery = useSupplierConversationDetail(conversationId);
  const sendMessageMutation = useSendSupplierMessage();
  const archiveMutation = useArchiveSupplierConversation();

  const conversation = conversationQuery.data ?? null;
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [localMessages, setLocalMessages] = useState<
    typeof conversation extends null ? never : NonNullable<typeof conversation>["messages"]
  >([]);

  useEffect(() => {
    if (conversation) {
      setLocalMessages(conversation.messages);
    }
  }, [conversation]);

  useEffect(() => {
    if (conversationId && conversation) {
      supplierMessagingApi.markAsRead(conversationId);
    }
  }, [conversationId, conversation]);

  useEffect(() => {
    if (conversationQuery.error) {
      showToast(
        conversationQuery.error instanceof Error
          ? conversationQuery.error.message
          : "Failed to load conversation",
        "error",
      );
      router.push("/supplier/messages");
    }
  }, [conversationQuery.error, showToast, router]);

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    try {
      const newMessage = await sendMessageMutation.mutateAsync({
        conversationId: conversation.id,
        dto: { content },
      });

      if (currentUserId === 0) {
        setCurrentUserId(newMessage.senderId);
      }

      setLocalMessages((prev) => [...prev, newMessage]);
    } catch (error: any) {
      showToast(error.message || "Failed to send message", "error");
    }
  };

  const handleArchive = async () => {
    if (!conversation) return;

    try {
      await archiveMutation.mutateAsync(conversation.id);
      showToast("Conversation archived", "success");
      router.push("/supplier/messages");
    } catch (error: any) {
      showToast(error.message || "Failed to archive conversation", "error");
    }
  };

  if (conversationQuery.isLoading) {
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
          onClick={() => router.push("/supplier/messages")}
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
          onClick={() => router.push("/supplier/messages")}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {conversation.participantNames.join(", ")}
          </p>
        </div>
        {!conversation.isArchived && (
          <button
            onClick={handleArchive}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            Archive
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="flex flex-col min-h-[600px]">
          <ConversationThread messages={localMessages} currentUserId={currentUserId} />

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
