import type { ConversationFilters, BroadcastFilters, MetricsFilters } from '@/app/lib/api/messagingApi'

export const messagingKeys = {
  conversations: {
    all: ['messaging', 'conversations'] as const,
    list: (filters?: ConversationFilters) =>
      [...messagingKeys.conversations.all, 'list', filters ?? null] as const,
    detail: (id: number) =>
      [...messagingKeys.conversations.all, 'detail', id] as const,
  },
  broadcasts: {
    all: ['messaging', 'broadcasts'] as const,
    list: (filters?: BroadcastFilters) =>
      [...messagingKeys.broadcasts.all, 'list', filters ?? null] as const,
    detail: (id: number) =>
      [...messagingKeys.broadcasts.all, 'detail', id] as const,
  },
  metrics: {
    all: ['messaging', 'metrics'] as const,
    summary: (filters?: MetricsFilters) =>
      [...messagingKeys.metrics.all, 'summary', filters ?? null] as const,
  },
  sla: {
    all: ['messaging', 'sla'] as const,
    config: () => [...messagingKeys.sla.all, 'config'] as const,
  },
} as const
