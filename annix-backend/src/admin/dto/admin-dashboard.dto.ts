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
