export const customerKeys = {
  dashboard: {
    all: ['customer', 'dashboard'] as const,
    data: () => [...customerKeys.dashboard.all, 'data'] as const,
  },
  rfqs: {
    all: ['customer', 'rfqs'] as const,
    list: () => [...customerKeys.rfqs.all, 'list'] as const,
    detail: (id: number) =>
      [...customerKeys.rfqs.all, 'detail', id] as const,
  },
  drafts: {
    all: ['customer', 'drafts'] as const,
    list: () => [...customerKeys.drafts.all, 'list'] as const,
    detail: (id: number) =>
      [...customerKeys.drafts.all, 'detail', id] as const,
  },
  profile: {
    all: ['customer', 'profile'] as const,
    data: () => [...customerKeys.profile.all, 'data'] as const,
  },
  suppliers: {
    all: ['customer', 'suppliers'] as const,
    list: () => [...customerKeys.suppliers.all, 'list'] as const,
    invitations: () =>
      [...customerKeys.suppliers.all, 'invitations'] as const,
  },
} as const
