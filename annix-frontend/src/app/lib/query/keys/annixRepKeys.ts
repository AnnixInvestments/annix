import type { ProspectStatus } from "@/app/lib/api/annixRepApi";

export const annixRepKeys = {
  all: ["annixRep"] as const,
  dashboard: {
    all: ["annixRep", "dashboard"] as const,
    data: () => [...annixRepKeys.dashboard.all, "data"] as const,
  },
  organization: {
    all: ["annixRep", "organization"] as const,
    current: () => [...annixRepKeys.organization.all, "current"] as const,
    stats: (id: number) => [...annixRepKeys.organization.all, "stats", id] as const,
  },
  team: {
    all: ["annixRep", "team"] as const,
    members: () => [...annixRepKeys.team.all, "members"] as const,
    member: (id: number) => [...annixRepKeys.team.all, "member", id] as const,
    hierarchy: () => [...annixRepKeys.team.all, "hierarchy"] as const,
    myTeam: () => [...annixRepKeys.team.all, "myTeam"] as const,
  },
  invitations: {
    all: ["annixRep", "invitations"] as const,
    list: () => [...annixRepKeys.invitations.all, "list"] as const,
    validate: (token: string) => [...annixRepKeys.invitations.all, "validate", token] as const,
  },
  territories: {
    all: ["annixRep", "territories"] as const,
    list: () => [...annixRepKeys.territories.all, "list"] as const,
    my: () => [...annixRepKeys.territories.all, "my"] as const,
    detail: (id: number) => [...annixRepKeys.territories.all, "detail", id] as const,
    prospects: (id: number) => [...annixRepKeys.territories.all, "prospects", id] as const,
  },
  handoff: {
    all: ["annixRep", "handoff"] as const,
    history: (prospectId: number) => [...annixRepKeys.handoff.all, "history", prospectId] as const,
  },
  teamActivity: {
    all: ["annixRep", "teamActivity"] as const,
    feed: (limit?: number) => [...annixRepKeys.teamActivity.all, "feed", limit] as const,
    myTeamFeed: (limit?: number) =>
      [...annixRepKeys.teamActivity.all, "myTeamFeed", limit] as const,
    userActivity: (userId: number, limit?: number) =>
      [...annixRepKeys.teamActivity.all, "userActivity", userId, limit] as const,
  },
  managerDashboard: {
    all: ["annixRep", "managerDashboard"] as const,
    data: () => [...annixRepKeys.managerDashboard.all, "data"] as const,
    teamPerformance: (period?: string) =>
      [...annixRepKeys.managerDashboard.all, "teamPerformance", period] as const,
    territoryPerformance: () =>
      [...annixRepKeys.managerDashboard.all, "territoryPerformance"] as const,
    pipelineByRep: () => [...annixRepKeys.managerDashboard.all, "pipelineByRep"] as const,
    leaderboard: (metric?: string) =>
      [...annixRepKeys.managerDashboard.all, "leaderboard", metric] as const,
    overdueFollowUps: (limit?: number) =>
      [...annixRepKeys.managerDashboard.all, "overdueFollowUps", limit] as const,
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
    expandedRecurring: (startDate: string, endDate: string) =>
      [...annixRepKeys.meetings.all, "expandedRecurring", startDate, endDate] as const,
    seriesInstances: (parentId: number) =>
      [...annixRepKeys.meetings.all, "seriesInstances", parentId] as const,
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
    conflicts: () => [...annixRepKeys.calendars.all, "conflicts"] as const,
    conflictCount: () => [...annixRepKeys.calendars.all, "conflictCount"] as const,
    conflict: (id: number) => [...annixRepKeys.calendars.all, "conflict", id] as const,
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
    syncLogs: (configId: number, limit?: number, offset?: number) =>
      [...annixRepKeys.crm.all, "syncLogs", configId, limit, offset] as const,
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
  discovery: {
    all: ["annixRep", "discovery"] as const,
    search: (lat: number, lng: number, radiusKm?: number, sources?: string[]) =>
      [...annixRepKeys.discovery.all, "search", lat, lng, radiusKm, sources?.join(",")] as const,
    quota: () => [...annixRepKeys.discovery.all, "quota"] as const,
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
  bookingLinks: {
    all: ["annixRep", "bookingLinks"] as const,
    list: () => [...annixRepKeys.bookingLinks.all, "list"] as const,
    detail: (id: number) => [...annixRepKeys.bookingLinks.all, "detail", id] as const,
  },
  publicBooking: {
    all: ["publicBooking"] as const,
    linkDetails: (slug: string) => [...annixRepKeys.publicBooking.all, "link", slug] as const,
    availability: (slug: string, date: string) =>
      [...annixRepKeys.publicBooking.all, "availability", slug, date] as const,
  },
  reports: {
    all: ["annixRep", "reports"] as const,
    weeklyActivity: (startDate: string, endDate: string) =>
      [...annixRepKeys.reports.all, "weeklyActivity", startDate, endDate] as const,
    monthlySales: (month: string) => [...annixRepKeys.reports.all, "monthlySales", month] as const,
    territoryCoverage: (startDate: string, endDate: string) =>
      [...annixRepKeys.reports.all, "territoryCoverage", startDate, endDate] as const,
    meetingOutcomes: (startDate: string, endDate: string) =>
      [...annixRepKeys.reports.all, "meetingOutcomes", startDate, endDate] as const,
  },
  meetingPlatforms: {
    all: ["annixRep", "meetingPlatforms"] as const,
    connections: () => [...annixRepKeys.meetingPlatforms.all, "connections"] as const,
    connection: (id: number) => [...annixRepKeys.meetingPlatforms.all, "connection", id] as const,
    recordings: (connectionId: number, limit?: number) =>
      [...annixRepKeys.meetingPlatforms.all, "recordings", connectionId, limit] as const,
    recording: (recordId: number) =>
      [...annixRepKeys.meetingPlatforms.all, "recording", recordId] as const,
    availablePlatforms: () => [...annixRepKeys.meetingPlatforms.all, "availablePlatforms"] as const,
  },
  teamsBot: {
    all: ["annixRep", "teamsBot"] as const,
    activeSessions: () => [...annixRepKeys.teamsBot.all, "activeSessions"] as const,
    sessionHistory: (limit?: number) =>
      [...annixRepKeys.teamsBot.all, "sessionHistory", limit] as const,
    session: (sessionId: string) => [...annixRepKeys.teamsBot.all, "session", sessionId] as const,
    transcript: (sessionId: string) =>
      [...annixRepKeys.teamsBot.all, "transcript", sessionId] as const,
  },
} as const;
