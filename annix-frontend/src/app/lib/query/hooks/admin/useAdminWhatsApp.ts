import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type WhatsAppConversationList,
  type WhatsAppMessage,
  type WhatsAppStatus,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

const TWO_MINUTES = 2 * 60 * 1000;

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
    // eslint-disable-next-line no-restricted-syntax -- exactly the documented 2-min floor; admin inbox needs fresh arrivals
    refetchInterval: TWO_MINUTES,
  });
}

export function useAdminWhatsAppMessages(conversationId: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: adminKeys.whatsApp.messages(conversationId ?? ""),
    queryFn: () => adminApiClient.whatsAppMessages(conversationId ?? ""),
    enabled: conversationId !== null,
    // eslint-disable-next-line no-restricted-syntax -- exactly the documented 2-min floor; open thread polls for replies
    refetchInterval: TWO_MINUTES,
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
