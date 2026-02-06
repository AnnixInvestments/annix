import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  customerMessagingApi,
  type ConversationSummary,
  type ConversationDetail,
  type BroadcastSummary,
  type SendMessageDto,
  type CreateConversationDto,
} from '@/app/lib/api/messagingApi'
import { customerKeys } from '../../keys'

export function useCustomerConversations() {
  return useQuery<{ conversations: ConversationSummary[]; total: number }>({
    queryKey: customerKeys.messaging.conversations(),
    queryFn: () => customerMessagingApi.conversations(),
  })
}

export function useCustomerConversationDetail(id: number) {
  return useQuery<ConversationDetail>({
    queryKey: customerKeys.messaging.conversationDetail(id),
    queryFn: () => customerMessagingApi.conversation(id),
    enabled: id > 0,
  })
}

export function useCustomerBroadcasts() {
  return useQuery<{ broadcasts: BroadcastSummary[]; total: number }>({
    queryKey: customerKeys.messaging.broadcasts(),
    queryFn: () => customerMessagingApi.broadcasts({ unreadOnly: true }),
  })
}

export function useSendCustomerMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, dto }: { conversationId: number; dto: SendMessageDto }) =>
      customerMessagingApi.sendMessage(conversationId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.messaging.conversationDetail(variables.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: customerKeys.messaging.conversations(),
      })
    },
  })
}

export function useCreateCustomerConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateConversationDto) =>
      customerMessagingApi.createConversation(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.messaging.conversations(),
      })
    },
  })
}

export function useArchiveCustomerConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: number) =>
      customerMessagingApi.archiveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.messaging.conversations(),
      })
    },
  })
}

export function useMarkCustomerBroadcastRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (broadcastId: number) =>
      customerMessagingApi.markBroadcastRead(broadcastId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.messaging.broadcasts(),
      })
    },
  })
}
