import type { ProspectStatus } from "@/app/lib/api/annixRepApi";

export const annixRepKeys = {
  all: ["annixRep"] as const,
  dashboard: {
    all: ["annixRep", "dashboard"] as const,
    data: () => [...annixRepKeys.dashboard.all, "data"] as const,
  },
  prospects: {
    all: ["annixRep", "prospects"] as const,
    list: () => [...annixRepKeys.prospects.all, "list"] as const,
    listByStatus: (status: ProspectStatus) =>
      [...annixRepKeys.prospects.all, "list", status] as const,
    detail: (id: number) => [...annixRepKeys.prospects.all, "detail", id] as const,
    nearby: (lat: number, lng: number, radiusKm?: number) =>
      [...annixRepKeys.prospects.all, "nearby", lat, lng, radiusKm] as const,
    stats: () => [...annixRepKeys.prospects.all, "stats"] as const,
    followUps: () => [...annixRepKeys.prospects.all, "followUps"] as const,
    duplicates: () => [...annixRepKeys.prospects.all, "duplicates"] as const,
    activities: (id: number, limit?: number) =>
      [...annixRepKeys.prospects.all, "activities", id, limit] as const,
  },
  customFields: {
    all: ["annixRep", "customFields"] as const,
    list: (includeInactive?: boolean) =>
      [...annixRepKeys.customFields.all, "list", includeInactive] as const,
    detail: (id: number) => [...annixRepKeys.customFields.all, "detail", id] as const,
  },
  meetings: {
    all: ["annixRep", "meetings"] as const,
    list: () => [...annixRepKeys.meetings.all, "list"] as const,
    today: () => [...annixRepKeys.meetings.all, "today"] as const,
    upcoming: (days?: number) => [...annixRepKeys.meetings.all, "upcoming", days] as const,
    detail: (id: number) => [...annixRepKeys.meetings.all, "detail", id] as const,
  },
  visits: {
    all: ["annixRep", "visits"] as const,
    list: () => [...annixRepKeys.visits.all, "list"] as const,
    today: () => [...annixRepKeys.visits.all, "today"] as const,
    byProspect: (prospectId: number) =>
      [...annixRepKeys.visits.all, "byProspect", prospectId] as const,
  },
  calendars: {
    all: ["annixRep", "calendars"] as const,
    connections: () => [...annixRepKeys.calendars.all, "connections"] as const,
    connection: (id: number) => [...annixRepKeys.calendars.all, "connection", id] as const,
    availableCalendars: (connectionId: number) =>
      [...annixRepKeys.calendars.all, "availableCalendars", connectionId] as const,
    events: (startDate: string, endDate: string) =>
      [...annixRepKeys.calendars.all, "events", startDate, endDate] as const,
  },
  recordings: {
    all: ["annixRep", "recordings"] as const,
    detail: (id: number) => [...annixRepKeys.recordings.all, "detail", id] as const,
    byMeeting: (meetingId: number) =>
      [...annixRepKeys.recordings.all, "meeting", meetingId] as const,
  },
  transcripts: {
    all: ["annixRep", "transcripts"] as const,
    byRecording: (recordingId: number) =>
      [...annixRepKeys.transcripts.all, "recording", recordingId] as const,
    byMeeting: (meetingId: number) =>
      [...annixRepKeys.transcripts.all, "meeting", meetingId] as const,
  },
  summaries: {
    all: ["annixRep", "summaries"] as const,
    preview: (meetingId: number) => [...annixRepKeys.summaries.all, "preview", meetingId] as const,
  },
  crm: {
    all: ["annixRep", "crm"] as const,
    configs: () => [...annixRepKeys.crm.all, "configs"] as const,
    config: (id: number) => [...annixRepKeys.crm.all, "config", id] as const,
    status: (configId: number) => [...annixRepKeys.crm.all, "status", configId] as const,
  },
  routes: {
    all: ["annixRep", "routes"] as const,
    gaps: (date: string, minGapMinutes?: number) =>
      [...annixRepKeys.routes.all, "gaps", date, minGapMinutes] as const,
    coldCallSuggestions: (date: string, lat?: number, lng?: number) =>
      [...annixRepKeys.routes.all, "coldCallSuggestions", date, lat, lng] as const,
    planDay: (date: string, includeColdCalls?: boolean, lat?: number, lng?: number) =>
      [...annixRepKeys.routes.all, "planDay", date, includeColdCalls, lat, lng] as const,
  },
  repProfile: {
    all: ["annixRep", "repProfile"] as const,
    status: () => [...annixRepKeys.repProfile.all, "status"] as const,
    profile: () => [...annixRepKeys.repProfile.all, "profile"] as const,
    searchTerms: () => [...annixRepKeys.repProfile.all, "searchTerms"] as const,
  },
  analytics: {
    all: ["annixRep", "analytics"] as const,
    summary: () => [...annixRepKeys.analytics.all, "summary"] as const,
    meetingsOverTime: (period?: "week" | "month", count?: number) =>
      [...annixRepKeys.analytics.all, "meetingsOverTime", period, count] as const,
    prospectFunnel: () => [...annixRepKeys.analytics.all, "prospectFunnel"] as const,
    winLossRateTrends: (months?: number) =>
      [...annixRepKeys.analytics.all, "winLossRateTrends", months] as const,
    activityHeatmap: () => [...annixRepKeys.analytics.all, "activityHeatmap"] as const,
    revenuePipeline: () => [...annixRepKeys.analytics.all, "revenuePipeline"] as const,
    topProspects: (limit?: number) =>
      [...annixRepKeys.analytics.all, "topProspects", limit] as const,
  },
  goals: {
    all: ["annixRep", "goals"] as const,
    list: () => [...annixRepKeys.goals.all, "list"] as const,
    byPeriod: (period: string) => [...annixRepKeys.goals.all, "byPeriod", period] as const,
    progress: (period: string) => [...annixRepKeys.goals.all, "progress", period] as const,
  },
} as const;
