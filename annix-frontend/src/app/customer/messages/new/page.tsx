"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useCustomerAuth } from "@/app/context/CustomerAuthContext";
import { ConversationType, RelatedEntityType } from "@/app/lib/api/messagingApi";
import { useCreateCustomerConversation } from "@/app/lib/query/hooks";

export default function NewConversationPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useCustomerAuth();
  const { showToast } = useToast();
  const createConversationMutation = useCreateCustomerConversation();

  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [relatedEntityType, setRelatedEntityType] = useState<RelatedEntityType>(
    RelatedEntityType.GENERAL,
  );
  const [relatedEntityId, setRelatedEntityId] = useState("");

  const isSubmitting = createConversationMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      showToast("Please enter a subject", "error");
      return;
    }

    if (!initialMessage.trim()) {
      showToast("Please enter a message", "error");
      return;
    }

    try {
      const conversation = await createConversationMutation.mutateAsync({
        subject: subject.trim(),
        conversationType: ConversationType.SUPPORT,
        relatedEntityType,
        relatedEntityId: relatedEntityId ? Number(relatedEntityId) : undefined,
        participantIds: [],
        initialMessage: initialMessage.trim(),
      });

      showToast("Conversation created", "success");
      router.push(`/customer/messages/${conversation.id}`);
    } catch (error: any) {
      showToast(error.message || "Failed to create conversation", "error");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.push("/customer/messages")}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Conversation</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this conversation about?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="relatedType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Related to (optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                id="relatedType"
                value={relatedEntityType}
                onChange={(e) => setRelatedEntityType(e.target.value as RelatedEntityType)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value={RelatedEntityType.GENERAL}>General Inquiry</option>
                <option value={RelatedEntityType.RFQ}>RFQ</option>
                <option value={RelatedEntityType.BOQ}>BOQ</option>
              </select>
              {relatedEntityType !== RelatedEntityType.GENERAL && (
                <input
                  type="number"
                  value={relatedEntityId}
                  onChange={(e) => setRelatedEntityId(e.target.value)}
                  placeholder={`${relatedEntityType} ID`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Message *
            </label>
            <textarea
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/customer/messages")}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !initialMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Conversation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
