import type {
  AdminRfqQueryDto,
  AiUsageQueryParams,
  CustomerQueryDto,
} from "@/app/lib/api/adminApi";

export const adminKeys = {
  customers: {
    all: ["admin", "customers"] as const,
    list: (params?: CustomerQueryDto) =>
      [...adminKeys.customers.all, "list", params ?? {}] as const,
    detail: (id: number) => [...adminKeys.customers.all, "detail", id] as const,
    loginHistory: (id: number) => [...adminKeys.customers.all, id, "loginHistory"] as const,
    documents: (id: number) => [...adminKeys.customers.all, id, "documents"] as const,
    customFields: (id: number) => [...adminKeys.customers.all, id, "customFields"] as const,
  },
  suppliers: {
    all: ["admin", "suppliers"] as const,
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      [...adminKeys.suppliers.all, "list", params ?? {}] as const,
    detail: (id: number) => [...adminKeys.suppliers.all, "detail", id] as const,
  },
  dashboard: {
    all: ["admin", "dashboard"] as const,
    stats: () => [...adminKeys.dashboard.all, "stats"] as const,
    // Per-app "needs attention" counts for the Global Apps badges + dashboard panel.
    attention: () => [...adminKeys.dashboard.all, "attention"] as const,
  },
  inboundEmails: {
    all: ["admin", "inboundEmails"] as const,
    configs: () => [...adminKeys.inboundEmails.all, "configs"] as const,
  },
  rfqs: {
    all: ["admin", "rfqs"] as const,
    list: (params?: AdminRfqQueryDto) => [...adminKeys.rfqs.all, "list", params ?? {}] as const,
    detail: (id: number) => [...adminKeys.rfqs.all, "detail", id] as const,
    fullDraft: (id: number) => [...adminKeys.rfqs.all, "fullDraft", id] as const,
  },
  approvals: {
    all: ["admin", "approvals"] as const,
    customers: () => [...adminKeys.approvals.all, "customers"] as const,
    suppliers: () => [...adminKeys.approvals.all, "suppliers"] as const,
  },
  users: {
    all: ["admin", "users"] as const,
    list: () => [...adminKeys.users.all, "list"] as const,
  },
  secureDocuments: {
    all: ["admin", "secureDocuments"] as const,
    list: () => [...adminKeys.secureDocuments.all, "list"] as const,
    detail: (id: string) => [...adminKeys.secureDocuments.all, "detail", id] as const,
    local: () => [...adminKeys.secureDocuments.all, "local"] as const,
    entityFolders: () => [...adminKeys.secureDocuments.all, "entityFolders"] as const,
  },
  aiUsage: {
    all: ["admin", "aiUsage"] as const,
    list: (params?: AiUsageQueryParams) =>
      [...adminKeys.aiUsage.all, "list", params ?? {}] as const,
  },
  scheduledJobs: {
    all: ["admin", "scheduledJobs"] as const,
    list: () => [...adminKeys.scheduledJobs.all, "list"] as const,
  },
  pollingJobs: {
    all: ["admin", "pollingJobs"] as const,
    list: () => [...adminKeys.pollingJobs.all, "list"] as const,
    config: () => [...adminKeys.pollingJobs.all, "config"] as const,
    globalSettings: () => [...adminKeys.pollingJobs.all, "globalSettings"] as const,
  },
  companyProfile: {
    all: ["admin", "companyProfile"] as const,
    detail: () => [...adminKeys.companyProfile.all, "detail"] as const,
  },
  feedback: {
    all: ["admin", "feedback"] as const,
    list: () => [...adminKeys.feedback.all, "list"] as const,
    detail: (id: number) => [...adminKeys.feedback.all, "detail", id] as const,
    attachments: (id: number) => [...adminKeys.feedback.all, "attachments", id] as const,
  },
  metrics: {
    all: ["admin", "metrics"] as const,
    extractionUsage: (params: {
      from?: string;
      to?: string;
      groupBy?: "category" | "operation" | "day";
      category?: string;
    }) => [...adminKeys.metrics.all, "extractionUsage", params] as const,
    neonConsumption: () => [...adminKeys.metrics.all, "neonConsumption"] as const,
  },
  orbitJobMarket: {
    all: ["admin", "orbitJobMarket"] as const,
    providers: () => [...adminKeys.orbitJobMarket.all, "providers"] as const,
    sources: () => [...adminKeys.orbitJobMarket.all, "sources"] as const,
    stats: () => [...adminKeys.orbitJobMarket.all, "stats"] as const,
    jobs: (params?: {
      country?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => [...adminKeys.orbitJobMarket.all, "jobs", params ?? {}] as const,
    duplicates: () => [...adminKeys.orbitJobMarket.all, "duplicates"] as const,
    clusterUsage: () => [...adminKeys.orbitJobMarket.all, "clusterUsage"] as const,
    retentionCap: () => [...adminKeys.orbitJobMarket.all, "retentionCap"] as const,
  },
  orbitSeekers: {
    all: ["admin", "orbitSeekers"] as const,
    matchTier: (email: string) => [...adminKeys.orbitSeekers.all, "matchTier", email] as const,
    list: (params?: { search?: string; page?: number; limit?: number }) =>
      [...adminKeys.orbitSeekers.all, "list", params ?? {}] as const,
    detail: (id: number) => [...adminKeys.orbitSeekers.all, "detail", id] as const,
  },
  orbitUsers: {
    all: ["admin", "orbitUsers"] as const,
    list: (params?: { type?: string; search?: string; page?: number; limit?: number }) =>
      [...adminKeys.orbitUsers.all, "list", params ?? {}] as const,
  },
  orbitTierCapabilities: {
    all: ["admin", "orbitTierCapabilities"] as const,
    list: () => [...adminKeys.orbitTierCapabilities.all, "list"] as const,
  },
  orbitEeTargets: {
    all: ["admin", "orbitEeTargets"] as const,
    list: () => [...adminKeys.orbitEeTargets.all, "list"] as const,
  },
  orbitCredentialTypes: {
    all: ["admin", "orbitCredentialTypes"] as const,
    list: () => [...adminKeys.orbitCredentialTypes.all, "list"] as const,
  },
  orbitDismissReasons: {
    all: ["admin", "orbitDismissReasons"] as const,
    list: () => [...adminKeys.orbitDismissReasons.all, "list"] as const,
  },
  orbitDelistReports: {
    all: ["admin", "orbitDelistReports"] as const,
    list: () => [...adminKeys.orbitDelistReports.all, "list"] as const,
    count: () => [...adminKeys.orbitDelistReports.all, "count"] as const,
  },
  sso: {
    all: ["admin", "sso"] as const,
    identityReconciliation: () => [...adminKeys.sso.all, "identityReconciliation"] as const,
  },
} as const;
