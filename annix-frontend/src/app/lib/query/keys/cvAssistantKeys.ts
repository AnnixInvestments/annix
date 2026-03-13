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
} as const;
