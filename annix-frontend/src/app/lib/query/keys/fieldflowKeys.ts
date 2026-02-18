import type { ProspectStatus } from "@/app/lib/api/fieldflowApi";

export const fieldflowKeys = {
  all: ["fieldflow"] as const,
  dashboard: {
    all: ["fieldflow", "dashboard"] as const,
    data: () => [...fieldflowKeys.dashboard.all, "data"] as const,
  },
  prospects: {
    all: ["fieldflow", "prospects"] as const,
    list: () => [...fieldflowKeys.prospects.all, "list"] as const,
    listByStatus: (status: ProspectStatus) =>
      [...fieldflowKeys.prospects.all, "list", status] as const,
    detail: (id: number) => [...fieldflowKeys.prospects.all, "detail", id] as const,
    nearby: (lat: number, lng: number, radiusKm?: number) =>
      [...fieldflowKeys.prospects.all, "nearby", lat, lng, radiusKm] as const,
    stats: () => [...fieldflowKeys.prospects.all, "stats"] as const,
    followUps: () => [...fieldflowKeys.prospects.all, "followUps"] as const,
    duplicates: () => [...fieldflowKeys.prospects.all, "duplicates"] as const,
  },
  meetings: {
    all: ["fieldflow", "meetings"] as const,
    list: () => [...fieldflowKeys.meetings.all, "list"] as const,
    today: () => [...fieldflowKeys.meetings.all, "today"] as const,
    upcoming: (days?: number) => [...fieldflowKeys.meetings.all, "upcoming", days] as const,
    detail: (id: number) => [...fieldflowKeys.meetings.all, "detail", id] as const,
  },
  visits: {
    all: ["fieldflow", "visits"] as const,
    list: () => [...fieldflowKeys.visits.all, "list"] as const,
    today: () => [...fieldflowKeys.visits.all, "today"] as const,
    byProspect: (prospectId: number) =>
      [...fieldflowKeys.visits.all, "byProspect", prospectId] as const,
  },
  calendars: {
    all: ["fieldflow", "calendars"] as const,
    connections: () => [...fieldflowKeys.calendars.all, "connections"] as const,
    connection: (id: number) => [...fieldflowKeys.calendars.all, "connection", id] as const,
    availableCalendars: (connectionId: number) =>
      [...fieldflowKeys.calendars.all, "availableCalendars", connectionId] as const,
    events: (startDate: string, endDate: string) =>
      [...fieldflowKeys.calendars.all, "events", startDate, endDate] as const,
  },
  recordings: {
    all: ["fieldflow", "recordings"] as const,
    detail: (id: number) => [...fieldflowKeys.recordings.all, "detail", id] as const,
    byMeeting: (meetingId: number) =>
      [...fieldflowKeys.recordings.all, "meeting", meetingId] as const,
  },
  transcripts: {
    all: ["fieldflow", "transcripts"] as const,
    byRecording: (recordingId: number) =>
      [...fieldflowKeys.transcripts.all, "recording", recordingId] as const,
    byMeeting: (meetingId: number) =>
      [...fieldflowKeys.transcripts.all, "meeting", meetingId] as const,
  },
  summaries: {
    all: ["fieldflow", "summaries"] as const,
    preview: (meetingId: number) => [...fieldflowKeys.summaries.all, "preview", meetingId] as const,
  },
  crm: {
    all: ["fieldflow", "crm"] as const,
    configs: () => [...fieldflowKeys.crm.all, "configs"] as const,
    config: (id: number) => [...fieldflowKeys.crm.all, "config", id] as const,
    status: (configId: number) => [...fieldflowKeys.crm.all, "status", configId] as const,
  },
  routes: {
    all: ["fieldflow", "routes"] as const,
    gaps: (date: string, minGapMinutes?: number) =>
      [...fieldflowKeys.routes.all, "gaps", date, minGapMinutes] as const,
    coldCallSuggestions: (date: string, lat?: number, lng?: number) =>
      [...fieldflowKeys.routes.all, "coldCallSuggestions", date, lat, lng] as const,
    planDay: (date: string, includeColdCalls?: boolean, lat?: number, lng?: number) =>
      [...fieldflowKeys.routes.all, "planDay", date, includeColdCalls, lat, lng] as const,
  },
  repProfile: {
    all: ["fieldflow", "repProfile"] as const,
    status: () => [...fieldflowKeys.repProfile.all, "status"] as const,
    profile: () => [...fieldflowKeys.repProfile.all, "profile"] as const,
    searchTerms: () => [...fieldflowKeys.repProfile.all, "searchTerms"] as const,
  },
  analytics: {
    all: ["fieldflow", "analytics"] as const,
    summary: () => [...fieldflowKeys.analytics.all, "summary"] as const,
    meetingsOverTime: (period?: "week" | "month", count?: number) =>
      [...fieldflowKeys.analytics.all, "meetingsOverTime", period, count] as const,
    prospectFunnel: () => [...fieldflowKeys.analytics.all, "prospectFunnel"] as const,
    winLossRateTrends: (months?: number) =>
      [...fieldflowKeys.analytics.all, "winLossRateTrends", months] as const,
    activityHeatmap: () => [...fieldflowKeys.analytics.all, "activityHeatmap"] as const,
    revenuePipeline: () => [...fieldflowKeys.analytics.all, "revenuePipeline"] as const,
    topProspects: (limit?: number) =>
      [...fieldflowKeys.analytics.all, "topProspects", limit] as const,
  },
} as const;
