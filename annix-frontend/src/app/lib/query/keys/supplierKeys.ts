import type { SupplierBoqStatus } from "@/app/lib/api/supplierApi";

export const supplierKeys = {
  dashboard: {
    all: ["supplier", "dashboard"] as const,
    data: () => [...supplierKeys.dashboard.all, "data"] as const,
  },
  onboarding: {
    all: ["supplier", "onboarding"] as const,
    status: () => [...supplierKeys.onboarding.all, "status"] as const,
  },
  boqs: {
    all: ["supplier", "boqs"] as const,
    list: (status?: SupplierBoqStatus) =>
      [...supplierKeys.boqs.all, "list", status ?? "all"] as const,
    detail: (id: number) => [...supplierKeys.boqs.all, "detail", id] as const,
  },
  profile: {
    all: ["supplier", "profile"] as const,
    data: () => [...supplierKeys.profile.all, "data"] as const,
  },
  capabilities: {
    all: ["supplier", "capabilities"] as const,
    data: () => [...supplierKeys.capabilities.all, "data"] as const,
  },
  documents: {
    all: ["supplier", "documents"] as const,
    list: () => [...supplierKeys.documents.all, "list"] as const,
  },
  messaging: {
    all: ["supplier", "messaging"] as const,
    conversations: () => [...supplierKeys.messaging.all, "conversations"] as const,
    conversationDetail: (id: number) =>
      [...supplierKeys.messaging.all, "conversation", id] as const,
    broadcasts: () => [...supplierKeys.messaging.all, "broadcasts"] as const,
  },
} as const;
