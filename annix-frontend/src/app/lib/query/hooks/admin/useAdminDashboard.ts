import { useQuery } from "@tanstack/react-query";
import { adminApiClient, type DashboardStats } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useAdminDashboard() {
  return useQuery<DashboardStats>({
    queryKey: adminKeys.dashboard.stats(),
    queryFn: () => adminApiClient.getDashboardStats(),
  });
}
