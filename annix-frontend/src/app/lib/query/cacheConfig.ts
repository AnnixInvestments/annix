export const cacheConfig = {
  static: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },

  profile: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },

  analytics: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },

  dashboard: {
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  },

  list: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },

  timeSensitive: {
    staleTime: 15 * 1000,
    gcTime: 2 * 60 * 1000,
  },

  reports: {
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },

  goals: {
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },

  recordings: {
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },

  crm: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
} as const;
