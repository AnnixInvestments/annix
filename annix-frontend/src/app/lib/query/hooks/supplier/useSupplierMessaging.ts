import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  supplierMessagingApi,
  type ConversationSummary,
  type ConversationDetail,
  type BroadcastSummary,
  type SendMessageDto,
} from '@/app/lib/api/messagingApi'
import { supplierKeys } from '../../keys'

export function useSupplierConversations() {
  return useQuery<{ conversations: ConversationSummary[]; total: number }>({
    queryKey: supplierKeys.messaging.conversations(),
    queryFn: () => supplierMessagingApi.conversations(),
  })
}

export function useSupplierConversationDetail(id: number) {
  return useQuery<ConversationDetail>({
    queryKey: supplierKeys.messaging.conversationDetail(id),
    queryFn: () => supplierMessagingApi.conversation(id),
    enabled: id > 0,
  })
}

export function useSupplierBroadcasts() {
  return useQuery<{ broadcasts: BroadcastSummary[]; total: number }>({
    queryKey: supplierKeys.messaging.broadcasts(),
    queryFn: () => supplierMessagingApi.broadcasts({ unreadOnly: true }),
  })
}

export function useSendSupplierMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, dto }: { conversationId: number; dto: SendMessageDto }) =>
      supplierMessagingApi.sendMessage(conversationId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.messaging.conversationDetail(variables.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: supplierKeys.messaging.conversations(),
      })
    },
  })
}

export function useArchiveSupplierConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) =>
      supplierMessagingApi.archiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.messaging.conversations(),
      })
    },
  })
}

export function useMarkSupplierBroadcastRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (broadcastId: number) =>
      supplierMessagingApi.markBroadcastRead(broadcastId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supplierKeys.messaging.broadcasts(),
      })
    },
  })
}
