export const annixSentinelKeys = {
  all: ["annix-sentinel"] as const,
  compliance: {
    all: ["annix-sentinel", "compliance"] as const,
    dashboard: () => [...annixSentinelKeys.compliance.all, "dashboard"] as const,
    requirements: () => [...annixSentinelKeys.compliance.all, "requirements"] as const,
  },
  documents: {
    all: ["annix-sentinel", "documents"] as const,
    list: () => [...annixSentinelKeys.documents.all, "list"] as const,
    byRequirement: (reqId: string) =>
      [...annixSentinelKeys.documents.all, "by-requirement", reqId] as const,
  },
  governmentDocuments: {
    all: ["annix-sentinel", "government-documents"] as const,
    list: () => ["annix-sentinel", "government-documents", "list"] as const,
  },
  notifications: {
    all: ["annix-sentinel", "notifications"] as const,
    list: () => [...annixSentinelKeys.notifications.all, "list"] as const,
    preferences: () => [...annixSentinelKeys.notifications.all, "preferences"] as const,
  },
  regulatory: {
    all: ["annix-sentinel", "regulatory"] as const,
    updates: (limit?: number) =>
      [...annixSentinelKeys.regulatory.all, "updates", limit ?? "all"] as const,
    byCategory: (category: string) =>
      [...annixSentinelKeys.regulatory.all, "by-category", category] as const,
  },
  templates: {
    all: ["annix-sentinel", "templates"] as const,
    list: () => [...annixSentinelKeys.templates.all, "list"] as const,
  },
  tender: {
    all: ["annix-sentinel", "tender"] as const,
    checklist: () => [...annixSentinelKeys.tender.all, "checklist"] as const,
    score: () => [...annixSentinelKeys.tender.all, "score"] as const,
  },
  bbee: {
    all: ["annix-sentinel", "bbee"] as const,
    scorecardElements: () => [...annixSentinelKeys.bbee.all, "scorecard-elements"] as const,
  },
  tax: {
    all: ["annix-sentinel", "tax"] as const,
    calendar: (yearEndMonth: number) =>
      [...annixSentinelKeys.tax.all, "calendar", yearEndMonth] as const,
    setaGrants: () => [...annixSentinelKeys.tax.all, "seta-grants"] as const,
  },
  advisor: {
    all: ["annix-sentinel", "advisor"] as const,
    dashboard: () => [...annixSentinelKeys.advisor.all, "dashboard"] as const,
    clients: () => [...annixSentinelKeys.advisor.all, "clients"] as const,
    calendar: (month: number, year: number) =>
      [...annixSentinelKeys.advisor.all, "calendar", month, year] as const,
  },
  company: {
    all: ["annix-sentinel", "company"] as const,
    profile: () => [...annixSentinelKeys.company.all, "profile"] as const,
  },
  subscriptions: {
    all: ["annix-sentinel", "subscriptions"] as const,
    status: () => [...annixSentinelKeys.subscriptions.all, "status"] as const,
  },
  apiKeys: {
    all: ["annix-sentinel", "api-keys"] as const,
    list: () => [...annixSentinelKeys.apiKeys.all, "list"] as const,
  },
  integrations: {
    all: ["annix-sentinel", "integrations"] as const,
    list: () => [...annixSentinelKeys.integrations.all, "list"] as const,
    status: (id: string) => [...annixSentinelKeys.integrations.all, "status", id] as const,
  },
  healthReport: {
    all: ["annix-sentinel", "health-report"] as const,
  },
} as const;
