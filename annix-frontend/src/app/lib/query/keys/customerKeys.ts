export const customerKeys = {
  dashboard: {
    all: ["customer", "dashboard"] as const,
    data: () => [...customerKeys.dashboard.all, "data"] as const,
  },
  rfqs: {
    all: ["customer", "rfqs"] as const,
    list: () => [...customerKeys.rfqs.all, "list"] as const,
    detail: (id: number) => [...customerKeys.rfqs.all, "detail", id] as const,
  },
  drafts: {
    all: ["customer", "drafts"] as const,
    list: () => [...customerKeys.drafts.all, "list"] as const,
    detail: (id: number) => [...customerKeys.drafts.all, "detail", id] as const,
  },
  profile: {
    all: ["customer", "profile"] as const,
    data: () => [...customerKeys.profile.all, "data"] as const,
  },
  suppliers: {
    all: ["customer", "suppliers"] as const,
    list: () => [...customerKeys.suppliers.all, "list"] as const,
    invitations: () => [...customerKeys.suppliers.all, "invitations"] as const,
    directory: (filters?: Record<string, unknown>) =>
      [...customerKeys.suppliers.all, "directory", filters ?? {}] as const,
  },
  company: {
    all: ["customer", "company"] as const,
    data: () => [...customerKeys.company.all, "data"] as const,
  },
  onboarding: {
    all: ["customer", "onboarding"] as const,
    status: () => [...customerKeys.onboarding.all, "status"] as const,
  },
  documents: {
    all: ["customer", "documents"] as const,
    list: () => [...customerKeys.documents.all, "list"] as const,
  },
  messaging: {
    all: ["customer", "messaging"] as const,
    conversations: () => [...customerKeys.messaging.all, "conversations"] as const,
    conversationDetail: (id: number) =>
      [...customerKeys.messaging.all, "conversation", id] as const,
    broadcasts: () => [...customerKeys.messaging.all, "broadcasts"] as const,
  },
  feedback: {
    all: ["customer", "feedback"] as const,
  },
} as const;
