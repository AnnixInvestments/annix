import { toPairs as entries } from "es-toolkit/compat";
import { StockControlApiClient } from "./base";
import type {
  CostByJob,
  CpoSummary,
  DashboardPreferences,
  DashboardStats,
  RecentActivity,
  RoleDashboardSummary,
  SohByLocation,
  SohSummary,
  StaffStockFilters,
  StaffStockReportResult,
  StockIssuance,
  StockItem,
  StockMovement,
  StockValuation,
  WorkflowLaneCounts,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    dashboardStats(): Promise<DashboardStats>;
    sohSummary(): Promise<SohSummary[]>;
    sohByLocation(): Promise<SohByLocation[]>;
    recentActivity(): Promise<RecentActivity[]>;
    reorderAlerts(): Promise<StockItem[]>;
    cpoSummary(): Promise<CpoSummary>;
    roleDashboardSummary(role?: string): Promise<RoleDashboardSummary>;
    dashboardPreferences(): Promise<DashboardPreferences | null>;
    updateDashboardPreferences(data: {
      pinnedWidgets?: string[];
      hiddenWidgets?: string[];
      viewOverride?: string | null;
    }): Promise<DashboardPreferences>;
    workflowLaneCounts(): Promise<WorkflowLaneCounts>;
    costByJob(): Promise<CostByJob[]>;
    stockValuation(): Promise<StockValuation>;
    movementHistory(params?: {
      startDate?: string;
      endDate?: string;
      movementType?: string;
      stockItemId?: number;
    }): Promise<StockMovement[]>;
    staffStockReport(filters?: StaffStockFilters): Promise<StaffStockReportResult>;
    staffStockDetail(
      staffMemberId: number,
      filters?: { startDate?: string; endDate?: string },
    ): Promise<StockIssuance[]>;
  }
}

const proto = StockControlApiClient.prototype;

proto.dashboardStats = async function () {
  return this.request("/stock-control/dashboard/stats");
};

proto.sohSummary = async function () {
  return this.request("/stock-control/dashboard/soh-summary");
};

proto.sohByLocation = async function () {
  return this.request("/stock-control/dashboard/soh-by-location");
};

proto.recentActivity = async function () {
  return this.request("/stock-control/dashboard/recent-activity");
};

proto.reorderAlerts = async function () {
  return this.request("/stock-control/dashboard/reorder-alerts");
};

proto.cpoSummary = async function () {
  return this.request("/stock-control/dashboard/cpo-summary");
};

proto.roleDashboardSummary = async function (role) {
  const query = role ? `?role=${role}` : "";
  return this.request(`/stock-control/dashboard/role-summary${query}`);
};

proto.dashboardPreferences = async function () {
  return this.request("/stock-control/dashboard/preferences");
};

proto.updateDashboardPreferences = async function (data) {
  return this.request("/stock-control/dashboard/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.workflowLaneCounts = async function () {
  return this.request("/stock-control/dashboard/workflow-lanes");
};

proto.costByJob = async function () {
  return this.request("/stock-control/reports/cost-by-job");
};

proto.stockValuation = async function () {
  return this.request("/stock-control/reports/stock-valuation");
};

proto.movementHistory = async function (params) {
  const query = params
    ? "?" +
      entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return this.request(`/stock-control/reports/movement-history${query}`);
};

proto.staffStockReport = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.staffMemberId) params.set("staffMemberId", String(filters.staffMemberId));
  if (filters?.departmentId) params.set("departmentId", String(filters.departmentId));
  if (filters?.stockItemId) params.set("stockItemId", String(filters.stockItemId));
  if (filters?.anomalyThreshold) params.set("anomalyThreshold", String(filters.anomalyThreshold));
  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request(`/stock-control/reports/staff-stock${query}`);
};

proto.staffStockDetail = async function (staffMemberId, filters) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request(`/stock-control/reports/staff-stock/${staffMemberId}/detail${query}`);
};
