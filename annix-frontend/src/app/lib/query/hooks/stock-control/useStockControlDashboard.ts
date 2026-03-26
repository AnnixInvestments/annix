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

export function useWorkflowLaneCounts() {
  return useQuery<WorkflowLaneCounts>({
    queryKey: stockControlKeys.dashboard.workflowLanes(),
    queryFn: () => stockControlApiClient.workflowLaneCounts(),
    refetchInterval: 60_000,
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: stockControlKeys.dashboard.stats(),
    queryFn: () => stockControlApiClient.dashboardStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSohByLocation() {
  return useQuery<SohByLocation[]>({
    queryKey: stockControlKeys.dashboard.sohByLocation(),
    queryFn: () => stockControlApiClient.sohByLocation(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useSohSummary() {
  return useQuery<SohSummary[]>({
    queryKey: stockControlKeys.dashboard.sohSummary(),
    queryFn: () => stockControlApiClient.sohSummary(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRecentActivity() {
  return useQuery<RecentActivity[]>({
    queryKey: stockControlKeys.dashboard.recentActivity(),
    queryFn: () => stockControlApiClient.recentActivity(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useReorderAlerts() {
  return useQuery<StockItem[]>({
    queryKey: stockControlKeys.dashboard.reorderAlerts(),
    queryFn: () => stockControlApiClient.reorderAlerts(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function usePendingApprovals() {
  return useQuery<JobCard[]>({
    queryKey: stockControlKeys.dashboard.pendingApprovals(),
    queryFn: () => stockControlApiClient.pendingApprovals(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCpoSummary() {
  return useQuery<CpoSummary>({
    queryKey: stockControlKeys.dashboard.cpoSummary(),
    queryFn: () => stockControlApiClient.cpoSummary(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRoleSummary(role: string) {
  return useQuery<RoleDashboardSummary>({
    queryKey: stockControlKeys.dashboard.roleSummary(role),
    queryFn: () => stockControlApiClient.roleDashboardSummary(role),
    staleTime: 30_000,
    refetchInterval: 60_000,
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
