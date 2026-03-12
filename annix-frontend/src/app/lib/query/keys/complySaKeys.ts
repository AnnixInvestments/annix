export const complySaKeys = {
  all: ["comply-sa"] as const,
  compliance: {
    all: ["comply-sa", "compliance"] as const,
    dashboard: () => [...complySaKeys.compliance.all, "dashboard"] as const,
    requirements: () => [...complySaKeys.compliance.all, "requirements"] as const,
  },
  documents: {
    all: ["comply-sa", "documents"] as const,
    list: () => [...complySaKeys.documents.all, "list"] as const,
    byRequirement: (reqId: string) =>
      [...complySaKeys.documents.all, "by-requirement", reqId] as const,
  },
  notifications: {
    all: ["comply-sa", "notifications"] as const,
    list: () => [...complySaKeys.notifications.all, "list"] as const,
    preferences: () => [...complySaKeys.notifications.all, "preferences"] as const,
  },
  regulatory: {
    all: ["comply-sa", "regulatory"] as const,
    updates: (limit?: number) =>
      [...complySaKeys.regulatory.all, "updates", limit ?? "all"] as const,
    byCategory: (category: string) =>
      [...complySaKeys.regulatory.all, "by-category", category] as const,
  },
  templates: {
    all: ["comply-sa", "templates"] as const,
    list: () => [...complySaKeys.templates.all, "list"] as const,
  },
  tender: {
    all: ["comply-sa", "tender"] as const,
    checklist: () => [...complySaKeys.tender.all, "checklist"] as const,
    score: () => [...complySaKeys.tender.all, "score"] as const,
  },
  bbee: {
    all: ["comply-sa", "bbee"] as const,
    scorecardElements: () => [...complySaKeys.bbee.all, "scorecard-elements"] as const,
  },
  tax: {
    all: ["comply-sa", "tax"] as const,
    calendar: (yearEndMonth: number) =>
      [...complySaKeys.tax.all, "calendar", yearEndMonth] as const,
    setaGrants: () => [...complySaKeys.tax.all, "seta-grants"] as const,
  },
  advisor: {
    all: ["comply-sa", "advisor"] as const,
    dashboard: () => [...complySaKeys.advisor.all, "dashboard"] as const,
    clients: () => [...complySaKeys.advisor.all, "clients"] as const,
    calendar: (month: number, year: number) =>
      [...complySaKeys.advisor.all, "calendar", month, year] as const,
  },
  company: {
    all: ["comply-sa", "company"] as const,
    profile: () => [...complySaKeys.company.all, "profile"] as const,
  },
  subscriptions: {
    all: ["comply-sa", "subscriptions"] as const,
    status: () => [...complySaKeys.subscriptions.all, "status"] as const,
  },
  apiKeys: {
    all: ["comply-sa", "api-keys"] as const,
    list: () => [...complySaKeys.apiKeys.all, "list"] as const,
  },
  integrations: {
    all: ["comply-sa", "integrations"] as const,
    list: () => [...complySaKeys.integrations.all, "list"] as const,
    status: (id: string) => [...complySaKeys.integrations.all, "status", id] as const,
  },
  healthReport: {
    all: ["comply-sa", "health-report"] as const,
  },
} as const;
