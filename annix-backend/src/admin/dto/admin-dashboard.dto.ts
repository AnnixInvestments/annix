export class DashboardStatsDto {
  totalCustomers: number;
  totalSuppliers: number;
  totalRfqs: number;
  pendingApprovals: {
    customers: number;
    suppliers: number;
    total: number;
  };
  recentActivity?: RecentActivityItemDto[];
  systemHealth?: {
    activeCustomerSessions: number;
    activeSupplierSessions: number;
    activeAdminSessions: number;
  };
}

export class RecentActivityItemDto {
  id: number;
  timestamp: Date;
  userId: number;
  userEmail: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  clientIp: string;
}

export class CustomerStatsDto {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
  deactivated: number;
}

export class SupplierStatsDto {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
  deactivated: number;
}

export type AttentionSeverity = "info" | "warning" | "urgent";

export class AttentionItemDto {
  /** Human-readable description of the outstanding task. */
  label: string;
  /** How many records this task covers. */
  count: number;
  /** Admin route where the task can be actioned. */
  href: string;
  severity: AttentionSeverity;
}

export class AppAttentionDto {
  /** Stable app identifier, e.g. "rfq". */
  appCode: string;
  appName: string;
  /** Sum of every item's count — the badge number. */
  total: number;
  items: AttentionItemDto[];
}

export class AdminAttentionDto {
  /** Only apps with defined attention sources are listed. */
  apps: AppAttentionDto[];
}
