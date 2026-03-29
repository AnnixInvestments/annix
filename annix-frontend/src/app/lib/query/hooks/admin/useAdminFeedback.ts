import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FeedbackAttachmentUrl, FeedbackDetail, FeedbackItem } from "@/app/lib/api/adminApi";
import { adminApiClient as adminApi } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys/adminKeys";

export function useAdminFeedback() {
  return useQuery<FeedbackItem[]>({
    queryKey: adminKeys.feedback.list(),
    queryFn: () => adminApi.listFeedback(),
  });
}

export function useAdminFeedbackDetail(id: number | null) {
  return useQuery<FeedbackDetail | null>({
    queryKey: adminKeys.feedback.detail(id ?? 0),
    queryFn: () => adminApi.feedbackById(id ?? 0),
    enabled: id !== null,
  });
}

export function useFeedbackAttachmentUrls(feedbackId: number | null) {
  return useQuery<FeedbackAttachmentUrl[]>({
    queryKey: adminKeys.feedback.attachments(feedbackId ?? 0),
    queryFn: () => adminApi.feedbackAttachmentUrls(feedbackId ?? 0),
    enabled: feedbackId !== null,
  });
}

export function useAssignFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackId: number) => adminApi.assignFeedback(feedbackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.feedback.all });
    },
  });
}

export function useUnassignFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackId: number) => adminApi.unassignFeedback(feedbackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.feedback.all });
    },
  });
}
