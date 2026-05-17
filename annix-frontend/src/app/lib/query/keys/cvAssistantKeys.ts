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

export const cvAssistantKeys = {
  all: ["cv-assistant"] as const,

  dashboard: {
    all: ["cv-assistant", "dashboard"] as const,
    stats: () => ["cv-assistant", "dashboard", "stats"] as const,
    topCandidates: () => ["cv-assistant", "dashboard", "top-candidates"] as const,
    marketInsights: () => ["cv-assistant", "dashboard", "market-insights"] as const,
  },

  candidates: {
    all: ["cv-assistant", "candidates"] as const,
    list: (params?: CvCandidateQueryParams) =>
      ["cv-assistant", "candidates", "list", params ?? {}] as const,
    detail: (id: number) => ["cv-assistant", "candidates", "detail", id] as const,
    recommendedJobs: (candidateId: number) =>
      ["cv-assistant", "candidates", "recommended-jobs", candidateId] as const,
    popiaStats: () => ["cv-assistant", "candidates", "popia-stats"] as const,
  },

  jobPostings: {
    all: ["cv-assistant", "job-postings"] as const,
    list: (status?: string) => ["cv-assistant", "job-postings", "list", status ?? "all"] as const,
    detail: (id: number) => ["cv-assistant", "job-postings", "detail", id] as const,
    wizard: (id: number) => ["cv-assistant", "job-postings", "wizard", id] as const,
  },

  emailTemplates: {
    all: ["cv-assistant", "email-templates"] as const,
    detail: (kind: string) => ["cv-assistant", "email-templates", "detail", kind] as const,
  },

  references: {
    all: ["cv-assistant", "references"] as const,
    list: (status?: string | null) =>
      ["cv-assistant", "references", "list", status ?? "all"] as const,
  },

  settings: {
    all: ["cv-assistant", "settings"] as const,
    company: () => ["cv-assistant", "settings", "company"] as const,
    notifications: () => ["cv-assistant", "settings", "notifications"] as const,
  },

  jobMarket: {
    all: ["cv-assistant", "job-market"] as const,
    providers: () => ["cv-assistant", "job-market", "providers"] as const,
    stats: () => ["cv-assistant", "job-market", "stats"] as const,
    sources: () => ["cv-assistant", "job-market", "sources"] as const,
    jobs: (params?: CvExternalJobQueryParams) =>
      ["cv-assistant", "job-market", "jobs", params ?? {}] as const,
    jobDetail: (id: number) => ["cv-assistant", "job-market", "jobs", "detail", id] as const,
    matchingCandidates: (jobId: number) =>
      ["cv-assistant", "job-market", "matching-candidates", jobId] as const,
  },

  analytics: {
    all: ["cv-assistant", "analytics"] as const,
    funnel: (dateFrom?: string | null, dateTo?: string | null) =>
      ["cv-assistant", "analytics", "funnel", dateFrom ?? null, dateTo ?? null] as const,
    matchAccuracy: () => ["cv-assistant", "analytics", "match-accuracy"] as const,
    timeToFill: () => ["cv-assistant", "analytics", "time-to-fill"] as const,
    marketTrends: () => ["cv-assistant", "analytics", "market-trends"] as const,
  },

  individualProfile: {
    all: ["cv-assistant", "me"] as const,
    status: () => ["cv-assistant", "me", "profile-status"] as const,
    documents: () => ["cv-assistant", "me", "documents"] as const,
    notificationPreferences: () => ["cv-assistant", "me", "notification-preferences"] as const,
    interviewBookings: () => ["cv-assistant", "me", "interview-bookings"] as const,
    eeAttributes: () => ["cv-assistant", "me", "ee-attributes"] as const,
    interviewInvites: () => ["cv-assistant", "me", "interview-invites"] as const,
    nixGeneratedCv: () => ["cv-assistant", "me", "nix-generated-cv"] as const,
  },

  interviewSlots: {
    all: ["cv-assistant", "interview-slots"] as const,
    company: (fromIso?: string | null) =>
      ["cv-assistant", "interview-slots", "company", fromIso ?? null] as const,
    job: (jobPostingId: number) =>
      ["cv-assistant", "interview-slots", "job", jobPostingId] as const,
  },

  compliance: {
    all: ["cv-assistant", "compliance"] as const,
    eeReport: (dateFrom: string, dateTo: string) =>
      ["cv-assistant", "compliance", "ee-report", dateFrom, dateTo] as const,
  },

  seekerJobs: {
    all: ["cv-assistant", "seeker", "jobs"] as const,
    recommended: () => ["cv-assistant", "seeker", "jobs", "recommended"] as const,
    coldStart: () => ["cv-assistant", "seeker", "jobs", "cold-start"] as const,
    browse: (params?: CvExternalJobQueryParams) =>
      ["cv-assistant", "seeker", "jobs", "browse", params ?? {}] as const,
    stats: () => ["cv-assistant", "seeker", "jobs", "stats"] as const,
    consent: () => ["cv-assistant", "seeker", "jobs", "consent"] as const,
    mutes: () => ["cv-assistant", "seeker", "jobs", "mutes"] as const,
  },
  seekerTradeProfile: {
    all: ["cv-assistant", "seeker", "trade-profile"] as const,
    detail: () => ["cv-assistant", "seeker", "trade-profile", "detail"] as const,
  },
  seekerCredentials: {
    all: ["cv-assistant", "seeker", "credentials"] as const,
    list: () => ["cv-assistant", "seeker", "credentials", "list"] as const,
  },
  workforceNeed: {
    all: ["cv-assistant", "admin", "workforce-needs"] as const,
    forRfq: (rfqId: number) => ["cv-assistant", "admin", "workforce-needs", "rfq", rfqId] as const,
  },
} as const;
