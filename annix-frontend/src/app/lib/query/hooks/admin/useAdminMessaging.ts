import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminMessagingApi,
  type ConversationSummary,
  type ConversationDetail,
  type BroadcastDetail,
  type BroadcastFilters,
  type CreateBroadcastDto,
  type SendMessageDto,
  type ResponseMetricsSummary,
  type SlaConfig,
} from '@/app/lib/api/messagingApi'
import { messagingKeys } from '../../keys'

export function useAdminConversations() {
  return useQuery<{ conversations: ConversationSummary[]; total: number }>({
    queryKey: messagingKeys.conversations.list(),
    queryFn: () => adminMessagingApi.conversations(),
  })
}

export function useAdminConversationDetail(id: number) {
  return useQuery<ConversationDetail>({
    queryKey: messagingKeys.conversations.detail(id),
    queryFn: () => adminMessagingApi.conversation(id),
    enabled: id > 0,
  })
}

export function useSendAdminMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, dto }: { conversationId: number; dto: SendMessageDto }) =>
      adminMessagingApi.sendMessage(conversationId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations.detail(variables.conversationId),
      })
      queryClient.invalidateQueries({
        queryKey: messagingKeys.conversations.list(),
      })
    },
  })
}

export function useAdminBroadcasts(filters?: BroadcastFilters) {
  return useQuery<{ broadcasts: BroadcastDetail[]; total: number }>({
    queryKey: messagingKeys.broadcasts.list(filters),
    queryFn: () => adminMessagingApi.broadcastsAdmin(filters),
  })
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateBroadcastDto) =>
      adminMessagingApi.createBroadcast(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.broadcasts.all })
    },
  })
}

export function useAdminResponseMetrics() {
  return useQuery<ResponseMetricsSummary>({
    queryKey: messagingKeys.metrics.summary(),
    queryFn: () => adminMessagingApi.responseMetrics(),
  })
}

export function useAdminSlaConfig() {
  return useQuery<SlaConfig>({
    queryKey: messagingKeys.sla.config(),
    queryFn: () => adminMessagingApi.slaConfig(),
  })
}

export function useUpdateSlaConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: Partial<Omit<SlaConfig, 'id' | 'updatedAt'>>) =>
      adminMessagingApi.updateSlaConfig(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.sla.all })
    },
  })
}
