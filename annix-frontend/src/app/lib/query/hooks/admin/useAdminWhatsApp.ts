import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type RbacUserWithAccessSummary,
  type UpdateUserWhatsAppPayload,
  type WhatsAppBackfillPhonesResult,
  type WhatsAppBroadcastCandidatesResponse,
  type WhatsAppConversationList,
  type WhatsAppMessage,
  type WhatsAppStatus,
} from "@/app/lib/api/adminApi";
import { rbacKeys } from "@/app/lib/query/keys";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

const INBOX_LIST_POLL = 30 * 1000;
const OPEN_THREAD_POLL = 10 * 1000;

export function useAdminWhatsAppStatus() {
  return useQuery<WhatsAppStatus>({
    queryKey: adminKeys.whatsApp.status(),
    queryFn: () => adminApiClient.whatsAppStatus(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAdminWhatsAppConversations(page = 1) {
  return useQuery<WhatsAppConversationList>({
    queryKey: adminKeys.whatsApp.conversations(page),
    queryFn: () => adminApiClient.whatsAppConversations(page),
    // eslint-disable-next-line no-restricted-syntax -- live chat inbox: new inbound conversations must surface promptly; admin-only, low concurrency
    refetchInterval: INBOX_LIST_POLL,
    refetchOnWindowFocus: true,
  });
}

export function useAdminWhatsAppMessages(conversationId: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: adminKeys.whatsApp.messages(conversationId ?? ""),
    queryFn: () => adminApiClient.whatsAppMessages(conversationId ?? ""),
    enabled: conversationId !== null,
    // eslint-disable-next-line no-restricted-syntax -- open thread polls for incoming replies in near-real-time; single conversation, admin-only
    refetchInterval: OPEN_THREAD_POLL,
    refetchOnWindowFocus: true,
  });
}

export function useAdminSendWhatsAppReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      adminApiClient.sendWhatsAppReply(conversationId, body),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        adminKeys.whatsApp.messages(variables.conversationId),
        data.messages,
      );
      queryClient.invalidateQueries({ queryKey: adminKeys.whatsApp.all });
    },
  });
}

export function useAdminWhatsAppBroadcastCandidates(appCode: string | null) {
  return useQuery<WhatsAppBroadcastCandidatesResponse>({
    queryKey: adminKeys.whatsApp.broadcastCandidates(appCode),
    queryFn: () => adminApiClient.whatsAppBroadcastCandidates(appCode),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminMarkWhatsAppRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      adminApiClient.markWhatsAppConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.whatsApp.all });
    },
  });
}

export function useUpdateUserWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation<
    RbacUserWithAccessSummary,
    Error,
    { userId: number; payload: UpdateUserWhatsAppPayload }
  >({
    mutationFn: ({ userId, payload }) => adminApiClient.updateUserWhatsApp(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbacKeys.users.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.whatsApp.all });
    },
  });
}

export function useWhatsAppBackfillPhones() {
  const queryClient = useQueryClient();
  return useMutation<WhatsAppBackfillPhonesResult, Error, void>({
    mutationFn: () => adminApiClient.whatsAppBackfillPhones(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.whatsApp.all });
    },
  });
}
