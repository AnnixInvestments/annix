export interface CvCandidateQueryParams {
  status?: string | null;
  jobPostingId?: number | null;
}

export interface CvExternalJobQueryParams {
  country?: string;
  category?: string;
  search?: string | null;
  page?: number;
  limit?: number;
}

export const annixOrbitKeys = {
  all: ["annix-orbit"] as const,

  dashboard: {
    all: ["annix-orbit", "dashboard"] as const,
    stats: () => ["annix-orbit", "dashboard", "stats"] as const,
    topCandidates: () => ["annix-orbit", "dashboard", "top-candidates"] as const,
    marketInsights: () => ["annix-orbit", "dashboard", "market-insights"] as const,
  },

  candidates: {
    all: ["annix-orbit", "candidates"] as const,
    list: (params?: CvCandidateQueryParams) =>
      ["annix-orbit", "candidates", "list", params ?? {}] as const,
    detail: (id: number) => ["annix-orbit", "candidates", "detail", id] as const,
    recommendedJobs: (candidateId: number) =>
      ["annix-orbit", "candidates", "recommended-jobs", candidateId] as const,
    popiaStats: () => ["annix-orbit", "candidates", "popia-stats"] as const,
  },

  jobPostings: {
    all: ["annix-orbit", "job-postings"] as const,
    list: (status?: string) => ["annix-orbit", "job-postings", "list", status ?? "all"] as const,
    detail: (id: number) => ["annix-orbit", "job-postings", "detail", id] as const,
    wizard: (id: number) => ["annix-orbit", "job-postings", "wizard", id] as const,
  },

  emailTemplates: {
    all: ["annix-orbit", "email-templates"] as const,
    detail: (kind: string) => ["annix-orbit", "email-templates", "detail", kind] as const,
  },

  references: {
    all: ["annix-orbit", "references"] as const,
    list: (status?: string | null) =>
      ["annix-orbit", "references", "list", status ?? "all"] as const,
  },

  settings: {
    all: ["annix-orbit", "settings"] as const,
    company: () => ["annix-orbit", "settings", "company"] as const,
    notifications: () => ["annix-orbit", "settings", "notifications"] as const,
  },

  jobMarket: {
    all: ["annix-orbit", "job-market"] as const,
    providers: () => ["annix-orbit", "job-market", "providers"] as const,
    stats: () => ["annix-orbit", "job-market", "stats"] as const,
    sources: () => ["annix-orbit", "job-market", "sources"] as const,
    jobs: (params?: CvExternalJobQueryParams) =>
      ["annix-orbit", "job-market", "jobs", params ?? {}] as const,
    jobDetail: (id: number) => ["annix-orbit", "job-market", "jobs", "detail", id] as const,
    matchingCandidates: (jobId: number) =>
      ["annix-orbit", "job-market", "matching-candidates", jobId] as const,
  },

  analytics: {
    all: ["annix-orbit", "analytics"] as const,
    funnel: (dateFrom?: string | null, dateTo?: string | null) =>
      ["annix-orbit", "analytics", "funnel", dateFrom ?? null, dateTo ?? null] as const,
    matchAccuracy: () => ["annix-orbit", "analytics", "match-accuracy"] as const,
    timeToFill: () => ["annix-orbit", "analytics", "time-to-fill"] as const,
    marketTrends: () => ["annix-orbit", "analytics", "market-trends"] as const,
  },

  individualProfile: {
    all: ["annix-orbit", "me"] as const,
    status: () => ["annix-orbit", "me", "profile-status"] as const,
    documents: () => ["annix-orbit", "me", "documents"] as const,
    notificationPreferences: () => ["annix-orbit", "me", "notification-preferences"] as const,
    interviewBookings: () => ["annix-orbit", "me", "interview-bookings"] as const,
    eeAttributes: () => ["annix-orbit", "me", "ee-attributes"] as const,
    interviewInvites: () => ["annix-orbit", "me", "interview-invites"] as const,
    nixGeneratedCv: () => ["annix-orbit", "me", "nix-generated-cv"] as const,
  },

  interviewSlots: {
    all: ["annix-orbit", "interview-slots"] as const,
    company: (fromIso?: string | null) =>
      ["annix-orbit", "interview-slots", "company", fromIso ?? null] as const,
    job: (jobPostingId: number) => ["annix-orbit", "interview-slots", "job", jobPostingId] as const,
  },

  compliance: {
    all: ["annix-orbit", "compliance"] as const,
    eeReport: (dateFrom: string, dateTo: string) =>
      ["annix-orbit", "compliance", "ee-report", dateFrom, dateTo] as const,
  },

  seekerJobs: {
    all: ["annix-orbit", "seeker", "jobs"] as const,
    recommended: () => ["annix-orbit", "seeker", "jobs", "recommended"] as const,
    coldStart: () => ["annix-orbit", "seeker", "jobs", "cold-start"] as const,
    browse: (params?: CvExternalJobQueryParams) =>
      ["annix-orbit", "seeker", "jobs", "browse", params ?? {}] as const,
    stats: () => ["annix-orbit", "seeker", "jobs", "stats"] as const,
    consent: () => ["annix-orbit", "seeker", "jobs", "consent"] as const,
    mutes: () => ["annix-orbit", "seeker", "jobs", "mutes"] as const,
  },
  seekerTradeProfile: {
    all: ["annix-orbit", "seeker", "trade-profile"] as const,
    detail: () => ["annix-orbit", "seeker", "trade-profile", "detail"] as const,
  },
  seekerCredentials: {
    all: ["annix-orbit", "seeker", "credentials"] as const,
    list: () => ["annix-orbit", "seeker", "credentials", "list"] as const,
  },
  workforceNeed: {
    all: ["annix-orbit", "admin", "workforce-needs"] as const,
    forRfq: (rfqId: number) => ["annix-orbit", "admin", "workforce-needs", "rfq", rfqId] as const,
  },
} as const;
