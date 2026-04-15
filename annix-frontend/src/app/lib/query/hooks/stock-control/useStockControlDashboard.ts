import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CpoSummary,
  DashboardPreferences,
  DashboardStats,
  JobCard,
  RecentActivity,
  RoleDashboardSummary,
  SohByLocation,
  SohSummary,
  StockItem,
  WorkflowLaneCounts,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";
import { usePollingInterval } from "../admin/usePollingJobs";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function useWorkflowLaneCounts() {
  const refetchInterval = usePollingInterval("dashboard:workflow-lane-counts", SIX_HOURS);
  return useQuery<WorkflowLaneCounts>({
    queryKey: stockControlKeys.dashboard.workflowLanes(),
    queryFn: () => stockControlApiClient.workflowLaneCounts(),
    refetchInterval,
  });
}

export function useDashboardStats() {
  const refetchInterval = usePollingInterval("dashboard:stats", SIX_HOURS);
  return useQuery<DashboardStats>({
    queryKey: stockControlKeys.dashboard.stats(),
    queryFn: () => stockControlApiClient.dashboardStats(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useSohByLocation() {
  const refetchInterval = usePollingInterval("dashboard:soh-by-location", SIX_HOURS);
  return useQuery<SohByLocation[]>({
    queryKey: stockControlKeys.dashboard.sohByLocation(),
    queryFn: () => stockControlApiClient.sohByLocation(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useSohSummary() {
  const refetchInterval = usePollingInterval("dashboard:soh-summary", SIX_HOURS);
  return useQuery<SohSummary[]>({
    queryKey: stockControlKeys.dashboard.sohSummary(),
    queryFn: () => stockControlApiClient.sohSummary(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useRecentActivity() {
  const refetchInterval = usePollingInterval("dashboard:recent-activity", SIX_HOURS);
  return useQuery<RecentActivity[]>({
    queryKey: stockControlKeys.dashboard.recentActivity(),
    queryFn: () => stockControlApiClient.recentActivity(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useReorderAlerts() {
  const refetchInterval = usePollingInterval("dashboard:reorder-alerts", SIX_HOURS);
  return useQuery<StockItem[]>({
    queryKey: stockControlKeys.dashboard.reorderAlerts(),
    queryFn: () => stockControlApiClient.reorderAlerts(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function usePendingApprovals() {
  const refetchInterval = usePollingInterval("dashboard:pending-approvals", SIX_HOURS);
  return useQuery<JobCard[]>({
    queryKey: stockControlKeys.dashboard.pendingApprovals(),
    queryFn: () => stockControlApiClient.pendingApprovals(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useCpoSummary() {
  const refetchInterval = usePollingInterval("dashboard:cpo-summary", SIX_HOURS);
  return useQuery<CpoSummary>({
    queryKey: stockControlKeys.dashboard.cpoSummary(),
    queryFn: () => stockControlApiClient.cpoSummary(),
    staleTime: 30_000,
    refetchInterval,
  });
}

export function useRoleSummary(role: string) {
  const refetchInterval = usePollingInterval("dashboard:role-summary", SIX_HOURS);
  return useQuery<RoleDashboardSummary>({
    queryKey: stockControlKeys.dashboard.roleSummary(role),
    queryFn: () => stockControlApiClient.roleDashboardSummary(role),
    staleTime: 30_000,
    refetchInterval,
    enabled: role.length > 0,
  });
}

export function useDashboardPreferences() {
  return useQuery<DashboardPreferences | null>({
    queryKey: stockControlKeys.dashboard.preferences(),
    queryFn: () => stockControlApiClient.dashboardPreferences(),
    staleTime: 30_000,
  });
}

export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      pinnedWidgets?: string[];
      hiddenWidgets?: string[];
      widgetOrder?: string[];
      viewOverride?: string | null;
    }) => stockControlApiClient.updateDashboardPreferences(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: stockControlKeys.dashboard.preferences(),
      });
      const previous = queryClient.getQueryData<DashboardPreferences | null>(
        stockControlKeys.dashboard.preferences(),
      );
      const fallback: DashboardPreferences = {
        id: 0,
        userId: 0,
        pinnedWidgets: [],
        hiddenWidgets: [],
        widgetOrder: [],
        viewOverride: null,
      };
      queryClient.setQueryData<DashboardPreferences>(
        stockControlKeys.dashboard.preferences(),
        (old) => ({ ...(old ?? fallback), ...data }),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(stockControlKeys.dashboard.preferences(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: stockControlKeys.dashboard.preferences(),
      });
    },
  });
}
