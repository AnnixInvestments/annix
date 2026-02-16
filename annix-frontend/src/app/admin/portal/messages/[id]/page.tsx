"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConversationThread, MessageComposer } from "@/app/components/messaging";
import { useToast } from "@/app/components/Toast";
import { adminApiClient } from "@/app/lib/api/adminApi";
import type { ConversationDetail } from "@/app/lib/api/messagingApi";
import { RelatedEntityType } from "@/app/lib/api/messagingApi";
import { useAdminConversationDetail, useSendAdminMessage } from "@/app/lib/query/hooks";
import { messagingKeys } from "@/app/lib/query/keys";

export default function AdminConversationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const conversationId = Number(params.id);

  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [isAssigning, setIsAssigning] = useState(false);

  const conversationQuery = useAdminConversationDetail(conversationId);
  const sendMutation = useSendAdminMessage();

  const conversation = conversationQuery.data ?? null;

  const isFeedbackConversation = conversation?.relatedEntityType === RelatedEntityType.FEEDBACK;

  const feedbackQuery = useQuery({
    queryKey: ["admin", "feedback", "conversation", conversationId],
    queryFn: () => adminApiClient.feedbackByConversationId(conversationId),
    enabled: isFeedbackConversation && !!conversation,
  });

  const feedback = feedbackQuery.data ?? null;

  const handleAssignToMe = async () => {
    if (!feedback) return;
    setIsAssigning(true);
    try {
      await adminApiClient.assignFeedback(feedback.id);
      await feedbackQuery.refetch();
      showToast("You are now handling this feedback", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assign feedback";
      showToast(message, "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!feedback) return;
    setIsAssigning(true);
    try {
      await adminApiClient.unassignFeedback(feedback.id);
      await feedbackQuery.refetch();
      showToast("Feedback unassigned", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unassign feedback";
      showToast(message, "error");
    } finally {
      setIsAssigning(false);
    }
  };

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
            (old) => (old ? { ...old, messages: [...old.messages, newMessage] } : old),
          );
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to send message";
          showToast(message, "error");
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
        <p>
          {conversationQuery.error instanceof Error
            ? conversationQuery.error.message
            : "Failed to load conversation"}
        </p>
        <button
          onClick={() => router.push("/admin/portal/messages")}
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
          onClick={() => router.push("/admin/portal/messages")}
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
          onClick={() => router.push("/admin/portal/messages")}
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
      </div>

      {isFeedbackConversation && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Customer Feedback
                </p>
                {feedback?.assignedTo ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Being handled by{" "}
                    <span className="font-semibold">
                      {feedback.assignedTo.firstName} {feedback.assignedTo.lastName}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Not yet assigned to anyone
                  </p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              {feedback?.assignedTo ? (
                <button
                  onClick={handleUnassign}
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-md transition-colors disabled:opacity-50"
                >
                  {isAssigning ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                  Unassign
                </button>
              ) : (
                <button
                  onClick={handleAssignToMe}
                  disabled={isAssigning}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {isAssigning ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  I'll Handle This
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="flex flex-col min-h-[600px]">
          <ConversationThread messages={conversation.messages} currentUserId={currentUserId} />

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
