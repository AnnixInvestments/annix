import type { CustomerQueryDto } from '@/app/lib/api/adminApi'

export const adminKeys = {
  customers: {
    all: ['admin', 'customers'] as const,
    list: (params?: CustomerQueryDto) =>
      [...adminKeys.customers.all, 'list', params ?? {}] as const,
    detail: (id: number) =>
      [...adminKeys.customers.all, 'detail', id] as const,
  },
  suppliers: {
    all: ['admin', 'suppliers'] as const,
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      [...adminKeys.suppliers.all, 'list', params ?? {}] as const,
    detail: (id: number) =>
      [...adminKeys.suppliers.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['admin', 'dashboard'] as const,
    stats: () => [...adminKeys.dashboard.all, 'stats'] as const,
  },
} as const
