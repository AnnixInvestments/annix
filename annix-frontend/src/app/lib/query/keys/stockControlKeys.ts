export const stockControlKeys = {
  all: ["stock-control"] as const,
  dashboard: {
    all: ["stock-control", "dashboard"] as const,
    stats: () => [...stockControlKeys.dashboard.all, "stats"] as const,
    workflowLanes: () => [...stockControlKeys.dashboard.all, "workflow-lanes"] as const,
    sohByLocation: () => [...stockControlKeys.dashboard.all, "soh-by-location"] as const,
    sohSummary: () => [...stockControlKeys.dashboard.all, "soh-summary"] as const,
    recentActivity: () => [...stockControlKeys.dashboard.all, "recent-activity"] as const,
    reorderAlerts: () => [...stockControlKeys.dashboard.all, "reorder-alerts"] as const,
    pendingApprovals: () => [...stockControlKeys.dashboard.all, "pending-approvals"] as const,
    cpoSummary: () => [...stockControlKeys.dashboard.all, "cpo-summary"] as const,
    roleSummary: (role: string) =>
      [...stockControlKeys.dashboard.all, "role-summary", role] as const,
    preferences: () => [...stockControlKeys.dashboard.all, "preferences"] as const,
  },
};
