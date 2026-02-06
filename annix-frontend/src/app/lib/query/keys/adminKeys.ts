import type { CustomerQueryDto, AdminRfqQueryDto } from '@/app/lib/api/adminApi'

export const adminKeys = {
  customers: {
    all: ['admin', 'customers'] as const,
    list: (params?: CustomerQueryDto) =>
      [...adminKeys.customers.all, 'list', params ?? {}] as const,
    detail: (id: number) =>
      [...adminKeys.customers.all, 'detail', id] as const,
    loginHistory: (id: number) =>
      [...adminKeys.customers.all, id, 'loginHistory'] as const,
    documents: (id: number) =>
      [...adminKeys.customers.all, id, 'documents'] as const,
    customFields: (id: number) =>
      [...adminKeys.customers.all, id, 'customFields'] as const,
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
  rfqs: {
    all: ['admin', 'rfqs'] as const,
    list: (params?: AdminRfqQueryDto) =>
      [...adminKeys.rfqs.all, 'list', params ?? {}] as const,
    detail: (id: number) =>
      [...adminKeys.rfqs.all, 'detail', id] as const,
    fullDraft: (id: number) =>
      [...adminKeys.rfqs.all, 'fullDraft', id] as const,
  },
  approvals: {
    all: ['admin', 'approvals'] as const,
    customers: () => [...adminKeys.approvals.all, 'customers'] as const,
    suppliers: () => [...adminKeys.approvals.all, 'suppliers'] as const,
  },
  users: {
    all: ['admin', 'users'] as const,
    list: () => [...adminKeys.users.all, 'list'] as const,
  },
  secureDocuments: {
    all: ['admin', 'secureDocuments'] as const,
    list: () => [...adminKeys.secureDocuments.all, 'list'] as const,
    detail: (id: string) =>
      [...adminKeys.secureDocuments.all, 'detail', id] as const,
    local: () => [...adminKeys.secureDocuments.all, 'local'] as const,
    entityFolders: () => [...adminKeys.secureDocuments.all, 'entityFolders'] as const,
  },
} as const
