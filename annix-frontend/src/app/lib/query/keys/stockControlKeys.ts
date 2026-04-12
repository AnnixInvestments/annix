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
    dispatchProgress: (id: number) =>
      [...stockControlKeys.jobCards.all, "dispatch-progress", id] as const,
    dispatchHistory: (id: number) =>
      [...stockControlKeys.jobCards.all, "dispatch-history", id] as const,
    dataBookStatuses: (ids: number[]) =>
      [...stockControlKeys.jobCards.all, "data-book-statuses", ...ids] as const,
  },
  inventory: {
    all: ["stock-control", "inventory"] as const,
    list: (params: Record<string, string | number | undefined>) =>
      [...stockControlKeys.inventory.all, "list", params] as const,
    detail: (id: number) => [...stockControlKeys.inventory.all, "detail", id] as const,
    movements: (id: number) => [...stockControlKeys.inventory.all, "movements", id] as const,
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
  inboundEmails: {
    all: ["stock-control", "inbound-emails"] as const,
    config: () => [...stockControlKeys.inboundEmails.all, "config"] as const,
    list: (filters?: Record<string, string | number | undefined>) =>
      [...stockControlKeys.inboundEmails.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...stockControlKeys.inboundEmails.all, "detail", id] as const,
    stats: () => [...stockControlKeys.inboundEmails.all, "stats"] as const,
  },
  notifications: {
    all: ["stock-control", "notifications"] as const,
    list: (filter: string) => [...stockControlKeys.notifications.all, "list", filter] as const,
  },
  cpos: {
    all: ["stock-control", "cpos"] as const,
    list: (status?: string) => [...stockControlKeys.cpos.all, "list", status ?? "all"] as const,
    detail: (id: number) => [...stockControlKeys.cpos.all, "detail", id] as const,
    calloffRecords: (id: number) => [...stockControlKeys.cpos.all, "calloff-records", id] as const,
    deliveryHistory: (id: number) =>
      [...stockControlKeys.cpos.all, "delivery-history", id] as const,
  },
  calibration: {
    all: ["stock-control", "calibration"] as const,
    list: (filterActive: string) =>
      [...stockControlKeys.calibration.all, "list", filterActive] as const,
  },
  requisitions: {
    all: ["stock-control", "requisitions"] as const,
    list: () => [...stockControlKeys.requisitions.all, "list"] as const,
    detail: (id: number) => [...stockControlKeys.requisitions.all, "detail", id] as const,
  },
  jobCardDetail: {
    all: ["stock-control", "job-card-detail"] as const,
    data: (id: number) => [...stockControlKeys.jobCardDetail.all, "data", id] as const,
    allocations: (id: number) =>
      [...stockControlKeys.jobCardDetail.all, "allocations", id] as const,
    requisition: (id: number) =>
      [...stockControlKeys.jobCardDetail.all, "requisition", id] as const,
    deliveryJobCards: (id: number) =>
      [...stockControlKeys.jobCardDetail.all, "delivery-job-cards", id] as const,
    workflow: (id: number) => [...stockControlKeys.jobCardDetail.all, "workflow", id] as const,
    approvals: (id: number) => [...stockControlKeys.jobCardDetail.all, "approvals", id] as const,
  },
  reports: {
    all: ["stock-control", "reports"] as const,
    costByJob: () => [...stockControlKeys.reports.all, "cost-by-job"] as const,
    stockValuation: () => [...stockControlKeys.reports.all, "stock-valuation"] as const,
    movementHistory: (params?: Record<string, string | number | undefined>) =>
      [...stockControlKeys.reports.all, "movement-history", params ?? {}] as const,
    staffStock: (filters?: Record<string, string | number | undefined>) =>
      [...stockControlKeys.reports.all, "staff-stock", filters ?? {}] as const,
    staffMembers: () => [...stockControlKeys.reports.all, "staff-members"] as const,
    departments: () => [...stockControlKeys.reports.all, "departments"] as const,
    stockItems: () => [...stockControlKeys.reports.all, "stock-items"] as const,
  },
  certificates: {
    all: ["stock-control", "certificates"] as const,
    list: (filters?: Record<string, string | number>) =>
      [...stockControlKeys.certificates.all, "list", filters ?? {}] as const,
    suppliers: () => [...stockControlKeys.certificates.all, "suppliers"] as const,
    stockItems: () => [...stockControlKeys.certificates.all, "stock-items"] as const,
  },
  cpoReports: {
    all: ["stock-control", "cpo-reports"] as const,
    fulfillment: () => [...stockControlKeys.cpoReports.all, "fulfillment"] as const,
    calloff: () => [...stockControlKeys.cpoReports.all, "calloff"] as const,
    overdue: () => [...stockControlKeys.cpoReports.all, "overdue"] as const,
  },
  issueStock: {
    all: ["stock-control", "issue-stock"] as const,
    staffMembers: () => [...stockControlKeys.issueStock.all, "staff-members"] as const,
    recentIssuances: () => [...stockControlKeys.issueStock.all, "recent-issuances"] as const,
    linkedStaff: (id: number) => [...stockControlKeys.issueStock.all, "linked-staff", id] as const,
  },
  cpoBatchIssuance: {
    all: ["stock-control", "cpo-batch-issuance"] as const,
    context: (cpoId: number) =>
      [...stockControlKeys.cpoBatchIssuance.all, "context", cpoId] as const,
    session: (sessionId: number) =>
      [...stockControlKeys.cpoBatchIssuance.all, "session", sessionId] as const,
    pendingApproval: () => [...stockControlKeys.cpoBatchIssuance.all, "pending-approval"] as const,
    forCpo: (cpoId: number) =>
      [...stockControlKeys.cpoBatchIssuance.all, "for-cpo", cpoId] as const,
    forJobCard: (jobCardId: number) =>
      [...stockControlKeys.cpoBatchIssuance.all, "for-job-card", jobCardId] as const,
  },
  positector: {
    all: ["stock-control", "positector"] as const,
    devices: () => [...stockControlKeys.positector.all, "devices"] as const,
  },
  shoreHardness: {
    all: ["stock-control", "shore-hardness"] as const,
    list: () => [...stockControlKeys.shoreHardness.all, "list"] as const,
  },
  environmentalRecords: {
    all: ["stock-control", "environmental-records"] as const,
    list: () => [...stockControlKeys.environmentalRecords.all, "list"] as const,
  },
  blastProfiles: {
    all: ["stock-control", "blast-profiles"] as const,
    list: () => [...stockControlKeys.blastProfiles.all, "list"] as const,
  },
  dftReadings: {
    all: ["stock-control", "dft-readings"] as const,
    list: () => [...stockControlKeys.dftReadings.all, "list"] as const,
  },
  qcpLog: {
    all: ["stock-control", "qcp-log"] as const,
    list: (search?: string) => [...stockControlKeys.qcpLog.all, "list", search ?? ""] as const,
  },
  glossary: {
    all: ["stock-control", "glossary"] as const,
  },
  inspections: {
    all: ["stock-control", "inspections"] as const,
    forRange: (startDate: string, endDate: string) =>
      [...stockControlKeys.inspections.all, "range", startDate, endDate] as const,
  },
  staff: {
    all: ["stock-control", "staff"] as const,
    list: (params: { search?: string; active?: string }) =>
      [...stockControlKeys.staff.all, "list", params] as const,
    departments: () => [...stockControlKeys.staff.all, "departments"] as const,
  },
  settings: {
    all: ["stock-control", "settings"] as const,
    companyRoles: () => [...stockControlKeys.settings.all, "company-roles"] as const,
    teamMembers: () => [...stockControlKeys.settings.all, "team-members"] as const,
  },
  workflowConfig: {
    all: ["stock-control", "workflow-config"] as const,
    foreground: () => [...stockControlKeys.workflowConfig.all, "foreground"] as const,
    background: () => [...stockControlKeys.workflowConfig.all, "background"] as const,
  },
  supplierDocuments: {
    all: ["stock-control", "supplier-documents"] as const,
    list: (filters?: Record<string, string | number | undefined>) =>
      [...stockControlKeys.supplierDocuments.all, "list", filters ?? {}] as const,
  },
  suppliers: {
    all: ["stock-control", "suppliers"] as const,
    list: () => [...stockControlKeys.suppliers.all, "list"] as const,
  },
  leave: {
    all: ["stock-control", "leave"] as const,
    month: (year: number, month: number) =>
      [...stockControlKeys.leave.all, "month", year, month] as const,
  },
  dispatch: {
    all: ["stock-control", "dispatch"] as const,
    cdns: (jobCardId: number) => [...stockControlKeys.dispatch.all, "cdns", jobCardId] as const,
    loadPhotos: (jobCardId: number) =>
      [...stockControlKeys.dispatch.all, "load-photos", jobCardId] as const,
  },
};
