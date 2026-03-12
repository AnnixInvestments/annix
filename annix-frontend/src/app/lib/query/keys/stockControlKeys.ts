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
  jobCards: {
    all: ["stock-control", "job-cards"] as const,
    list: (status?: string) => [...stockControlKeys.jobCards.all, "list", status ?? "all"] as const,
    detail: (id: number) => [...stockControlKeys.jobCards.all, "detail", id] as const,
    dataBookStatuses: (ids: number[]) =>
      [...stockControlKeys.jobCards.all, "data-book-statuses", ...ids] as const,
  },
  inventory: {
    all: ["stock-control", "inventory"] as const,
    list: (params: Record<string, string | number | undefined>) =>
      [...stockControlKeys.inventory.all, "list", params] as const,
    grouped: (search?: string, locationId?: number) =>
      [...stockControlKeys.inventory.all, "grouped", search ?? "", locationId ?? "all"] as const,
    categories: () => [...stockControlKeys.inventory.all, "categories"] as const,
    locations: () => [...stockControlKeys.inventory.all, "locations"] as const,
  },
  invoices: {
    all: ["stock-control", "invoices"] as const,
    list: () => [...stockControlKeys.invoices.all, "list"] as const,
    detail: (id: number) => [...stockControlKeys.invoices.all, "detail", id] as const,
  },
  deliveries: {
    all: ["stock-control", "deliveries"] as const,
    list: () => [...stockControlKeys.deliveries.all, "list"] as const,
    detail: (id: number) => [...stockControlKeys.deliveries.all, "detail", id] as const,
  },
};
